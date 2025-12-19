sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Panel"
], function (Controller, MessageToast, MessageBox, JSONModel, Label, Input, VBox, HBox, Panel) {
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

        // Get current date in IST (yyyy-mm-dd)
        getISTDate: function () {
            const now = new Date();
            const istOffsetMs = 5.5 * 60 * 60 * 1000;
            return new Date(now.getTime() + istOffsetMs)
                .toISOString()
                .split("T")[0];
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
            if(!enteredSiteId){
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
                url: `/odata/v4/site-management/siteMaster(site_id='${enteredSiteId}')?$expand=siteProductionLines`,
                method: "GET",
                success: (res) => {
                    console.log("received production data", res.siteProductionLines);
                    const aProds = res.siteProductionLines || [];

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

            const oInput = this.byId("ProductionLineId1");

            // 1️⃣ Set value
            oInput.setValue(slineName);

            // 2️⃣ Fire change event manually
            // oInput.fireChange({
            //     value: sSiteId
            // });

            this._oProdVHDialog.close();
        },

        // ==========================================
        // Fetch site data and render production lines
        // ==========================================
        onSiteIdChange: function (oEvent) {
            const siteId = oEvent.getSource().getValue().trim();
            if (!siteId) return;

            const sDate = this.getISTDate();
            const oShiftSelect = this.byId("shiftSelect");
            const sShift = oShiftSelect.getSelectedKey() || "A"; // default A if nothing selected


            const sServiceUrl =
                `/odata/v4/site-management/siteMaster` +
                `?$filter=site_id eq '${encodeURIComponent(siteId)}'` +
                `&$expand=siteProductionLines(` +
                `$expand=sensors(` +
                `$expand=sensorReading(` +
                `$filter=reading_date eq ${sDate} and shift_code eq '${sShift}'` +
                `)` +
                `)` +
                `)`;

            fetch(sServiceUrl, {
                method: "GET",
                headers: { "Accept": "application/json" }
            })
                .then(resp => resp.ok ? resp.json() : Promise.reject("Site not found"))
                .then(data => {

                    if (!data.value || data.value.length === 0) {
                        throw new Error("Site not found");
                    }

                    const oSite = data.value[0];
                    console.log("Fetched Site Data:", oSite);

                    const oFormModel = this.getView().getModel("formData");

                    // Editable only if sensor stage NOT completed
                    oFormModel.setProperty("/isSensorEditable", !oSite.sensorStageCompleted);

                    // ===============================
                    // Prefill General Info
                    // ===============================
                    oFormModel.setProperty("/siteId", oSite.site_id);
                    oFormModel.setProperty("/runnerId", oSite.runner_id || "");
                    oFormModel.setProperty("/campaignNo", oSite.campaign_no || "");
                    oFormModel.setProperty("/repairStatus", oSite.repair_status || "");
                    oFormModel.setProperty("/minorRepairStatus", oSite.minor_repair_status || 0);
                    oFormModel.setProperty("/productionLines", []);

                    // Clear old UI
                    const oLinesContainer = this.byId("linesContainer");
                    oLinesContainer.destroyItems();

                    // Render Production Lines + Sensors
                    (oSite.siteProductionLines || []).forEach(line => {

                        const lineData = {
                            ID: line.ID,
                            line_name: line.line_name,
                            sensors: []
                        };

                        const oLinePanel = new sap.m.Panel({
                            headerText: "Production Line : " + line.line_name,
                            expandable: true,
                            expanded: true
                        });

                        const oGrid = new sap.ui.layout.Grid({
                            defaultSpan: "L6 M6 S12",
                            hSpacing: 2,
                            width: "100%"
                        });

                        // SGP Panel
                        const oSGPPanel = new sap.m.Panel({
                            headerText: "SPG SENSOR",
                            class: "whiteCard",
                            width: "100%"
                        });
                        const oSGPVBox = new sap.m.VBox();
                        oSGPPanel.addContent(oSGPVBox);

                        // MUDGUN Panel
                        const oMUDGUNPanel = new sap.m.Panel({
                            headerText: "MUDGUN SENSOR",
                            class: "whiteCard",
                            width: "100%"
                        });
                        const oMUDGUNVBox = new sap.m.VBox();
                        oMUDGUNPanel.addContent(oMUDGUNVBox);

                        // Render sensors inside the line
                        (line.sensors || []).forEach(sensor => {

                            // Check if reading already exists for this shift + date
                            const oReading =
                                sensor.sensorReading && sensor.sensorReading.length > 0
                                    ? sensor.sensorReading[0]
                                    : null;

                            const sensorData = {
                                sensorId: sensor.ID,                 // Sensor master ID (for POST)
                                readingId: oReading?.ID || null,     // SensorReading ID (for PATCH)
                                sensor_name: sensor.sensor_name,
                                sensor_type: sensor.sensor_type,
                                reading: oReading?.reading ?? ""     // Prefill existing reading
                            };

                            lineData.sensors.push(sensorData);

                            const oHBox = new sap.m.HBox({
                                justifyContent: "SpaceBetween",
                                class: "sapUiSmallMarginBottom",
                                items: [
                                    new sap.m.Label({ text: sensor.sensor_name }).addStyleClass("sapUiTinyMarginTop"),
                                    new sap.m.Input({
                                        type: "Number",
                                        width: "100px",
                                        placeholder: "Reading...",
                                        value: sensorData.reading,
                                        editable: "{formData>/isSensorEditable}",
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

                        oGrid.addContent(oSGPPanel);
                        oGrid.addContent(oMUDGUNPanel);

                        oLinePanel.addContent(oGrid);
                        oLinePanel.addStyleClass("sapUiSmallMarginBottom");

                        oLinesContainer.addItem(oLinePanel);

                        oFormModel.getProperty("/productionLines").push(lineData);
                    });

                    oFormModel.refresh(true);
                })
                .catch(err => {
                    sap.m.MessageToast.show(err.message || err);
                    this.byId("linesContainer").destroyItems();
                    this.getView().getModel("formData").setProperty("/productionLines", []);
                });
        },

        // ==========================================
        // Save sensor readings (POST / PATCH)
        // ==========================================
        onSave: function () {

            const oModel = this.getView().getModel("formData");

            const campNo = oModel.getProperty("/campaignNo");

            const siteData = oModel.getData();
            const sDate = this.getISTDate();
            const oShiftSelect = this.byId("shiftSelect");
            const sShift = oShiftSelect.getSelectedKey() || "A"; // default A if nothing selected


            if (!siteData.productionLines?.length) {
                sap.m.MessageToast.show("No sensors to save");
                return;
            }

            siteData.productionLines.forEach(line => {

                (line.sensors || []).forEach(sensor => {

                    if (sensor.reading === "" || sensor.reading == null) return;

                    // UPDATE (existing reading)
                    if (sensor.readingId) {
                        fetch(`/odata/v4/site-management/sensorReading('${sensor.readingId}')`, {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            body: JSON.stringify({
                                reading: Number(sensor.reading)
                            })
                        })
                            .catch(err => {
                                console.error(err);
                                sap.m.MessageToast.show("Update failed");
                            });
                    }
                    // CREATE (new reading)
                    else {
                        fetch("/odata/v4/site-management/sensorReading", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            body: JSON.stringify({
                                reading_date: sDate,
                                shift_code: sShift,
                                reading: Number(sensor.reading),
                                sensor_ID: sensor.sensorId ,
                                campaign_no:campNo
                            })
                        })
                            .catch(err => {
                                console.error(err);
                                sap.m.MessageToast.show("Create failed");
                            });
                    }

                });
            });

            sap.m.MessageToast.show("Sensor readings saved successfully");
        },

        // ==========================================
        // Submit Sensor Stage
        // ==========================================
        onSubmit: function () {
            MessageBox.confirm(
                "Confirm submission? Changes will not be allowed after this.",
                {
                    title: "Confirm Submission",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    emphasizedAction: sap.m.MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction === sap.m.MessageBox.Action.YES) {
                            this.markSensorStageCompleted();
                        }
                    }.bind(this)
                }
            );
        },

        markSensorStageCompleted: function () {
            const sSiteId = this.byId("siteId").getValue();
            const sUrl = `/odata/v4/site-management/siteMaster(site_id='${sSiteId}')`;

            $.ajax({
                url: sUrl,
                method: "PATCH",
                contentType: "application/json",
                data: JSON.stringify({
                    sensorStageCompleted: true
                }),
                success: function () {
                    sap.m.MessageToast.show("Sensor stage submitted successfully");
                },
                error: function (xhr) {
                    sap.m.MessageBox.error(
                        xhr.responseJSON?.error?.message || "Submission failed"
                    );
                    console.error(xhr);
                }
            });
        }

    });
});
