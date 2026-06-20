import { useEffect, useRef, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { TTabs, TTabPanel, TSwitch } from '@/components/ui-tdesign';
import { ThemeSelector } from './ThemeSelector';
import { ShortcutsTab } from './ShortcutSettings';
import { TutorialTab } from './TutorialTab';
import { UpdateTab } from './UpdateTab';
import { AISettingsTab } from './AISettingsTab';
import { getAllShortcuts, getCategoryLabel } from '@/lib/shortcut-registry';
import { useSettingsStore, serializeSettings } from '@/stores/useSettingsStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useUpdateWorkspace } from '@/services/api-hooks';
import { SettingsRow } from '@/components/_shared/SettingsRow';
import packageJson from '../../../package.json';

interface PackageJson {
  name: string;
  version: string;
  productName?: string;
}

const pkg = packageJson as unknown as PackageJson;
const APP_NAME = pkg.productName ?? pkg.name ?? 'Storyloom';
const APP_VERSION = pkg.version ?? 'unknown';

function PreferencesTab() {
  const openLastWorkspace = useSettingsStore((s) => s.openLastWorkspace);
  const autoSave = useSettingsStore((s) => s.autoSave);
  const setOpenLastWorkspace = useSettingsStore((s) => s.setOpenLastWorkspace);
  const setAutoSave = useSettingsStore((s) => s.setAutoSave);

  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const updateWorkspace = useUpdateWorkspace();
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    if (debounceTimer.current != null) {
      window.clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(() => {
      const settingsJson = serializeSettings(useSettingsStore.getState());
      updateWorkspace.mutate({ id: currentWorkspaceId, data: { settingsJson } });
    }, 400);

    return () => {
      if (debounceTimer.current != null) {
        window.clearTimeout(debounceTimer.current);
      }
    };
  }, [openLastWorkspace, autoSave, currentWorkspaceId, updateWorkspace]);

  return (
    <div className="flex flex-col gap-6">
      <SettingsRow
        label="启动时打开上次工作区"
        description="应用启动时自动加载最近使用的工作区"
      >
        <TSwitch
          value={openLastWorkspace}
          onChange={(v) => setOpenLastWorkspace(Boolean(v))}
        />
      </SettingsRow>

      <SettingsRow
        label="自动保存"
        description="编辑内容变更后自动保存到本地"
      >
        <TSwitch
          value={autoSave}
          onChange={(v) => setAutoSave(Boolean(v))}
        />
      </SettingsRow>
    </div>
  );
}

function AboutTab() {
  const shortcuts = getAllShortcuts();
  const categories = new Set(shortcuts.map((s) => s.category));
  const categoryList = Array.from(categories);

  const [userDataPath, setUserDataPath] = useState<string>('~/.storyloom');
  const [backupPath, setBackupPath] = useState<string>('~/.storyloom/backups');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.getUserDataPath?.().then((p: string) => {
        setUserDataPath(p);
        setBackupPath(`${p}/backups`);
      }).catch(() => {
        // fallback: keep defaults
      });
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{APP_NAME}</h3>
        <p className="text-sm text-muted-foreground">版本 {APP_VERSION}</p>
      </div>

      <Separator />

      <div className="grid gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">用户数据目录</span>
          <span className="text-muted-foreground">{userDataPath}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">自动备份路径</span>
          <span className="text-muted-foreground">{backupPath}</span>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <span className="font-medium">快捷键摘要</span>
        <div className="text-sm text-muted-foreground">
          共 {shortcuts.length} 条快捷键，分布于 {categoryList.length} 个分类
        </div>
        <div className="flex flex-wrap gap-1">
          {categoryList.map((category) => (
            <span
              key={category}
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
            >
              {getCategoryLabel(category)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsTabs() {
  const [activeTab, setActiveTab] = useState('preferences');

  return (
    <div className="flex flex-col w-full flex-1 overflow-hidden">
      <TTabs
        value={activeTab}
        onChange={(v) => setActiveTab(v as string)}
        className="border-b px-6 pt-6"
      >
        <TTabPanel value="preferences" label="偏好" />
        <TTabPanel value="theme" label="主题" />
        <TTabPanel value="ai" label="AI" />
        <TTabPanel value="shortcuts" label="快捷键" />
        <TTabPanel value="tutorial" label="教程" />
        <TTabPanel value="update" label="更新" />
        <TTabPanel value="about" label="关于与数据" />
      </TTabs>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'preferences' && <PreferencesTab />}
        {activeTab === 'theme' && <ThemeSelector />}
        {activeTab === 'ai' && <AISettingsTab />}
        {activeTab === 'shortcuts' && <ShortcutsTab />}
        {activeTab === 'tutorial' && <TutorialTab />}
        {activeTab === 'update' && <UpdateTab />}
        {activeTab === 'about' && <AboutTab />}
      </div>
    </div>
  );
}
