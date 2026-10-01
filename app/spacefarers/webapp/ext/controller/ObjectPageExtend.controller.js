/* global Promise */
sap.ui.define(
  ["sap/ui/core/mvc/ControllerExtension", "sap/ui/core/Messaging", "sap/m/MessageBox"],
  function (ControllerExtension, Messaging, MessageBox) {
    "use strict";

    return ControllerExtension.extend(
      "galactic.spacefarer.spacefarers.ext.controller.ObjectPageExtend",
      {
        override: {
          editFlow: {
            onBeforeSave: function () {
              return new Promise(function (resolve, reject) {
                const errorMessages = Messaging.getMessageModel()
                  .getData()
                  .filter(function (message) {
                    return message.type === "Error";
                  });

                if (errorMessages.length === 0) {
                  resolve();
                  return;
                }

                MessageBox.error(
                  errorMessages
                    .map(function (message) {
                      return message.message;
                    })
                    .join("\n"),
                  { title: "Please correct the following before saving" }
                );
                reject(new Error("Validation errors prevent saving."));
              });
            }
          }
        }
      }
    );
  }
);
