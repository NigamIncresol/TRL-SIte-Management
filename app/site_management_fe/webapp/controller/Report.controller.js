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

    return Controller.extend("com.trl.sitemanagementfe.controller.Report", {

        /* =========================
           INIT
        ========================= */
        onInit: function () {
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

            /* ===== DATA (ONLY 3 PROD FIELDS) ===== */
            const aReportData = [
                { date: "2025-01-01", eastProd: 120, westProd: 95, southProd: 60, northProd: 70, eastErosion: 12, westErosion: 9, southErosion: 8, northErosion: 10, totalProd: 345 },
                { date: "2025-01-02", eastProd: 118, westProd: 92, southProd: 58, northProd: 68, eastErosion: 11, westErosion: 8, southErosion: 7, northErosion: 9, totalProd: 336 },
                { date: "2025-01-03", eastProd: 125, westProd: 100, southProd: 65, northProd: 75, eastErosion: 13, westErosion: 10, southErosion: 9, northErosion: 11, totalProd: 365 },
                { date: "2025-01-04", eastProd: 130, westProd: 105, southProd: 68, northProd: 78, eastErosion: 14, westErosion: 11, southErosion: 10, northErosion: 12, totalProd: 381 },
                { date: "2025-01-05", eastProd: 128, westProd: 0, southProd: 66, northProd: 76, eastErosion: 13, westErosion: 10, southErosion: 9, northErosion: 11, totalProd: 270 },
                { date: "2025-01-06", eastProd: 132, westProd: 108, southProd: 70, northProd: 80, eastErosion: 14, westErosion: 11, southErosion: 10, northErosion: 12, totalProd: 390 },
                { date: "2025-01-07", eastProd: 134, westProd: 110, southProd: 72, northProd: 82, eastErosion: 15, westErosion: 11, southErosion: 11, northErosion: 13, totalProd: 398 },
                { date: "2025-01-08", eastProd: 136, westProd: 112, southProd: 74, northProd: 84, eastErosion: 15, westErosion: 12, southErosion: 11, northErosion: 13, totalProd: 406 },
                { date: "2025-01-09", eastProd: 138, westProd: 114, southProd: 76, northProd: 86, eastErosion: 16, westErosion: 12, southErosion: 12, northErosion: 14, totalProd: 414 },
                { date: "2025-01-10", eastProd: 140, westProd: 116, southProd: 78, northProd: 88, eastErosion: 16, westErosion: 13, southErosion: 12, northErosion: 14, totalProd: 422 }
            ];




            const oModel = new JSONModel({ reportData: aReportData });
            this.getView().setModel(oModel);

            const oContainer = this.byId("tableContainer");
            oContainer.removeAllItems();

            /* =========================
               DATA-DRIVEN TABLE
               (Header fixed, rows scroll)
            ========================= */
            const oTable = new UiTable({
                rows: "{/reportData}",
                visibleRowCount: 8,
                selectionMode: "None",
                width: "100%",
                class: "sapUiLargeMarginTop"
            });

            /* =========================
               CREATE COLUMNS FROM DATA
            ========================= */
            const aKeys = Object.keys(aReportData[0]);

            aKeys.forEach(function (sKey) {
                oTable.addColumn(new UiColumn({
                    label: new Label({
                        text: sKey
                            .replace(/([A-Z])/g, " $1")   // eastProd → east Prod
                            .replace(/^./, c => c.toUpperCase())
                    }),
                    template: new Text({
                        text: `{${sKey}}`
                    })
                }));
            });

            oContainer.addItem(oTable);
            const oButtonBox = new sap.m.HBox({
                class: "sapUiSmallMarginTop",
                alignItems: "Center",
                items: [
                    new sap.m.Button({
                        text: "View",
                        type: "Emphasized",
                        press: this.onViewChart.bind(this)
                    }),
                    new sap.m.ToolbarSpacer({ width: "1rem" }), // 👈 SPACE
                    new sap.m.Button({
                        text: "Export",
                        type: "Success",
                        press: this.onExportExcel.bind(this)
                    })
                ]
            });

            oContainer.addItem(oButtonBox);



        },
        onViewChart: function () {

            const oModel = this.getView().getModel();
            const aReportData = oModel.getProperty("/reportData");

            if (!aReportData || !aReportData.length) {
                return;
            }

            /* =========================
               1. DETECT KEYS (DATA-DRIVEN)
            ========================= */
            const aKeys = Object.keys(aReportData[0]);

            const aProdKeys = aKeys.filter(k => k.endsWith("Prod") && k !== "totalProd");
            const aErosionKeys = aKeys.filter(k => k.endsWith("Erosion"));

            const fnLabel = function (sKey) {
                return sKey
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, c => c.toUpperCase());
            };

            /* =========================
               2. PRODUCTION DATASET
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
               3. EROSION DATASET
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
               4. PRODUCTION CHART
            ========================= */
            const oProdChart = new VizFrame({
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
                legend: {
                    visible: true
                }
            });

            /* =========================
               5. EROSION CHART
               (SAME STYLE AS PRODUCTION)
            ========================= */
            const oErosionChart = new VizFrame({
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
                legend: {
                    visible: true
                }
            });

            /* =========================
               6. COMBINE CHARTS
            ========================= */
            const oChartsBox = new sap.m.VBox({
                items: [
                    oProdChart,
                    oErosionChart
                ]
            });

            /* =========================
               7. SHOW IN DIALOG
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

            if (!aData || !aData.length) {
                return;
            }

            /* =========================
               1. BUILD COLUMNS DYNAMICALLY
            ========================= */
            const aKeys = Object.keys(aData[0]);

            const aColumns = aKeys.map(function (sKey) {
                return {
                    label: sKey
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, c => c.toUpperCase()),
                    property: sKey,
                    type: exportLibrary.EdmType.Number
                };
            });

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
                workbook: {
                    columns: aColumns
                },
                dataSource: aData,
                fileName: sFileName
            };

            /* =========================
               4. CREATE & DOWNLOAD
            ========================= */
            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        }
    });
});