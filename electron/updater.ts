import { ipcMain, BrowserWindow } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

type UpdateEventKind =
  | 'checking'
  | 'available'
  | 'not-available'
  | 'error'
  | 'progress'
  | 'downloaded';

interface UpdateEventPayload {
  kind: UpdateEventKind;
  version?: string;
  releaseNotes?: string | null;
  releaseName?: string | null;
  message?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
}

let initialised = false;
let mainRef: BrowserWindow | null = null;

function send(payload: UpdateEventPayload): void {
  if (!mainRef || mainRef.isDestroyed()) return;
  mainRef.webContents.send('update:event', payload);
}

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  if (initialised) {
    mainRef = mainWindow;
    return;
  }
  initialised = true;
  mainRef = mainWindow;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] checking-for-update');
    send({ kind: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[updater] update-available v${info?.version}`);
    const releaseNotes = typeof info?.releaseNotes === 'string'
      ? info.releaseNotes
      : Array.isArray(info?.releaseNotes)
        ? info.releaseNotes.map((n) => (typeof n === 'string' ? n : n.note ?? '')).join('\n\n')
        : null;
    send({
      kind: 'available',
      version: info?.version,
      releaseNotes,
      releaseName: info?.releaseName ?? null,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log(`[updater] update-not-available v${info?.version}`);
    send({ kind: 'not-available', version: info?.version });
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] error', err);
    send({ kind: 'error', message: err?.message ?? String(err) });
  });

  autoUpdater.on('download-progress', (progress) => {
    send({
      kind: 'progress',
      percent: Math.round(progress.percent ?? 0),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[updater] update-downloaded v${info?.version}`);
    send({ kind: 'downloaded', version: info?.version });
  });
}

export function registerUpdaterIpc(): void {
  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, version: result?.updateInfo?.version ?? null };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('update:install', () => {
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true);
    });
    return { ok: true };
  });
}
