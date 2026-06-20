import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 偏好设置状态（后续 Task 5 会扩展 outlineFontSize 等字段） */
export interface SettingsState {
  openLastWorkspace: boolean;
  autoSave: boolean;
  autoCheckUpdates: boolean;
  outlineFontSize: number;
}

export interface SettingsActions {
  setOpenLastWorkspace: (v: boolean) => void;
  setAutoSave: (v: boolean) => void;
  setAutoCheckUpdates: (v: boolean) => void;
  setOutlineFontSize: (v: number) => void;
  mergeSettings: (partial: Partial<SettingsState>) => void;
}

const STORAGE_KEY = 'storyloom-settings';

const DEFAULT_SETTINGS: SettingsState = {
  openLastWorkspace: false,
  autoSave: false,
  autoCheckUpdates: true,
  outlineFontSize: 14,
};

function sanitizeSettings(value: unknown): Partial<SettingsState> {
  if (typeof value !== 'object' || value === null) return {};
  const raw = value as Record<string, unknown>;
  const result: Partial<SettingsState> = {};
  if (typeof raw.openLastWorkspace === 'boolean') {
    result.openLastWorkspace = raw.openLastWorkspace;
  }
  if (typeof raw.autoSave === 'boolean') {
    result.autoSave = raw.autoSave;
  }
  if (typeof raw.outlineFontSize === 'number' && Number.isFinite(raw.outlineFontSize)) {
    result.outlineFontSize = raw.outlineFontSize;
  }
  if (typeof raw.autoCheckUpdates === 'boolean') {
    result.autoCheckUpdates = raw.autoCheckUpdates;
  }
  return result;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setOpenLastWorkspace: (v) => set({ openLastWorkspace: v }),
      setAutoSave: (v) => set({ autoSave: v }),
      setAutoCheckUpdates: (v) => set({ autoCheckUpdates: v }),
      setOutlineFontSize: (v) => set({ outlineFontSize: Math.max(12, Math.min(24, v)) }),
      mergeSettings: (partial) =>
        set((state) => ({
          ...state,
          ...sanitizeSettings(partial),
        })),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        openLastWorkspace: state.openLastWorkspace,
        autoSave: state.autoSave,
        autoCheckUpdates: state.autoCheckUpdates,
        outlineFontSize: state.outlineFontSize,
      }),
      migrate: (persisted: unknown) => {
        const sanitized = sanitizeSettings(persisted);
        return { ...DEFAULT_SETTINGS, ...sanitized } as SettingsState & SettingsActions;
      },
    },
  ),
);

export function serializeSettings(settings: SettingsState): string {
  return JSON.stringify({
    openLastWorkspace: settings.openLastWorkspace,
    autoSave: settings.autoSave,
    autoCheckUpdates: settings.autoCheckUpdates,
    outlineFontSize: settings.outlineFontSize,
  });
}

export function deserializeSettings(json: string | null): Partial<SettingsState> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as unknown;
    return sanitizeSettings(parsed);
  } catch {
    return {};
  }
}
