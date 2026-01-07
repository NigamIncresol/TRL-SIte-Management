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

        /* =========================
           FIND BUTTON
        ========================= */
        onFindPress: function () {
            var sSiteId = this.byId("siteId").getValue();
            var sFromDate = this.byId("fromDate").getDateValue();
            var sToDate = this.byId("toDate").getDateValue();

            if (!sSiteId || !sFromDate || !sToDate) {
                sap.m.MessageToast.show("Please fill all required fields!");
                return;
            }

            // Format dates as yyyy-MM-dd
            var fnFormatDate = function (d) {
                return d.toISOString().split("T")[0];
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
                            press: this.onViewChart.bind(this)
                        }),
                        new sap.m.ToolbarSpacer({ width: "1rem" }),
                        new sap.m.Button({
                            text: "Export",
                            type: "Success",
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
            const aData = this.getView().getModel().getProperty("/reportData");
            if (!aData || !aData.length) return;

            /* =========================
               1. BUILD COLUMNS DYNAMICALLY
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
               2. BUILD TIMESTAMPED FILE NAME
            ========================= */
            const oNow = new Date();
            const sTimestamp =
                oNow.getFullYear() +
                ("0" + (oNow.getMonth() + 1)).slice(-2) +
                ("0" + oNow.getDate()).slice(-2) + "_" +
                ("0" + oNow.getHours()).slice(-2) +
                ("0" + oNow.getMinutes()).slice(-2) +
                ("0" + oNow.getSeconds()).slice(-2);

            const sFileName = `Production_Report_${sTimestamp}.xlsx`;

            /* =========================
               3. SPREADSHEET SETTINGS
            ========================= */
            const oSettings = {
                workbook: { columns: aColumns },
                dataSource: aData,
                fileName: sFileName
            };

            /* =========================
               4. CREATE & DOWNLOAD
            ========================= */
            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(() => oSheet.destroy());
        }

    });
});