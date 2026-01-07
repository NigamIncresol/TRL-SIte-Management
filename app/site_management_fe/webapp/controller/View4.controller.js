sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";
    let oODataModel;

    return Controller.extend("com.trl.sitemanagementfe.controller.View4", {

        onInit: function () {
            oODataModel = this.getOwnerComponent().getModel();

            const oData = {
                runnerId: "",
                campaignNo: "",
                repairStatus: "",
                minorRepairStatus: "",
                shift: "",
                productionLines: [],
                isSensorEditable: true,

                // ✅ ADD materials here
                materials: [
                    {
                        material: "",
                        materialDesc: "",
                        quantity: "",
                        batch: ""
                    }
                ]
            };

            const oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "formData");
        }
        ,

        // ===== Add Row =====
        onAddMaterialRow: function () {
            const oModel = this.getView().getModel("formData");
            const aMaterials = oModel.getProperty("/materials");

            aMaterials.push({
                material: "",
                materialDesc: "",
                quantity: "",
                batch: ""
            });

            oModel.setProperty("/materials", aMaterials);
        }
        ,

        onSave: function () {
            const omodel = this.getView().getModel("formData");

            // Get complete payload
            const oPayload = omodel.getData();

            // Pretty print payload in console
            console.log("===== SAVE AS DRAFT PAYLOAD =====");
            console.log(JSON.stringify(oPayload, null, 2));
            //oModel.setProperty("/materials", []);
        },


        // ===== Delete Row =====
        onDeleteMaterialRow: function (oEvent) {
            const oTable = this.byId("materialTable");
            const oItem = oEvent.getSource().getParent();
            const iIndex = oTable.indexOfItem(oItem);

            const oModel = this.getView().getModel("formData");
            const aMaterials = oModel.getProperty("/materials");

            aMaterials.splice(iIndex, 1);
            oModel.setProperty("/materials", aMaterials);
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

        onNavToHome: function () {
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Home");
        }


    });
});
