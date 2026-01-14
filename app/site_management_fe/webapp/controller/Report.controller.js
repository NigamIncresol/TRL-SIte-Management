sap.ui.define([
    // MVC & Model
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/UIComponent",

    // Table (ALV style – fixed header)
    "sap/ui/table/Table",
    "sap/ui/table/Column",

    // Basic Controls
    "sap/m/Text",
    "sap/m/Label",
    "sap/m/Button",
    "sap/m/Dialog",

    // Chart (VizFrame)
    "sap/viz/ui5/controls/VizFrame",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library"

], function (
    Controller,
    JSONModel,
    UIComponent,
    UiTable,
    UiColumn,
    Text,
    Label,
    Button,
    Dialog,
    VizFrame,
    FlattenedDataset,
    FeedItem, Spreadsheet,
    exportLibrary
) {
    "use strict";
    let oODataModel;
    return Controller.extend("com.trl.sitemanagementfe.controller.Report", {

        /* =========================
           INIT
        ========================= */
        onInit: function () {
            oODataModel = this.getOwnerComponent().getModel();
            this.getView().setModel(new JSONModel({}));
        },

        /* =========================
           NAV BACK
        ========================= */
        onNavToHome: function () {
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Home");
        },
        onSiteIdValueHelp: function () {
            const oView = this.getView();

            // Create dialog only once
            if (!this._oSiteVHDialog) {
                this._oSiteVHDialog = new sap.m.SelectDialog({
                    title: "Select Site ID",

                    liveChange: this._onSiteSearch.bind(this),

                    confirm: this._onSiteSelect.bind(this),

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

            // Bind SiteMaster from backend
            const oListBinding = this.getOwnerComponent()
                .getModel()
                .bindList("/siteMaster");

            oListBinding.requestContexts()
                .then(aContexts => {
                    const aSites = aContexts.map(oCtx => oCtx.getObject());

                    const oVHModel = new sap.ui.model.json.JSONModel({
                        sites: aSites
                    });

                    this._oSiteVHDialog.setModel(oVHModel);
                    this._oSiteVHDialog.open();
                })
                .catch(err => {
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

            this.byId("siteId").setValue(oItem.getTitle());
            this._oSiteVHDialog.close();
        },

        onSiteIdLiveChange: function (oEvent) {
            oEvent.getSource().setValue("");
            sap.m.MessageToast.show("Please select Site ID using value help");
        }
        ,

        /* =========================
         Prodution Value Help
        ========================= */
        onProdLineLiveChange: function (oEvent) {
            const oInput = oEvent.getSource();

            // Clear typed value
            oInput.setValue("");

            // Inform user
            MessageToast.show("Please select Line name using the value help", {
                duration: 2000
            });
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
        }
        ,
        onCampaignValueHelp: function () {
            const oView = this.getView();

            const sSiteId = this.byId("siteId").getValue();
            const sRunner = this.byId("ProductionLineId1").getValue();

            if (!sSiteId || !sRunner) {
                sap.m.MessageToast.show("Please select Site ID and Runner first");
                return;
            }

            // Create dialog only once
            if (!this._oCampaignVHDialog) {
                this._oCampaignVHDialog = new sap.m.SelectDialog({
                    title: "Select Campaign Number",

                    liveChange: this._onCampaignSearch.bind(this),

                    confirm: this._onCampaignSelect.bind(this),

                    cancel: () => {
                        this._oCampaignVHDialog.close();
                    },

                    items: {
                        path: "/campaigns",
                        template: new sap.m.StandardListItem({
                            title: "{campaign}"
                        })
                    }
                });

                oView.addDependent(this._oCampaignVHDialog);
            }

            // Bind function import (OData V4)
            // NOTE: Path format depends on how CAP exposes your function.
            // This is the common CAP V4 format:
            const sFuncPath =
                "/getCampaignsBySite(site_id='" + encodeURIComponent(sSiteId) +
                "',productionLineName='" + encodeURIComponent(sRunner) + "')";

            const oListBinding = this.getOwnerComponent()
                .getModel()
                .bindList(sFuncPath);

            oListBinding.requestContexts()
                .then(aContexts => {
                    const aCampaigns = aContexts.map(oCtx => oCtx.getObject());

                    const oVHModel = new sap.ui.model.json.JSONModel({
                        campaigns: aCampaigns
                    });

                    this._oCampaignVHDialog.setModel(oVHModel);
                    this._oCampaignVHDialog.open();
                })
                .catch(err => {
                    sap.m.MessageToast.show("Failed to load Campaign Numbers");
                    console.error(err);
                });
        },

        _onCampaignSearch: function (oEvent) {
            const sValue = oEvent.getParameter("value");

            const oFilter = new sap.ui.model.Filter(
                "campaign",
                sap.ui.model.FilterOperator.Contains,
                sValue
            );

            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        _onCampaignSelect: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) return;

            this.byId("CampaignNoId1").setValue(oItem.getTitle());
            this._oCampaignVHDialog.close();
        },

        onCampaignLiveChange: function (oEvent) {
            oEvent.getSource().setValue("");
            sap.m.MessageToast.show("Please select Campaign Number using value help");
        }
        ,

        /* =========================
           FIND BUTTON FOR DAILY PRODUCTION
        ========================= */
        onFindPressDailyProduction: function () {
            console.log("=== onFindPressDailyProduction START ===");

            const oODataModel = this.getOwnerComponent().getModel();

            const sSiteId = this.byId("siteId").getValue();
            const dFromDate = this.byId("fromDate").getDateValue();
            const dToDate = this.byId("toDate").getDateValue();

            console.log("Site ID:", sSiteId);
            console.log("From Date (raw):", dFromDate);
            console.log("To Date (raw):", dToDate);

            if (!sSiteId || !dFromDate || !dToDate) {
                console.warn("Validation failed – missing required fields");
                sap.m.MessageToast.show("Please fill all required fields!");
                return;
            }

            // IST date formatter
            const fnFormatDate = function (d) {
                const istOffset = 5.5 * 60 * 60 * 1000;
                return new Date(d.getTime() + istOffset).toISOString().split("T")[0];
            };

            const sFormattedFromDate = fnFormatDate(dFromDate);
            const sFormattedToDate = fnFormatDate(dToDate);

            console.log("Formatted From Date:", sFormattedFromDate);
            console.log("Formatted To Date:", sFormattedToDate);

            const sFunctionPath =
                `/getDailyProductionPivot(` +
                `site_id='${encodeURIComponent(sSiteId)}',` +
                `fromDate='${encodeURIComponent(sFormattedFromDate)}',` +
                `toDate='${encodeURIComponent(sFormattedToDate)}'` +
                `)`;

            console.log("OData Function Import Path:", sFunctionPath);

            const oContext = oODataModel.bindContext(sFunctionPath);

            oContext.requestObject()
                .then(function (oResponse) {
                    console.log("API Raw Response:", oResponse);
                    sap.m.MessageToast.show("Daily Production Data Loaded.");

                    const aReportData = oResponse.value || [];
                    console.log("Extracted Pivot Data:", aReportData);

                    if (!aReportData.length) {
                        sap.m.MessageToast.show("No data found for selected filters");

                    }

                    // ✅ reuse named model
                    let oDailyProductionModel = this.getView().getModel("dailyProductionModel");
                    if (!oDailyProductionModel) {
                        oDailyProductionModel = new sap.ui.model.json.JSONModel({ reportData: [] });
                        this.getView().setModel(oDailyProductionModel, "dailyProductionModel");
                    }

                    // ✅ update data + refresh
                    oDailyProductionModel.setProperty("/reportData", aReportData);
                    oDailyProductionModel.refresh(true);

                    const oContainer = this.byId("tableContainer");

                    // ✅ create table ONLY ONCE
                    let oTable = this.byId("dailyProductionTable");
                    if (!oTable) {
                        oTable = new sap.ui.table.Table(this.createId("dailyProductionTable"), {
                            rows: "{dailyProductionModel>/reportData}",
                            visibleRowCount: 10,
                            selectionMode: "None",
                            width: "100%",
                            enableColumnResize: false,      // ✅ no column resizing
                            enableColumnReordering: true    // optional
                        });

                        oTable.addStyleClass("sapUiLargeMarginTop");

                        const aKeys = Object.keys(aReportData[0]);
                        console.log("Dynamic Column Keys:", aKeys);

                        aKeys.forEach(function (sKey) {
                            const sLabel = sKey
                                .replace(/_/g, " ")
                                .replace(/([a-z])([A-Z])/g, "$1 $2")
                                .replace(/[^a-zA-Z0-9 ]/g, "")
                                .toUpperCase();

                            oTable.addColumn(new sap.ui.table.Column({
                                label: new sap.m.Label({ text: sLabel }),
                                template: new sap.m.Text({ text: `{dailyProductionModel>${sKey}}` }),
                                resizable: false // ✅ per-column safety
                            }));
                        });

                        oContainer.addItem(oTable);
                    }

                    // ✅ create button box ONLY ONCE
                    let oBtnBox = this.byId("dailyProductionBtnBox");
                    if (!oBtnBox) {
                        oBtnBox = new sap.m.HBox(this.createId("dailyProductionBtnBox"), {
                            alignItems: "Center"
                        });
                        oBtnBox.addStyleClass("sapUiSmallMarginTop");

                        oBtnBox.addItem(new sap.m.Button(this.createId("viewDailyProduction"), {
                            text: "View production",
                            type: "Emphasized",
                            icon: "sap-icon://area-chart",
                            press: this.onViewDailyProductionChart.bind(this)
                        }));

                        oBtnBox.addItem(new sap.m.ToolbarSpacer({ width: "1rem" }));

                        oBtnBox.addItem(new sap.m.Button(this.createId("exportDailyProduction"), {
                            text: "Export production",
                            type: "Success",
                            icon: "sap-icon://excel-attachment",
                            press: this.onExportExcel.bind(this, "PRODUCTION")
                        }));

                        oContainer.addItem(oBtnBox);
                    }

                    console.log("=== onFindPressDailyProduction SUCCESS ===");

                }.bind(this))
                .catch(function (err) {
                    console.error("API Error:", err);
                    sap.m.MessageToast.show("Error fetching data from API");
                });
        }



        ,
        onViewDailyProductionChart: function () {

            // ✅ Use named production model
            const oModel = this.getView().getModel("dailyProductionModel");
            if (!oModel) {
                console.warn("dailyProductionModel not found");
                return;
            }

            const aReportData = oModel.getProperty("/reportData");

            if (!aReportData || !aReportData.length) {
                console.warn("No report data available");
                return;
            }

            /* =========================
               1. DETECT KEYS (DATA-DRIVEN, CASE-INSENSITIVE)
            ========================= */
            const aKeys = Object.keys(aReportData[0]);

            const aProdKeys = aKeys.filter(
                k => k.toLowerCase().endsWith("prod") && k.toLowerCase() !== "totalprod"
            );
            const aErosionKeys = aKeys.filter(
                k => k.toLowerCase().endsWith("erosion")
            );

            console.log("All keys:", aKeys);
            console.log("Production keys:", aProdKeys);
            console.log("Erosion keys:", aErosionKeys);

            if (!aProdKeys.length && !aErosionKeys.length) {
                console.warn("No production or erosion keys found");
                return;
            }

            /* =========================
               2. LABEL FUNCTION
            ========================= */
            const fnLabel = function (sKey) {
                return sKey.replace(/_/g, " ").toUpperCase();
            };

            /* =========================
               3. PRODUCTION DATASET
            ========================= */
            const oProdDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Date",
                    value: "{dailyProductionModel>date}"
                }],
                measures: aProdKeys.map(k => ({
                    name: fnLabel(k),
                    value: `{dailyProductionModel>${k}}`
                })),
                data: {
                    path: "dailyProductionModel>/reportData"
                }
            });

            /* =========================
               4. EROSION DATASET
            ========================= */
            const oErosionDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Date",
                    value: "{dailyProductionModel>date}"
                }],
                measures: aErosionKeys.map(k => ({
                    name: fnLabel(k),
                    value: `{dailyProductionModel>${k}}`
                })),
                data: {
                    path: "dailyProductionModel>/reportData"
                }
            });

            /* =========================
               5. PRODUCTION CHART
            ========================= */
            let oProdChart = null;
            if (aProdKeys.length) {
                oProdChart = new VizFrame({
                    vizType: "line",
                    width: "100%",
                    height: "250px",
                    dataset: oProdDataset
                });

                oProdChart.setModel(oModel, "dailyProductionModel");

                oProdChart.addFeed(new FeedItem({
                    uid: "categoryAxis",
                    type: "Dimension",
                    values: ["Date"]
                }));

                oProdChart.addFeed(new FeedItem({
                    uid: "valueAxis",
                    type: "Measure",
                    values: aProdKeys.map(fnLabel)
                }));

                oProdChart.setVizProperties({
                    title: { text: "Production Trend" },
                    plotArea: { dataLabel: { visible: true } },
                    valueAxis: {
                        title: { visible: true, text: "Production" }
                    },
                    legend: { visible: true }
                });
            }

            /* =========================
               6. EROSION CHART
            ========================= */
            let oErosionChart = null;
            if (aErosionKeys.length) {
                oErosionChart = new VizFrame({
                    vizType: "line",
                    width: "100%",
                    height: "250px",
                    dataset: oErosionDataset
                });

                oErosionChart.setModel(oModel, "dailyProductionModel");

                oErosionChart.addFeed(new FeedItem({
                    uid: "categoryAxis",
                    type: "Dimension",
                    values: ["Date"]
                }));

                oErosionChart.addFeed(new FeedItem({
                    uid: "valueAxis",
                    type: "Measure",
                    values: aErosionKeys.map(fnLabel)
                }));

                oErosionChart.setVizProperties({
                    title: { text: "Erosion Trend" },
                    plotArea: { dataLabel: { visible: true } },
                    valueAxis: {
                        title: { visible: true, text: "Erosion" }
                    },
                    legend: { visible: true }
                });
            }

            /* =========================
               7. COMBINE CHARTS
            ========================= */
            const items = [];
            if (oProdChart) items.push(oProdChart);
            if (oErosionChart) items.push(oErosionChart);

            if (!items.length) {
                console.warn("No charts to display");
                return;
            }

            const oChartsBox = new sap.m.VBox({ items });

            /* =========================
               8. SHOW IN DIALOG
            ========================= */
            const oDialog = new Dialog({
                title: "Production & Erosion Trends",
                contentWidth: "80%",
                contentHeight: "620px",
                resizable: true,
                draggable: true,
                content: [oChartsBox],
                endButton: new Button({
                    text: "Close",
                    type: "Negative",
                    press: function () {
                        oDialog.close();
                        oDialog.destroy();
                    }
                })
            });

            oDialog.open();
        }





        , onFindPressDailyTemperature: function () {
            console.log("=== onFindPressDailyTemperature START ===");

            const oODataModel = this.getOwnerComponent().getModel();

            const sSiteId = this.byId("siteId").getValue();
            const sProductionLine = this.byId("ProductionLineId1").getValue();
            const dFromDate = this.byId("fromDate").getDateValue();
            const dToDate = this.byId("toDate").getDateValue();

            if (!sSiteId || !sProductionLine || !dFromDate || !dToDate) {
                sap.m.MessageToast.show("Please fill all required fields!");
                return;
            }

            // IST date formatter
            const fnFormatDate = function (d) {
                const istOffset = 5.5 * 60 * 60 * 1000;
                return new Date(d.getTime() + istOffset).toISOString().split("T")[0];
            };

            const sFromDate = fnFormatDate(dFromDate);
            const sToDate = fnFormatDate(dToDate);

            const sFunctionPath =
                `/getDailyShiftSensorPivot(` +
                `site_id='${encodeURIComponent(sSiteId)}',` +
                `productionLineName='${encodeURIComponent(sProductionLine)}',` +
                `fromDate='${encodeURIComponent(sFromDate)}',` +
                `toDate='${encodeURIComponent(sToDate)}'` +
                `)`;

            const oContext = oODataModel.bindContext(sFunctionPath);

            oContext.requestObject()
                .then(function (oResponse) {
                    const aData = oResponse.value || [];
                     sap.m.MessageToast.show("Temperature Data Loaded!");

                    if (!aData.length) {
                        sap.m.MessageToast.show("No data found");
                    }

                    // ✅ reuse same named model
                    let oDailyTemperatureModel = this.getView().getModel("dailyTemperatureModel");
                    if (!oDailyTemperatureModel) {
                        oDailyTemperatureModel = new sap.ui.model.json.JSONModel({ temperatureData: [] });
                        this.getView().setModel(oDailyTemperatureModel, "dailyTemperatureModel");
                    }

                    // ✅ update data + refresh
                    oDailyTemperatureModel.setProperty("/temperatureData", aData);
                    oDailyTemperatureModel.refresh(true);

                    const oContainer = this.byId("temperatureTableContainer");

                    // ✅ create table ONLY ONCE
                    let oTable = this.byId("dailyTemperatureTable");
                    if (!oTable) {
                        oTable = new sap.ui.table.Table(this.createId("dailyTemperatureTable"), {
                            rows: "{dailyTemperatureModel>/temperatureData}",
                            visibleRowCount: 10,
                            selectionMode: "None",
                            width: "100%",
                            enableColumnResize: false,      // ✅ no column resize
                            enableColumnReordering: true    // optional (keep/remove as you want)
                        });

                        oTable.addStyleClass("sapUiLargeMarginTop");

                        // ✅ create columns once
                        Object.keys(aData[0]).forEach(function (sKey) {
                            oTable.addColumn(new sap.ui.table.Column({
                                label: new sap.m.Label({ text: sKey.replace(/_/g, " ").toUpperCase() }),
                                template: new sap.m.Text({ text: `{dailyTemperatureModel>${sKey}}` }),
                                resizable: false              // ✅ extra safety per column
                            }));
                        });

                        oContainer.addItem(oTable);
                    }

                    // ✅ create buttons ONLY ONCE
                    let oBtnBox = this.byId("dailyTemperatureBtnBox");
                    if (!oBtnBox) {
                        oBtnBox = new sap.m.HBox(this.createId("dailyTemperatureBtnBox"), {
                            alignItems: "Center"
                        });
                        oBtnBox.addStyleClass("sapUiSmallMarginTop");

                        oBtnBox.addItem(new sap.m.Button(this.createId("viewDailyTemperature"), {
                            text: "View Temperature",
                            type: "Emphasized",
                            icon: "sap-icon://area-chart",
                            press: this.onViewDailyTemperatureChart.bind(this, "TEMPERATURE")
                        }));

                        oBtnBox.addItem(new sap.m.ToolbarSpacer({ width: "1rem" }));

                        oBtnBox.addItem(new sap.m.Button(this.createId("exportDailyTemperature"), {
                            text: "Export Temperature",
                            type: "Success",
                            icon: "sap-icon://excel-attachment",
                            press: this.onExportExcel.bind(this, "TEMPERATURE")
                        }));

                        oContainer.addItem(oBtnBox);
                    }

                    console.log("=== onFindPressDailyTemperature SUCCESS ===");

                }.bind(this))
                .catch(function (err) {
                    console.error("Temperature API Error:", err);
                    sap.m.MessageToast.show("Error fetching temperature data");
                });
        }
        , onExportExcel: function (sReportType, oEvent) {

            // ✅ Use site id safely for file name
            var sSiteId = this.byId("siteId")?.getValue() || "SITE";
            let aData = null;

            /* =========================
               1. PICK DATA BASED ON REPORT TYPE OR BUTTON ID
            ========================= */

            // ---- A) Based on report type (your existing way)
            if (sReportType === "PRODUCTION") {
                const oProdModel = this.getView().getModel("dailyProductionModel");
                aData = oProdModel?.getProperty("/reportData");

            } else if (sReportType === "TEMPERATURE") {
                const oTempModel = this.getView().getModel("dailyTemperatureModel");
                aData = oTempModel?.getProperty("/temperatureData");

            } else if (sReportType === "LIFE_AFTER_MAJOR_MINOR") {
                const oLifeModel = this.getView().getModel("lifeAfterMajorMinorModel");
                aData = oLifeModel?.getProperty("/reportData");
            }
            else if (sReportType === "CAMPAIGNWISE_PRODUCTION") {
                const oCampModel = this.getView().getModel("campaignwiseProductionModel");
                aData = oCampModel?.getProperty("/reportData");   // keep same path style
                // If your model stores in different path, change here (ex: "/data")
            }
            // ---- B) If report type not passed, pick based on button id (no default creation)
            // (Useful if you call: press: this.onExportExcel.bind(this) )
            if ((!aData || !aData.length) && oEvent) {
                const sBtnId = oEvent.getSource()?.getId() || "";

                if (sBtnId.includes("exportProduction")) {
                    const oProdModel = this.getView().getModel("dailyProductionModel");
                    aData = oProdModel?.getProperty("/reportData");

                } else if (sBtnId.includes("exportTemperature")) {
                    const oTempModel = this.getView().getModel("dailyTemperatureModel");
                    aData = oTempModel?.getProperty("/temperatureData");

                } else if (sBtnId.includes("exportLifeAfterMajorMinor")) {
                    const oLifeModel = this.getView().getModel("lifeAfterMajorMinorModel");
                    aData = oLifeModel?.getProperty("/reportData");
                }
            }

            if (!aData || !aData.length) {
                sap.m.MessageToast.show("No data available to export");
                return;
            }

            /* =========================
               2. BUILD COLUMNS DYNAMICALLY
            ========================= */
            const aKeys = Object.keys(aData[0]);

            const aColumns = aKeys.map(sKey => ({
                label: sKey
                    .replace(/_/g, " ")
                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                    .replace(/[^a-zA-Z0-9 ]/g, "")
                    .toUpperCase(),
                property: sKey,
                type: exportLibrary.EdmType.String
            }));

            /* =========================
               3. FILE NAME
            ========================= */
            const oNow = new Date();
            const aMonths = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

            const sDate =
                ("0" + oNow.getDate()).slice(-2) +
                aMonths[oNow.getMonth()] +
                oNow.getFullYear();

            let iHour = oNow.getHours();
            const sAMPM = iHour >= 12 ? "PM" : "AM";
            iHour = iHour % 12 || 12;

            const sTime =
                iHour + "-" +                      // ✅ avoid ":" in filename (windows safe)
                ("0" + oNow.getMinutes()).slice(-2) +
                sAMPM;

            const sFileName = `${sReportType || "REPORT"}_REPORT_${sSiteId}_${sDate}_${sTime}.xlsx`;

            /* =========================
               4. EXPORT
            ========================= */
            const oSheet = new Spreadsheet({
                workbook: { columns: aColumns },
                dataSource: aData,
                fileName: sFileName
            });

            oSheet.build().finally(() => oSheet.destroy());
        }





        , onViewDailyTemperatureChart: function () {

            /* =========================
               1. GET MODEL & DATA
            ========================= */
            const oModel = this.getView().getModel("dailyTemperatureModel");
            if (!oModel) {
                console.warn("dailyTemperatureModel not found");
                return;
            }

            const aData = oModel.getProperty("/temperatureData");
            if (!aData || !aData.length) {
                console.warn("No temperature data available");
                return;
            }

            /* =========================
               2. DETECT SENSOR KEYS
            ========================= */
            const aKeys = Object.keys(aData[0]);
            const aSensorKeys = aKeys.filter(k =>
                k !== "date" &&
                k !== "shift_code"
            );

            if (!aSensorKeys.length) {
                console.warn("No sensor keys found");
                return;
            }

            /* =========================
               3. LABEL FORMATTER
            ========================= */
            const fnLabel = function (sKey) {
                return sKey.replace(/_/g, " ").toUpperCase();
            };

            /* =====================================================
               CHART 1: DAILY-SHIFT WISE TEMPERATURE TREND
            ===================================================== */

            const aPreparedShiftData = aData.map(o => ({
                ...o,
                xAxisLabel: o.date + " - " + o.shift_code
            }));

            oModel.setProperty("/_shiftWiseChartData", aPreparedShiftData);

            const oShiftDataset = new sap.viz.ui5.data.FlattenedDataset({
                dimensions: [{
                    name: "Date / Shift",
                    value: "{dailyTemperatureModel>xAxisLabel}"
                }],
                measures: aSensorKeys.map(k => ({
                    name: fnLabel(k),
                    value: `{dailyTemperatureModel>${k}}`
                })),
                data: {
                    path: "dailyTemperatureModel>/_shiftWiseChartData"
                }
            });

            const oShiftChart = new sap.viz.ui5.controls.VizFrame({
                vizType: "line",
                width: "100%",
                height: "350px",
                dataset: oShiftDataset
            });

            oShiftChart.setModel(oModel, "dailyTemperatureModel");

            oShiftChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                uid: "categoryAxis",
                type: "Dimension",
                values: ["Date / Shift"]
            }));

            oShiftChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: aSensorKeys.map(fnLabel)
            }));

            oShiftChart.setVizProperties({
                title: { text: "Daily-Shift Wise Temperature Trend" },
                plotArea: { dataLabel: { visible: false } },
                valueAxis: {
                    title: { visible: true, text: "Temperature" }
                },
                legend: { visible: true }
            });

            /* =====================================================
               CHART 2: DATE-WISE HIGHEST TEMPERATURE (ALL SENSORS)
            ===================================================== */

            const oMaxByDate = {};

            aData.forEach(o => {
                const sDate = o.date;

                if (!oMaxByDate[sDate]) {
                    oMaxByDate[sDate] = { date: sDate };
                }

                aSensorKeys.forEach(sKey => {
                    const fVal = Number(o[sKey]);

                    if (
                        oMaxByDate[sDate][sKey] === undefined ||
                        fVal > oMaxByDate[sDate][sKey]
                    ) {
                        oMaxByDate[sDate][sKey] = fVal;
                    }
                });
            });

            const aDateWiseMaxData = Object.values(oMaxByDate);
            oModel.setProperty("/_dateWiseMaxChartData", aDateWiseMaxData);

            const oMaxDataset = new sap.viz.ui5.data.FlattenedDataset({
                dimensions: [{
                    name: "Date",
                    value: "{dailyTemperatureModel>date}"
                }],
                measures: aSensorKeys.map(k => ({
                    name: fnLabel(k),
                    value: `{dailyTemperatureModel>${k}}`
                })),
                data: {
                    path: "dailyTemperatureModel>/_dateWiseMaxChartData"
                }
            });

            const oMaxChart = new sap.viz.ui5.controls.VizFrame({
                vizType: "line",
                width: "100%",
                height: "350px",
                dataset: oMaxDataset
            });

            oMaxChart.setModel(oModel, "dailyTemperatureModel");

            oMaxChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                uid: "categoryAxis",
                type: "Dimension",
                values: ["Date"]
            }));

            oMaxChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: aSensorKeys.map(fnLabel)
            }));

            oMaxChart.setVizProperties({
                title: { text: "Date Wise Highest Temperature Trend (All Sensors)" },
                plotArea: { dataLabel: { visible: false } },
                valueAxis: {
                    title: { visible: true, text: "Temperature" }
                },
                legend: { visible: true }
            });

            /* =========================
               4. DIALOG
            ========================= */
            const oDialog = new sap.m.Dialog({
                title: "Temperature Sensor Trends",
                contentWidth: "90%",
                contentHeight: "800px",
                resizable: true,
                draggable: true,
                content: [
                    oShiftChart,
                    oMaxChart
                ],
                endButton: new sap.m.Button({
                    text: "Close",
                    press: function () {
                        oDialog.close();
                        oDialog.destroy();
                    }
                })
            });

            oDialog.open();
        }
        , onFindPressLifeAfterMajorMinor: function () {
            console.log("=== onFindPressLifeAfterMajorMinor START ===");

            const oODataModel = this.getOwnerComponent().getModel();

            const sSiteId = this.byId("siteId").getValue();
            const sRunner = this.byId("ProductionLineId1").getValue();
            const sCampaign = this.byId("CampaignNoId1").getValue();

            if (!sSiteId || !sRunner || !sCampaign) {
                sap.m.MessageToast.show("Please fill all required fields!");
                return;
            }

            const sFunctionPath =
                `/lifeAfterMajorMinorRepairProduction(` +
                `site_id='${encodeURIComponent(sSiteId)}',` +
                `productionLineName='${encodeURIComponent(sRunner)}',` +
                `curr_campaign='${encodeURIComponent(sCampaign)}'` +
                `)`;

            const oContext = oODataModel.bindContext(sFunctionPath);

            oContext.requestObject()
                .then(function (oResponse) {
                    const aReportData = oResponse.value || [];
                     sap.m.MessageToast.show("Life After major/Minor data loaded");

                    if (!aReportData.length) {
                        sap.m.MessageToast.show("No data found for selected filters");
                    
                    }

                    // ✅ reuse same named model
                    let oLifeModel = this.getView().getModel("lifeAfterMajorMinorModel");
                    if (!oLifeModel) {
                        oLifeModel = new sap.ui.model.json.JSONModel({ reportData: [] });
                        this.getView().setModel(oLifeModel, "lifeAfterMajorMinorModel");
                    }

                    // ✅ update data + refresh
                    oLifeModel.setProperty("/reportData", aReportData);
                    oLifeModel.refresh(true);

                    const oContainer = this.byId("lifeAfterMajorMinorContainer");

                    // ✅ create table ONLY ONCE
                    let oTable = this.byId("lifeAfterMajorMinorTable");
                    if (!oTable) {
                        oTable = new sap.ui.table.Table(this.createId("lifeAfterMajorMinorTable"), {
                            rows: "{lifeAfterMajorMinorModel>/reportData}",
                            visibleRowCount: 10,
                            selectionMode: "None",
                            width: "100%",
                            enableColumnReordering: true,
                            enableColumnResize: false
                        });

                        oTable.addStyleClass("sapUiLargeMarginTop");

                        // create columns once (based on first response)
                        Object.keys(aReportData[0]).forEach(function (sKey) {
                            const sLabel = sKey
                                .replace(/_/g, " ")
                                .replace(/([a-z])([A-Z])/g, "$1 $2")
                                .replace(/[^a-zA-Z0-9 ]/g, "")
                                .toUpperCase();

                            oTable.addColumn(new sap.ui.table.Column({
                                label: new sap.m.Label({ text: sLabel }),
                                template: new sap.m.Text({ text: `{lifeAfterMajorMinorModel>${sKey}}` }),
                                resizable: false
                            }));
                        });

                        oContainer.addItem(oTable);
                    }

                    // ✅ create Export button ONLY ONCE
                    let oExportBtn = this.byId("exportLifeAfterMajorMinor");
                    if (!oExportBtn) {
                        const oButtonBox = new sap.m.HBox({ alignItems: "Center" });
                        oButtonBox.addStyleClass("sapUiSmallMarginTop");

                        oExportBtn = new sap.m.Button(this.createId("exportLifeAfterMajorMinor"), {
                            text: "Export Data",
                            type: "Success",
                            icon: "sap-icon://excel-attachment",
                            press: this.onExportExcel.bind(this, "LIFE_AFTER_MAJOR_MINOR")
                        });

                        oButtonBox.addItem(oExportBtn);
                        oContainer.addItem(oButtonBox);
                    }

                }.bind(this))
                .catch(function (err) {
                    console.error("API Error:", err);
                    sap.m.MessageToast.show("Error fetching data from API");
                });
        }

        , onFindPressCampaignwiseProduction: function () {
            console.log("=== onFindPressCampaignwiseProduction START ===");

            const oODataModel = this.getOwnerComponent().getModel();

            const sSiteId = this.byId("siteId").getValue();
            const sRunner = this.byId("ProductionLineId1").getValue();
            const sCampaign = this.byId("CampaignNoId1").getValue();

            if (!sSiteId || !sRunner || !sCampaign) {
                sap.m.MessageToast.show("Please fill all required fields!");
                return;
            }

            const sFunctionPath =
                `/campaignwiseProduction(` +
                `site_id='${encodeURIComponent(sSiteId)}',` +
                `productionLineName='${encodeURIComponent(sRunner)}',` +
                `curr_campaign='${encodeURIComponent(sCampaign)}'` +
                `)`;

            const oContext = oODataModel.bindContext(sFunctionPath);

            oContext.requestObject()
                .then(function (oResponse) {
                    const aReportData = oResponse.value || [];
                     sap.m.MessageToast.show("Campain wise production data loaded");

                    if (!aReportData.length) {
                        sap.m.MessageToast.show("No data found for selected filters");
                        
                    }

                    // ✅ reuse same named model
                    let oCampModel = this.getView().getModel("campaignwiseProductionModel");
                    if (!oCampModel) {
                        oCampModel = new sap.ui.model.json.JSONModel({ reportData: [] });
                        this.getView().setModel(oCampModel, "campaignwiseProductionModel");
                    }

                    // ✅ update data + refresh (no UI recreation needed)
                    oCampModel.setProperty("/reportData", aReportData);
                    oCampModel.refresh(true);

                    const oContainer = this.byId("campaignwiseProductionContainer");

                    // ✅ create table ONLY ONCE
                    let oTable = this.byId("campaignwiseProductionTable");
                    if (!oTable) {
                        oTable = new sap.ui.table.Table(this.createId("campaignwiseProductionTable"), {
                            rows: "{campaignwiseProductionModel>/reportData}",
                            visibleRowCount: 10,
                            selectionMode: "None",
                            width: "100%",
                            enableColumnReordering: true,
                            enableColumnResize: false
                        });
                        oTable.addStyleClass("sapUiLargeMarginTop");

                        // create columns once (based on first response)
                        Object.keys(aReportData[0]).forEach(function (sKey) {
                            const sLabel = sKey
                                .replace(/_/g, " ")
                                .replace(/([a-z])([A-Z])/g, "$1 $2")
                                .replace(/[^a-zA-Z0-9 ]/g, "")
                                .toUpperCase();

                            oTable.addColumn(new sap.ui.table.Column({
                                label: new sap.m.Label({ text: sLabel }),
                                template: new sap.m.Text({ text: `{campaignwiseProductionModel>${sKey}}` }),
                                resizable: false
                            }));
                        });

                        oContainer.addItem(oTable);
                    }

                    // ✅ create Export button ONLY ONCE
                    let oExportBtn = this.byId("exportCampaignwiseProduction");
                    if (!oExportBtn) {
                        const oButtonBox = new sap.m.HBox({ alignItems: "Center" });
                        oButtonBox.addStyleClass("sapUiSmallMarginTop");

                        oExportBtn = new sap.m.Button(this.createId("exportCampaignwiseProduction"), {
                            text: "Export Data",
                            type: "Success",
                            icon: "sap-icon://excel-attachment",
                            press: this.onExportExcel.bind(this, "CAMPAIGNWISE_PRODUCTION")
                        });

                        oButtonBox.addItem(oExportBtn);
                        oContainer.addItem(oButtonBox);
                    }

                }.bind(this))
                .catch(function (err) {
                    console.error("API Error:", err);
                    sap.m.MessageToast.show("Error fetching data from API");
                });
        }



    });
});