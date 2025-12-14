sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Panel",
    "sap/m/HBox",
    "sap/m/VBox",
    "sap/m/Input",
    "sap/m/Label",
    "sap/m/MessageToast",
    "sap/ui/layout/Grid"
], function(Controller, Panel, HBox, VBox, Input, Label, MessageToast, Grid) {
    "use strict";

    return Controller.extend("com.trl.sitemanagementfe.controller.View2", {

        onInit: function() {
            // JSON model for the view
            this.getView().setModel(new sap.ui.model.json.JSONModel(), "view");
        },

        /**
         * Triggered when Site ID input changes
         */
        onSiteIdChange: function(oEvent) {
            const siteId = oEvent.getSource().getValue().trim();
            if (!siteId) return;

            const sServiceUrl = `/odata/v4/site-management/siteMaster?$filter=site_id eq '${siteId}'&$expand=siteProductionLines`;

            fetch(sServiceUrl, {
                method: "GET",
                headers: { "Accept": "application/json" }
            })
            .then(response => {
                if (!response.ok) throw new Error("Site not found");
                return response.json();
            })
            .then(data => {
                if (!data.value || data.value.length === 0) throw new Error("Site not found");

                const oData = data.value[0]; // first matching site
                this.getView().getModel("view").setProperty("/siteMaster", oData);

                // Render production lines dynamically
                const oLinesContainer = this.byId("linesContainer");
                oLinesContainer.destroyItems();

                (oData.siteProductionLines || []).forEach(line => {
                    const oPanel = new Panel({
                        headerText: line.line_name,
                        expandable: false,
                        class: "whiteCard",
                        content: [
                            new Grid({
                                defaultSpan: "L4 M6 S12",
                                hSpacing: 1,
                                vSpacing: 1,
                                content: [
                                    // Production Line Name (prefilled, non-editable)
                                    new VBox({
                                        items: [
                                            new Label({ text: "Production Line Name" }),
                                            new Input({ value: line.line_name, editable: false })
                                        ]
                                    }),

                                    // Production Data (editable)
                                    new VBox({
                                        items: [
                                            new Label({ text: "Production Data" }),
                                            new Input({ value: line.production_data || 0, type: "Number" })
                                        ]
                                    }),

                                    // Erosion Data (editable)
                                    new VBox({
                                        items: [
                                            new Label({ text: "Erosion Data" }),
                                            new Input({ value: line.errosion_data || 0, type: "Number" })
                                        ]
                                    })
                                ]
                            })
                        ]
                    });
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
         * Save updated production and erosion data
         */
        onSave: function() {
            const oLinesContainer = this.byId("linesContainer");
            const aLinesData = [];

            oLinesContainer.getItems().forEach(panel => {
                const aGridContent = panel.getContent()[0].getContent();

                const lineName = aGridContent[0].getItems()[1].getValue();
                const production = parseInt(aGridContent[1].getItems()[1].getValue(), 10);
                const erosion = parseInt(aGridContent[2].getItems()[1].getValue(), 10);

                aLinesData.push({
                    line_name: lineName,
                    production_data: production,
                    errosion_data: erosion
                });
            });

            // Save each line via PATCH
            aLinesData.forEach(line => {
                const sUrl = `/odata/v4/site-management/siteProductionLine('${line.line_name}')`;
                fetch(sUrl, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        production_data: line.production_data,
                        errosion_data: line.errosion_data
                    })
                })
                .then(resp => {
                    if (!resp.ok) throw new Error("Failed to save line: " + line.line_name);
                    return resp.json();
                })
                .then(() => MessageToast.show("Saved: " + line.line_name))
                .catch(err => MessageToast.show(err.message));
            });
        }

    });
});
