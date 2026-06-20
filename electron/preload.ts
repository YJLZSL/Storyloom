import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  isPackaged: ipcRenderer.sendSync('updater:is-packaged') as boolean,
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  openLogFolder: () => ipcRenderer.invoke('open-log-folder'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
});

contextBridge.exposeInMainWorld('updater', {
  onEvent: (cb: (payload: unknown) => void) => {
    const handler = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on('update:event', handler);
    return () => ipcRenderer.removeListener('update:event', handler);
  },
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  install: () => ipcRenderer.invoke('update:install'),
});
