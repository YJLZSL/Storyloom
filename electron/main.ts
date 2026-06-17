import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

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

async function createWindow(loadTarget: { type: 'url'; url: string } | { type: 'file'; path: string }): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'AI Timeline Creator',
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (loadTarget.type === 'url') {
    await mainWindow.loadURL(loadTarget.url);
  } else {
    await mainWindow.loadFile(loadTarget.path);
  }

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'I' && input.control && input.shift) {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
    console.error(`Page load failed: ${errorCode} ${errorDesc}`);
    dialog.showErrorBox('加载失败', `页面加载失败 (${errorCode}): ${errorDesc}`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

    console.log(`=== AI Timeline Creator starting ===`);
    console.log(`Version: ${app.getVersion()}`);
    console.log(`Electron: ${process.versions.electron}`);
    console.log(`Node: ${process.versions.node}`);
    console.log(`app.isPackaged: ${app.isPackaged}`);
    console.log(`process.resourcesPath: ${process.resourcesPath}`);

    const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

    if (isDev) {
      await createWindow({ type: 'url', url: 'http://localhost:5173' });
      mainWindow?.webContents.openDevTools();
    } else {
      try {
        const dataDir = path.join(app.getPath('userData'), 'data');
        process.env.DATA_DIR = dataDir;
        process.env.NODE_ENV = 'production';
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
        const { startServer } = await import(serverUrl);
        const port = parseInt(process.env.PORT || '3001', 10);
        await startServer(port);

        console.log(`Loading frontend from dist/index.html`);

        const frontendPath = path.join(appPath, 'dist', 'index.html');
        if (!fs.existsSync(frontendPath)) {
          throw new Error(`Frontend not found at: ${frontendPath}`);
        }
        await createWindow({ type: 'file', path: frontendPath });
      } catch (err) {
        const errMsg = err instanceof Error
            ? `${err.message}\n\nStack: ${err.stack || 'N/A'}`
            : String(err);
        console.error('Startup failed:', errMsg);
        dialog.showErrorBox('启动失败', `应用启动失败:\n${errMsg}`);
        app.quit();
      }
    }
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow({ type: 'url', url: 'http://localhost:5173' });
  }
});
