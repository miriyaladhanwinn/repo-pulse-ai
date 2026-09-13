/**
 * RepoPulse Studio Desktop Shell - Electron Main Process
 * Cherry Studio-grade native desktop application with Apple Liquid Glass framing.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, nativeImage } from 'electron';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StudioServer } from '../server/studio-server.js';
import { ModelCatalog } from '../providers/models-catalog.js';
import { AssistantMatrix } from '../core/assistant-matrix.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RepoPulseDesktopApp {
  private mainWindow: BrowserWindow | null = null;
  private studioServer: StudioServer | null = null;
  private tray: Tray | null = null;
  private serverPort: number = 3000;

  constructor() {
    this.initLifecycle();
  }

  private initLifecycle(): void {
    // Enforce single instance lock
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });

    app.whenReady().then(async () => {
      await this.startInternalStudioServer();
      this.createMainWindow();
      this.setupIPC();
      this.setupApplicationMenu();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  private async startInternalStudioServer(): Promise<void> {
    try {
      this.studioServer = new StudioServer(3000);
      this.serverPort = await this.studioServer.start();
      console.log(`[RepoPulse Desktop] Internal Studio engine active on port ${this.serverPort}`);
    } catch (err) {
      console.error('[RepoPulse Desktop] Failed starting internal studio engine:', err);
    }
  }

  private createMainWindow(): void {
    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';

    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 700,
      title: 'RepoPulse Studio • Titan Edition',
      backgroundColor: '#040409',
      show: false,
      titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
      trafficLightPosition: isMac ? { x: 18, y: 18 } : undefined,
      titleBarOverlay: isWin ? {
        color: '#0a0d18',
        symbolColor: '#cbd5e1',
        height: 38
      } : false,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      backgroundMaterial: 'acrylic',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        spellcheck: false
      }
    });

    // Graceful presentation when content is rendered
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.loadURL(`http://localhost:${this.serverPort}`);

    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIPC(): void {
    ipcMain.on('window:minimize', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.on('window:maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.on('window:close', () => {
      this.mainWindow?.close();
    });

    ipcMain.handle('desktop:openExternal', async (_event, targetUrl: string) => {
      if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
        await shell.openExternal(targetUrl);
        return true;
      }
      return false;
    });

    ipcMain.handle('desktop:selectDirectory', async () => {
      if (!this.mainWindow) return null;
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory', 'createDirectory']
      });
      return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('desktop:getSystemInfo', () => {
      return {
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome,
        modelsCount: ModelCatalog.count(),
        assistantsCount: AssistantMatrix.getAll().length,
        studioPort: this.serverPort
      };
    });
  }

  private setupApplicationMenu(): void {
    const isMac = process.platform === 'darwin';
    const template: any[] = [
      ...(isMac ? [{
        label: 'RepoPulse',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }] : []),
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Repository Directory...',
            accelerator: 'CmdOrCtrl+O',
            click: async () => {
              if (this.mainWindow) {
                const res = await dialog.showOpenDialog(this.mainWindow, {
                  properties: ['openDirectory']
                });
                if (!res.canceled && res.filePaths[0]) {
                  this.mainWindow.webContents.send('desktop:repoOpened', res.filePaths[0]);
                }
              }
            }
          },
          { type: 'separator' },
          isMac ? { role: 'close' } : { role: 'quit' }
        ]
      },
      {
        label: 'Models',
        submenu: [
          {
            label: 'Open Model Spotlight (540+ Models)',
            accelerator: 'CmdOrCtrl+K',
            click: () => {
              this.mainWindow?.webContents.send('desktop:openSpotlight');
            }
          },
          { type: 'separator' },
          {
            label: 'Explore All 540 Models...',
            click: () => {
              this.mainWindow?.webContents.send('desktop:switchView', 'models');
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'RepoPulse Documentation',
            click: () => shell.openExternal('https://github.com/miriyaladhanwinn/repo-pulse-ai#readme')
          },
          {
            label: 'Report an Issue',
            click: () => shell.openExternal('https://github.com/miriyaladhanwinn/repo-pulse-ai/issues')
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private cleanup(): void {
    if (this.studioServer) {
      this.studioServer.stop();
      this.studioServer = null;
    }
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

// Instantiate if executed directly as Electron main
if (process.type === 'browser') {
  new RepoPulseDesktopApp();
}
