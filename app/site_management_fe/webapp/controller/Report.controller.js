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
           FIND BUTTON FOR DAILY PRODUCTION
        ========================= */
        onFindPressDailyProduction: function () {
            var sSiteId = this.byId("siteId").getValue();
            var sFromDate = this.byId("fromDate").getDateValue();
            var sToDate = this.byId("toDate").getDateValue();
            console.log("received search params", sFromDate, "---", sToDate);

            if (!sSiteId || !sFromDate || !sToDate) {
                sap.m.MessageToast.show("Please fill all required fields!");
                return;
            }

            // Format dates as yyyy-MM-dd
            // var fnFormatDate = function (d) {
            //     return d.toISOString().split("T")[0];
            // };
            var fnFormatDate = function (d) {
                // IST = UTC + 5 hours 30 minutes
                var istOffset = 5.5 * 60 * 60 * 1000;
                var istDate = new Date(d.getTime() + istOffset);

                return istDate.toISOString().split("T")[0];
            };


            // Bind context to OData V4 function import
            var oContext = oODataModel.bindContext(
                `/getDailyProductionPivot(site_id='${sSiteId}',fromDate='${fnFormatDate(sFromDate)}',toDate='${fnFormatDate(sToDate)}')`
            );

            // Call the API
            oContext.requestObject().then(function (oResponse) {
                // Extract the actual array from 'value'
                var aReportData = oResponse.value || [];
                console.log("API Pivot Data", aReportData);

                if (aReportData.length === 0) {
                    sap.m.MessageToast.show("No data found for selected filters");
                }

                // Create JSONModel
                const oModel = new sap.ui.model.json.JSONModel({ reportData: aReportData });
                this.getView().setModel(oModel);

                // Clear container
                const oContainer = this.byId("tableContainer");
                oContainer.removeAllItems();

                /* =========================
                   DATA-DRIVEN TABLE
                ========================= */
                const oTable = new sap.ui.table.Table({
                    rows: "{/reportData}",
                    visibleRowCount: 8,
                    selectionMode: "None",
                    width: "100%",
                    class: "sapUiLargeMarginTop"
                });

                // Dynamically create columns from keys
                if (aReportData.length > 0) {
                    const aKeys = Object.keys(aReportData[0]);
                    aKeys.forEach(function (sKey) {
                        // Generate column label: remove special chars, underscores, split camelCase, uppercase
                        const sLabel = sKey
                            .replace(/_/g, " ")                   // underscores → space
                            .replace(/([a-z])([A-Z])/g, "$1 $2") // split camelCase
                            .replace(/[^a-zA-Z0-9 ]/g, "")       // remove special characters
                            .toUpperCase();                       // all uppercase

                        oTable.addColumn(new sap.ui.table.Column({
                            label: new sap.m.Label({ text: sLabel }),
                            template: new sap.m.Text({ text: `{${sKey}}` })
                        }));
                    });
                }

                oContainer.addItem(oTable);

                // Add action buttons
                const oButtonBox = new sap.m.HBox({
                    class: "sapUiSmallMarginTop",
                    alignItems: "Center",
                    items: [
                        new sap.m.Button({
                            text: "View",
                            type: "Emphasized",
                            icon: "sap-icon://area-chart",
                            press: this.onViewChart.bind(this)
                        }),
                        new sap.m.ToolbarSpacer({ width: "1rem" }),
                        new sap.m.Button({
                            text: "Export",
                            type: "Success",
                            icon: "sap-icon://excel-attachment",
                            press: this.onExportExcel.bind(this)
                        })
                    ]
                });
                oContainer.addItem(oButtonBox);

            }.bind(this)).catch(function (err) {
                console.error(err);
                sap.m.MessageToast.show("Error fetching data from API");
            });
        }


        ,
        onViewChart: function () {

            const oModel = this.getView().getModel();
            const aReportData = oModel.getProperty("/reportData");

            if (!aReportData || !aReportData.length) {
                console.warn("No report data available");
                return;
            }

            /* =========================
               1. DETECT KEYS (DATA-DRIVEN, CASE-INSENSITIVE)
            ========================= */
            const aKeys = Object.keys(aReportData[0]);

            // Case-insensitive filtering
            const aProdKeys = aKeys.filter(k => k.toLowerCase().endsWith("prod") && k.toLowerCase() !== "totalprod");
            const aErosionKeys = aKeys.filter(k => k.toLowerCase().endsWith("erosion"));

            console.log("All keys in dataset:", aKeys);
            console.log("Production keys (aProdKeys):", aProdKeys);
            console.log("Erosion keys (aErosionKeys):", aErosionKeys);

            if (!aProdKeys.length && !aErosionKeys.length) {
                console.warn("No production or erosion keys found. Chart cannot be rendered.");
                return;
            }

            /* =========================
               2. LABEL FUNCTION (UPPERCASE, NO UNDERSCORE)
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
                    value: "{date}"
                }],
                measures: aProdKeys.map(k => ({
                    name: fnLabel(k),
                    value: `{${k}}`
                })),
                data: {
                    path: "/reportData"
                }
            });

            /* =========================
               4. EROSION DATASET
            ========================= */
            const oErosionDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Date",
                    value: "{date}"
                }],
                measures: aErosionKeys.map(k => ({
                    name: fnLabel(k),
                    value: `{${k}}`
                })),
                data: {
                    path: "/reportData"
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

                oProdChart.setModel(oModel);

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
                    title: {
                        text: "Production Trend"
                    },
                    plotArea: {
                        dataLabel: {
                            visible: true
                        }
                    },
                    valueAxis: {
                        title: {
                            visible: true,
                            text: "Production"  // <-- Set Y-axis label here
                        }
                    },
                    legend: {
                        visible: true
                    }
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

                oErosionChart.setModel(oModel);

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
                    title: {
                        text: "Erosion Trend"
                    },
                    plotArea: {
                        dataLabel: {
                            visible: true
                        }
                    },
                    valueAxis: {
                        title: {
                            visible: true,
                            text: "Erosion"  // <-- Set Y-axis label here
                        }
                    },
                    legend: {
                        visible: true
                    }
                });
            }

            /* =========================
               7. COMBINE CHARTS
            ========================= */
            const items = [];
            if (oProdChart) items.push(oProdChart);
            if (oErosionChart) items.push(oErosionChart);

            if (!items.length) {
                console.warn("No charts to display.");
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


        , onExportExcel: function () {
            // 1. Get site ID
            var sSiteId = this.byId("siteId").getValue();

            // 2. Get report data
            const aData = this.getView().getModel().getProperty("/reportData");
            if (!aData || !aData.length) return;

            /* =========================
               3. BUILD COLUMNS DYNAMICALLY
            ========================= */
            const aKeys = Object.keys(aData[0]);

            const aColumns = aKeys.map(sKey => ({
                label: sKey
                    .replace(/_/g, " ")                  // underscores → space
                    .replace(/([a-z])([A-Z])/g, "$1 $2") // split camelCase
                    .replace(/[^a-zA-Z0-9 ]/g, "")       // remove special chars
                    .toUpperCase(),                       // uppercase
                property: sKey,
                type: exportLibrary.EdmType.Number
            }));

            /* =========================
               4. BUILD FILE NAME WITH DATE & TIME
            ========================= */
            const oNow = new Date();

            // Month abbreviations
            const aMonths = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

            // Format date as "08JAN2026"
            const sDate = ("0" + oNow.getDate()).slice(-2) + aMonths[oNow.getMonth()] + oNow.getFullYear();

            // Format time as "h:mm AM/PM"
            let iHour = oNow.getHours();
            const sAMPM = iHour >= 12 ? "PM" : "AM";
            iHour = iHour % 12;
            if (iHour === 0) iHour = 12; // 12 AM or 12 PM
            const sTime = iHour + ":" + ("0" + oNow.getMinutes()).slice(-2) + " " + sAMPM;

            // Combine site ID, date, and time
            const sFileName = `Production_Report_${sSiteId}_${sDate}_${sTime}.xlsx`;

            /* =========================
               5. SPREADSHEET SETTINGS
            ========================= */
            const oSettings = {
                workbook: { columns: aColumns },
                dataSource: aData,
                fileName: sFileName
            };

            /* =========================
               6. CREATE & DOWNLOAD
            ========================= */
            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(() => oSheet.destroy());
        }


    });
});