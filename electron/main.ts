import { app, BrowserWindow, dialog, screen, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { fileURLToPath, pathToFileURL } from 'url';
import { initAutoUpdater, registerUpdaterIpc } from './updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let serverPort: number | null = null;

ipcMain.on('updater:is-packaged', (event) => {
  event.returnValue = app.isPackaged;
});

const DEFAULT_PORT = 3001;
const MAX_PORT = 3010;
const PORT_HOST = '127.0.0.1';

function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', (err: NodeJS.ErrnoException) => {
      resolve(err.code !== 'EADDRINUSE');
    });
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, host);
  });
}

async function findAvailablePort(): Promise<number> {
  for (let port = DEFAULT_PORT; port <= MAX_PORT; port++) {
    if (await isPortAvailable(port, PORT_HOST)) {
      return port;
    }
  }
  throw new Error(`No available port found between ${DEFAULT_PORT} and ${MAX_PORT}`);
}

function serializeArg(a: unknown): string {
  if (typeof a === 'string') return a;
  if (a instanceof Error) {
    return JSON.stringify({ message: a.message, stack: a.stack, code: (a as { code?: string }).code });
  }
  try {
    return JSON.stringify(a);
  } catch {
    return String(a);
  }
}

function setupLogging(): void {
  const logPath = path.join(app.getPath('userData'), 'app.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    const msg = args.map(serializeArg).join(' ');
    logStream.write(`[${new Date().toISOString()}] ${msg}\n`);
    originalLog.apply(console, args);
  };

  console.error = (...args: unknown[]) => {
    const msg = args.map(serializeArg).join(' ');
    logStream.write(`[${new Date().toISOString()}] ERROR: ${msg}\n`);
    originalError.apply(console, args);
  };
}

function getLoadingHtmlPath(): string {
  // 打包后位于 app.asar/electron-out/electron/loading.html
  // 开发模式下位于 electron/loading.html（直接相对源文件）
  const inAsar = path.join(__dirname, 'loading.html');
  if (fs.existsSync(inAsar)) return inAsar;
  // dev 兜底
  const devPath = path.join(process.cwd(), 'electron', 'loading.html');
  return devPath;
}

function getAppIconPath(): string {
  // Production (electron-builder asar): main.js lives at app.asar/electron-out/electron/.
  // Vite copies `public/icon.png` into `dist/icon.png` at build time, so the
  // shipped icon is at app.asar/dist/icon.png — i.e. ../../dist/icon.png from
  // this file. In dev we run from the source tree and the icon is at
  // <repo>/public/icon.png. We probe both.
  const candidates = [
    path.join(__dirname, '..', '..', 'dist', 'icon.png'),
    path.join(__dirname, '..', '..', 'public', 'icon.png'),
    path.join(process.cwd(), 'public', 'icon.png'),
    path.join(process.cwd(), 'dist', 'icon.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

async function createMainWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Storyloom',
    icon: getAppIconPath(),
    show: true,
    backgroundColor: '#FAF6EF',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'I' && input.control && input.shift) {
      win.webContents.toggleDevTools();
    }
    if (input.control) {
      const wc = win.webContents;
      if (input.key === '=' || input.key === 'NumpadAdd') {
        wc.setZoomFactor(wc.getZoomFactor() + 0.1);
        event.preventDefault();
      } else if (input.key === '-' || input.key === 'NumpadSubtract') {
        wc.setZoomFactor(Math.max(0.5, wc.getZoomFactor() - 0.1));
        event.preventDefault();
      } else if (input.key === '0' || input.key === 'Numpad0') {
        wc.setZoomFactor(1.0);
        event.preventDefault();
      }
    }
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
    console.error(`Page load failed: ${errorCode} ${errorDesc}`);
    setStatus(`页面加载失败 (${errorCode}): ${errorDesc}`, 'error');
  });

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  return win;
}

function setStatus(text: string, kind: 'info' | 'error' = 'info'): void {
  if (!mainWindow) return;
  const safe = JSON.stringify(text);
  const safeKind = JSON.stringify(kind);
  mainWindow.webContents
    .executeJavaScript(`window.updateStatus && window.updateStatus(${safe}, ${safeKind});`, true)
    .catch(() => undefined);
}

async function bootDevWindow(): Promise<void> {
  if (!mainWindow) return;
  await mainWindow.loadURL('http://localhost:5173');
  mainWindow.webContents.openDevTools({ mode: 'detach' });
}

async function bootProductionFlow(): Promise<void> {
  if (!mainWindow) return;
  setStatus('正在初始化数据库…');

  const dataDir = path.join(app.getPath('userData'), 'data');
  process.env.DATA_DIR = dataDir;
  process.env.NODE_ENV = 'production';
  process.env.STORYLOOM_ELECTRON = '1';
  const appPath = app.getAppPath();
  process.env.MIGRATIONS_DIR = path.join(appPath, 'drizzle');

  console.log(`DATA_DIR: ${dataDir}`);
  console.log(`MIGRATIONS_DIR: ${process.env.MIGRATIONS_DIR}`);
  console.log(`app.getAppPath(): ${appPath}`);

  const serverPath = path.join(appPath, 'dist-server', 'server', 'index.js');
  if (!fs.existsSync(serverPath)) {
    throw new Error(`Server module not found at: ${serverPath}`);
  }
  const serverUrl = pathToFileURL(serverPath).href;

  setStatus('正在启动服务…');
  const { startServer } = await import(serverUrl);
  const port = await findAvailablePort();
  serverPort = port;
  process.env.SERVER_PORT = String(port);
  await startServer(port);

  setStatus('准备就绪');
  console.log(`Loading frontend from dist/index.html`);

  const frontendPath = path.join(appPath, 'dist', 'index.html');
  if (!fs.existsSync(frontendPath)) {
    throw new Error(`Frontend not found at: ${frontendPath}`);
  }
  await mainWindow.loadFile(frontendPath);
  mainWindow.webContents.send('server-port', port);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    setupLogging();

    ipcMain.handle('get-server-port', () => serverPort ?? parseInt(process.env.PORT || '3001', 10));
    ipcMain.handle('open-external', (_e, url: string) => shell.openExternal(url));
    ipcMain.handle('open-log-folder', () => {
      const logPath = path.join(app.getPath('userData'), 'app.log');
      // 如果 app.log 还没生成（极少见），就退化为打开 userData 目录
      if (fs.existsSync(logPath)) {
        shell.showItemInFolder(logPath);
      } else {
        void shell.openPath(app.getPath('userData'));
      }
    });
    ipcMain.handle('get-user-data-path', () => app.getPath('userData'));

    screen.on('display-metrics-changed', () => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('display-scale-changed');
      });
    });

    console.log(`=== Storyloom starting ===`);
    console.log(`Version: ${app.getVersion()}`);
    console.log(`Electron: ${process.versions.electron}`);
    console.log(`Node: ${process.versions.node}`);
    console.log(`app.isPackaged: ${app.isPackaged}`);
    console.log(`process.resourcesPath: ${process.resourcesPath}`);

    const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

    // 1. 立即创建主窗口并显示 splash
    mainWindow = await createMainWindow();
    try {
      const loadingPath = getLoadingHtmlPath();
      if (fs.existsSync(loadingPath)) {
        await mainWindow.loadFile(loadingPath);
      }
    } catch (err) {
      console.error('Failed to load splash:', err);
    }

    // 2. 异步启动后端，splash 期间显示进度
    try {
      if (isDev) {
        setStatus('正在连接前端开发服务器…');
        await bootDevWindow();
      } else {
        await bootProductionFlow();
      }
    } catch (err) {
      const errMsg = err instanceof Error
        ? `${err.message}\n\nStack: ${err.stack || 'N/A'}`
        : String(err);
      console.error('Startup failed:', errMsg);
      setStatus(`启动失败：${errMsg}\n\n请截图此页面并反馈，或查看 app.log（位于 %APPDATA%\\storyloom\\app.log）`, 'error');
      // 不再 quit，保留窗口让用户看到错误
      try {
        dialog.showErrorBox('启动失败', `应用启动失败:\n${errMsg}`);
      } catch {
        // ignore
      }
    }

    // 3. 启动自动更新（仅生产环境）
    if (!isDev && mainWindow) {
      registerUpdaterIpc();
      initAutoUpdater(mainWindow);
    }
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    void (async () => {
      mainWindow = await createMainWindow();
      const loadingPath = getLoadingHtmlPath();
      if (fs.existsSync(loadingPath)) {
        await mainWindow.loadFile(loadingPath);
      }
      await bootDevWindow();
    })();
  }
});
