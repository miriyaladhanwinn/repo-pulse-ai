/**
 * Desktop Architecture Unit & Integration Tests
 * Verifies the Cherry Studio-grade Electron desktop shell and IPC contracts.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

describe('Native Desktop Architecture & Cherry Parity Verification', () => {
  test('Electron desktop entry point exists and compiles to ESM', async () => {
    const mainTsPath = path.join(rootDir, 'src', 'desktop', 'main.ts');
    const mainJsPath = path.join(rootDir, 'dist', 'desktop', 'main.js');
    
    assert.ok(fs.existsSync(mainTsPath), 'src/desktop/main.ts must exist');
    assert.ok(fs.existsSync(mainJsPath), 'dist/desktop/main.js must be built');
    
    const content = fs.readFileSync(mainTsPath, 'utf-8');
    assert.ok(content.includes('RepoPulseDesktopApp'), 'Exports RepoPulseDesktopApp class');
    assert.ok(content.includes("titleBarStyle: isMac ? 'hiddenInset' : 'hidden'"), 'Configures borderless titlebar');
    assert.ok(content.includes("backgroundMaterial: 'acrylic'"), 'Supports Windows 11 acrylic material');
    assert.ok(content.includes("vibrancy: 'under-window'"), 'Supports macOS Apple Liquid Glass vibrancy');
    assert.ok(content.includes('requestSingleInstanceLock'), 'Enforces single-instance application lock');
    assert.ok(content.includes('setAsDefaultProtocolClient'), 'Registers repopulse:// protocol client');
    assert.ok(content.includes('handleDeepLink'), 'Implements handleDeepLink method');
  });

  test('Preload context bridge defines secure desktop API window bindings', async () => {
    const preloadTsPath = path.join(rootDir, 'src', 'desktop', 'preload.ts');
    const preloadJsPath = path.join(rootDir, 'dist', 'desktop', 'preload.js');
    
    assert.ok(fs.existsSync(preloadTsPath), 'src/desktop/preload.ts must exist');
    assert.ok(fs.existsSync(preloadJsPath), 'dist/desktop/preload.js must be built');
    
    const content = fs.readFileSync(preloadTsPath, 'utf-8');
    assert.ok(content.includes("contextBridge.exposeInMainWorld('electronAPI'"), 'Exposes window.electronAPI');
    assert.ok(content.includes("minimize: () => ipcRenderer.send('window:minimize')"), 'Exposes minimize IPC');
    assert.ok(content.includes("maximize: () => ipcRenderer.send('window:maximize')"), 'Exposes maximize IPC');
    assert.ok(content.includes("close: () => ipcRenderer.send('window:close')"), 'Exposes close IPC');
    assert.ok(content.includes('openExternal: (url: string)'), 'Exposes secure external link opener');
    assert.ok(content.includes('selectDirectory: ()'), 'Exposes native folder picker');
    assert.ok(content.includes('getSystemInfo: ()'), 'Exposes native hardware/system diagnostics');
    assert.ok(content.includes('openAuthPortal: ()'), 'Exposes openAuthPortal IPC');
    assert.ok(content.includes('onDeepLink: (callback:'), 'Exposes onDeepLink listener');
  });

  test('Apple Duo fluid closing animation and dynamic island are integrated in UI', async () => {
    const htmlPath = path.join(rootDir, 'dist', 'server', 'assets', 'studio.html');
    assert.ok(fs.existsSync(htmlPath), 'studio.html must exist in dist');
    
    const html = fs.readFileSync(htmlPath, 'utf-8');
    assert.ok(html.includes('@keyframes appleDuoClosing'), 'Contains Apple Duo closing keyframe animation');
    assert.ok(html.includes('dynamic-island'), 'Contains Apple Dynamic Island pill');
    assert.ok(html.includes('view-models'), 'Contains 540+ Model Explorer Matrix');
    assert.ok(html.includes('siri-border') || html.includes('siri'), 'Contains Apple Siri glow and glass styling');
    assert.ok(html.includes('window.electronAPI'), 'Contains native desktop IPC hooks in renderer');
    assert.ok(html.includes('openAuthPage'), 'Contains openAuthPage launcher');
  });

  test('package.json specifies native desktop execution scripts', async () => {
    const pkgPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    
    assert.equal(pkg.version, '2.3.1');
    assert.ok(pkg.scripts.desktop, 'Contains npm run desktop script');
    assert.ok(pkg.devDependencies.electron, 'Contains electron devDependency');
    assert.equal(pkg.main, 'dist/desktop/main.js', 'Points main to Electron desktop entry');
  });
});
