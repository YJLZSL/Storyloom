import { useEffect, useRef } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { useUIStore } from '@/stores/useUIStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { TopToolbar } from './TopToolbar';
import { SideNav } from './SideNav';
import { ContextPanel } from './ContextPanel';
import { StatusBar } from './StatusBar';
import { TimelineView } from '@/components/timeline/TimelineView';
import { OutlineView } from '@/components/outline/OutlineView';
import { NarrativeView } from '@/components/timeline/NarrativeView';
import { GanttTimelineView } from '@/components/timeline/GanttTimelineView';
import { StatsView } from '@/components/stats/StatsView';
import { RelationshipView } from '@/components/relationship-graph/RelationshipView';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { useCommandContext } from '@/components/command-palette/commands';
import { ShortcutSettings } from '@/components/settings/ShortcutSettings';
import { tryHandleShortcut, getCurrentContext } from '@/lib/shortcut-registry';

function MainCanvas() {
  const viewMode = useTimelineStore((s) => s.viewMode);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

  if (!currentWorkspaceId) {
    return <WorkspaceSelector />;
  }

  switch (viewMode) {
    case 'timeline':
      return <TimelineView />;
    case 'outline':
      return <OutlineView />;
    case 'narrative':
      return <NarrativeView />;
    case 'gantt':
      return <GanttTimelineView />;
    case 'statistics':
      return <StatsView />;
    case 'relationship':
      return <RelationshipView />;
    default:
      return <TimelineView />;
  }
}

export function AppShell() {
  const focusMode = useUIStore((s) => s.focusMode);
  const panelWidth = useUIStore((s) => s.panelWidth);
  const theme = useThemeStore((s) => s.theme);

  // 命令上下文（供快捷键系统调用命令 handler）
  const ctx = useCommandContext();
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  // 主题初始化：同步 dark class 到 documentElement
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // 全局快捷键监听：根据 when 上下文过滤匹配的快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      tryHandleShortcut(e, getCurrentContext(), ctxRef.current);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shellStyle = {
    '--panel-width': `${panelWidth}px`,
  } as React.CSSProperties;

  if (focusMode) {
    return (
      <TooltipProvider delayDuration={300}>
        <div
          className="h-screen w-screen overflow-hidden bg-background text-foreground"
          style={shellStyle}
        >
          <div
            className="grid h-full"
            style={{ gridTemplateColumns: `1fr var(--panel-width)` }}
          >
            <main className="overflow-auto">
              <MainCanvas />
            </main>
            <ContextPanel />
          </div>
          <CommandPalette />
          <ShortcutSettings />
          <Toaster position="top-right" richColors />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="h-screen w-screen overflow-hidden bg-background text-foreground"
        style={shellStyle}
      >
        <div
          className="grid h-full"
          style={{
            gridTemplateRows: '48px 1fr 28px',
            gridTemplateColumns: `56px 1fr var(--panel-width)`,
          }}
        >
          {/* Row 1: TopToolbar spans all columns */}
          <div style={{ gridColumn: '1 / -1' }}>
            <TopToolbar />
          </div>

          {/* Row 2: SideNav | Main Canvas | ContextPanel */}
          <SideNav />
          <main className="overflow-auto">
            <MainCanvas />
          </main>
          <ContextPanel />

          {/* Row 3: StatusBar spans all columns */}
          <div style={{ gridColumn: '1 / -1' }}>
            <StatusBar />
          </div>
        </div>
        <CommandPalette />
        <ShortcutSettings />
        <Toaster position="top-right" richColors />
      </div>
    </TooltipProvider>
  );
}
