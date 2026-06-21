import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { TTabs, TTabPanel, TSwitch, TButton } from '@/components/ui-tdesign';
import { ThemeSelector } from './ThemeSelector';
import { ShortcutsTab } from './ShortcutSettings';
import { TutorialTab } from './TutorialTab';
import { UpdateTab } from './UpdateTab';
import { AISettingsTab } from './AISettingsTab';
import { getAllShortcuts, getCategoryLabel } from '@/lib/shortcut-registry';
import { useSettingsStore, serializeSettings } from '@/stores/useSettingsStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useUpdateWorkspace } from '@/services/api-hooks';
import { useTimelineStore } from '@/stores/useTimelineStore';
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

function TimelineSettingsTab() {
  const showConnectionLines = useTimelineStore((s) => s.showConnectionLines);
  const toggleConnectionLines = useTimelineStore((s) => s.toggleConnectionLines);
  const zoom = useTimelineStore((s) => s.zoom);
  const resetZoom = useTimelineStore((s) => s.resetZoom);
  const setZoom = useTimelineStore((s) => s.setZoom);

  return (
    <div className="flex flex-col gap-6">
      <SettingsRow
        label="显示事件连接线"
        description="在时间轴上显示事件之间的关联关系线"
      >
        <TSwitch
          value={showConnectionLines}
          onChange={() => toggleConnectionLines()}
        />
      </SettingsRow>

      <SettingsRow
        label="默认缩放级别"
        description="时间轴的默认显示缩放比例"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-12">{Math.round(zoom * 100)}%</span>
          <input
            type="range"
            min="50"
            max="300"
            step="10"
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="w-32"
          />
          <TButton
            theme="default"
            variant="outline"
            size="small"
            onClick={() => resetZoom()}
          >
            重置
          </TButton>
        </div>
      </SettingsRow>

      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
        <h4 className="text-sm font-medium mb-2">时间轴操作提示</h4>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li className="flex items-center gap-2">
            <kbd className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono">Ctrl</kbd>
            <span>+ 滚轮 = 缩放时间轴</span>
          </li>
          <li className="flex items-center gap-2">
            <kbd className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono">滚轮</kbd>
            <span>= 水平滚动时间轴</span>
          </li>
          <li className="flex items-center gap-2">
            <kbd className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono">拖拽</kbd>
            <span>= 平移时间轴视图</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const openLastWorkspace = useSettingsStore((s) => s.openLastWorkspace);
  const autoSave = useSettingsStore((s) => s.autoSave);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const setOpenLastWorkspace = useSettingsStore((s) => s.setOpenLastWorkspace);
  const setAutoSave = useSettingsStore((s) => s.setAutoSave);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);

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
  }, [openLastWorkspace, autoSave, fontFamily, currentWorkspaceId, updateWorkspace]);

  const fontOptions: { value: typeof fontFamily; label: string }[] = [
    { value: 'noto', label: 'Noto Sans' },
    { value: 'system', label: '系统字体' },
    { value: 'inter', label: 'Inter' },
    { value: 'source-han', label: '思源黑体' },
    { value: 'pixel', label: '像素风' },
  ];

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

      <SettingsRow
        label="界面字体"
        description="选择应用全局字体风格"
      >
        <div className="flex flex-wrap gap-2">
          {fontOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFontFamily(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                fontFamily === opt.value
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
        className="border-b px-6 pt-6 pr-12"
      >
  <TTabPanel value="timeline" label="时间轴" />
        <TTabPanel value="preferences" label="偏好" />
        <TTabPanel value="theme" label="主题" />
        <TTabPanel value="ai" label="AI" />
        <TTabPanel value="shortcuts" label="快捷键" />
        <TTabPanel value="tutorial" label="教程" />
        <TTabPanel value="update" label="更新" />
        <TTabPanel value="about" label="关于与数据" />
      </TTabs>

      <div className="flex-1 overflow-auto p-6 min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="min-h-[320px]"
          >
            {activeTab === 'timeline' && <TimelineSettingsTab />}
            {activeTab === 'preferences' && <PreferencesTab />}
            {activeTab === 'theme' && <ThemeSelector />}
            {activeTab === 'ai' && <AISettingsTab />}
            {activeTab === 'shortcuts' && <ShortcutsTab />}
            {activeTab === 'tutorial' && <TutorialTab />}
            {activeTab === 'update' && <UpdateTab />}
            {activeTab === 'about' && <AboutTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
