import { useEffect, useRef, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { useUIStore } from '@/stores/useUIStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useSettingsStore, deserializeSettings } from '@/stores/useSettingsStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { TopToolbar } from './TopToolbar';
import { SideNav } from './SideNav';
import { ContextPanel } from './ContextPanel';
import { StatusBar } from './StatusBar';
import { TimelineView } from '@/components/timeline/TimelineView';
import { OutlineView } from '@/components/outline/OutlineView';
import { NarrativeView } from '@/components/timeline/NarrativeView';
import { GanttTimelineView } from '@/components/timeline/GanttTimelineView';
import { TreeTimelineView } from '@/components/timeline/TreeTimelineView';
import { StatsView } from '@/components/stats/StatsView';
import { RelationshipView } from '@/components/relationship-graph/RelationshipView';
import { EmptyShell } from './EmptyShell';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { useCommandContext } from '@/components/command-palette/commands';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { EventDetailView } from '@/components/events/EventDetailView';
import { tryHandleShortcut, getCurrentContext } from '@/lib/shortcut-registry';
import { setApiBase } from '@/services/api';
import { useWorkspace } from '@/services/api-hooks';

function MainCanvas() {
  const viewMode = useTimelineStore((s) => s.viewMode);

  switch (viewMode) {
    case 'timeline':
      return <TimelineView />;
    case 'outline':
      return <OutlineView />;
    case 'narrative':
      return <NarrativeView />;
    case 'gantt':
      return <GanttTimelineView />;
    case 'tree':
      return <TreeTimelineView />;
    case 'statistics':
      return <StatsView />;
    case 'relationship':
      return <RelationshipView />;
    default:
      return <TimelineView />;
  }
}

export function AppShell() {
  const [sideNavCollapsed, setSideNavCollapsed] = useState(false);
  const sideNavManualOverride = useRef(false);
  const isCompactScreen = useMediaQuery('(max-width: 1024px)');

  // 响应式自动折叠：< 1024px 自动折叠侧栏；用户手动切换后本会话保持手动状态。
  useEffect(() => {
    if (sideNavManualOverride.current) return;
    setSideNavCollapsed(isCompactScreen);
  }, [isCompactScreen]);
  const focusMode = useUIStore((s) => s.focusMode);
  const activePanel = useUIStore((s) => s.activePanel);
  const panelWidth = useUIStore((s) => s.panelWidth);

  // 命令上下文（供快捷键系统调用命令 handler）
  const ctx = useCommandContext();
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  // 主题初始化由 useThemeStore 在 rehydrate 时完成（设置 data-theme），此处无需重复

  // 初始化 Electron 环境下的 API 基地址（动态获取实际服务器端口）
  useEffect(() => {
    if (window.electronAPI?.getServerPort) {
      window.electronAPI.getServerPort().then(setApiBase);
    }
  }, []);

  // 当前工作区 settingsJson 反序列化合并到 settings store
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: workspace } = useWorkspace(currentWorkspaceId);
  const appliedSettingsJsonRef = useRef<string | null>(null);

  useEffect(() => {
    if (!workspace?.settingsJson) return;
    if (workspace.settingsJson === appliedSettingsJsonRef.current) return;

    const parsed = deserializeSettings(workspace.settingsJson);
    if (Object.keys(parsed).length > 0) {
      useSettingsStore.getState().mergeSettings(parsed);
    }
    appliedSettingsJsonRef.current = workspace.settingsJson;
  }, [workspace?.settingsJson]);

  // 全局快捷键监听：根据 when 上下文过滤匹配的快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 连续缩放快捷键（Ctrl/Cmd + +/-0），阻止浏览器默认缩放
      if (e.ctrlKey || e.metaKey) {
        const isZoomIn = e.key === '=' || e.key === '+' || e.key === 'NumpadAdd';
        const isZoomOut = e.key === '-' || e.key === 'NumpadSubtract';
        const isReset = e.key === '0';
        if (isZoomIn || isZoomOut || isReset) {
          e.preventDefault();
          e.stopPropagation();
          const { zoomIn, zoomOut, resetZoom } = useTimelineStore.getState();
          if (isZoomIn) zoomIn(0.1);
          else if (isZoomOut) zoomOut(0.1);
          else resetZoom();
          return;
        }
      }
      tryHandleShortcut(e, getCurrentContext(), ctxRef.current);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shellStyle = {
    '--panel-width': `${panelWidth}px`,
  } as React.CSSProperties;

  if (!currentWorkspaceId) {
    return <EmptyShell />;
  }

  if (focusMode) {
    return (
      <TooltipProvider delayDuration={300}>
        <div
          className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground"
          style={shellStyle}
        >
          <div className="flex flex-1 overflow-hidden">
            <main className="min-w-0 flex-1 overflow-auto">
              <MainCanvas />
            </main>
            {activePanel && <ContextPanel />}
          </div>
          <CommandPalette />
          <SettingsDialog />
          <EventDetailView />
          <Toaster position="top-right" richColors />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground"
        style={shellStyle}
      >
        <TopToolbar />

        <div className="flex flex-1 overflow-hidden">
          <SideNav
            collapsed={sideNavCollapsed}
            onToggle={() => {
              sideNavManualOverride.current = true;
              setSideNavCollapsed((c) => !c);
            }}
          />
          <main className="min-w-0 flex-1 overflow-auto">
            <MainCanvas />
          </main>
          {activePanel && <ContextPanel />}
        </div>

        <StatusBar />

        <CommandPalette />
        <SettingsDialog />
        <EventDetailView />
        <Toaster position="top-right" richColors />
      </div>
    </TooltipProvider>
  );
}
