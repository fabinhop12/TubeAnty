import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { registerProfileHandlers } from "./ipc/profile.handlers";
import { registerProxyHandlers } from "./ipc/proxy.handlers";
import { registerSettingsHandlers } from "./ipc/settings.handlers";
import { registerYoutubeHandlers } from "./ipc/youtube.handlers";

function createMainWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#0b0b0f",
    // So usado no Linux/Windows em dev (fora do pacote empacotado, onde o
    // icone vem do electron-builder via directories.buildResources/icon.*).
    icon: join(__dirname, "../../build/icon.png"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devServerUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  registerProfileHandlers();
  registerProxyHandlers();
  registerSettingsHandlers();
  registerYoutubeHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
