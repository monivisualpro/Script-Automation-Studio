const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  isElectron: true,
  platform: process.platform,
});
