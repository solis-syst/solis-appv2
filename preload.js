const { contextBridge, ipcRenderer } = require("electron");

const validUpdaterEvents = new Set([
  "checking-for-update",
  "update-available",
  "update-not-available",
  "download-progress",
  "update-downloaded",
  "error"
]);

contextBridge.exposeInMainWorld("electronAPI", {
  app: {
    getVersion: () => ipcRenderer.invoke("app:get-version"),
    isDevelopment: () => ipcRenderer.invoke("app:is-development")
  },

  updater: {
    check: () => ipcRenderer.invoke("updater:check"),

    download: () => ipcRenderer.invoke("updater:download"),

    install: () => ipcRenderer.invoke("updater:install"),

    onEvent: (callback) => {
      if (typeof callback !== "function") {
        throw new TypeError("Updater callback must be a function.");
      }

      const listener = (_event, payload) => {
        if (!payload || !validUpdaterEvents.has(payload.type)) {
          return;
        }

        callback(payload);
      };

      ipcRenderer.on("updater:event", listener);

      return () => {
        ipcRenderer.removeListener("updater:event", listener);
      };
    },

    mock: (type, data = {}) => {
      if (!validUpdaterEvents.has(type)) {
        return Promise.reject(new Error("Unsupported updater event."));
      }

      return ipcRenderer.invoke("updater:mock", {
        type,
        data
      });
    }
  }
});
