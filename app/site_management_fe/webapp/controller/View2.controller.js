sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Panel",
    "sap/m/HBox",
    "sap/m/VBox",
    "sap/m/Input",
    "sap/m/Label",
    "sap/m/MessageToast",
    "sap/ui/layout/Grid",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/CustomData",
    "sap/m/MessageBox"
], function (
    Controller,
    Panel,
    HBox,
    VBox,
    Input,
    Label,
    MessageToast,
    Grid,
    JSONModel,
    CustomData,
    MessageBox
) {
    "use strict";

    return Controller.extend("com.trl.sitemanagementfe.controller.View2", {

        onInit: function () {
            this.getView().setModel(new JSONModel(), "view");
        },
        onAfterRendering:function(){
            this.getISTDate();

        },

        /**
         * Triggered when Site ID input changes
         */
        getISTDate: function () {
            const now = new Date();

            // Convert to IST (+05:30)
            const istOffsetMs = 5.5 * 60 * 60 * 1000;
            const istDate = new Date(now.getTime() + istOffsetMs);
            this.byId("siteDate").setValue(istDate.toISOString().split("T")[0]);
            return istDate.toISOString().split("T")[0]; // yyyy-mm-dd
        },


        onSiteIdChange: function (oEvent) {
            const siteId = oEvent.getSource().getValue().trim();
            if (!siteId) return;

            const sDate = this.getISTDate(); // yyyy-mm-dd

            // Build service URL with $expand and filter for today's dailyProduction
            const sServiceUrl = `/odata/v4/site-management/siteMaster` +
                `?$filter=site_id eq '${encodeURIComponent(siteId)}'` +
                `&$expand=siteProductionLines(` +
                `$expand=dailyProductions($filter=production_date eq ${sDate})` +
                `)`;


            fetch(sServiceUrl, {
                method: "GET",
                headers: { "Accept": "application/json" }
            })
                .then(resp => resp.ok ? resp.json() : Promise.reject("Site not found"))
                .then(data => {
                    if (!data.value || data.value.length === 0) throw new Error("Site not found");

                    const oSite = data.value[0];
                    console.log("Fetched Site Data:", oSite);
                    // Initialize remark
                    const oFirstLine = oSite.siteProductionLines?.[0];
                    const oDaily = oFirstLine?.dailyProductions?.[0] || {};
                    //setting model
                    const oViewModel = this.getView().getModel("view");
                    oViewModel.setProperty("/siteMaster", oSite);
                    oViewModel.setProperty("/remark", oDaily.remarks || "");

                    // Determine editability: productionStageCompleted
                    const bEditable = !oSite.siteProductionLines?.some(line =>
                        line.dailyProductions?.some(d => d.productionStageCompleted)
                    );
                    oViewModel.setProperty("/isProductionEditable", bEditable);

                    // Clear previous UI
                    const oLinesContainer = this.byId("linesContainer");
                    oLinesContainer.destroyItems();

                    // Render production lines dynamically
                    (oSite.siteProductionLines || []).forEach(line => {
                        const oDaily = line.dailyProductions?.[0] || {}; // may be empty

                        const oPanel = new sap.m.Panel({
                            headerText: "Production Line : " + line.line_name,
                            expandable: false,
                            customData: [
                                new sap.ui.core.CustomData({ key: "lineId", value: line.ID })
                            ],
                            content: [
                                new sap.ui.layout.Grid({
                                    defaultSpan: "L4 M6 S12",
                                    hSpacing: 1,
                                    vSpacing: 1,
                                    content: [
                                        new sap.m.VBox({
                                            items: [
                                                new sap.m.Label({ text: "Production Line Name" }),
                                                new sap.m.Input({ value: line.line_name, editable: false })
                                            ]
                                        }),
                                        new sap.m.VBox({
                                            items: [
                                                new sap.m.Label({ text: "Production Data" }),
                                                new sap.m.Input({
                                                    type: "Number",
                                                    placeholder: "Enter production data",
                                                    value: oDaily.production_data || "",
                                                    editable: bEditable
                                                })
                                            ]
                                        }),
                                        new sap.m.VBox({
                                            items: [
                                                new sap.m.Label({ text: "Erosion Data" }),
                                                new sap.m.Input({
                                                    type: "Number",
                                                    placeholder: "Enter erosion data",
                                                    value: oDaily.erosion_data || "",
                                                    editable: bEditable
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        });

                        // Store dailyProduction ID in customData for PATCH logic
                        if (oDaily.ID) {
                            oPanel.addCustomData(new sap.ui.core.CustomData({ key: "dailyId", value: oDaily.ID }));
                        }

                        oPanel.addStyleClass("sapUiSmallMarginBottom");
                        oLinesContainer.addItem(oPanel);
                    });

                })
                .catch(err => {
                    sap.m.MessageToast.show(err.message || err);
                    this.byId("linesContainer").destroyItems();
                    this.getView().getModel("view").setProperty("/siteMaster", {});
                });
        }

        ,

        /**
         * Save updated production and erosion data using Production Line ID
         */
        onSave: function () {
            const oModel = this.getView().getModel("view");
            const siteData = oModel.getProperty("/siteMaster");
            const campNo = oModel.getProperty("/siteMaster").campaign_no;
            let sDate = this.getISTDate(); // yyyy-mm-dd
            const sRemark = this.byId("remark")?.getValue() || "";

            if (!siteData?.siteProductionLines?.length) {
                sap.m.MessageToast.show("No production lines to save");
                return;
            }

            siteData.siteProductionLines.forEach(line => {

                const oDaily = line.dailyProductions?.[0]; // existing record if any

                const aGridContent = this.byId("linesContainer")
                    .getItems()
                    .find(p => p.getCustomData().find(d => d.getKey() === "lineId").getValue() === line.ID)
                    .getContent()[0].getContent();

                const iProduction = parseInt(aGridContent[1].getItems()[1].getValue(), 10) || 0;
                const iErosion = parseInt(aGridContent[2].getItems()[1].getValue(), 10) || 0;

                const payload = {
                    production_date: sDate,
                    production_data: iProduction,
                    erosion_data: iErosion,
                    remarks: sRemark,
                    productionLine_ID: line.ID,
                    campaign_no:campNo
                };

                // ==========================
                // PATCH if existing, else POST
                // ==========================
                if (oDaily?.ID) {
                    fetch(`/odata/v4/site-management/dailyProduction('${oDaily.ID}')`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify(payload)
                    })
                        .then(resp => {
                            if (!resp.ok) throw new Error("Failed to update production");
                        })
                        .catch(err => {
                            console.error(err);
                            sap.m.MessageToast.show(err.message);
                        });
                } else {
                    fetch("/odata/v4/site-management/dailyProduction", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify(payload)
                    })
                        .then(resp => {
                            if (!resp.ok) throw new Error("Failed to create production");
                        })
                        .catch(err => {
                            console.error(err);
                            sap.m.MessageToast.show(err.message);
                        });
                }

            });

            sap.m.MessageToast.show("Daily production saved successfully");
        }

        ,
        onSubmit: function () {

            const sSiteId = this.byId("siteId").getValue();
            if (!sSiteId) {
                sap.m.MessageToast.show("Please enter Site ID");
                return;
            }

            const sDate = this.getISTDate(); // yyyy-mm-dd

            sap.m.MessageBox.confirm(
                "Confirm submission? Changes will not be allowed after this.",
                {
                    title: "Confirm Submission",
                    actions: [
                        sap.m.MessageBox.Action.YES,
                        sap.m.MessageBox.Action.NO
                    ],
                    emphasizedAction: sap.m.MessageBox.Action.YES,

                    onClose: function (sAction) {

                        if (sAction !== sap.m.MessageBox.Action.YES) {
                            return;
                        }

                        fetch("/odata/v4/site-management/submitDailyProduction", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            body: JSON.stringify({
                                site_id: sSiteId,
                                date: sDate
                            })
                        })
                            .then(resp => {

                                // ❌ Handle errors
                                if (!resp.ok) {
                                    return resp.json().then(err => {
                                        throw new Error(
                                            err?.error?.message || "Submission failed"
                                        );
                                    });
                                }

                                // ✅ Handle 204 No Content
                                if (resp.status === 204) {
                                    return {
                                        message: "Production submitted successfully"
                                    };
                                }

                                // ✅ Handle 200 with body
                                return resp.json();
                            })
                            .then(result => {

                                sap.m.MessageToast.show(
                                    result.message || "Production submitted successfully"
                                );

                                // 🔒 Lock UI immediately
                                this.getView().getModel("view")
                                    .setProperty("/isProductionEditable", false);
                            })
                            .catch(err => {
                                sap.m.MessageBox.error(err.message);
                                console.error(err);
                            });

                    }.bind(this)
                }
            );
        }




    });
});
