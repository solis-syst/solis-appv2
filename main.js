const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("node:path");
const { autoUpdater } = require("electron-updater");

let mainWindow = null;

const DEV_SERVER_URL =
  process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173";

const isDevelopment = !app.isPackaged;

const sendUpdaterEvent = (type, data = {}) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send("updater:event", {
    type,
    ...data
  });
};

const registerUpdaterEvents = () => {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    sendUpdaterEvent("checking-for-update");
  });

  autoUpdater.on("update-available", (info) => {
    sendUpdaterEvent("update-available", {
      version: info.version,
      releaseDate: info.releaseDate || null
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    sendUpdaterEvent("update-not-available", {
      currentVersion: info?.version || app.getVersion()
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdaterEvent("download-progress", {
      percent: Number(progress.percent) || 0,
      bytesPerSecond: Number(progress.bytesPerSecond) || 0,
      transferred: Number(progress.transferred) || 0,
      total: Number(progress.total) || 0
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendUpdaterEvent("update-downloaded", {
      version: info.version
    });
  });

  autoUpdater.on("error", (error) => {
    sendUpdaterEvent("error", {
      message: error instanceof Error ? error.message : String(error)
    });
  });
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 860,
    height: 620,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: "#09090b",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({
    action: "deny"
  }));

  mainWindow.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (isDevelopment) {
    await mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(
      path.join(__dirname, "dist", "renderer", "index.html")
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

const registerIpc = () => {
  ipcMain.handle("app:get-version", () => app.getVersion());

  ipcMain.handle("app:is-development", () => isDevelopment);

  ipcMain.handle("updater:check", async () => {
    if (isDevelopment) {
      sendUpdaterEvent("update-not-available", {
        currentVersion: app.getVersion(),
        development: true
      });

      return {
        ok: true,
        development: true
      };
    }

    try {
      await autoUpdater.checkForUpdates();

      return {
        ok: true
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      sendUpdaterEvent("error", {
        message
      });

      return {
        ok: false,
        error: message
      };
    }
  });

  ipcMain.handle("updater:download", async () => {
    if (isDevelopment) {
      return {
        ok: false,
        error: "Update downloads are disabled in development mode."
      };
    }

    try {
      await autoUpdater.downloadUpdate();

      return {
        ok: true
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      sendUpdaterEvent("error", {
        message
      });

      return {
        ok: false,
        error: message
      };
    }
  });

  ipcMain.handle("updater:install", () => {
    if (isDevelopment) {
      return {
        ok: false,
        error: "Update installation is disabled in development mode."
      };
    }

    autoUpdater.quitAndInstall(false, true);

    return {
      ok: true
    };
  });

  ipcMain.handle("updater:mock", (_event, payload) => {
    if (!isDevelopment) {
      return {
        ok: false,
        error: "Mock updater events are disabled in production."
      };
    }

    if (!payload || typeof payload !== "object") {
      return {
        ok: false,
        error: "Invalid mock payload."
      };
    }

    const allowedEvents = new Set([
      "checking-for-update",
      "update-available",
      "update-not-available",
      "download-progress",
      "update-downloaded",
      "error"
    ]);

    if (!allowedEvents.has(payload.type)) {
      return {
        ok: false,
        error: "Unsupported mock event."
      };
    }

    sendUpdaterEvent(payload.type, payload.data || {});

    return {
      ok: true
    };
  });
};

const configureSession = () => {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(false);
    }
  );
};

const checkForUpdatesOnStartup = () => {
  if (isDevelopment) {
    return;
  }

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      sendUpdaterEvent("error", {
        message:
          error instanceof Error ? error.message : String(error)
      });
    });
  }, 1500);
};

app.whenReady().then(async () => {
  configureSession();
  registerUpdaterEvents();
  registerIpc();

  await createWindow();
  checkForUpdatesOnStartup();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
