const { app, BrowserWindow, Menu, shell, session, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");

let mainWindow = null;
let serverModule = null;
let isShuttingDown = false;

function findAvailablePort(preferredPort = 3000) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => {
      const fallback = net.createServer();
      fallback.once("error", () => resolve(3000));
      fallback.listen(0, "127.0.0.1", () => {
        const addr = fallback.address();
        const chosen = typeof addr === "object" && addr ? addr.port : 3000;
        fallback.close(() => resolve(chosen));
      });
    });
    tester.listen(preferredPort, "127.0.0.1", () => {
      tester.close(() => resolve(preferredPort));
    });
  });
}

function prepareWritableDataDirectory() {
  const userDataDir = app.getPath("userData");
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.mkdirSync(path.join(userDataDir, ".studio-data"), { recursive: true });
  fs.mkdirSync(path.join(userDataDir, "local-engine", "bin"), { recursive: true });
  fs.mkdirSync(path.join(userDataDir, "local-engine", "models"), { recursive: true });
  fs.mkdirSync(path.join(userDataDir, "local-engine", "skills"), { recursive: true });

  const envTarget = path.join(userDataDir, ".env");
  const envExample = path.join(__dirname, "..", ".env.example");
  if (!fs.existsSync(envTarget) && fs.existsSync(envExample)) {
    try {
      fs.copyFileSync(envExample, envTarget);
    } catch {
      // Non-fatal if .env seed fails
    }
  }

  process.chdir(userDataDir);
  return userDataDir;
}

function buildApplicationMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Open Local Data Folder",
          click: () => {
            shell.openPath(app.getPath("userData"));
          },
        },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(process.platform === "darwin" ? [{ role: "front" }] : [{ role: "close" }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createMainWindow() {
  prepareWritableDataDirectory();

  const port = await findAvailablePort(Number(process.env.PORT) || 3000);
  process.env.PORT = String(port);
  process.env.NODE_ENV = "production";
  process.env.AUTO_OPEN_BROWSER = "0";

  const serverBundlePath = path.join(__dirname, "..", "dist", "server.cjs");
  if (!fs.existsSync(serverBundlePath)) {
    throw new Error(`Missing production server bundle at ${serverBundlePath}`);
  }

  serverModule = require(serverBundlePath);
  if (typeof serverModule.setupServer === "function") {
    await serverModule.setupServer();
  }

  const iconPath = path.join(__dirname, "..", "build-resources", "icon.png");

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#141414",
    title: "Script Automation Studio",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // The preload only uses contextBridge + process.platform, both available when sandboxed.
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"))) {
      if (!url.startsWith(`http://127.0.0.1:${port}`) && !url.startsWith(`http://localhost:${port}`)) {
        shell.openExternal(url);
        return { action: "deny" };
      }
    }
    return { action: "allow" };
  });

  // Never let the app window navigate away from the local server (e.g. via a dropped file or a stray link).
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}`) && !url.startsWith(`http://localhost:${port}`)) {
      event.preventDefault();
      if (url.startsWith("https://") || url.startsWith("http://")) shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      if (permission === "media" || permission === "clipboard-read" || permission === "clipboard-sanitized-write") {
        callback(true);
        return;
      }
      callback(false);
    });

    buildApplicationMenu();

    try {
      await createMainWindow();
    } catch (err) {
      dialog.showErrorBox(
        "Script Automation Studio — Startup Error",
        err instanceof Error ? err.message : String(err)
      );
      app.quit();
    }
  });

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        await createMainWindow();
      } catch (err) {
        dialog.showErrorBox(
          "Script Automation Studio — Startup Error",
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", async (event) => {
    if (isShuttingDown) return;
    if (serverModule && typeof serverModule.stopServer === "function") {
      event.preventDefault();
      isShuttingDown = true;
      try {
        await serverModule.stopServer();
      } catch {
        // Ignore shutdown errors
      }
      app.quit();
    }
  });
}
