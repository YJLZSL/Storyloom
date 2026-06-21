import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { EventContextPanel } from './EventContextPanel';
import { BookmarkPanel } from '@/components/bookmark/BookmarkPanel';
import { MapView } from '@/components/maps/MapView';
import type { TimelineEvent } from '../../../shared/types';

const PANEL_TITLES: Record<string, string> = {
  properties: 'contextPanel.properties',
  'event-editor': 'contextPanel.eventEditor',
  ai: 'contextPanel.aiPanel',
  characters: 'contextPanel.characterManagement',
  worldview: 'contextPanel.worldview',
  foreshadowing: 'contextPanel.foreshadowing',
  connections: 'contextPanel.connections',
  consistency: 'contextPanel.consistencyCheck',
  shortcuts: 'contextPanel.shortcuts',
  bookmarks: '书签',
  maps: '地图',
};

export function ContextPanel() {
  const { t } = useTranslation();
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
    workspaceId,
    handleClose,
    () => setSettingsOpen(true),
    t,
  );

  return (
    <aside
      className="relative flex flex-col border-l border-border/40 glass panel-enter card-hover-shadow"
      style={{ width: `var(--panel-width)` }}
    >
      {/* 左侧拖拽 handle */}
      <div
        className="absolute inset-y-0 left-0 w-1 cursor-col-resize transition-all duration-200 hover:bg-primary/40 hover:shadow-[2px_0_6px_rgb(var(--primary)/0.15)] hover:w-1.5"
        onMouseDown={handleDragStart}
      />

      {/* 标题栏 */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/30 px-4 glass-subtle">
        <h2 className="font-serif text-sm font-semibold text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          {viewMode === 'outline' && (
            <div className="flex items-center gap-1 rounded-lg bg-muted/50 px-1 py-0.5">
              <TButton
                variant="text"
                shape="square"
                size="small"
                className="size-7 btn-lift"
                disabled={outlineFontSize <= 12}
                onClick={() => setOutlineFontSize(outlineFontSize - 1)}
                title={t('contextPanel.decreaseFontSize')}
              >
                <MinusIcon size={16} />
              </TButton>
              <span className="w-5 text-center text-xs tabular-nums text-muted-foreground">{outlineFontSize}</span>
              <TButton
                variant="text"
                shape="square"
                size="small"
                className="size-7 btn-lift"
                disabled={outlineFontSize >= 24}
                onClick={() => setOutlineFontSize(outlineFontSize + 1)}
                title={t('contextPanel.increaseFontSize')}
              >
                <PlusIcon size={16} />
              </TButton>
            </div>
          )}
          <TButton
            variant="text"
            shape="square"
            size="small"
            className="size-7 btn-lift hover:bg-muted/80 rounded-lg"
            onClick={handleClose}
            title={t('contextPanel.close')}
          >
            <XIcon size={16} />
          </TButton>
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
    <div className="flex h-full items-center justify-center panel-enter empty-state-refined">
      <div className="flex flex-col items-center text-center gap-3 px-6">
        <div className="empty-illustration">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/60 empty-icon">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
              <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center panel-enter empty-state-refined">
      <div className="flex flex-col items-center text-center gap-3 px-6">
        <div className="empty-illustration">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/60 empty-icon">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
              <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <p className="text-sm font-medium text-foreground">{t('contextPanel.selectEventOrCharacter')}</p>
        <p className="text-xs text-muted-foreground/70 max-w-[180px]">
          {t('contextPanel.emptyStateSubtitle')}
        </p>
      </div>
    </div>
  );
}

function ShortcutSettingsPanel({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 panel-enter">
      <div className="empty-illustration">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/60">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
            <path d="M7 9h4M7 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {t('contextPanel.shortcutSettingsDesc')}
      </p>
      <TButton variant="outline" size="small" onClick={onOpen} className="btn-lift">
        {t('contextPanel.openShortcutSettings')}
      </TButton>
    </div>
  );
}

function getPanelContent(
  activePanel: string | null,
  selectedEvent: TimelineEvent | null,
  selectedEventId: string | null,
  selectedCharacterId: string | null,
  workspaceId: string | null,
  onClose: () => void,
  onOpenSettings: () => void,
  t: (key: string) => string,
): { title: string; content: React.ReactNode } {
  if (!activePanel) {
    if (selectedEventId && selectedEvent) {
      return { title: t('contextPanel.relatedData'), content: <EventContextPanel event={selectedEvent} workspaceId={workspaceId} /> };
    }
    if (selectedCharacterId) {
      return { title: t('contextPanel.characterDetails'), content: <Placeholder label={t('contextPanel.viewInCharacterPanel')} /> };
    }
    return { title: t('contextPanel.contextPanel'), content: <EmptyState /> };
  }

  switch (activePanel) {
    case 'properties':
      if (selectedEventId) {
        if (!selectedEvent) {
          return { title: t('contextPanel.eventEditor'), content: <Placeholder label={t('contextPanel.loading')} /> };
        }
        return { title: t('contextPanel.eventEditor'), content: <EventEditorDialog event={selectedEvent} onClose={onClose} /> };
      }
      if (selectedCharacterId) {
        return { title: t('contextPanel.characterDetails'), content: <Placeholder label={t('contextPanel.viewInCharacterPanel')} /> };
      }
      return { title: t('contextPanel.properties'), content: <EmptyState /> };

    case 'event-editor':
      if (selectedEventId && !selectedEvent) {
        return { title: t(PANEL_TITLES['event-editor']), content: <Placeholder label={t('contextPanel.loading')} /> };
      }
      return {
        title: t(PANEL_TITLES['event-editor']),
        content: <EventEditorDialog event={selectedEvent} onClose={onClose} />,
      };

    case 'ai':
      return { title: t(PANEL_TITLES.ai), content: <AIPanel /> };

    case 'characters':
      return { title: t(PANEL_TITLES.characters), content: <CharacterPanel /> };

    case 'worldview':
      return { title: t(PANEL_TITLES.worldview), content: <WorldBuildingPanel /> };

    case 'foreshadowing':
      return { title: t(PANEL_TITLES.foreshadowing), content: <ForeshadowingPanel /> };

    case 'connections':
      return { title: t(PANEL_TITLES.connections), content: <ConnectionPanel /> };

    case 'consistency':
      return { title: t(PANEL_TITLES.consistency), content: <ConsistencyPanel /> };

    case 'shortcuts':
      return { title: t(PANEL_TITLES.shortcuts), content: <ShortcutSettingsPanel onOpen={onOpenSettings} /> };

    case 'bookmarks':
      return { title: PANEL_TITLES.bookmarks, content: <BookmarkPanel /> };

    case 'maps':
      return { title: PANEL_TITLES.maps, content: <MapView /> };

    default:
      return { title: t('contextPanel.contextPanel'), content: <EmptyState /> };
  }
}
