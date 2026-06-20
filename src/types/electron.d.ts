// 全局 Electron 桥接类型：preload 暴露的 window.electronAPI 与 window.updater
declare global {
  interface UpdateEventPayload {
    kind: 'checking' | 'available' | 'not-available' | 'error' | 'progress' | 'downloaded';
    version?: string;
    releaseNotes?: string | null;
    releaseName?: string | null;
    message?: string;
    percent?: number;
    bytesPerSecond?: number;
    transferred?: number;
    total?: number;
  }

  interface UpdaterApi {
    onEvent: (cb: (payload: UpdateEventPayload) => void) => () => void;
    check: () => Promise<{ ok: boolean; version?: string | null; error?: string }>;
    download: () => Promise<{ ok: boolean; error?: string }>;
    install: () => Promise<{ ok: boolean }>;
  }

  interface ElectronAPI {
    platform: string;
    isElectron: boolean;
    isPackaged: boolean;
    getServerPort?: () => Promise<number>;
    openExternal?: (url: string) => Promise<unknown>;
    openLogFolder?: () => Promise<void>;
    getUserDataPath?: () => Promise<string>;
  }

  interface Window {
    updater?: UpdaterApi;
    electronAPI?: ElectronAPI;
  }
}

export {};
