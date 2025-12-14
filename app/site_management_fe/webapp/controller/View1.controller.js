sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("com.trl.sitemanagementfe.controller.View1", {

        onInit: async function () {
            this._initModel();
            // this._initCampaignNo();
            this._loadDropdowns();

        },
        _generateIDs: async function () {
            const oModel = this.getView().getModel();

            try {
                // Site ID
                const siteRes = await $.ajax({
                    url: "/odata/v4/site-management/generateSiteId",
                    method: "GET"
                });
                oModel.setProperty("/site_id", siteRes.value);

                // Campaign No
                const campRes = await $.ajax({
                    url: "/odata/v4/site-management/generateCampaignNo",
                    method: "GET"
                });
                oModel.setProperty("/campaignNo", campRes.value);

                // // Runner ID
                // const runRes = await $.ajax({
                //     url: "/odata/v4/site-management/generateRunnerId",
                //     method: "GET"
                // });
                // oModel.setProperty("/runnerId", runRes.value);

            } catch (err) {
                MessageToast.show("Error generating IDs: " + err.responseText || err.statusText);
            }
        },

        onAfterRendering: async function () {
            // Reset all fields
            this._initModel();  // resets JSONModel data
            // Generate IDs from backend
            await this._generateIDs();
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

        _initCampaignNo: function () {
            const no = "CMP-" + Date.now();
            this.byId("campaign").setValue(no);
            this.getView().getModel().setProperty("/campaignNo", no);
        },
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

            const payload = {
                site_id: data.site_id || "SITE-" + Date.now(),
                customer_name: data.customer,
                location: data.location,
                runner_id: data.runnerId,
                campaign_no: data.campaignNo,
                repair_status: data.repairStatus,
                minor_repair_status: data.minorRepairStatus || 0, // <-- updated
                no_of_production_line: data.lines.length,
                siteProductionLines: []
            };

            // Validate main fields
            console.log("Site ID      :", this.byId("topName")?.getValue());
            console.log("Customer     :", data.customer);
            console.log("Location     :", data.location);
            console.log("Runner ID    :", data.runnerId);
            console.log("Campaign No  :", data.campaignNo);
            console.log("Repair Status:", data.repairStatus);
            console.log("Minor Repair :", data.minorRepairStatus); // <-- added
            console.log("Line Count   :", data.lineCount);
            console.log("Lines Array  :", data.lines);

            data.lines.forEach(line => {

                const lineEntry = {
                    line_name: line.name,
                    no_of_spg_sensors: line.spgCount,
                    no_of_mudgun_sensors: line.mudgunCount,
                    sensors: []
                };

                line.spgSensors.forEach(val => {
                    if (val)
                        lineEntry.sensors.push({ sensor_type: "SPG", sensor_name: val });
                });

                line.mudgunSensors.forEach(val => {
                    if (val)
                        lineEntry.sensors.push({ sensor_type: "MUDGUN", sensor_name: val });
                });

                payload.siteProductionLines.push(lineEntry);
            });

            console.log("FINAL PAYLOAD:", payload);

            $.ajax({
                url: "/odata/v4/site-management/siteMaster",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(payload),
                success: () => { MessageToast.show("Site Master saved successfully!");
                    // this._initModel();
                 },
                error: xhr => MessageToast.show("Error: " + (xhr.responseJSON?.error?.message || "Unknown Error"))
            });
        },


        // ========================= RESET ============================
        onReset: function () {
            MessageBox.confirm("Reset all fields?", {
                onClose: a => {
                    if (a === "OK") {
                        this._initModel();
                        this._initCampaignNo();
                        this.byId("linesContainer").destroyItems();
                        MessageToast.show("Reset Completed");
                    }
                }
            });
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
