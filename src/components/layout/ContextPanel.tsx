import { useCallback } from 'react';
import { XIcon, MinusIcon, PlusIcon } from '@/lib/icons';
import { TButton } from '@/components/ui-tdesign';
import { useUIStore } from '@/stores/useUIStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { useEvent } from '@/services/api-hooks';
import { AIPanel } from '@/components/ai-panel/AIPanel';
import { EventEditorDialog } from '@/components/events/EventEditorDialog';
import { CharacterPanel } from '@/components/characters/CharacterPanel';
import { WorldBuildingPanel } from '@/components/worldbuilding/WorldBuildingPanel';
import { ForeshadowingPanel } from '@/components/foreshadowing/ForeshadowingPanel';
import { ConnectionPanel } from '@/components/connection/ConnectionPanel';
import { ConsistencyPanel } from '@/components/consistency/ConsistencyPanel';
import type { TimelineEvent } from '../../../shared/types';

const PANEL_TITLES: Record<string, string> = {
  properties: '属性',
  'event-editor': '事件编辑器',
  ai: 'AI 面板',
  characters: '角色管理',
  worldview: '世界观',
  foreshadowing: '伏笔',
  connections: '关联',
  consistency: '一致性检查',
  shortcuts: '快捷键设置',
};

export function ContextPanel() {
  const activePanel = useUIStore((s) => s.activePanel);
  const panelWidth = useUIStore((s) => s.panelWidth);
  const setPanelWidth = useUIStore((s) => s.setPanelWidth);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const selectedEventId = useSelectionStore((s) => s.selectedEventId);
  const selectedCharacterId = useSelectionStore((s) => s.selectedCharacterId);
  const viewMode = useTimelineStore((s) => s.viewMode);
  const outlineFontSize = useSettingsStore((s) => s.outlineFontSize);
  const setOutlineFontSize = useSettingsStore((s) => s.setOutlineFontSize);
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: selectedEvent } = useEvent(workspaceId, selectedEventId);

  // 拖拽调整宽度
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = panelWidth;

      const handleMouseMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        setPanelWidth(startWidth + delta);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [panelWidth, setPanelWidth],
  );

  const handleClose = () => {
    setActivePanel(null);
  };

  // 决定面板标题与内容
  const { title, content } = getPanelContent(
    activePanel,
    selectedEvent ?? null,
    selectedEventId,
    selectedCharacterId,
    handleClose,
    () => setSettingsOpen(true),
  );

  return (
    <aside
      className="relative flex flex-col border-l border-border bg-card"
      style={{ width: `var(--panel-width)` }}
    >
      {/* 左侧拖拽 handle */}
      <div
        className="absolute inset-y-0 left-0 w-1 cursor-col-resize transition-colors hover:bg-primary/30"
        onMouseDown={handleDragStart}
      />

      {/* 标题栏 */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 className="font-serif text-sm font-semibold text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          {viewMode === 'outline' && (
            <div className="flex items-center gap-1">
              <TButton
                variant="text"
                shape="square"
                size="small"
                className="size-7"
                disabled={outlineFontSize <= 12}
                onClick={() => setOutlineFontSize(outlineFontSize - 1)}
                title="减小字号"
                icon={<MinusIcon size={16} />}
              />
              <span className="w-5 text-center text-xs tabular-nums text-muted-foreground">{outlineFontSize}</span>
              <TButton
                variant="text"
                shape="square"
                size="small"
                className="size-7"
                disabled={outlineFontSize >= 24}
                onClick={() => setOutlineFontSize(outlineFontSize + 1)}
                title="增大字号"
                icon={<PlusIcon size={16} />}
              />
            </div>
          )}
          <TButton
            variant="text"
            shape="square"
            size="small"
            className="size-7"
            onClick={handleClose}
            icon={<XIcon size={16} />}
            title="关闭"
          />
        </div>
      </div>

      {/* 面板内容 */}
      <div className={activePanel === 'ai' ? 'flex-1 overflow-hidden p-0' : 'flex-1 overflow-auto p-4'}>
        {content}
      </div>
    </aside>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-center text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-center text-sm text-muted-foreground">
        选择一个事件或角色查看详情
      </p>
    </div>
  );
}

function ShortcutSettingsPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <p className="text-center text-sm text-muted-foreground">
        点击下方按钮打开快捷键设置对话框
      </p>
      <TButton variant="outline" size="small" onClick={onOpen}>
        打开快捷键设置
      </TButton>
    </div>
  );
}

function getPanelContent(
  activePanel: string | null,
  selectedEvent: TimelineEvent | null,
  selectedEventId: string | null,
  selectedCharacterId: string | null,
  onClose: () => void,
  onOpenSettings: () => void,
): { title: string; content: React.ReactNode } {
  if (!activePanel) {
    return { title: '上下文面板', content: <EmptyState /> };
  }

  switch (activePanel) {
    case 'properties':
      if (selectedEventId) {
        if (!selectedEvent) {
          return { title: '事件编辑器', content: <Placeholder label="加载事件…" /> };
        }
        return { title: '事件编辑器', content: <EventEditorDialog event={selectedEvent} onClose={onClose} /> };
      }
      if (selectedCharacterId) {
        return { title: '角色详情', content: <Placeholder label="请在角色面板中查看和编辑角色详情" /> };
      }
      return { title: '属性', content: <EmptyState /> };

    case 'event-editor':
      if (selectedEventId && !selectedEvent) {
        return { title: PANEL_TITLES['event-editor'], content: <Placeholder label="加载事件…" /> };
      }
      return {
        title: PANEL_TITLES['event-editor'],
        content: <EventEditorDialog event={selectedEvent} onClose={onClose} />,
      };

    case 'ai':
      return { title: PANEL_TITLES.ai, content: <AIPanel /> };

    case 'characters':
      return { title: PANEL_TITLES.characters, content: <CharacterPanel /> };

    case 'worldview':
      return { title: PANEL_TITLES.worldview, content: <WorldBuildingPanel /> };

    case 'foreshadowing':
      return { title: PANEL_TITLES.foreshadowing, content: <ForeshadowingPanel /> };

    case 'connections':
      return { title: PANEL_TITLES.connections, content: <ConnectionPanel /> };

    case 'consistency':
      return { title: PANEL_TITLES.consistency, content: <ConsistencyPanel /> };

    case 'shortcuts':
      return { title: PANEL_TITLES.shortcuts, content: <ShortcutSettingsPanel onOpen={onOpenSettings} /> };

    default:
      return { title: '上下文面板', content: <EmptyState /> };
  }
}
