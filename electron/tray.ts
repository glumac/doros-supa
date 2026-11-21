import * as path from "node:path";
import { Menu, Tray, nativeImage } from "electron";

export interface TrayActions {
  showWindow(): void;
  quit(): void;
}

// electron-dist/tray.js → electron/assets (same layout inside the packaged app.asar).
const ASSETS_DIR = path.join(__dirname, "..", "electron", "assets");

export function createTray(actions: TrayActions): Tray {
  // nativeImage picks up trayTomato@2x.png automatically on Retina screens.
  const icon = nativeImage.createFromPath(path.join(ASSETS_DIR, "trayTomato.png"));
  const tray = new Tray(icon);
  tray.setToolTip("Doros");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show Doros", click: () => actions.showWindow() },
      { type: "separator" },
      { label: "Quit Doros", click: () => actions.quit() },
    ]),
  );
  return tray;
}
