import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { useUIStore } from '@/stores/useUIStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useSettingsStore, deserializeSettings } from '@/stores/useSettingsStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { TopToolbar } from './TopToolbar';
import { LeftPanel } from './LeftPanel';
import { ContextPanel } from './ContextPanel';
import { StatusBar } from './StatusBar';
import { ZenMode } from '@/components/zen-mode/ZenMode';
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
import { NotebookView } from '@/components/notebook/NotebookView';
import { AIAssistantView } from '@/components/ai/AIAssistantView';
import { WritingView } from '@/components/writing/WritingView';
import { ScriptEditorView } from '@/components/script-editor/ScriptEditorView';
import { tryHandleShortcut, getCurrentContext } from '@/lib/shortcut-registry';
import { setApiBase } from '@/services/api';
import { getServerPort, isTauri } from '@/lib/tauri-api';
import { useWorkspace } from '@/services/api-hooks';
import { PanelLeftIcon, LayersIcon, BookmarkIcon, MapIcon } from '@/lib/icons';
import { TButton } from '@/components/ui-tdesign';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu';
import type { PageId } from '@/stores/useUIStore';

// 时间轴视图体系页面：这些页面显示左侧边栏
const TIMELINE_PAGES: PageId[] = ['timeline', 'outline', 'narrative', 'gantt', 'tree', 'stats', 'relationship'];

const viewVariants = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};

function MainCanvas() {
  const viewMode = useTimelineStore((s) => s.viewMode);
  const currentPage = useUIStore((s) => s.currentPage);

  const renderView = () => {
    // 非时间轴页面：使用 currentPage 直接渲染对应视图
    if (!TIMELINE_PAGES.includes(currentPage)) {
      switch (currentPage) {
        case 'notebook':
          return <NotebookView />;
        case 'ai':
          return <AIAssistantView />;
        case 'writing':
          return <WritingView />;
        case 'script-editor':
          return <ScriptEditorView />;
        default:
          return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <h2 className="text-lg font-medium mb-2">{currentPage}</h2>
                <p className="text-sm">此页面正在开发中</p>
              </div>
            </div>
          );
      }
    }

    // 时间轴视图体系：沿用现有渲染逻辑
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
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage + viewMode}
        className="h-full w-full"
        variants={viewVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {renderView()}
      </motion.div>
    </AnimatePresence>
  );
}

export function AppShell() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  const focusMode = useUIStore((s) => s.focusMode);
  const zenMode = useUIStore((s) => s.zenMode);
  const setZenMode = useUIStore((s) => s.setZenMode);
  const activePanel = useUIStore((s) => s.activePanel);
  const panelWidth = useUIStore((s) => s.panelWidth);
  const currentPage = useUIStore((s) => s.currentPage);
  const showLeftPanel = useUIStore((s) => s.showLeftPanel);

  // 判断当前是否显示左侧边栏
  const isTimelinePage = TIMELINE_PAGES.includes(currentPage);
  const shouldShowLeftPanel = isTimelinePage && showLeftPanel;

  // 命令上下文（供快捷键系统调用命令 handler）
  const ctx = useCommandContext();
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  // 初始化 Tauri 环境下的 API 基地址（动态获取实际服务器端口）
  useEffect(() => {
    if (isTauri()) {
      getServerPort()
        .then((port) => setApiBase(port))
        .catch(() => {
          // silently ignore port detection failure
        });
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

  // 移动端 ESC 关闭面板
  useEffect(() => {
    if (!isMobile) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileLeftOpen(false);
        setMobileRightOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isMobile]);

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
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <main className="min-w-0 flex-1 overflow-auto">
                  <MainCanvas />
                </main>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => ctx.createEvent()}>新建事件</ContextMenuItem>
                <ContextMenuItem onClick={() => ctx.save()}>保存</ContextMenuItem>
                <ContextMenuItem onClick={() => useUIStore.getState().toggleFocusMode()}>切换专注模式</ContextMenuItem>
                <ContextMenuItem onClick={() => useUIStore.getState().toggleZenMode()}>切换 Zen 模式</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem icon={<BookmarkIcon size={14} />} onClick={() => useUIStore.getState().setActivePanel(useUIStore.getState().activePanel === 'bookmarks' ? null : 'bookmarks')}>书签</ContextMenuItem>
                <ContextMenuItem icon={<MapIcon size={14} />} onClick={() => useUIStore.getState().setActivePanel(useUIStore.getState().activePanel === 'maps' ? null : 'maps')}>地图</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => document.execCommand('copy')}>复制</ContextMenuItem>
                <ContextMenuItem onClick={() => document.execCommand('paste')}>粘贴</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
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

  if (zenMode) {
    return (
      <TooltipProvider delayDuration={300}>
        <AnimatePresence>
          <ZenMode key="zen-mode" onExit={() => setZenMode(false)} />
        </AnimatePresence>
        <CommandPalette />
        <SettingsDialog />
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground"
        style={shellStyle}
      >
        <TopToolbar />

        <div className="flex flex-1 overflow-hidden">
          {/* 左栏 — 仅在时间轴页面且非折叠时显示 */}
          {shouldShowLeftPanel && (
            isMobile ? (
              <MobileDrawer
                open={mobileLeftOpen}
                onClose={() => setMobileLeftOpen(false)}
                position="left"
              >
                <LeftPanel />
              </MobileDrawer>
            ) : (
              <LeftPanel />
            )
          )}

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <main className={cn('min-w-0 flex-1 overflow-auto', !shouldShowLeftPanel && 'w-full')}>
                <MainCanvas />
              </main>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => ctx.createEvent()}>新建事件</ContextMenuItem>
              <ContextMenuItem onClick={() => ctx.save()}>保存</ContextMenuItem>
              <ContextMenuItem onClick={() => useUIStore.getState().toggleFocusMode()}>切换专注模式</ContextMenuItem>
              <ContextMenuItem onClick={() => useUIStore.getState().toggleZenMode()}>切换 Zen 模式</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem icon={<BookmarkIcon size={14} />} onClick={() => useUIStore.getState().setActivePanel(useUIStore.getState().activePanel === 'bookmarks' ? null : 'bookmarks')}>书签</ContextMenuItem>
              <ContextMenuItem icon={<MapIcon size={14} />} onClick={() => useUIStore.getState().setActivePanel(useUIStore.getState().activePanel === 'maps' ? null : 'maps')}>地图</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => document.execCommand('copy')}>复制</ContextMenuItem>
              <ContextMenuItem onClick={() => document.execCommand('paste')}>粘贴</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {/* 右栏 — 移动端 Sheet */}
          {isMobile ? (
            activePanel && (
              <MobileDrawer
                open={mobileRightOpen}
                onClose={() => setMobileRightOpen(false)}
                position="right"
              >
                <ContextPanel />
              </MobileDrawer>
            )
          ) : (
            activePanel && <ContextPanel />
          )}
        </div>

        <StatusBar />

        {/* 移动端浮动按钮 */}
        {isMobile && (
          <MobileFloatButtons
            leftOpen={mobileLeftOpen}
            onToggleLeft={() => {
              setMobileLeftOpen((o) => !o);
              setMobileRightOpen(false);
            }}
            rightOpen={mobileRightOpen}
            onToggleRight={() => {
              setMobileRightOpen((o) => !o);
              setMobileLeftOpen(false);
            }}
            rightEnabled={!!activePanel}
            leftEnabled={shouldShowLeftPanel}
          />
        )}

        <CommandPalette />
        <SettingsDialog />
        <EventDetailView />
        <Toaster position="top-right" richColors />
      </div>
    </TooltipProvider>
  );
}

/* ───────── 移动端抽屉 ───────── */

function MobileDrawer({
  open,
  onClose,
  position,
  children,
}: {
  open: boolean;
  onClose: () => void;
  position: 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 遮罩 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[var(--z-overlay)] bg-black/40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* 面板 */}
      <motion.div
        initial={false}
        animate={{
          x: open ? 0 : position === 'left' ? '-100%' : '100%',
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={
          position === 'left'
            ? 'fixed bottom-0 left-0 top-11 z-[var(--z-sidenav)] w-64 shadow-xl'
            : 'fixed bottom-0 right-0 top-11 z-[var(--z-sidenav)] w-[var(--panel-width)] shadow-xl'
        }
        style={{ maxWidth: '80vw' }}
      >
        {children}
      </motion.div>
    </>
  );
}

/* ───────── 移动端浮动按钮 ───────── */

function MobileFloatButtons({
  leftOpen,
  onToggleLeft,
  rightOpen,
  onToggleRight,
  rightEnabled,
  leftEnabled,
}: {
  leftOpen: boolean;
  onToggleLeft: () => void;
  rightOpen: boolean;
  onToggleRight: () => void;
  rightEnabled: boolean;
  leftEnabled: boolean;
}) {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-[var(--z-overlay)] flex justify-between pointer-events-none">
      {leftEnabled && (
        <TButton
          variant={leftOpen ? 'base' : 'outline'}
          shape="circle"
          size="small"
          className={cn(
            'pointer-events-auto h-12 w-12 shadow-lg transition-all duration-300',
            leftOpen ? 'btn-brown scale-105' : 'bg-background/90 backdrop-blur hover:scale-105',
          )}
          onClick={onToggleLeft}
          icon={<PanelLeftIcon size={22} />}
          aria-label="打开目录"
        />
      )}
      {rightEnabled && (
        <TButton
          variant={rightOpen ? 'base' : 'outline'}
          shape="circle"
          size="small"
          className={cn(
            'pointer-events-auto h-12 w-12 shadow-lg transition-all duration-300',
            rightOpen ? 'btn-green scale-105' : 'bg-background/90 backdrop-blur hover:scale-105',
          )}
          onClick={onToggleRight}
          icon={<LayersIcon size={22} />}
          aria-label="打开面板"
        />
      )}
    </div>
  );
}
