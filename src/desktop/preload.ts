/**
 * RepoPulse Studio Desktop Preload Script
 * Exposes secure context bridge for Electron native desktop shell.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  openExternal: (url: string) => ipcRenderer.invoke('desktop:openExternal', url),
  selectDirectory: () => ipcRenderer.invoke('desktop:selectDirectory'),
  getSystemInfo: () => ipcRenderer.invoke('desktop:getSystemInfo'),
  openAuthPortal: () => ipcRenderer.invoke('desktop:openAuthPortal'),
  onSpotlight: (callback: () => void) => {
    ipcRenderer.on('desktop:openSpotlight', () => callback());
  },
  onSwitchView: (callback: (view: string) => void) => {
    ipcRenderer.on('desktop:switchView', (_event, view) => callback(view));
  },
  onRepoOpened: (callback: (dirPath: string) => void) => {
    ipcRenderer.on('desktop:repoOpened', (_event, dirPath) => callback(dirPath));
  },
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('desktop:deepLink', (_event, url) => callback(url));
  }
});
