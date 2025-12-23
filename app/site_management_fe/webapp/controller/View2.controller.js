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
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteView2").attachPatternMatched(
                this._onRouteMatched,
                this
            );
            this.getView().setModel(new JSONModel(), "view");
            this._isExistingDailyProduction = false;
        },
        _onRouteMatched: function () {
            this._clearPage();
            
        }
        ,
        onAfterRendering: function () {
            this.getISTDate();

        },
        getISTDate: function () {
            const now = new Date();

            // Convert to IST (+05:30)
            const istOffsetMs = 5.5 * 60 * 60 * 1000;
            const istDate = new Date(now.getTime() + istOffsetMs);
            this.byId("siteDate").setValue(istDate.toISOString().split("T")[0]);
            return istDate.toISOString().split("T")[0]; // yyyy-mm-dd
        },
        onSiteIdLiveChange: function (oEvent) {
            const oInput = oEvent.getSource();

            // Clear typed value
            oInput.setValue("");

            // Inform user
            MessageToast.show("Please select Site ID using the value help", {
                duration: 2000
            });
        },
        onProdLineLiveChange: function (oEvent) {
            const oInput = oEvent.getSource();

            // Clear typed value
            oInput.setValue("");

            // Inform user
            MessageToast.show("Please select Line name using the value help", {
                duration: 2000
            });
        },
        onSiteIdValueHelp: function () {

            const oView = this.getView();

            // Create dialog only once
            if (!this._oSiteVHDialog) {
                this._oSiteVHDialog = new sap.m.SelectDialog({
                    title: "Select Site ID",

                    liveChange: (oEvent) => {
                        this._onSiteSearch(oEvent);
                    },

                    confirm: (oEvent) => {
                        this._onSiteSelect(oEvent);
                    },

                    cancel: () => {
                        this._oSiteVHDialog.close();
                    },

                    items: {
                        path: "/sites",
                        template: new sap.m.StandardListItem({
                            title: "{site_id}",
                            description: "{customer_name} - {location}"
                        })
                    }
                });

                oView.addDependent(this._oSiteVHDialog);
            }

            // Fetch SiteMaster data
            $.ajax({
                url: "/odata/v4/site-management/siteMaster",
                method: "GET",
                success: (res) => {
                    const aSites = res?.value || [];

                    const oModel = new sap.ui.model.json.JSONModel({
                        sites: aSites
                    });

                    this._oSiteVHDialog.setModel(oModel);
                    this._oSiteVHDialog.open();
                },
                error: (xhr) => {
                    sap.m.MessageToast.show("Failed to load Site IDs");
                    console.error(xhr);
                }
            });
        },
        _onSiteSearch: function (oEvent) {
            const sValue = oEvent.getParameter("value");

            const oFilter = new sap.ui.model.Filter(
                "site_id",
                sap.ui.model.FilterOperator.Contains,
                sValue
            );

            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        _onSiteSelect: function (oEvent) {
            //clear prod line field
            this.byId("ProductionLineId").setValue("");

            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) return;

            const sSiteId = oItem.getTitle();

            const oInput = this.byId("siteId");

            // 1️⃣ Set value
            oInput.setValue(sSiteId);

            // 2️⃣ Fire change event manually
            // oInput.fireChange({
            //     value: sSiteId
            // });

            this._oSiteVHDialog.close();
        },
        onProdLineValueHelp: function () {
            let enteredSiteId = this.byId("siteId").getValue();
            if (!enteredSiteId) {
                sap.m.MessageToast.show("Please select a Site ID !")
                return;
            }
            const oView = this.getView();

            // Create dialog only once
            if (!this._oProdVHDialog) {
                this._oProdVHDialog = new sap.m.SelectDialog({
                    title: "Select Production Line",

                    liveChange: (oEvent) => {
                        this._onProdLineSearch(oEvent);
                    },

                    confirm: (oEvent) => {
                        this._onProdLineSelect(oEvent);
                    },

                    cancel: () => {
                        this._oProdVHDialog.close();
                    },

                    items: {
                        path: "/prods",
                        template: new sap.m.StandardListItem({
                            title: "{line_name}",
                            description: "Site ID : {site_site_id}"
                        })
                    }
                });

                oView.addDependent(this._oProdVHDialog);
            }

            // Fetch SiteMaster data
            $.ajax({
                url: `/odata/v4/site-management/siteMaster(site_id='${enteredSiteId}')?$expand=productionLines`,
                method: "GET",
                success: (res) => {
                    console.log("received production data", res.productionLines);

                    this.siteMasterCompleteData = res; //storing the whole details for future use
                    const aProds = res.productionLines || [];

                    const oModel = new sap.ui.model.json.JSONModel({
                        prods: aProds
                    });

                    this._oProdVHDialog.setModel(oModel);
                    this._oProdVHDialog.open();
                },
                error: (xhr) => {
                    sap.m.MessageToast.show("Failed to load production lines.");
                    console.error(xhr);
                }
            });
        },
        _onProdLineSearch: function (oEvent) {
            const sValue = oEvent.getParameter("value");

            const oFilter = new sap.ui.model.Filter(
                "line_name",
                sap.ui.model.FilterOperator.Contains,
                sValue
            );

            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        _onProdLineSelect: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) return;

            const slineName = oItem.getTitle();

            const oInput = this.byId("ProductionLineId");

            // 1️⃣ Set value
            oInput.setValue(slineName);

            // 2️⃣ Fire change event manually
            // oInput.fireChange({
            //     value: sSiteId
            // });

            this._oProdVHDialog.close();
        }
        ,
        onFindPress: async function () {
            const oView = this.getView();

            let oViewModel = oView.getModel("view");
            if (!oViewModel) {
                oViewModel = new sap.ui.model.json.JSONModel();
                oView.setModel(oViewModel, "view");
            }

            const sSiteId = oView.byId("siteId").getValue().trim();
            const sProdLine = oView.byId("ProductionLineId").getValue().trim();
            const sDate = oView.byId("siteDate").getValue().trim();

            if (!sSiteId || !sProdLine || !sDate) {
                sap.m.MessageToast.show("Please fill all required fields");
                return;
            }

            const ajaxPromise = (url) => {
                return new Promise((resolve, reject) => {
                    $.ajax({
                        url: url,
                        method: "GET",
                        dataType: "json",
                        success: resolve,
                        error: reject
                    });
                });
            };

            const siteMaster = this.siteMasterCompleteData;

            oViewModel.setProperty("/siteMaster", {
                customer_name: siteMaster.customer_name,
                location: siteMaster.location,
                runner_id: siteMaster.runner_id
            });

            const dailyDataFetchUrl =
                `/odata/v4/site-management/dailyProduction(` +
                `site_id='${encodeURIComponent(sSiteId)}',` +
                `productionLineName='${encodeURIComponent(sProdLine)}',` +
                `production_date=${sDate}` +
                `)`;

            try {
                const dailyResponse = await ajaxPromise(dailyDataFetchUrl);

                this._isExistingDailyProduction = true;

                const isSubmitted = !!dailyResponse.productionStageCompleted;
                oViewModel.setProperty("/isProductionEditable", !isSubmitted);

                if (isSubmitted) {
                    sap.m.MessageToast.show(
                        "Production stage already submitted. Editing disabled."
                    );
                }
                else {
                    sap.m.MessageToast.show(
                        "Existing production data found for the selected line/date"
                    );
                }


                this.renderProductionLine(siteMaster, dailyResponse);

                this.byId("remark").setValue(dailyResponse.remarks || "");

                oViewModel.setProperty("/campinfo", {
                    campaign_no: dailyResponse.curr_campaign || "",
                    repair_status: dailyResponse.curr_repair_status || "",
                    minor_repair_status: dailyResponse.curr_minor_repair_status || 0
                });

            } catch (err) {
                if (err.status !== 404) {
                    console.error("AJAX Error:", err.status, err.statusText);
                    sap.m.MessageToast.show("Error fetching daily production data");
                    return;
                }

                sap.m.MessageToast.show(
                    "No production data found for the selected line/date"
                );

                this._isExistingDailyProduction = false;
                oViewModel.setProperty("/isProductionEditable", true);

                this.renderProductionLine(siteMaster, null);

                const matchingLine = siteMaster.productionLines.find(
                    line => line.line_name === sProdLine
                );

                oViewModel.setProperty("/campinfo", matchingLine ? {
                    campaign_no: matchingLine.curr_campaign,
                    repair_status: matchingLine.curr_repair_status,
                    minor_repair_status: matchingLine.curr_minor_repair_status
                } : {
                    campaign_no: "",
                    repair_status: "",
                    minor_repair_status: 0
                });

                this.byId("remark").setValue("");
            }
        }


        ,


        // --- Render Production Line Helper ---
        renderProductionLine: function (siteData, dailyData) {
            const oView = this.getView();
            const oViewModel = oView.getModel("view");
            const oLinesContainer = oView.byId("linesContainer");
            oLinesContainer.destroyItems();

            const sProdLine = oView.byId("ProductionLineId").getValue().trim();

            // Find the production line matching the entered name
            const oLine = (siteData.productionLines || []).find(line => line.line_name === sProdLine);

            if (!oLine) {
                sap.m.MessageToast.show("Production line not found");
                return;
            }

            const bEditable = true; // Customize based on productionStageCompleted if needed

            const oPanel = new sap.m.Panel({
                headerText: "Production Line : " + oLine.line_name,
                expandable: false,
                customData: [new sap.ui.core.CustomData({ key: "lineId", value: oLine.ID })],
                content: [
                    new sap.ui.layout.Grid({
                        defaultSpan: "L4 M6 S12",
                        hSpacing: 1,
                        vSpacing: 1,
                        content: [
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({ text: "Production Line Name" }),
                                    new sap.m.Input({ value: oLine.line_name, editable: false })
                                ]
                            }),
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({ text: "Production Data" }),
                                    new sap.m.Input({
                                        type: "Number",
                                        placeholder: "Enter production data",
                                        value: dailyData?.production_data || "",
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
                                        value: dailyData?.erosion_data || "",
                                        editable: bEditable
                                    })
                                ]
                            })
                        ]
                    })
                ]
            });

            oPanel.addStyleClass("sapUiSmallMarginBottom");
            oLinesContainer.addItem(oPanel);
        }


        ,
        onSave: function () {
            const oView = this.getView();

            const siteId = oView.byId("siteId").getValue().trim();
            const prodLineName = oView.byId("ProductionLineId").getValue().trim();
            const prodDate = oView.byId("siteDate").getValue().trim();
            const remark = oView.byId("remark").getValue();

            const campInfo = oView.getModel("view").getProperty("/campinfo");

            const oPanel = oView.byId("linesContainer").getItems()[0];
            if (!oPanel) {
                sap.m.MessageToast.show("No production data");
                return;
            }

            const aGrid = oPanel.getContent()[0].getContent();

            const productionData =
                parseInt(aGrid[1].getItems()[1].getValue(), 10) || 0;

            const erosionData =
                parseInt(aGrid[2].getItems()[1].getValue(), 10) || 0;

            const payload = {
                production_data: productionData,
                erosion_data: erosionData,
                remarks: remark,
                curr_campaign: campInfo?.campaign_no || "",
                curr_repair_status: campInfo?.repair_status || "",
                curr_minor_repair_status: campInfo?.minor_repair_status || 0
            };

            if (this._isExistingDailyProduction) {
                const keyPredicate =
                    `site_id='${encodeURIComponent(siteId)}',` +
                    `productionLineName='${encodeURIComponent(prodLineName)}',` +
                    `production_date=${prodDate}`;

                $.ajax({
                    url: `/odata/v4/site-management/dailyProduction(${keyPredicate})`,
                    method: "PATCH",
                    contentType: "application/json",
                    dataType: "json",
                    data: JSON.stringify(payload),
                    success: () => {
                        sap.m.MessageToast.show("Production Data updated");

                    },
                    error: (xhr) => {
                        const msg =
                            xhr.responseJSON?.error?.message || "Update failed";
                        sap.m.MessageBox.error(msg);

                    }
                });

            } else {
                const postPayload = {
                    site_id: siteId,
                    productionLineName: prodLineName,
                    production_date: prodDate,
                    productionStageCompleted: false,
                    ...payload
                };

                $.ajax({
                    url: "/odata/v4/site-management/dailyProduction",
                    method: "POST",
                    contentType: "application/json",
                    dataType: "json",
                    data: JSON.stringify(postPayload),
                    success: () => {
                        this._isExistingDailyProduction = true;
                        sap.m.MessageToast.show("Production Data created");

                    },
                    error: (xhr) => {
                        const msg =
                            xhr.responseJSON?.error?.message || "Create failed";
                        sap.m.MessageBox.error(msg);
                    }
                });
            }
        }

        ,
        onSubmit: function () {
            const oView = this.getView();
            const oViewModel = oView.getModel("view");

            const sSiteId = this.byId("siteId").getValue().trim();
            const sProdLine = this.byId("ProductionLineId").getValue().trim();
            const sDate = this.byId("siteDate").getValue().trim(); // yyyy-mm-dd

            if (!sSiteId || !sProdLine || !sDate) {
                sap.m.MessageToast.show("Please fill all required fields");
                return;
            }

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

                        const patchUrl = `/odata/v4/site-management/dailyProduction(` +
                            `site_id='${encodeURIComponent(sSiteId)}',` +
                            `productionLineName='${encodeURIComponent(sProdLine)}',` +
                            `production_date=${encodeURIComponent(sDate)}` +
                            `)`;

                        const payload = {
                            productionStageCompleted: true
                        };

                        $.ajax({
                            url: patchUrl,
                            method: "PATCH",
                            contentType: "application/json",
                            data: JSON.stringify(payload),
                            success: function () {
                                sap.m.MessageToast.show("Production submitted successfully");

                                // Lock UI after submission
                                oViewModel.setProperty("/isProductionEditable", false);
                            },
                            error: function (xhr) {
                                let errMsg = "Submission failed";
                                try {
                                    const err = JSON.parse(xhr.responseText);
                                    errMsg = err?.error?.message || errMsg;
                                } catch (e) { }
                                sap.m.MessageBox.error(errMsg);
                                console.error(xhr);
                            }
                        });

                    }.bind(this)
                }
            );
        },
        //Reset Page...............................................................................
        _clearPage: function () {
            // 1️: Reset view model (clears bound fields)
            const oViewModel = this.getView().getModel("view");
            oViewModel.setData(this._getEmptyViewData());

            // 2️: Clear search inputs (not model bound)
            this.byId("siteId").setValue("");
            this.byId("ProductionLineId").setValue("");
            this.byId("siteDate").setValue(null);
            this.byId("remark").setValue("");

            // 3️: Clear dynamic production lines
            this.byId("linesContainer").removeAllItems();
        },
        //reset model also....
        _getEmptyViewData: function () {
            return {
                siteMaster: {
                    customer_name: "",
                    location: "",
                    runner_id: ""
                },
                campinfo: {
                    campaign_no: "",
                    repair_status: "",
                    minor_repair_status: ""
                },
                isProductionEditable: false
            };
        },




    });
});
