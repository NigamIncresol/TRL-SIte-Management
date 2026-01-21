sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, JSONModel) {
    "use strict";
    let oODataModel;

    return Controller.extend("com.trl.sitemanagementfe.controller.View5", {

        onInit: function () {
            oODataModel = this.getOwnerComponent().getModel();

            const oData = {
                runnerId: "",
                campaignNo: "",
                repairStatus: "",
                minorRepairStatus: "",
                shift: "",
                productionLines: [],
                materials: [],            // ✅ ADD THIS
                isSensorEditable: true
            };

            const oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "formData");
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
        onProdLineLiveChange: function (oEvent) {
            const oInput = oEvent.getSource();

            // Clear typed value
            oInput.setValue("");

            // Inform user
            MessageToast.show("Please select Line name using the value help", {
                duration: 2000
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

            // Fetch SiteMaster data


            // Bind context with $expand
            const oContextBinding = oODataModel.bindContext(
                `/siteMaster(site_id='${enteredSiteId}')`,
                null,
                {
                    $expand: {
                        productionLines: true
                    }
                }
            );

            // Request data
            oContextBinding.requestObject().then(res => {

                console.log("received production data", res.productionLines);

                // store whole response for future use
                this.siteMasterCompleteData = res;
                console.log("Sitemaster full data", this.siteMasterCompleteData);

                const aProds = res.productionLines || [];

                const oModel = new sap.ui.model.json.JSONModel({
                    prods: aProds
                });

                this._oProdVHDialog.setModel(oModel);
                this._oProdVHDialog.open();

            }).catch(err => {
                sap.m.MessageToast.show("Failed to load production lines.");
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

            // 1️⃣ Set value
            oInput.setValue(slineName);

            // 2️⃣ Fire change event manually
            // oInput.fireChange({
            //     value: sSiteId
            // });

            this._oProdVHDialog.close();
        },
        renderProductionLine: function (siteData, dailyData) {
            const oView = this.getView();
            const oViewModel = oView.getModel("view");
            const oLinesContainer = oView.byId("linesContainer");
            oLinesContainer.destroyItems();

            const sProdLine = oView.byId("ProductionLineId1").getValue().trim();

            // Find the production line matching the entered name
            const oLine = (siteData.productionLines || []).find(line => line.line_name === sProdLine);

            if (!oLine) {
                sap.m.MessageToast.show("Production line not found");
                return;
            }

            const bEditable = true; // Customize based on productionStageCompleted if needed

            const oPanel = new sap.m.Panel({
                headerText: "Runner : " + oLine.line_name,
                expandable: false,
                customData: [new sap.ui.core.CustomData({ key: "lineId", value: oLine.ID })],
                content: [
                    new sap.ui.layout.Grid({
                        defaultSpan: "L4 M6 S12",
                        hSpacing: 1,
                        vSpacing: 1,
                        content: [
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({ text: "Runner Name" }),
                                    new sap.m.Input({ value: oLine.line_name, editable: false })
                                ]
                            }),
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({ text: "Production Data" }),
                                    new sap.m.Input({
                                        type: "Number",
                                        placeholder: "Enter production data",
                                        value: dailyData?.production_data || "",
                                        editable: bEditable
                                    })
                                ]
                            }),
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({ text: "Erosion Data" }),
                                    new sap.m.Input({
                                        type: "Number",
                                        placeholder: "Enter erosion data",
                                        value: dailyData?.erosion_data || "",
                                        editable: bEditable
                                    })
                                ]
                            })
                        ]
                    })
                ]
            });

            oPanel.addStyleClass("sapUiSmallMarginBottom");
            oLinesContainer.addItem(oPanel);
        },
        onFindPress: function () {
            const oView = this.getView();
            const oFormModel = oView.getModel("formData");
            const oODataModel = oView.getModel(); // default OData V4 model

            const siteId = oView.byId("siteId").getValue().trim();
            const prodLine = oView.byId("ProductionLineId1").getValue().trim();
            const sDate = oView.byId("siteDate1").getValue().trim();
            const sShift = oView.byId("shiftSelect").getSelectedKey() || "A";

            if (!siteId || !prodLine || !sDate) {
                sap.m.MessageToast.show("Please fill all required fields.");
                return;
            }

            // Reset data
            oFormModel.setProperty("/siteMaster", {});
            oFormModel.setProperty("/campinfo", {});

            // Set Site Master details (already loaded)
            if (this.siteMasterCompleteData) {
                oFormModel.setProperty("/siteMaster", {
                    customer_name: this.siteMasterCompleteData.customer_name || "",
                    location: this.siteMasterCompleteData.location || "",
                    runner_id: this.siteMasterCompleteData.runner_id || ""
                });
            }

            // Build OData V4 filters for Consumption
            const aFilters = [
                new sap.ui.model.Filter("site_id", "EQ", siteId),
                new sap.ui.model.Filter("productionLineName", "EQ", prodLine),
                new sap.ui.model.Filter("consumption_date", "EQ", sDate),
                new sap.ui.model.Filter("shift_code", "EQ", sShift)
            ];

            // Bind Consumption entity
            const oListBinding = oODataModel.bindList(
                "/consumption",
                null,
                null,
                aFilters
            );

            oListBinding.requestContexts().then(aContexts => {

                if (aContexts.length > 0) {
                    const aConsumptions = aContexts.map(oCtx => oCtx.getObject());

                    this._isExistingConsumptionData = true;

                    sap.m.MessageToast.show(
                        "Existing consumption data found for the selected line/shift/date"
                    );

                    const oFirstRecord = aConsumptions[0];

                    // Bind Campaign Information
                    oFormModel.setProperty("/campinfo", {
                        campaign_no: oFirstRecord.curr_campaign || "",
                        repair_status: oFirstRecord.curr_repair_status || "",
                        minor_repair_status: oFirstRecord.curr_minor_repair_status || 0
                    });

                } else {
                    // No Consumption Found
                    sap.m.MessageToast.show(
                        "No consumption data found for the selected line/shift/date"
                    );

                    const oMatchedLine =
                        this.siteMasterCompleteData?.productionLines.find(
                            line => line.line_name === prodLine
                        );

                    oFormModel.setProperty("/campinfo", {
                        campaign_no: oMatchedLine?.curr_campaign || "",
                        repair_status: oMatchedLine?.curr_repair_status || "",
                        minor_repair_status: oMatchedLine?.curr_minor_repair_status || 0
                    });

                    this._isExistingConsumptionData = false;
                }

            }).catch(err => {

                sap.m.MessageToast.show(
                    err?.message || "Error while fetching consumption data"
                );

                const oMatchedLine =
                    this.siteMasterCompleteData?.productionLines.find(
                        line => line.line_name === prodLine
                    );

                oFormModel.setProperty("/campinfo", {
                    campaign_no: oMatchedLine?.curr_campaign || "",
                    repair_status: oMatchedLine?.curr_repair_status || "",
                    minor_repair_status: oMatchedLine?.curr_minor_repair_status || 0
                });
            });
        }
        ,
        onMaterialValueHelp: function (oEvent) {
            const oView = this.getView();
            const oInput = oEvent.getSource();     // Clicked material input
            this._oMaterialInput = oInput;

            // Get Site ID
            const sSiteId = oView.byId("siteId").getValue().trim();

            // Create dialog only once
            if (!this._oMaterialVHDialog) {
                this._oMaterialVHDialog = new sap.m.SelectDialog({
                    title: "Select Material",

                    liveChange: (oEvent) => {
                        const sValue = oEvent.getParameter("value");
                        const oFilter = new sap.ui.model.Filter(
                            "material",
                            sap.ui.model.FilterOperator.Contains,
                            sValue
                        );
                        oEvent.getSource().getBinding("items").filter([oFilter]);
                    },

                    confirm: (oEvent) => {
                        const oItem = oEvent.getParameter("selectedItem");
                        if (!oItem) return;

                        const oMat = oItem.getBindingContext().getObject();
                        const oRowCtx = this._oMaterialInput.getBindingContext("formData");

                        // ✅ ONLY material fields (NO quantity)
                        oRowCtx.setProperty("material", oMat.material);
                        // oRowCtx.setProperty("materialDesc", oMat.materialDescription);

                        this._oMaterialVHDialog.close();
                    },

                    cancel: (oEvent) => {
                        oEvent.getSource().close();
                    },

                    items: {
                        path: "/materialsVH",
                        template: new sap.m.StandardListItem({
                            title: "{material}",
                            description: "{materialDescription}"
                        })
                    }
                });

                oView.addDependent(this._oMaterialVHDialog);
            }

            // ===== Fetch ONLY material data (quantity ignored) =====
            const oODataModel = this.getOwnerComponent().getModel();
            const oListBinding = oODataModel.bindList(
                "/inventory",
                null,
                null,
                [new sap.ui.model.Filter("siteId", sap.ui.model.FilterOperator.EQ, sSiteId)]
            );

            oListBinding.requestContexts()
                .then((aContexts) => {
                    // ✅ Explicitly map only material fields
                    const aMaterials = aContexts.map(oCtx => {
                        const oObj = oCtx.getObject();
                        return {
                            material: oObj.material,
                            materialDescription: oObj.materialDescription
                        };
                    });

                    const oVHModel = new sap.ui.model.json.JSONModel({
                        materialsVH: aMaterials
                    });

                    this._oMaterialVHDialog.setModel(oVHModel);
                    this._oMaterialVHDialog.open();
                })
                .catch((err) => {
                    sap.m.MessageToast.show("Failed to load Materials");
                    console.error(err);
                });
        },



        onAddMaterialRow: function () {
            const oModel = this.getView().getModel("formData");

            let aMaterials = oModel.getProperty("/materials");

            if (!Array.isArray(aMaterials)) {
                aMaterials = [];
            }

            aMaterials.push({
                material: "",
                materialDesc: "",
                batch: "",
                remarks: ""
            });

            oModel.setProperty("/materials", aMaterials);
        }
        ,
        onDeleteMaterialRow: function (oEvent) {
            const oModel = this.getView().getModel("formData");

            // Get pressed button
            const oButton = oEvent.getSource();

            // Get row (ColumnListItem)
            const oItem = oButton.getParent();

            // Get binding context path (e.g. /materials/2)
            const sPath = oItem.getBindingContext("formData").getPath();

            // Get index from path
            const iIndex = parseInt(sPath.split("/").pop(), 10);

            // Get materials array
            const aMaterials = oModel.getProperty("/materials");

            // Prevent deleting last row (optional)
            if (aMaterials.length === 1) {
                sap.m.MessageToast.show("At least one material row is required");
                return;
            }

            // Remove row
            aMaterials.splice(iIndex, 1);

            // Update model
            oModel.setProperty("/materials", aMaterials);
        }
        ,


        onNavToHome: function () {
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Home");
        }


    });
});