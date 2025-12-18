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
            // Reset all fields
            this._initModel();  // resets JSONModel data
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
                this.byId("repairStatus").setEditable(true);
                this.byId("minorRepairStatus").setEditable(true);
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

        /**
         * Set all form fields non-editable except repairStatus and minorRepairStatus
         */
        _setFormReadOnly: function () {
            const oView = this.getView();

            // General info
            this.byId("customer").setEditable(false);
            this.byId("location").setEditable(false);
            this.byId("runnerId").setEditable(false);
            this.byId("lineCount").setEditable(false);
            this.byId("topName").setEditable(true); // Site ID must remain editable for search

            // Repair status fields remain editable
            this.byId("repairStatus").setEditable(true);
            this.byId("minorRepairStatus").setEditable(true);

        },

        /**
         * Make all dynamic lines non-editable (for Maintain mode)
         */
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
        onSiteIdChange: function (oEvent) {
            const sSiteId = oEvent.getSource().getValue().trim();
            if (!sSiteId) return;

            //reset on start
            this._previousMinorRepairStatus = null;
            this._oldStatus = null;
            $.ajax({
                url: `/odata/v4/site-management/siteMaster('${encodeURIComponent(sSiteId)}')`,
                method: "GET",
                success: res => {
                    if (res) {
                        // Populate form with site data
                        const oModel = this.getView().getModel();
                        oModel.setProperty("/site_id", res.site_id);
                        oModel.setProperty("/customer", res.customer_name);
                        oModel.setProperty("/location", res.location);
                        oModel.setProperty("/runnerId", res.runner_id);
                        oModel.setProperty("/campaignNo", res.campaign_no);
                        oModel.setProperty("/repairStatus", res.repair_status);
                        oModel.setProperty("/minorRepairStatus", res.minor_repair_status);
                        oModel.setProperty("/lineCount", res.no_of_production_line);
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
                        this._renderLines(res.siteProductionLines, true);
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

        , _renderLinesForMaintain: function () {
            const oModel = this.getView().getModel();
            const aLines = oModel.getProperty("/lines") || [];
            const container = this.byId("linesContainer");

            container.destroyItems();

            aLines.forEach((line, index) => {
                const panel = new sap.m.Panel({
                    headerText: "House / Production Line - " + (index + 1),
                    expandable: true,
                    expanded: true
                }).addStyleClass("whiteCard sapUiMediumMarginBottom");

                const lineName = new sap.m.Input({
                    value: line.name,
                    editable: false
                });

                const spgInputs = (line.spgSensors || []).map((sensor, i) =>
                    new sap.m.Input({ value: sensor, editable: false, width: "80px" })
                );

                const mudgunInputs = (line.mudgunSensors || []).map((sensor, i) =>
                    new sap.m.Input({ value: sensor, editable: false, width: "80px" })
                );

                const spgBox = new sap.m.HBox({ items: spgInputs });
                const mudgunBox = new sap.m.HBox({ items: mudgunInputs });

                const layout = new sap.m.VBox({
                    width: "100%",
                    items: [
                        new sap.m.Label({ text: "Line Name", design: "Bold" }),
                        lineName,
                        new sap.m.Label({ text: "SPG Sensors", design: "Bold" }),
                        spgBox,
                        new sap.m.Label({ text: "Mudgun Sensors", design: "Bold" }),
                        mudgunBox
                    ]
                }).addStyleClass("sapUiSmallMargin");

                panel.addContent(layout);
                container.addItem(panel);
            });
        }
        ,
        // ============================ MODEL INIT ===========================
        _initModel: function () {
            const data = {
                site_id: "",
                customer: "",
                location: "",
                runnerId: "",
                campaignNo: "",
                repairStatus: "",
                minorRepairStatus: 0,
                lineCount: 0,
                lines: []
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
        onRunnerIdChange: async function () {
            const sCustomer = this.byId("customer").getSelectedKey();
            const sLocation = this.byId("location").getSelectedKey();
            const sRunnerId = this.byId("runnerId").getValue().trim();

            // Optional validation
            if (!sCustomer || !sLocation || !sRunnerId) {
                return; // wait until all 3 are provided
            }

            const oPayload = {
                customer_name: sCustomer,
                location: sLocation,
                runner_id: sRunnerId
            };

            console.log("Payload:", oPayload);
            this._generateCampaignNo();
            // Generate Site ID
            // await this._generateSiteId(oPayload);
            // await this._fetchLastCampaign(oPayload);
        }
        ,
        _generateSiteId: async function (oPayload) {

            const oModel = this.getView().getModel();

            await $.ajax({
                url: "/odata/v4/site-management/generateSiteId",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),

                success: function (res) {
                    // Bind Site ID to view (auto updates Site ID input)
                    oModel.setProperty("/site_id", res.site_id);

                    sap.m.MessageToast.show("Site ID generated");
                },

                error: function (xhr) {
                    sap.m.MessageBox.error(
                        xhr.responseJSON?.error?.message || "Failed to generate Site ID"
                    );
                    console.error(xhr);
                }
            });
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

        // ========================= DYNAMIC LINES ============================
        onLineCountChange: function (oEvent) {

            let count = parseInt(oEvent.getParameter("value"), 10);
            const container = this.byId("linesContainer");
            const model = this.getView().getModel();

            container.destroyItems();

            if (isNaN(count) || count <= 0) {
                model.setProperty("/lines", []);
                return;
            }

            const aLines = [];

            for (let i = 0; i < count; i++) {

                // Panel wrapper (you still use Panel)
                const panel = new sap.m.Panel({
                    headerText: "House / Production Line - " + (i + 1),
                    expandable: true,
                    expanded: true
                }).addStyleClass("whiteCard sapUiMediumMarginBottom");

                // LINE NAME
                const lineName = new sap.m.Input({
                    placeholder: "Line Name",
                    maxLength: 50,
                    width: "50%",
                    liveChange: oEvent => {
                        let value = oEvent.getSource().getValue();
                        // value = value.replace(/[^a-zA-Z\s]/g, "");
                        oEvent.getSource().setValue(value);
                        aLines[i].name = value;
                    }
                });

                // SPG COMPONENTS
                const spgCount = new sap.m.Input({
                    type: "Number",
                    width: "150px",
                    placeholder: "No of SPG Sensors",
                    change: this._handleSpgChange.bind(this, i)
                });

                const spgBox = new sap.m.HBox({ wrap: "Wrap" })
                    .addStyleClass("sapUiTinyMarginTop sapUiTinyMarginBottom");

                const spgSection = new sap.m.VBox({
                    items: [
                        new sap.m.Label({ text: "No of SPG Sensors", design: "Bold" }),
                        spgCount,
                        spgBox
                    ]
                }).addStyleClass("sapUiTinyMarginBottom");

                // MUDGUN COMPONENTS
                const mudgunCount = new sap.m.Input({
                    type: "Number",
                    width: "150px",
                    placeholder: "No of Mudgun Sensors",
                    change: this._handleMudgunChange.bind(this, i)
                });

                const mudgunBox = new sap.m.HBox({ wrap: "Wrap" })
                    .addStyleClass("sapUiTinyMarginTop sapUiTinyMarginBottom");

                const mudgunSection = new sap.m.VBox({
                    items: [
                        new sap.m.Label({ text: "No of Mudgun Sensors", design: "Bold" }),
                        mudgunCount,
                        mudgunBox
                    ]
                }).addStyleClass("sapUiMediumMarginBottom");

                // FINAL LAYOUT
                const layout = new sap.m.VBox({
                    width: "100%",
                    items: [
                        new sap.m.Label({ text: "Line Name", design: "Bold" }),
                        lineName.addStyleClass("sapUiTinyMarginBottom"),
                        spgSection,
                        mudgunSection
                    ]
                }).addStyleClass("sapUiSmallMargin");

                panel.addContent(layout);
                container.addItem(panel);

                aLines.push({
                    name: "",
                    spgCount: 0,
                    spgSensors: [],
                    mudgunCount: 0,
                    mudgunSensors: [],
                    spgBox: spgBox,
                    mudgunBox: mudgunBox
                });
            }

            model.setProperty("/lines", aLines);
        },

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
        },

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

        // ========================= SAVE ============================
        onSave: function () {
            const oModel = this.getView().getModel();
            const data = oModel.getData();
            const sMode = this.byId("modeSelector")?.getSelectedKey();

            const payload = {
                site_id: data.site_id,
                customer_name: data.customer,
                location: data.location,
                runner_id: data.runnerId,
                campaign_no: data.campaignNo,
                repair_status: data.repairStatus,
                minor_repair_status: data.minorRepairStatus || 0,
                no_of_production_line: data.lines.length,
                siteProductionLines: []
            };

            // Prepare production lines
            data.lines.forEach(line => {
                const lineEntry = {
                    line_name: line.name,
                    no_of_spg_sensors: line.spgCount,
                    no_of_mudgun_sensors: line.mudgunCount,
                    sensors: []
                };

                // SPG sensors
                (line.spgSensors || []).forEach(val => {
                    if (val) lineEntry.sensors.push({ sensor_name: val, sensor_type: "SPG" });
                });

                // Mudgun sensors
                (line.mudgunSensors || []).forEach(val => {
                    if (val) lineEntry.sensors.push({ sensor_name: val, sensor_type: "MUDGUN" });
                });

                payload.siteProductionLines.push(lineEntry);
            });

            if (sMode === "create") {
                // ===== CREATE NEW =====
                $.ajax({
                    url: "/odata/v4/site-management/siteMaster",
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(payload),
                    success: res => {
                        MessageToast.show("Site Master saved successfully: " + res.site_id);
                        console.log("Saved Response:", res);

                        // Patch the campaign as before
                        this._patchCampaign(res.site_id, res.campaign_no, res.repair_status, res.minor_repair_status);
                    },
                    error: xhr => {
                        MessageToast.show("Error: " + (xhr.responseJSON?.error?.message || "Unknown Error"));
                        console.error(xhr);
                    }
                });
            } else if (sMode === "maintain") {
                // ===== MAINTAIN =====
                if (!data.site_id) {
                    MessageToast.show("Site ID is required for Maintain mode");
                    return;
                }

                $.ajax({
                    url: `/odata/v4/site-management/siteMaster('${encodeURIComponent(data.site_id)}')`,
                    method: "PATCH",
                    contentType: "application/json",
                    data: JSON.stringify({
                        repair_status: data.repairStatus,
                        minor_repair_status: data.minorRepairStatus || 0,
                        campaign_no: this.byId("campaign").getValue()

                    }),
                    success: res => {
                        MessageToast.show("Site Master updated successfully: " + data.site_id);
                        console.log("Updated Response:", res);

                        // Also patch the campaign if needed
                        this._patchCampaign(data.site_id, data.campaignNo, data.repairStatus, data.minorRepairStatus);
                    },
                    error: xhr => {
                        MessageToast.show("Error updating site: " + (xhr.responseJSON?.error?.message || "Unknown Error"));
                        console.error(xhr);
                    }
                });
            }
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

    const oInput = this.byId("topName");

    // 1️⃣ Set value
    oInput.setValue(sSiteId);

    // 2️⃣ Fire change event manually
    oInput.fireChange({
        value: sSiteId
    });

    this._oSiteVHDialog.close();
},





        // ========================= REPAIR STATUS ============================
        // onRepairStatusChange: function (oEvent) {
        //     if (oEvent.getSource().getSelectedKey() === "major") {
        //         const no = "CMP-" + Math.floor(Math.random() * 1000000);
        //         this.byId("campaign").setValue(no);
        //         this.getView().getModel().setProperty("/campaignNo", no);
        //         MessageToast.show("Campaign Re-generated");
        //     }
        // }

    });
});
