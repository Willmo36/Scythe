import { app, BrowserWindow, globalShortcut } from "electron";
import * as path from "path";

function createWindow() {
    // Create the browser window.
    const win = new BrowserWindow({ width: 800, height: 600 });

    // and load the index.html of the app.

    win.loadFile(path.join(__dirname, "../index.html"));
    win.webContents.openDevTools();

    globalShortcut.register("f8", () => {
        win.webContents.send("capture_start");
    });
}

app.on("ready", createWindow);
