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
    let oODataModel;
    return Controller.extend("com.trl.sitemanagementfe.controller.View3", {

        onInit: function () {
            oODataModel = this.getOwnerComponent().getModel();
            // Initialize form model
            const oData = {
                runnerId: "",
                campaignNo: "",
                repairStatus: "",
                minorRepairStatus: "",
                shift: "",
                productionLines: [],
                isSensorEditable: true
            };
            const oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "formData");

            this._isExistingSensorData = false;

            // Attach route matched
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteView3").attachPatternMatched(
                this._onRouteMatched,
                this
            );
        },
        _onRouteMatched: function () {
            this._clearPage();
        },


        // Get current date in IST (yyyy-mm-dd)
        getISTDate: function () {
            const now = new Date();
            const istOffsetMs = 5.5 * 60 * 60 * 1000;
            return new Date(now.getTime() + istOffsetMs)
                .toISOString()
                .split("T")[0];
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


            // Bind list to SiteMaster
            const oListBinding = oODataModel.bindList("/siteMaster");

            // Request data
            oListBinding.requestContexts().then(aContexts => {

                const aSites = aContexts.map(oCtx => oCtx.getObject());

                const oModel = new sap.ui.model.json.JSONModel({
                    sites: aSites
                });

                this._oSiteVHDialog.setModel(oModel);
                this._oSiteVHDialog.open();

            }).catch(err => {

                sap.m.MessageToast.show("Failed to load Site IDs");
                console.error(err);

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

            // Set value
            oInput.setValue(sSiteId);

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
                    title: "Select Runner",

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




            // Bind context with nested $expand (no encodeURIComponent)
            const oContextBinding = oODataModel.bindContext(
                `/siteMaster(site_id='${enteredSiteId}')`,
                null,
                {
                    $expand: {
                        productionLines: {
                            $expand: {
                                sensors: true
                            }
                        }
                    }
                }
            );

            // Request data
            oContextBinding.requestObject().then(res => {

                console.log("received whole site data", res);

                // Store complete data for future use
                this.siteMasterCompleteData = res;

                const aProds = res.productionLines || [];

                const oModel = new sap.ui.model.json.JSONModel({
                    prods: aProds
                });

                this._oProdVHDialog.setModel(oModel);
                this._oProdVHDialog.open();

            }).catch(err => {

                sap.m.MessageToast.show("Failed to load Runners.");
                console.error(err);

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

            //  Set value
            oInput.setValue(slineName);

            this._oProdVHDialog.close();
        },
        onFindPress: function () {
            const oView = this.getView();
            const oFormModel = oView.getModel("formData");

            const siteId = oView.byId("siteId").getValue().trim();
            const prodLine = oView.byId("ProductionLineId1").getValue().trim();
            const sDate = oView.byId("siteDate1").getValue().trim();
            const sShift = oView.byId("shiftSelect").getSelectedKey() || "A";

            if (!siteId || !prodLine || !sDate) {
                sap.m.MessageToast.show("Please fill all required fields.");
                return;
            }

            oFormModel.setProperty("/siteMaster", {});
            oFormModel.setProperty("/campinfo", {});

            if (this.siteMasterCompleteData) {
                oFormModel.setProperty("/siteMaster", {
                    customer_name: this.siteMasterCompleteData.customer_name || "",
                    location: this.siteMasterCompleteData.location || "",
                    runner_id: this.siteMasterCompleteData.runner_id || ""
                });
            }



            // Build filters (OData V4 way)
            const aFilters = [
                new sap.ui.model.Filter("site_id", "EQ", siteId),
                new sap.ui.model.Filter("productionLineName", "EQ", prodLine),
                new sap.ui.model.Filter("reading_date", "EQ", sDate),
                new sap.ui.model.Filter("shift_code", "EQ", sShift)
            ];

            // Bind list with filters
            const oListBinding = oODataModel.bindList(
                "/sensorReading",
                null,
                null,
                aFilters
            );

            // Request data
            oListBinding.requestContexts().then(aContexts => {

                if (aContexts.length > 0) {
                    const readings = aContexts.map(oCtx => oCtx.getObject());

                    const isCompleted = readings.some(
                        r => r.sensorStageCompleted === true
                    );

                    oFormModel.setProperty("/isSensorEditable", !isCompleted);
                    this._isExistingSensorData = true;

                    if (isCompleted) {
                        sap.m.MessageToast.show(
                            "Sensor stage already submitted. Editing disabled."
                        );
                    } else {
                        sap.m.MessageToast.show(
                            "Existing sensor reading found for the selected line/shift/date"
                        );
                    }

                    const firstRecord = readings[0];
                    oFormModel.setProperty("/campinfo", {
                        campaign_no: firstRecord.curr_campaign || "",
                        repair_status: firstRecord.curr_repair_status || "",
                        minor_repair_status: firstRecord.curr_minor_repair_status || 0
                    });

                    this.renderSensorFieldFromMaster(prodLine, readings);

                } else {
                    // No readings found
                    sap.m.MessageToast.show(
                        "No sensor reading found for the selected line/shift/date"
                    );

                    const matchedLine =
                        this.siteMasterCompleteData?.productionLines.find(
                            line => line.line_name === prodLine
                        );

                    oFormModel.setProperty("/campinfo", {
                        campaign_no: matchedLine?.curr_campaign || "",
                        repair_status: matchedLine?.curr_repair_status || "",
                        minor_repair_status: matchedLine?.curr_minor_repair_status || 0
                    });

                    oFormModel.setProperty("/isSensorEditable", true);
                    this._isExistingSensorData = false;

                    this.renderSensorFieldFromMaster(prodLine, []);
                }

            }).catch(err => {

                sap.m.MessageToast.show(
                    err?.message || "No readings found"
                );

                const matchedLine =
                    this.siteMasterCompleteData?.productionLines.find(
                        line => line.line_name === prodLine
                    );

                oFormModel.setProperty("/campinfo", {
                    campaign_no: matchedLine?.curr_campaign || "",
                    repair_status: matchedLine?.curr_repair_status || "",
                    minor_repair_status: matchedLine?.curr_minor_repair_status || 0
                });

                this.renderSensorFieldFromMaster(prodLine, []);
            });

        }
        ,

        renderSensorFieldFromMaster: function (prodLineInput, fetchedReadings = []) {
            const oView = this.getView();
            const oFormModel = oView.getModel("formData");
            const oLinesContainer = oView.byId("linesContainer");
            oLinesContainer.destroyItems();
            oFormModel.setProperty("/productionLines", []);

            if (!this.siteMasterCompleteData?.productionLines) return;

            const matchedLines = this.siteMasterCompleteData.productionLines.filter(
                line => line.line_name === prodLineInput
            );

            matchedLines.forEach(line => {
                const lineData = { line_name: line.line_name, sensors: [] };

                const oLinePanel = new sap.m.Panel({
                    headerText: "Runner : " + line.line_name,
                    expandable: true,
                    expanded: true
                });

                const oGrid = new sap.ui.layout.Grid({ defaultSpan: "L6 M6 S12", hSpacing: 2, width: "100%" });

                const oSPGPanel = new sap.m.Panel({ headerText: "SPG SENSOR", class: "whiteCard", width: "100%" });
                const oSPGVBox = new sap.m.VBox(); oSPGPanel.addContent(oSPGVBox);

                const oMUDGUNPanel = new sap.m.Panel({ headerText: "MUDGUN SENSOR", class: "whiteCard", width: "100%" });
                const oMUDGUNVBox = new sap.m.VBox(); oMUDGUNPanel.addContent(oMUDGUNVBox);

                line.sensors.forEach(sensor => {
                    // Try to find matching reading from fetched data
                    const matchingReading = fetchedReadings.find(
                        r => r.sensor_name === sensor.sensor_name
                    );

                    const sensorData = {
                        sensorId: sensor.ID,
                        sensor_name: sensor.sensor_name,
                        sensor_type: sensor.sensor_type,
                        reading: matchingReading ? matchingReading.reading : ""
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
                                liveChange: (oEvent) => { sensorData.reading = oEvent.getParameter("value"); }
                            })
                        ]
                    });

                    if (sensor.sensor_type === "SPG") oSPGVBox.addItem(oHBox);
                    else if (sensor.sensor_type === "MUDGUN") oMUDGUNVBox.addItem(oHBox);
                });

                oGrid.addContent(oSPGPanel);
                oGrid.addContent(oMUDGUNPanel);
                oLinePanel.addContent(oGrid);
                oLinePanel.addStyleClass("sapUiSmallMarginBottom");
                oLinesContainer.addItem(oLinePanel);

                oFormModel.getProperty("/productionLines").push(lineData);
            });

            oFormModel.refresh(true);
        }



        ,

        onSave: function () {
            const oView = this.getView();
            const oModel = oView.getModel("formData");
            const siteData = oModel.getData();

            const siteId = oView.byId("siteId").getValue().trim();
            const prodLine = oView.byId("ProductionLineId1").getValue().trim();
            const sDate = oView.byId("siteDate1").getValue().trim();
            const sShift = oView.byId("shiftSelect").getSelectedKey() || "A";

            if (!siteId || !prodLine || !sDate) {
                sap.m.MessageToast.show("Please fill all required fields.");
                return;
            }

            if (!siteData.productionLines?.length) {
                sap.m.MessageToast.show("No sensors to save");
                return;
            }

            siteData.productionLines.forEach(line => {
                if (line.line_name !== prodLine) {
                    return;
                }

                (line.sensors || []).forEach(sensor => {
                    // if (sensor.reading === "" || sensor.reading == null) {
                    //     return;
                    // }

                    const payload = {
                        site_id: siteId,
                        productionLineName: prodLine,
                        reading_date: sDate,
                        shift_code: sShift,
                        sensor_name: sensor.sensor_name,
                        reading: Number(sensor.reading),
                        curr_campaign: siteData.campinfo?.campaign_no || "",
                        curr_repair_status: siteData.campinfo?.repair_status || "",
                        curr_minor_repair_status:
                            siteData.campinfo?.minor_repair_status ?? 0
                    };



                    if (this._isExistingSensorData) {

                        /* ================= PATCH sensorReading ================= */

                        const sPath =
                            `/sensorReading(` +
                            `site_id='${payload.site_id}',` +
                            `productionLineName='${payload.productionLineName}',` +
                            `reading_date='${payload.reading_date}',` +
                            `shift_code='${payload.shift_code}',` +
                            `sensor_name='${payload.sensor_name}'` +
                            `)`;

                        const oContextBinding = oODataModel.bindContext(sPath);

                        oContextBinding.requestObject().then(() => {

                            const oContext = oContextBinding.getBoundContext();

                            // Set properties one by one (PATCH)
                            Object.keys(payload).forEach(key => {
                                oContext.setProperty(key, payload[key]);
                            });

                            // Submit PATCH
                            return oODataModel.submitBatch(
                                oContextBinding.getUpdateGroupId()
                            );

                        }).then(() => {

                            console.log("Updated sensor:", sensor.sensor_name);

                        }).catch(err => {

                            console.error(err);
                            sap.m.MessageToast.show(
                                "Update failed for " + sensor.sensor_name
                            );
                        });

                    } else {

                        /* ================= POST sensorReading ================= */

                        const oListBinding = oODataModel.bindList("/sensorReading");
                        const oCreateContext = oListBinding.create(payload);

                        oCreateContext.created().then(() => {

                            console.log("Created sensor:", sensor.sensor_name);

                        }).catch(err => {

                            console.error(err);
                            sap.m.MessageToast.show(
                                "Create failed for " + sensor.sensor_name
                            );
                        });
                    }

                });
            });

            sap.m.MessageToast.show("Sensor readings saved successfully");
        }
        ,
        onSubmit: function () {
            MessageBox.confirm(
                "Confirm submission? Changes will not be allowed after this.",
                {
                    title: "Confirm Submission",
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            this.markSensorStageCompleted();
                        }
                    }.bind(this)
                }
            );
        },

        markSensorStageCompleted: function () {
            const oView = this.getView();
            const oFormModel = oView.getModel("formData");
            const data = oFormModel.getData();

            const sSiteId = oView.byId("siteId").getValue().trim();
            const sProdLine = oView.byId("ProductionLineId1").getValue().trim();
            const sDate = oView.byId("siteDate1").getValue().trim();
            const sShift = oView.byId("shiftSelect").getSelectedKey() || "A";

            if (!sSiteId || !sProdLine || !sDate) {
                sap.m.MessageToast.show("Missing required fields");
                return;
            }

            const aPatchPromises = [];

            // 🔁 Loop through sensors
            data.productionLines.forEach(line => {
                if (line.line_name !== sProdLine) {
                    return;
                }

                (line.sensors || []).forEach(sensor => {

                    const sPath =
                        `/sensorReading(` +
                        `site_id='${sSiteId}',` +
                        `productionLineName='${sProdLine}',` +
                        `reading_date='${sDate}',` +
                        `shift_code='${sShift}',` +
                        `sensor_name='${sensor.sensor_name}'` +
                        `)`;

                    const oContextBinding = oODataModel.bindContext(sPath);

                    const pPatch = oContextBinding.requestObject().then(() => {

                        const oContext = oContextBinding.getBoundContext();

                        // PATCH field
                        oContext.setProperty("sensorStageCompleted", true);

                        // Submit PATCH
                        return oODataModel.submitBatch(
                            oContextBinding.getUpdateGroupId()
                        );

                    }).then(() => {
                        console.log("Sensor submitted:", sensor.sensor_name);
                    }).catch(err => {
                        console.error(err);
                        sap.m.MessageToast.show(
                            "Submission failed for " + sensor.sensor_name
                        );
                    });

                    aPatchPromises.push(pPatch);
                });
            });

            // Final UI update after triggering all PATCH calls
            Promise.allSettled(aPatchPromises).then(() => {
                sap.m.MessageToast.show("Sensor stage submitted successfully");
                oFormModel.setProperty("/isSensorEditable", false);
                oFormModel.refresh();
            });
        }
        ,
        _clearPage: function () {
            // 1️: Reset formData model (clears bound fields)
            const oFormModel = this.getView().getModel("formData");
            oFormModel.setData(this._getEmptyFormData());

            // 2️: Clear search inputs (not bound)
            this.byId("siteId").setValue("");
            this.byId("ProductionLineId1").setValue("");
            this.byId("siteDate1").setValue(null);
            this.byId("shiftSelect").setSelectedKey("");

            // 3️: Clear dynamic content
            this.byId("linesContainer").removeAllItems();
        },
        _getEmptyFormData: function () {
            return {
                shift: "",
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
                isSensorEditable: false
            };
        },
        onNavToHome: function () {
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Home");
        }


    });
});
