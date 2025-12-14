sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Panel"
], function (Controller, MessageToast, JSONModel, Label, Input, VBox, HBox, Panel) {
    "use strict";

    return Controller.extend("com.trl.sitemanagementfe.controller.View3", {

        onInit: function () {
            // Initialize form model
            const oData = {
                runnerId: "",
                campaignNo: "",
                repairStatus: "",
                minorRepairStatus: "",
                shift: "",
                productionLines: [] // Will hold dynamic production line data
            };
            const oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "formData");

            // Optional: Live clock
            const clock = this.byId("liveClock");
            if (clock) {
                setInterval(() => {
                    clock.setText(new Date().toLocaleTimeString());
                }, 1000);
            }
        },

        // ==========================================
        // Fetch site data and render production lines
        // ==========================================
        onSiteIdChange: function (oEvent) {
            const siteId = oEvent.getSource().getValue().trim();
            if (!siteId) return;

            const sServiceUrl = `/odata/v4/site-management/siteMaster?$filter=site_id eq '${siteId}'&$expand=siteProductionLines,sensors`;

            fetch(sServiceUrl, { method: "GET", headers: { "Accept": "application/json" } })
                .then(resp => resp.ok ? resp.json() : Promise.reject("Site not found"))
                .then(data => {
                    if (!data.value || data.value.length === 0) throw new Error("Site not found");

                    const oSite = data.value[0];
                    console.log("Fetched Site Data:", oSite);

                    const oModel = this.getView().getModel("formData");

                    // Pre-fill general info
                    oModel.setProperty("/runnerId", oSite.runner_id || "");
                    oModel.setProperty("/campaignNo", oSite.campaign_no || "");
                    oModel.setProperty("/repairStatus", oSite.repair_status || "");
                    oModel.setProperty("/minorRepairStatus", oSite.minor_repair_status );
                    oModel.setProperty("/productionLines", []); // Clear previous lines

                    // Get container for production lines
                    const oLinesContainer = this.byId("linesContainer");
                    oLinesContainer.destroyItems();

                    // Loop through each production line
                    (oSite.siteProductionLines || []).forEach(line => {
                        const lineData = {
                            ID: line.ID,
                            line_name: line.line_name,
                            sensors: [] // Will populate with sensors
                        };

                        // Create production line panel
                        const oLinePanel = new Panel({
                            headerText: "Production Line Name : " + line.line_name,
                            expandable: false
                        });

                        // Grid to hold SGP / MUDGUN panels side by side
                        const oGrid = new sap.ui.layout.Grid({
                            defaultSpan: "L6 M6 S12",
                            hSpacing: 2,
                            width: "100%"
                        });

                        // Create SGP Panel
                        const oSGPPanel = new Panel({
                            headerText: "SGP SENSOR",
                            class: "whiteCard",
                            width: "100%"
                        });
                        const oSGPVBox = new VBox();
                        oSGPPanel.addContent(oSGPVBox);

                        // Create MUDGUN Panel
                        const oMUDGUNPanel = new Panel({
                            headerText: "MUDGUN SENSOR",
                            class: "whiteCard",
                            width: "100%"
                        });
                        const oMUDGUNVBox = new VBox();
                        oMUDGUNPanel.addContent(oMUDGUNVBox);

                        // Filter sensors for this line
                        const aLineSensors = (oSite.sensors || []).filter(s => s.line_ID === line.ID);

                        // Render sensors dynamically
                        aLineSensors.forEach(sensor => {
                            const sensorData = {
                                ID: sensor.ID,
                                sensor_name: sensor.sensor_name,
                                sensor_type: sensor.sensor_type,
                                reading: sensor.reading || ""
                            };
                            lineData.sensors.push(sensorData);

                            const oHBox = new HBox({
                                justifyContent: "SpaceBetween",
                                class: "sapUiSmallMarginBottom",
                                items: [
                                    new Label({ text: sensor.sensor_name }),
                                    new Input({
                                        type: "Number",
                                        width: "100px",
                                        placeholder: "Reading...",
                                        value: sensorData.reading,
                                        liveChange: (oEvent) => {
                                            sensorData.reading = oEvent.getParameter("value");
                                        }
                                    })
                                ]
                            });

                            if (sensor.sensor_type === "SPG") {
                                oSGPVBox.addItem(oHBox);
                            } else if (sensor.sensor_type === "MUDGUN") {
                                oMUDGUNVBox.addItem(oHBox);
                            }
                        });

                        // Add SGP and MUDGUN panels to grid
                        oGrid.addContent(oSGPPanel);
                        oGrid.addContent(oMUDGUNPanel);

                        // Add grid to production line panel
                        oLinePanel.addContent(oGrid);
                        oLinePanel.addStyleClass("sapUiSmallMarginBottom");

                        // Add production line panel to UI
                        oLinesContainer.addItem(oLinePanel);

                        // Add production line data to model
                        oModel.getProperty("/productionLines").push(lineData);
                        oModel.refresh();
                    });
                })
                .catch(err => {
                    MessageToast.show(err.message || err);
                    this.byId("linesContainer").destroyItems();
                    this.getView().getModel("formData").setProperty("/productionLines", []);
                });
        },

        // ==========================================
        // Save: PATCH each sensor reading
        // ==========================================
        onSave: function () {
            const oModel = this.getView().getModel("formData");
            const siteData = oModel.getData();

            if (!siteData.productionLines || siteData.productionLines.length === 0) {
                MessageToast.show("No production lines or sensors to save!");
                return;
            }

            siteData.productionLines.forEach(line => {
                if (!line.sensors) return;

                line.sensors.forEach(sensor => {
                    if (!sensor.ID) return;

                    const payload = { reading: sensor.reading };

                    fetch(`/odata/v4/site-management/sensors('${sensor.ID}')`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify(payload)
                    })
                        .then(resp => {
                            if (!resp.ok) throw new Error(`Failed to update sensor: ${sensor.sensor_name}`);
                            console.log(`Sensor ${sensor.sensor_name} updated successfully:`, sensor.reading);
                        })
                        .catch(err => {
                            console.error(err);
                            MessageToast.show(err.message || `Error updating sensor ${sensor.sensor_name}`);
                        });
                });
            });

            MessageToast.show("Sensor readings are being saved!");
        }

    });
});
