import { useMemo } from 'react';
import { Dialog } from '@/components/ui-tdesign';
import { useUIStore } from '@/stores/useUIStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useEvents, useCharacters } from '@/services/api-hooks';
import { TimeIcon, LocalTwoIcon, UserIcon } from '@/lib/icons';

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  try {
    const d = typeof value === 'string' || value instanceof Date ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('zh-CN');
  } catch {
    return '—';
  }
}

export function EventDetailView() {
  const detailEventId = useUIStore((s) => s.detailEventId);
  const setDetailEvent = useUIStore((s) => s.setDetailEvent);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const setSelectedEvent = useTimelineStore((s) => s.setSelectedEvent);
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

  const { data: eventsData } = useEvents(workspaceId);
  const { data: characters } = useCharacters(workspaceId);

  const event = useMemo(() => {
    if (!detailEventId) return null;
    return eventsData?.items.find((e) => e.id === detailEventId) ?? null;
  }, [detailEventId, eventsData]);

  const characterMap = useMemo(() => {
    const map = new Map<string, string>();
    (characters ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [characters]);

  const open = !!detailEventId;

  const handleClose = () => {
    setDetailEvent(null);
  };

  const handleEdit = () => {
    if (event) {
      setSelectedEvent(event.id);
    }
    setDetailEvent(null);
    setActivePanel('event-editor');
  };

  if (!open) return null;

  const linkedCharacterIds = event?.characterIds ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && handleClose()}
      header={event?.title ?? '事件详情'}
      width={560}
      confirmBtn={{ content: '编辑' }}
      cancelBtn="关闭"
      onConfirm={handleEdit}
      onCancel={handleClose}
    >
      {!event ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          {detailEventId ? '事件加载中或已删除…' : '未选择事件'}
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          {event.summary && (
            <p className="text-muted-foreground">{event.summary}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <TimeIcon size={12} />
                开始时间
              </div>
              <div className="font-mono text-xs">{formatDateTime(event.startTime)}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <TimeIcon size={12} />
                结束时间
              </div>
              <div className="font-mono text-xs">{formatDateTime(event.endTime)}</div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <LocalTwoIcon size={12} />
              地点
            </div>
            <div className="text-sm">{event.location || '未指定'}</div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <UserIcon size={12} />
              人物
            </div>
            {linkedCharacterIds.length === 0 ? (
              <div className="text-xs text-muted-foreground">未关联人物</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {linkedCharacterIds.map((id) => {
                  const name = characterMap.get(id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
                    >
                      {name ?? '未知角色'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {event.description && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="mb-1 text-xs font-medium text-muted-foreground">描述</div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {event.description}
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
