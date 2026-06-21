import { memo, useState, useRef, useEffect } from 'react';
import { TimelineEventCard } from './TimelineEventCard';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu';
import { TPopup } from '@/components/ui-tdesign';
import { EditIcon, EyesIcon, EyesOffIcon, DeleteIcon, PaletteIcon, PlusIcon } from '@/lib/icons';
import { useUpdateTrack, useDeleteTrack } from '@/services/api-hooks';
import { useTrackStore } from '@/stores/useTrackStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { MessagePlugin } from 'tdesign-react';
import { TRACK_COLORS } from '@/lib/colors';
import type { Track as TrackType, TimelineEvent } from '../../../shared/types';

const TRACK_HEIGHT = 80;
const TRACK_GAP = 8;
const HEADER_WIDTH = 200;
const MIN_EVENT_WIDTH = 96;

export interface TimelineTrackProps {
  track: TrackType;
  events: TimelineEvent[];
  trackIndex: number;
  pixelsPerMs: number;
  referenceDateMs: number;
  contentWidth: number;
  viewportLeft: number;
  viewportWidth: number;
  workspaceId: string | null;
  isReadOnly?: boolean;
  onCreateTrack?: () => void;
  onResizeEnd: (eventId: string, startTime: number | null, endTime: number | null) => void;
  onDragEnd: (eventId: string, startTime: number, endTime: number | null) => void;
}

export const TimelineTrack = memo(function TimelineTrack({
  track,
  events,
  trackIndex,
  pixelsPerMs,
  referenceDateMs,
  contentWidth,
  viewportLeft,
  viewportWidth,
  workspaceId,
  isReadOnly,
  onCreateTrack,
  onResizeEnd,
  onDragEnd,
}: TimelineTrackProps) {
  const zoom = useTimelineStore((s) => s.zoom);
  const scaledTrackHeight = TRACK_HEIGHT * zoom;
  const top = trackIndex * (scaledTrackHeight + TRACK_GAP);
  const editingTrackId = useTrackStore((s) => s.editingTrackId);
  const setEditingTrack = useTrackStore((s) => s.setEditingTrack);
  const selectedTrackId = useTrackStore((s) => s.selectedTrackId);
  const setSelectedTrack = useTrackStore((s) => s.setSelectedTrack);
  const updateTrack = useUpdateTrack();
  const deleteTrack = useDeleteTrack();

  const isEditing = editingTrackId === track.id && !isReadOnly;
  const isSelected = selectedTrackId === track.id;

  const [draftName, setDraftName] = useState(track.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraftName(track.name);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing, track.name]);

  const buffer = 100;
  const visibleStart = viewportLeft - buffer;
  const visibleEnd = viewportLeft + viewportWidth + buffer;

  const visibleEvents = events.filter((event) => {
    if (!event.startTime) return true;
    const startMs = new Date(event.startTime).getTime();
    const endMs = event.endTime ? new Date(event.endTime).getTime() : startMs;
    const leftPx = (startMs - referenceDateMs) * pixelsPerMs;
    const rightPx = (endMs - referenceDateMs) * pixelsPerMs;
    return rightPx >= visibleStart && leftPx <= visibleEnd;
  });

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (!workspaceId || !trimmed || trimmed === track.name) {
      setEditingTrack(null);
      return;
    }
    updateTrack.mutate(
      { workspaceId, trackId: track.id, data: { name: trimmed } },
      {
        onSuccess: () => MessagePlugin.success('轨道名称已更新'),
        onError: () => MessagePlugin.error('重命名失败'),
      },
    );
    setEditingTrack(null);
  };

  const handleToggleVisible = () => {
    if (!workspaceId || isReadOnly) return;
    updateTrack.mutate({
      workspaceId,
      trackId: track.id,
      data: { isVisible: !track.isVisible },
    });
  };

  const handleChangeColor = (color: string) => {
    if (!workspaceId || isReadOnly) return;
    updateTrack.mutate({
      workspaceId,
      trackId: track.id,
      data: { color },
    });
    setShowColorPicker(false);
  };

  const handleDelete = () => {
    if (!workspaceId || isReadOnly) return;
    if (!confirm(`确定删除轨道「${track.name}」吗？该轨道下的事件将变为未分类。`)) return;
    deleteTrack.mutate(
      { workspaceId, trackId: track.id },
      {
        onSuccess: () => MessagePlugin.success('轨道已删除'),
        onError: () => MessagePlugin.error('删除失败'),
      },
    );
  };

  const headerInner = (
    <div
      className={`group sticky left-0 z-20 shrink-0 border border-border/60 rounded-xl flex items-center px-3 gap-2 cursor-pointer transition-all duration-200 ${
        isSelected ? 'bg-accent/15 shadow-[var(--shadow-sm)]' : 'bg-card/60 shadow-[var(--shadow-sm)] hover:bg-card/80 hover:shadow-[var(--shadow-md)]'
      } glass-v2 track-header-float`}
      style={{ width: HEADER_WIDTH, height: 'calc(var(--timeline-track-height) * var(--zoom))' }}
      onClick={() => !isReadOnly && setSelectedTrack(track.id)}
    >
      <div
        className="w-1.5 h-10 rounded-full shrink-0"
        style={{ backgroundColor: track.color || 'rgb(var(--primary))' }}
      />
      {isEditing ? (
        <input
          ref={inputRef}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            else if (e.key === 'Escape') setEditingTrack(null);
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      ) : (
        <span
          className="font-sans text-sm font-semibold truncate flex-1"
          style={{ color: track.color || undefined }}
          onDoubleClick={(e) => {
            if (isReadOnly) return;
            e.stopPropagation();
            setEditingTrack(track.id);
          }}
          title="双击编辑名称"
        >
          {track.name}
        </span>
      )}
      {!isReadOnly && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground active:scale-90"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setEditingTrack(track.id);
            }}
            title="重命名"
          >
            <EditIcon size={16} />
          </button>
          <TPopup
            trigger="click"
            placement="bottom-left"
            visible={showColorPicker}
            onVisibleChange={setShowColorPicker}
            content={
              <div className="p-2 flex gap-1.5 flex-wrap" style={{ width: 200 }}>
                {TRACK_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleChangeColor(c)}
                    className="size-6 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                    style={{
                      backgroundColor: c,
                      border: track.color === c ? '2px solid rgb(var(--foreground))' : '2px solid transparent',
                    }}
                    title={c}
                  />
                ))}
              </div>
            }
          >
            <button
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground active:scale-90"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              title="修改颜色"
            >
              <PaletteIcon size={16} />
            </button>
          </TPopup>
          <button
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground active:scale-90"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleToggleVisible();
            }}
            title={track.isVisible ? '隐藏此轨道' : '显示此轨道'}
          >
            <EyesOffIcon size={16} />
          </button>
          <button
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-red-50 hover:text-red-500 active:scale-90"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleDelete();
            }}
            title="删除轨道"
          >
            <DeleteIcon size={16} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="absolute left-0 right-0 flex"
      style={{
        top,
        height: 'calc(var(--timeline-track-height) * var(--zoom))',
      }}
    >
      {/* Track header (sticky left) */}
      {isReadOnly ? (
        headerInner
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>{headerInner}</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              icon={<PlusIcon size={14} />}
              onSelect={() => onCreateTrack?.()}
            >
              新建轨道
            </ContextMenuItem>
            <ContextMenuItem
              icon={<EditIcon size={14} />}
              onSelect={() => setEditingTrack(track.id)}
            >
              重命名
            </ContextMenuItem>
            <ContextMenuItem
              icon={track.isVisible ? <EyesOffIcon size={14} /> : <EyesIcon size={14} />}
              onSelect={handleToggleVisible}
            >
              {track.isVisible ? '隐藏' : '显示'}
            </ContextMenuItem>
            <ContextMenuItem
              icon={<PaletteIcon size={14} />}
              onSelect={(e) => {
                e.preventDefault();
                setShowColorPicker(true);
              }}
            >
              修改颜色
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              icon={<DeleteIcon size={14} />}
              destructive
              onSelect={handleDelete}
            >
              删除轨道
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}

      {/* Track content area */}
      <div
        className="relative flex-1"
        style={{ width: contentWidth, height: scaledTrackHeight }}
      >
        {/* Track background */}
        <div
          className="absolute inset-0 border-b border-border/30"
          style={{ backgroundColor: track.color ? `${track.color}06` : undefined }}
        />

        {/* Events */}
        {visibleEvents.map((event) => {
          const startMs = event.startTime ? new Date(event.startTime).getTime() : null;
          const endMs = event.endTime ? new Date(event.endTime).getTime() : null;
          const isInstant = !endMs || (startMs !== null && endMs <= startMs);

          let left = 0;
          let width = MIN_EVENT_WIDTH;
          if (startMs) {
            left = (startMs - referenceDateMs) * pixelsPerMs;
            if (endMs && endMs > startMs) {
              width = Math.max((endMs - startMs) * pixelsPerMs, MIN_EVENT_WIDTH);
            } else {
              width = MIN_EVENT_WIDTH;
            }
          }

          return (
            <TimelineEventCard
              key={event.id}
              event={event}
              left={left}
              width={width}
              top={8}
              height={scaledTrackHeight - 16}
              pixelsPerMs={pixelsPerMs}
              isInstant={isInstant}
              onResizeEnd={onResizeEnd}
              onDragEnd={onDragEnd}
            />
          );
        })}
      </div>
    </div>
  );
});

export { TRACK_HEIGHT, TRACK_GAP, HEADER_WIDTH, MIN_EVENT_WIDTH };
