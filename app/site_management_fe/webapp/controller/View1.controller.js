sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("com.trl.sitemanagementfe.controller.View1", {

        onInit: function () {
            this._initModel();
            this._loadDropdowns();

            // On page load, disable everything except Mode
            this._setFieldsEditable(false);
        }

        ,
        onAfterRendering: async function () {

            const oModel = this.getOwnerComponent().getModel();

            console.log("DEFAULT MODEL =>", oModel);
            console.log("MODEL CLASS =>", oModel?.getMetadata()?.getName());

            // $.ajax({
            //     url: "/odata/v4/site-management/siteMaster",
            //     method: "GET",
            //     success: res => console.log("response of site master", res),
            //     error: err => console.log("error site master", err)
            // });

            // $.ajax({
            //     url: "/odata/v4/site-management/siteProductionLine",
            //     method: "GET",
            //     success: res => console.log("response of site production line", res),
            //     error: err => console.log("error site prod line", err)
            // });
        },
        onModeChange: function (oEvent) {
            const sMode = oEvent.getParameter("selectedItem").getKey();
            const oView = this.getView();
            this._clearForm();

            if (sMode === "create") {
                // ===== CREATE NEW MODE =====
                this._initModel();
                this.byId("linesContainer").destroyItems();

                // Site ID read-only
                this.byId("topName").setEditable(false);

                // All other fields editable
                this.byId("customer").setEditable(true);
                this.byId("location").setEditable(true);
                this.byId("runnerId").setEditable(true);
                this.byId("lineCount").setEditable(true);
                this.byId("btnSave").setEnabled(true);


            } else if (sMode === "maintain") {
                // ===== MAINTAIN MODE =====
                const oSiteInput = this.byId("topName");
                oSiteInput.setEditable(true); // user can enter Site ID
                oSiteInput.setValue(""); // clear previous value
                this.byId("btnSave").setEnabled(true);

                // All other fields non-editable initially
                this._setFormReadOnly();

                // Destroy existing lines
                this.byId("linesContainer").destroyItems();

                // Attach change handler to Site ID input
                oSiteInput.detachChange(this.onSiteIdChange); // remove previous
                oSiteInput.attachChange(this.onSiteIdChange.bind(this));
            }
        },

        _setFieldsEditable: function (bEditable) {
            const fieldIds = [
                "topName",
                "customer",
                "location",
                "runnerId",
                "campaign",
                "repairStatus",
                "minorRepairStatus",
                "lineCount"
            ];

            fieldIds.forEach(id => {
                const field = this.byId(id);
                if (field) {
                    field.setEditable(bEditable);
                }
            });
            this.byId("btnSave").setEnabled(bEditable);

            // Dynamic lines are handled separately if needed
            this.byId("linesContainer").getItems().forEach(panel => {
                panel.setEditable(bEditable); // optional for Panel wrapper
            });
        }
        ,
        _setFormReadOnly: function () {
            const oView = this.getView();

            // General info
            this.byId("customer").setEditable(false);
            this.byId("location").setEditable(false);
            this.byId("runnerId").setEditable(false);
            this.byId("lineCount").setEditable(false);
            this.byId("topName").setEditable(true); // Site ID must remain editable for search

        },


        _setLinesReadOnly: function () {
            const container = this.byId("linesContainer");
            container.getItems().forEach(panel => {
                panel.getContent().forEach(vbox => {
                    if (vbox.getItems) {
                        vbox.getItems().forEach(item => {
                            if (item.setEditable) item.setEditable(false);

                            // Recursively handle nested items (like VBox/HBox inside panel)
                            if (item.getItems) {
                                item.getItems().forEach(nestedItem => {
                                    if (nestedItem.setEditable) nestedItem.setEditable(false);
                                });
                            }
                        });
                    }
                });
            });
        },
        _clearForm: function () {
            const oView = this.getView();
            const oModel = oView.getModel();

            // Reset JSON model
            this._initModel();

            // Destroy dynamic lines
            this.byId("linesContainer").destroyItems();

            // Reset all fields editable/non-editable based on mode
            const sMode = this.byId("modeDropdown")?.getSelectedKey();
            if (sMode === "create") {
                this.byId("topName").setEditable(false); // Site ID read-only
                this.byId("customer").setEditable(true);
                this.byId("location").setEditable(true);
                this.byId("runnerId").setEditable(true);
                this.byId("lineCount").setEditable(true);
                this.byId("repairStatus").setEditable(true);
                this.byId("minorRepairStatus").setEditable(true);
            } else if (sMode === "maintain") {
                this.byId("topName").setEditable(true); // Site ID editable
                this.byId("customer").setEditable(false);
                this.byId("location").setEditable(false);
                this.byId("runnerId").setEditable(false);
                this.byId("lineCount").setEditable(false);
                this.byId("repairStatus").setEditable(true);
                this.byId("minorRepairStatus").setEditable(true);
            }
        }
        ,


        // ============================ MODEL INIT ===========================
        _initModel: function () {
            const data = {
                site_id: "",
                customer: "",
                location: "",
                runnerId: "",
                lineCount: 0,
                lines: []   // each line will now hold campaign & repair data
            };
            this.getView().setModel(new JSONModel(data));
        }
        ,
        _loadDropdowns: function () {

            // === CUSTOMER DROPDOWN MODEL ===
            const customerModel = new JSONModel({
                items: [
                    { key: "TRL", text: "TRL" },
                    { key: "Dolvi", text: "Dolvi" },
                    { key: "JSPL", text: "JSPL" }
                ]
            });

            this.byId("customer").setModel(customerModel, "customerModel");

            this.byId("customer").bindItems({
                path: "customerModel>/items",
                template: new sap.ui.core.Item({
                    key: "{customerModel>key}",
                    text: "{customerModel>text}"
                })
            });


            // === LOCATION DROPDOWN MODEL ===
            const locationModel = new JSONModel({
                items: [
                    { key: "Chennai", text: "Chennai" },
                    { key: "Pune", text: "Pune" },
                    { key: "Bangalore", text: "Bangalore" }
                ]
            });

            this.byId("location").setModel(locationModel, "locationModel");

            this.byId("location").bindItems({
                path: "locationModel>/items",
                template: new sap.ui.core.Item({
                    key: "{locationModel>key}",
                    text: "{locationModel>text}"
                })
            });
        }
        ,
        onSiteIdChange: function (oEvent) {
            const sSiteId = oEvent.getSource().getValue().trim();
            if (!sSiteId) return;

            //reset on start
            this._previousMinorRepairStatus = null;
            this._oldStatus = null;
            $.ajax({
                url: `/odata/v4/site-management/siteMaster('${encodeURIComponent(sSiteId)}')?$expand=productionLines($expand=sensors)`,

                method: "GET",
                success: res => {
                    if (res) {
                        console.log("recicied date responese", res)
                        // Populate form with site data
                        const oModel = this.getView().getModel();
                        oModel.setProperty("/site_id", res.site_id);
                        oModel.setProperty("/customer", res.customer_name);
                        oModel.setProperty("/location", res.location);
                        oModel.setProperty("/runnerId", res.runner_id);

                        oModel.setProperty("/lineCount", res.productionLines.length);
                        this._previousMinorRepairStatus = res.minor_repair_status;
                        this._oldStatus = res.repair_status;

                        //if major repair coming then make minor status non editable.
                        if (res.repair_status == "major") {
                            this.byId("minorRepairStatus").setEditable(false);
                        }
                        if (res.repair_status == "minor") {
                            this.byId("minorRepairStatus").setEditable(true);
                        }
                        // Render lines as read-only
                        this._renderProductionLines(res.productionLines, true);


                    } else {
                        MessageToast.show("Site not found.");
                        this._clearForm(); // Clear form if site not found
                    }
                },
                error: () => {
                    MessageToast.show("Site not found.");
                    this._clearForm(); // Clear form if site not found
                }
            });
        }

        ,
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

                    cancel: oEvent => {
                        oEvent.getSource().close();
                    }
                    ,

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

            const oDialog = oEvent.getSource();   // ✅ always the SelectDialog
            const oItem = oEvent.getParameter("selectedItem");

            if (!oItem) {
                oDialog.close();
                return;
            }

            const sSiteId = oItem.getTitle();
            const oInput = this.byId("topName");

            // Set Site ID
            oInput.setValue(sSiteId);

            // Fire change manually
            oInput.fireChange({ value: sSiteId });

            oDialog.close();   // ✅ SAFE
        }
        ,
        onRepairStatusChange: function (oEvent) {
            const oCombo = oEvent.getSource();
            const newStatus = oCombo.getSelectedKey();
            const oModel = this.getView().getModel();
            const oldStatus = oModel.getProperty("/repairStatus"); // current value in model

            // Update the model with new repair status
            oModel.setProperty("/repairStatus", newStatus);

            const oMinorInput = this.byId("minorRepairStatus");

            if (newStatus === "major") {
                // Major selected
                oModel.setProperty("/minorRepairStatus", 0);       // reset minor repair status
                oMinorInput.setEditable(false);                   // make minor repair status non-editable

                // Generate new campaign number
                this._generateCampaignNo({
                    customer_name: oModel.getProperty("/customer"),
                    location: oModel.getProperty("/location"),
                    runner_id: oModel.getProperty("/runnerId")
                });
                sap.m.MessageToast.show("Major repair, new campaign generated");
                this.byId("minorRepairStatus").setEditable(false); // preventing user to change initial minor repair status.

            } else if (newStatus === "minor") {
                // Minor selected
                oMinorInput.setEditable(true);                    // allow minor repair status edits
                const minorStatus = oModel.getProperty("/minorRepairStatus");
                if (![1, 2, 3].includes(minorStatus)) {
                    oModel.setProperty("/minorRepairStatus", 1);  // default to 1 if invalid
                }

                // If previous status was major, generate a new campaign number
                if (this._oldStatus === "major") {
                    this._generateCampaignNo({
                        customer_name: oModel.getProperty("/customer"),
                        location: oModel.getProperty("/location"),
                        runner_id: oModel.getProperty("/runnerId")
                    });
                    sap.m.MessageToast.show("Minor repair, new campaign generated");
                    this.byId("minorRepairStatus").setEditable(false); // preventing user to change initial minor repair status.
                }
            }
        }
        ,
        onMinorRepairStatusChange: function (oEvent) {
            const oModel = this.getView().getModel();
            const repairStatus = oModel.getProperty("/repairStatus");

            // Only validate if repair status is "minor"
            if (repairStatus !== "minor") return;

            let newValue = parseInt(oEvent.getSource().getValue(), 10);
            let currentValue = this._previousMinorRepairStatus;

            if (isNaN(newValue)) {
                // Reset to current value if input is invalid
                oEvent.getSource().setValue(currentValue);
                return;
            }

            if (currentValue === 1 && newValue !== 2) {
                MessageToast.show("Minor Repair Status can only move from 1 → 2");
                oEvent.getSource().setValue(1);
                oModel.setProperty("/minorRepairStatus", 1);
                return;
            }

            if (currentValue === 2 && newValue !== 3) {
                MessageToast.show("Minor Repair Status can only move from 2 → 3");
                oEvent.getSource().setValue(2);
                oModel.setProperty("/minorRepairStatus", 2);
                return;
            }

            if (currentValue === 3) {
                MessageBox.information("Minor Repair Status is 3. Please switch to Major Repair Status.");
                oEvent.getSource().setValue(3);
                oModel.setProperty("/minorRepairStatus", 3);
                return;
            }

            // If valid increment, update model
            oModel.setProperty("/minorRepairStatus", newValue);
        }
        ,
        _fetchLastCampaign: function (oPayload) {
            const oModel = this.getView().getModel();
            const sUrl =
                `/odata/v4/site-management/getLastCampaignNo` +
                `(customer_name='${oPayload.customer_name}',` +
                `location='${oPayload.location}',` +
                `runner_id='${oPayload.runner_id}')`;

            $.ajax({
                url: sUrl,
                method: "GET",
                success: function (res) {
                    if (res && res.campaign_no) {
                        console.log("Last campaign found:", res);
                        if (res.repair_status == "major" || res.minor_repair_status == "3") {
                            console.log("old one expired, generating new one");
                            sap.m.MessageToast.show("New Campaign Number Generated.");
                            this._generateCampaignNo(oPayload);
                        }
                        else {
                            console.log("existing one is valid, applying the same")
                            sap.m.MessageToast.show("Existing Campaign Number Applied.");
                            // Bind to view
                            oModel.setProperty("/campaignNo", res.campaign_no);
                            oModel.setProperty("/repairStatus", res.repair_status);
                            oModel.setProperty("/minorRepairStatus", res.minor_repair_status + 1);
                        }

                    } else {
                        console.log("No previous campaign found - generating one");
                        sap.m.MessageToast.show("New Campaign Number Generated.");
                        this._generateCampaignNo(oPayload);
                    }
                }.bind(this),
                error: function (xhr) {
                    console.error("Error fetching last campaign", xhr);
                }
            });
        }
        ,
        _generateCampaignNo: function () {

            const oModel = this.getView().getModel();

            $.ajax({
                url: "/odata/v4/site-management/campaign",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({}),

                success: function (res) {
                    console.log("Generated campaign number:", res.campaign_no);

                    // Bind to view
                    oModel.setProperty("/campaignNo", res.camp_no);
                },

                error: function (xhr) {
                    sap.m.MessageBox.error(
                        xhr.responseJSON?.error?.message || "Failed to generate campaign number"
                    );
                }
            });
        }
        ,
        _patchCampaign: function (sSiteId, sCampId, sRepairStatus, iMinorRepairStatus) {

            if (!sCampId) {
                sap.m.MessageToast.show("Campaign ID is required");
                return;
            }

            const payload = {
                repair_status: sRepairStatus,
                minor_repair_status: iMinorRepairStatus,
                site_site_id: sSiteId
            };

            console.log("PATCH Campaign Payload:", payload);

            $.ajax({
                url: `/odata/v4/site-management/campaign(camp_no='${encodeURIComponent(sCampId)}')`,
                method: "PATCH",
                contentType: "application/json",
                data: JSON.stringify(payload),

                success: function () {
                    // sap.m.MessageToast.show("Campaign updated successfully");
                },

                error: function (xhr) {
                    sap.m.MessageToast.show(
                        "Campaign update failed: " +
                        (xhr.responseJSON?.error?.message || "Unknown Error")
                    );
                    console.error("Campaign PATCH Error:", xhr);
                }
            });
        }
        ,
        _stopCampaignForLine: function (line) {

            MessageBox.confirm(
                "Do you want to stop this campaign?",
                {
                    onClose: action => {
                        if (action !== MessageBox.Action.OK) return;

                        $.ajax({
                            url: `/odata/v4/site-management/campaign(camp_no='${encodeURIComponent(line.campaign_no)}')`,
                            method: "PATCH",
                            contentType: "application/json",
                            data: JSON.stringify({
                                repair_status: "stopped"
                            }),
                            success: () => {
                                sap.m.MessageToast.show("Campaign stopped");
                            },
                            error: () => {
                                sap.m.MessageToast.show("Failed to stop campaign");
                            }
                        });
                    }
                }
            );
        }
        ,

        // ========================= DYNAMIC LINES ============================
        onLineCountChange: function (oEvent) {

            const count = parseInt(oEvent.getParameter("value"), 10);
            if (isNaN(count) || count <= 0) {
                this.byId("linesContainer").destroyItems();
                this.getView().getModel().setProperty("/lines", []);
                return;
            }

            const emptyLines = [];

            for (let i = 0; i < count; i++) {
                emptyLines.push({
                    line_name: "",
                    no_of_spg_sensors: 0,
                    no_of_mudgun_sensors: 0,
                    sensors: []
                });
            }

            this._renderProductionLines(emptyLines, false);
        }
        ,
        _renderProductionLines: function (aLinesFromAPI, bReadOnly) {

            const container = this.byId("linesContainer");
            const oModel = this.getView().getModel();

            container.destroyItems();

            const aLinesModel = [];

            aLinesFromAPI.forEach((line, index) => {

                const panel = new sap.m.Panel({
                    headerText: "House / Production Line - " + (index + 1),
                    expandable: true,
                    expanded: true
                }).addStyleClass("whiteCard sapUiMediumMarginBottom");

                const lineName = new sap.m.Input({
                    value: line.line_name || "",
                    editable: !bReadOnly,
                    liveChange: e => {
                        oModel.setProperty(`/lines/${index}/line_name`, e.getParameter("value"));
                    }
                });

                const spgCount = new sap.m.Input({
                    type: "Number",
                    value: line.no_of_spg_sensors || 0,
                    editable: !bReadOnly,
                    change: this._handleSpgChange.bind(this, index)
                });

                const mudgunCount = new sap.m.Input({
                    type: "Number",
                    value: line.no_of_mudgun_sensors || 0,
                    editable: !bReadOnly,
                    change: this._handleMudgunChange.bind(this, index)
                });

                const spgBox = new sap.m.HBox({ wrap: "Wrap" });
                const mudgunBox = new sap.m.HBox({ wrap: "Wrap" });

                (line.sensors || []).forEach(sensor => {
                    const input = new sap.m.Input({
                        width: "80px",
                        value: sensor.sensor_name,
                        editable: false
                    });
                    sensor.sensor_type === "SPG"
                        ? spgBox.addItem(input)
                        : mudgunBox.addItem(input);
                });

                const lineGrid = new sap.ui.layout.Grid({
                    defaultSpan: "L4 M6 S12",
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({ text: "Line Name", design: "Bold" }),
                                lineName
                            ]
                        }),
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({ text: "No of SPG Sensors", design: "Bold" }),
                                spgCount,
                                spgBox
                            ]
                        }),
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({ text: "No of Mudgun Sensors", design: "Bold" }),
                                mudgunCount,
                                mudgunBox
                            ]
                        })
                    ]
                });

                const campaignInput = new sap.m.Input({
                    value: line.curr_campaign || "",
                    width: "100%",
                    editable: !bReadOnly,
                    liveChange: e => {
                        oModel.setProperty(`/lines/${index}/campaign/campaign_no`, e.getParameter("value"));
                    }
                });

                const repairStatusCombo = new sap.m.ComboBox({
                    selectedKey: line.curr_repair_status || "",
                    width: "100%",
                    editable: true,
                    selectionChange: e => {
                        oModel.setProperty(
                            `/lines/${index}/campaign/repair_status`,
                            e.getSource().getSelectedKey()
                        );
                    },
                    items: [
                        new sap.ui.core.Item({ key: "major", text: "Major" }),
                        new sap.ui.core.Item({ key: "minor", text: "Minor" })
                    ]
                });

                const minorRepairInput = new sap.m.Input({
                    type: "Number",
                    value: line.curr_minor_repair_status || 0,
                    width: "100%",
                    editable: true,
                    liveChange: e => {
                        oModel.setProperty(
                            `/lines/${index}/campaign/minor_repair_count`,
                            parseInt(e.getParameter("value") || 0, 10)
                        );
                    }
                });

                const stopCampaignBtn = new sap.m.Button({
                    text: "Stop Campaign",
                    type: "Reject",
                    visible: true,
                    press: () => {

                        sap.m.MessageBox.confirm("Are you sure you want to stop the campaign?", {
                            onClose: sAction => {
                                if (sAction === sap.m.MessageBox.Action.OK) {

                                    oModel.setProperty(`/lines/${index}/campaign/campaign_no`, "");
                                    oModel.setProperty(`/lines/${index}/campaign/repair_status`, "");
                                    oModel.setProperty(`/lines/${index}/campaign/minor_repair_count`, 0);

                                    oModel.setProperty(`/lines/${index}/curr_campaign`, "");
                                    oModel.setProperty(`/lines/${index}/curr_repair_status`, "");
                                    oModel.setProperty(`/lines/${index}/curr_minor_repair_status`, 0);
                                }
                            }
                        });
                    }
                });


                const repairGrid = new sap.ui.layout.Grid({
                    defaultSpan: "L4 M6 S12",
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({ text: "Campaign No", design: "Bold" }),
                                campaignInput
                            ]
                        }),
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({ text: "Repair Status", design: "Bold" }),
                                repairStatusCombo
                            ]
                        }),
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({ text: "Minor Repair Status", design: "Bold" }),
                                minorRepairInput
                            ]
                        }),
                        new sap.m.VBox({
                            alignItems: "Start",
                            justifyContent: "End",
                            items: [stopCampaignBtn]
                        })
                    ]
                }).addStyleClass("sapUiSmallMarginTop");

                panel.addContent(
                    new sap.m.VBox({
                        items: [lineGrid, repairGrid]
                    }).addStyleClass("sapUiSmallMargin")
                );

                container.addItem(panel);

                aLinesModel.push({
                    line_name: line.line_name || "",
                    spgCount: line.no_of_spg_sensors || 0,
                    mudgunCount: line.no_of_mudgun_sensors || 0,
                    spgSensors: [],
                    mudgunSensors: [],
                    spgBox,
                    mudgunBox,
                    campaign: {
                        campaign_no: line.curr_campaign || "",
                        repair_status: line.curr_repair_status || "",
                        minor_repair_count: line.curr_minor_repair_status || 0
                    }
                });
            });

            oModel.setProperty("/lines", aLinesModel);
        }
        ,
        // ========================= SPG HANDLER ============================
        _handleSpgChange: function (lineIndex, oEvent) {

            const count = parseInt(oEvent.getParameter("value"), 10);
            const model = this.getView().getModel();
            const line = model.getProperty("/lines")[lineIndex];
            const box = line.spgBox;

            box.destroyItems();
            const sensors = [];

            for (let i = 0; i < count; i++) {
                const input = new sap.m.Input({
                    width: "80px",
                    placeholder: "NAME " + (i + 1),
                    change: e => {
                        sensors[i] = e.getSource().getValue();
                        line.spgSensors = sensors;
                        model.refresh();
                    }
                });

                sensors.push("");
                box.addItem(input);
            }

            line.spgCount = count;
        }
        ,

        // ========================= MUDGUN HANDLER ============================
        _handleMudgunChange: function (lineIndex, oEvent) {

            const count = parseInt(oEvent.getParameter("value"), 10);
            const model = this.getView().getModel();
            const line = model.getProperty("/lines")[lineIndex];
            const box = line.mudgunBox;

            box.destroyItems();
            const sensors = [];

            for (let i = 0; i < count; i++) {
                const input = new sap.m.Input({
                    width: "80px",
                    placeholder: "NAME " + (i + 1),
                    change: e => {
                        sensors[i] = e.getSource().getValue();
                        line.mudgunSensors = sensors;
                        model.refresh();
                    }
                });

                sensors.push("");
                box.addItem(input);
            }

            line.mudgunCount = count;
        },

        _generateCampaignNoForLine: function (lineObj, campaignInput) {
            $.ajax({
                url: "/odata/v4/site-management/campaign",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({}),

                success: res => {
                    lineObj.campaignNo = res.camp_no;
                    campaignInput.setValue(res.camp_no);
                },

                error: () => {
                    sap.m.MessageToast.show("Failed to generate Campaign No");
                }
            });
        },


        // ========================= SAVE ============================
        onSave: function () {

            const oModel = this.getView().getModel();
            const data = oModel.getData();
            const sMode = this.byId("modeSelector")?.getSelectedKey();

            const payload = {
                customer_name: data.customer,
                location: data.location,
                runner_id: data.runnerId,
                productionLines: []
            };

            (data.lines || []).forEach(line => {

                const currCampaign = line.campaign || {};

                const lineEntry = {
                    line_name: line.line_name,
                    no_of_spg_sensors: line.spgCount,
                    no_of_mudgun_sensors: line.mudgunCount,

                    curr_campaign: currCampaign.campaign_no || null,
                    curr_repair_status: currCampaign.repair_status || null,
                    curr_minor_repair_status: currCampaign.minor_repair_count || 0,

                    sensors: []
                };

                (line.spgSensors || []).forEach(val => {
                    if (val) {
                        lineEntry.sensors.push({
                            sensor_name: val,
                            sensor_type: "SPG"
                        });
                    }
                });

                (line.mudgunSensors || []).forEach(val => {
                    if (val) {
                        lineEntry.sensors.push({
                            sensor_name: val,
                            sensor_type: "MUDGUN"
                        });
                    }
                });

                payload.productionLines.push(lineEntry);
            });

            if (sMode === "create") {

                $.ajax({
                    url: "/odata/v4/site-management/siteMaster",
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(payload),
                    success: () => {
                        sap.m.MessageToast.show("Site created successfully");
                    },
                    error: xhr => {
                        sap.m.MessageToast.show(
                            xhr.responseJSON?.error?.message || "Error while creating site"
                        );
                        console.error(xhr);
                    }
                });

            } else if (sMode === "maintain") {

                $.ajax({
                    url: `/odata/v4/site-management/siteMaster('${encodeURIComponent(data.site_id)}')`,
                    method: "PATCH",
                    contentType: "application/json",
                    data: JSON.stringify({
                        customer_name: data.customer,
                        location: data.location,
                        runner_id: data.runnerId
                    }),
                    success: () => {
                        sap.m.MessageToast.show("Site updated successfully");
                    },
                    error: xhr => {
                        sap.m.MessageToast.show(
                            xhr.responseJSON?.error?.message || "Error while updating site"
                        );
                        console.error(xhr);
                    }
                });
            }
        }


        ,
        // ========================= RESET ============================
        onReset: function () {
            MessageBox.confirm("Reset all fields?", {
                onClose: a => {
                    if (a === "OK") {
                        this._initModel();
                        this.byId("linesContainer").destroyItems();
                        MessageToast.show("Reset Completed");
                    }
                }
            });
        }
        ,
    });
});