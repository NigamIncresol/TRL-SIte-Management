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
    "sap/ui/core/CustomData"
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
    CustomData
) {
    "use strict";

    return Controller.extend("com.trl.sitemanagementfe.controller.View2", {

        onInit: function () {
            this.getView().setModel(new JSONModel(), "view");
        },

        /**
         * Triggered when Site ID input changes
         */
        onSiteIdChange: function (oEvent) {
            const siteId = oEvent.getSource().getValue().trim();
            if (!siteId) {
                return;
            }

            const sServiceUrl =
                `/odata/v4/site-management/siteMaster` +
                `?$filter=site_id eq '${siteId}'` +
                `&$expand=siteProductionLines`;

            fetch(sServiceUrl, {
                method: "GET",
                headers: { "Accept": "application/json" }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Site not found");
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data.value || data.value.length === 0) {
                        throw new Error("Site not found");
                    }

                    const oData = data.value[0];
                    // Normalize repair_status for UI ComboBox
                    if (oData.repair_status) {
                        oData.repair_status = oData.repair_status.toUpperCase();
                    }
                    this.getView().getModel("view").setProperty("/siteMaster", oData);
                    console.log("Repair Status:", oData.repair_status);


                    const oLinesContainer = this.byId("linesContainer");
                    oLinesContainer.destroyItems();

                    (oData.siteProductionLines || []).forEach(line => {

                        const oPanel = new Panel({
                            headerText: "Production Line Name : " + line.line_name,
                            expandable: false,
                            customData: [
                                new CustomData({
                                    key: "lineId",
                                    value: line.ID   // <-- Production Line ID
                                })
                            ],
                            content: [
                                new Grid({
                                    defaultSpan: "L4 M6 S12",
                                    hSpacing: 1,
                                    vSpacing: 1,
                                    content: [

                                        // Production Line Name (read-only)
                                        new VBox({
                                            items: [
                                                new Label({ text: "Production Line Name" }),
                                                new Input({
                                                    value: line.line_name,
                                                    editable: false
                                                })
                                            ]
                                        }),

                                        // Production Data
                                        new VBox({
                                            items: [
                                                new Label({ text: "Production Data" }),
                                                new Input({
                                                    value: line.production_data !== null
                                                        ? line.production_data
                                                        : "",
                                                    placeholder: "Enter production data",
                                                    type: "Number"
                                                })

                                            ]
                                        }),

                                        // Erosion Data
                                        new VBox({
                                            items: [
                                                new Label({ text: "Erosion Data" }),
                                                new Input({
                                                    value: line.errosion_data !== null
                                                        ? line.errosion_data
                                                        : "",
                                                    placeholder: "Enter erosion data",
                                                    type: "Number"
                                                })

                                            ]
                                        })
                                    ]
                                })
                            ]
                        });
                        oPanel.addStyleClass("sapUiSmallMarginBottom")

                        oLinesContainer.addItem(oPanel);
                    });
                })
                .catch(err => {
                    MessageToast.show(err.message);
                    this.getView().getModel("view").setProperty("/siteMaster", {});
                    this.byId("linesContainer").destroyItems();
                });
        },

        /**
         * Save updated production and erosion data using Production Line ID
         */
        onSave: function () {
            let remark=this.byId("remark").getValue();
            const oLinesContainer = this.byId("linesContainer");

            oLinesContainer.getItems().forEach(panel => {

                const lineId = panel
                    .getCustomData()
                    .find(d => d.getKey() === "lineId")
                    .getValue();

                const aGridContent = panel.getContent()[0].getContent();

                const production = parseInt(
                    aGridContent[1].getItems()[1].getValue(), 10
                );

                const erosion = parseInt(
                    aGridContent[2].getItems()[1].getValue(), 10
                );

                const sUrl =
                    `/odata/v4/site-management/siteProductionLine(${lineId})`;

                fetch(sUrl, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        production_data: production,
                        errosion_data: erosion,
                        remarks:remark
                    })
                })
                    .then(resp => {
                        if (!resp.ok) {
                            throw new Error("Failed to save line ID: " + lineId);
                        }
                        MessageToast.show("Saved line ID: " + lineId);
                    })
                    .catch(err => {
                        MessageToast.show(err.message);
                    });
            });
        }

    });
});
