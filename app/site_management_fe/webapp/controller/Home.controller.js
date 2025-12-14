sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.trl.sitemanagementfe.controller.Home", {

        onInit: function () {
            // Optional initialization
        },

        onConfigurationPress: function () {
            // Get the router
            // var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
              this.getOwnerComponent().getRouter().navTo("RouteView1");
            // Navigate to View1
            // oRouter.navTo("RouteView1");
        },

        onProductionPress: function () {
            MessageToast.show("Production tile clicked");
             this.getOwnerComponent().getRouter().navTo("RouteView2");
        },

        onTemperaturePress: function () {
             this.getOwnerComponent().getRouter().navTo("RouteView3");
            MessageToast.show("Temperature tile clicked");
        }

    });
});
