import { useState, useEffect, useMemo } from 'react';
import { DatePicker } from 'tdesign-react';
import type { DateValue } from 'tdesign-react';
import { MessagePlugin } from 'tdesign-react';
import {
  useUpdateEvent,
  useCreateEvent,
  useDeleteEvent,
  useCharacters,
  useEvent,
  useEvents,
  useForeshadowings,
  useUpdateForeshadowing,
  useConnections,
  useCreateConnection,
  useDeleteConnection,
  useWorldSettings,
  useTracks,
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import { pushHistoryRecord } from '@/lib/history';
import { safeJsonArray } from '@/lib/utils';
import {
  SaveIcon,
  DeleteIcon,
  GroupIcon,
  LinkIcon,
  FireIcon,
  GlobeIcon,
  ArrowRightIcon,
  PlusIcon,
} from '@/lib/icons';
import {
  TInput,
  TTextarea,
  TSelect,
  TButton,
} from '@/components/ui-tdesign';
import { TRACK_COLORS } from '@/lib/colors';
import type { TimelineEvent, ConnectionType, Foreshadowing, UpdateEventRequest } from '../../../shared/types';

const CONNECTION_TYPES: ConnectionType[] = ['因果', '闪回', '伏笔', '平行', '对比', '呼应', '转折'];

interface EventEditorDialogProps {
  event: TimelineEvent | null;
  onClose: () => void;
}

export function EventEditorDialog({ event, onClose }: EventEditorDialogProps) {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setSelectedEvent = useTimelineStore((s) => s.setSelectedEvent);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [color, setColor] = useState('');
  const [tags, setTags] = useState('');
  const [trackId, setTrackId] = useState<string>('');
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [worldSettingIds, setWorldSettingIds] = useState<string[]>([]);
  const [newConnectionTargetId, setNewConnectionTargetId] = useState('');
  const [newConnectionType, setNewConnectionType] = useState<ConnectionType>('因果');
  const [activeTab, setActiveTab] = useState<'basic' | 'relations'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateEvent = useUpdateEvent();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();
  const updateForeshadowing = useUpdateForeshadowing();
  const createConnection = useCreateConnection();
  const deleteConnection = useDeleteConnection();
  const { data: characters } = useCharacters(workspaceId);
  const { data: eventDetail } = useEvent(workspaceId, event?.id ?? null);
  const { data: foreshadowings } = useForeshadowings(workspaceId);
  const { data: connections } = useConnections(workspaceId);
  const { data: worldSettings } = useWorldSettings(workspaceId);
  const { data: eventsData } = useEvents(workspaceId);
  const { data: tracks } = useTracks(workspaceId);

  const allEvents = eventsData?.items ?? [];
  const otherEvents = useMemo(() => allEvents.filter((e) => e.id !== event?.id), [allEvents, event?.id]);

  useEffect(() => {
    setIsSubmitting(false);
    if (event) {
      setTitle(event.title);
      setSummary(event.summary || '');
      setDescription(event.description || '');
      setLocation(event.location || '');
      setStartTime(event.startTime ? new Date(event.startTime).getTime() : null);
      setEndTime(event.endTime ? new Date(event.endTime).getTime() : null);
      setColor(event.color || '');
      setTrackId(event.trackId || '');
      const parsedTags = safeJsonArray<string>(event.tagsJson, []);
      setTags(parsedTags.join(', '));
    } else {
      setTitle('');
      setSummary('');
      setDescription('');
      setLocation('');
      setStartTime(null);
      setEndTime(null);
      setColor('');
      setTags('');
      setTrackId(tracks && tracks.length > 0 ? tracks[0].id : '');
      setCharacterIds([]);
      setWorldSettingIds([]);
      setActiveTab('basic');
    }
  }, [event, tracks]);

  // Load associated characters from event detail
  useEffect(() => {
    if (eventDetail && 'characters' in eventDetail && Array.isArray(eventDetail.characters)) {
      const ids = (eventDetail.characters as Array<{ characterId: string }>).map((c) => c.characterId);
      setCharacterIds(ids);
    } else if (!event) {
      setCharacterIds([]);
    }
  }, [eventDetail, event]);

  // Load associated world settings from event detail
  useEffect(() => {
    if (eventDetail && 'worldSettings' in eventDetail && Array.isArray(eventDetail.worldSettings)) {
      const ids = (eventDetail.worldSettings as Array<{ settingId: string }>).map((w) => w.settingId);
      setWorldSettingIds(ids);
    } else if (!event) {
      setWorldSettingIds([]);
    }
  }, [eventDetail, event]);

  const relatedConnections = useMemo(() => {
    if (!event || !connections) return [];
    return connections.filter((c) => c.sourceEventId === event.id || c.targetEventId === event.id);
  }, [connections, event]);

  const resetForm = () => {
    setTitle('');
    setSummary('');
    setDescription('');
    setLocation('');
    setStartTime(null);
    setEndTime(null);
    setColor('');
    setTags('');
    setTrackId(tracks && tracks.length > 0 ? tracks[0].id : '');
    setCharacterIds([]);
    setWorldSettingIds([]);
    setNewConnectionTargetId('');
    setNewConnectionType('因果');
    setActiveTab('basic');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || updateEvent.isPending || createEvent.isPending || isSubmitting || !workspaceId) return;
    setIsSubmitting(true);

    const data = {
      title,
      summary: summary || undefined,
      description: description || undefined,
      location: location || undefined,
      startTime,
      endTime,
      color: color || undefined,
      tagsJson: JSON.stringify(tags.split(',').map((t) => t.trim()).filter(Boolean)),
      trackId: trackId === '' ? undefined : trackId,
      characterIds,
      worldSettingIds,
    };

    try {
      if (event) {
        const changed: Record<string, unknown> = {};
        const after: Record<string, unknown> = {};
        const beforeValues: Record<string, unknown> = {
          title: event.title,
          summary: event.summary,
          description: event.description,
          location: event.location,
          startTime: event.startTime ? new Date(event.startTime).getTime() : null,
          endTime: event.endTime ? new Date(event.endTime).getTime() : null,
          color: event.color,
          tagsJson: event.tagsJson,
          trackId: event.trackId,
        };
        const afterValues: Record<string, unknown> = {
          title: data.title,
          summary: data.summary ?? null,
          description: data.description ?? null,
          location: data.location ?? null,
          startTime: data.startTime,
          endTime: data.endTime,
          color: data.color ?? null,
          tagsJson: data.tagsJson,
          trackId: data.trackId ?? null,
        };
        for (const key of Object.keys(afterValues)) {
          if (beforeValues[key] !== afterValues[key]) {
            changed[key] = beforeValues[key];
            after[key] = afterValues[key];
          }
        }
        const updateData = {
          ...data,
          // 空字符串→null：显式清空 trackId（事件归入"未分类"）
          ...(trackId === '' && event.trackId ? { trackId: null } : {}),
        } as UpdateEventRequest;
        await updateEvent.mutateAsync(
          {
            workspaceId,
            eventId: event.id,
            data: updateData,
          },
          {
            onSuccess: () => {
              if (Object.keys(changed).length > 0) {
                pushHistoryRecord({
                  workspaceId,
                  entityType: 'event',
                  action: 'update',
                  entityId: event.id,
                  data: changed,
                  meta: { after },
                });
              }
              resetForm();
              onClose();
            },
            onError: () => {
              MessagePlugin.error('保存事件失败');
            },
          },
        );
      } else {
        await createEvent.mutateAsync(
          { workspaceId, data },
          {
            onSuccess: (result) => {
              pushHistoryRecord({
                workspaceId,
                entityType: 'event',
                action: 'create',
                entityId: result.id,
                data: result as unknown as Record<string, unknown>,
              });
              setSelectedEvent(result.id);
              resetForm();
              onClose();
            },
            onError: () => {
              MessagePlugin.error('创建事件失败');
            },
          },
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !workspaceId) return;
    if (confirm('确定要删除这个事件吗？')) {
      pushHistoryRecord({
        workspaceId,
        entityType: 'event',
        action: 'delete',
        entityId: event.id,
        data: event as unknown as Record<string, unknown>,
      });
      await deleteEvent.mutateAsync({ workspaceId, eventId: event.id });
      setSelectedEvent(null);
      setActivePanel(null);
    }
  };

  const toggleForeshadowingRole = async (f: Foreshadowing, role: 'planted' | 'resolved') => {
    if (!event || !workspaceId) return;
    const isCurrently = role === 'planted' ? f.plantedEventId === event.id : f.resolvedEventId === event.id;
    const updateData = role === 'planted'
      ? { plantedEventId: isCurrently ? null : event.id }
      : { resolvedEventId: isCurrently ? null : event.id };
    await updateForeshadowing.mutateAsync({ workspaceId, foreshadowingId: f.id, data: updateData });
  };

  const handleCreateConnection = async () => {
    if (!event || !workspaceId || !newConnectionTargetId) return;
    await createConnection.mutateAsync({
      workspaceId,
      data: {
        sourceEventId: event.id,
        targetEventId: newConnectionTargetId,
        type: newConnectionType,
      },
    });
    setNewConnectionTargetId('');
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!workspaceId) return;
    if (confirm('确定删除此关联？')) {
      await deleteConnection.mutateAsync({ workspaceId, connectionId });
    }
  };

  if (!workspaceId) return null;

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      <div className="px-1 pt-1 flex gap-2 shrink-0">
        <TButton
          type="button"
          theme={activeTab === 'basic' ? 'primary' : 'default'}
          variant="text"
          size="small"
          className={activeTab === 'basic' ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground hover:bg-accent/80'}
          onClick={() => setActiveTab('basic')}
        >
          基本信息
        </TButton>
        <TButton
          type="button"
          theme={activeTab === 'relations' ? 'primary' : 'default'}
          variant="text"
          size="small"
          className={activeTab === 'relations' ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground hover:bg-accent/80'}
          onClick={() => setActiveTab('relations')}
        >
          关联关系
        </TButton>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto p-1 pt-3 space-y-4">
        {activeTab === 'basic' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">标题 *</label>
              <TInput
                value={title}
                onChange={(val) => setTitle((val ?? '').toString())}
                placeholder="事件标题"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">所属轨道</label>
              <TSelect
                value={trackId}
                onChange={(val) => setTrackId(val as string)}
                options={[
                  { label: '未分类', value: '' },
                  ...(tracks?.map((t) => ({ label: t.name, value: t.id })) ?? [])
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">开始时间</label>
                <DatePicker
                  value={startTime ?? undefined}
                  onChange={(v: DateValue | DateValue[] | null) => {
                    if (!v || Array.isArray(v)) {
                      setStartTime(null);
                    } else if (v instanceof Date) {
                      setStartTime(v.getTime());
                    } else if (typeof v === 'number') {
                      setStartTime(v);
                    } else {
                      const d = new Date(v);
                      setStartTime(Number.isNaN(d.getTime()) ? null : d.getTime());
                    }
                  }}
                  enableTimePicker
                  clearable
                  format="YYYY-MM-DD HH:mm"
                  valueType="time-stamp"
                  placeholder="选择开始时间"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">结束时间</label>
                <DatePicker
                  value={endTime ?? undefined}
                  onChange={(v: DateValue | DateValue[] | null) => {
                    if (!v || Array.isArray(v)) {
                      setEndTime(null);
                    } else if (v instanceof Date) {
                      setEndTime(v.getTime());
                    } else if (typeof v === 'number') {
                      setEndTime(v);
                    } else {
                      const d = new Date(v);
                      setEndTime(Number.isNaN(d.getTime()) ? null : d.getTime());
                    }
                  }}
                  enableTimePicker
                  clearable
                  format="YYYY-MM-DD HH:mm"
                  valueType="time-stamp"
                  placeholder="选择结束时间"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">地点</label>
              <TInput
                value={location}
                onChange={(val) => setLocation((val ?? '').toString())}
                placeholder="事件发生的地点"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">摘要</label>
              <TInput
                value={summary}
                onChange={(val) => setSummary((val ?? '').toString())}
                placeholder="简短描述"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">详细描述</label>
              <TTextarea
                value={description}
                onChange={(val) => setDescription((val ?? '').toString())}
                rows={4}
                placeholder="详细描述事件内容"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">颜色</label>
              <div className="flex items-center gap-2 flex-wrap">
                {TRACK_COLORS.map((c) => (
                  <TButton
                    key={c}
                    type="button"
                    shape="circle"
                    variant="text"
                    size="small"
                    className={`w-8 h-8 !p-0 border-2 transition-colors ${
                      color === c ? 'border-foreground' : 'border-transparent hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: c,
                      boxShadow: color === c ? `0 0 0 3px ${c}44, 0 2px 8px ${c}55` : 'none',
                    }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">标签（逗号分隔）</label>
              <TInput
                value={tags}
                onChange={(val) => setTags((val ?? '').toString())}
                placeholder="标签1, 标签2, 标签3"
              />
            </div>
          </>
        )}

        {activeTab === 'relations' && (
          <div className="space-y-5">
            {/* Characters */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                <GroupIcon className="w-4 h-4" />
                关联角色
              </label>
              {characters && characters.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-auto p-2 rounded-md border border-input bg-background">
                  {characters.map((char) => {
                    const selected = characterIds.includes(char.id);
                    return (
                      <TButton
                        key={char.id}
                        type="button"
                        variant={selected ? 'base' : 'text'}
                        theme={selected ? 'primary' : 'default'}
                        size="small"
                        shape="round"
                        className={selected ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground hover:bg-accent/80'}
                        onClick={() => {
                          setCharacterIds((prev) =>
                            selected ? prev.filter((id) => id !== char.id) : [...prev, char.id]
                          );
                        }}
                      >
                        {char.name}
                      </TButton>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-2">暂无角色，可在角色面板中创建</div>
              )}
            </div>

            {/* World settings */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                <GlobeIcon className="w-4 h-4" />
                相关世界观设定
              </label>
              {worldSettings && worldSettings.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-auto p-2 rounded-md border border-input bg-background">
                  {worldSettings.map((ws) => {
                    const selected = worldSettingIds.includes(ws.id);
                    return (
                      <TButton
                        key={ws.id}
                        type="button"
                        variant={selected ? 'base' : 'text'}
                        theme={selected ? 'primary' : 'default'}
                        size="small"
                        shape="round"
                        className={selected ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground hover:bg-accent/80'}
                        onClick={() => {
                          setWorldSettingIds((prev) =>
                            selected ? prev.filter((id) => id !== ws.id) : [...prev, ws.id]
                          );
                        }}
                        title={`${ws.category} · ${ws.key}`}
                      >
                        {ws.key}
                      </TButton>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-2">暂无世界观设定，可在世界观面板中创建</div>
              )}
            </div>

            {/* Foreshadowings */}
            {event && (
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                  <FireIcon className="w-4 h-4" />
                  伏笔关联
                </label>
                {foreshadowings && foreshadowings.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-auto p-2 rounded-md border border-input bg-background">
                    {foreshadowings.map((f) => {
                      const isPlanted = f.plantedEventId === event.id;
                      const isResolved = f.resolvedEventId === event.id;
                      return (
                        <div key={f.id} className="flex items-center justify-between text-xs">
                          <span className="font-medium truncate flex-1" title={f.title}>{f.title}</span>
                          <div className="flex items-center gap-1">
                            <TButton
                              type="button"
                              variant="text"
                              size="small"
                              className={isPlanted ? 'bg-yellow-500 text-white' : 'bg-accent hover:bg-accent/80'}
                              onClick={() => toggleForeshadowingRole(f, 'planted')}
                            >
                              埋下
                            </TButton>
                            <TButton
                              type="button"
                              variant="text"
                              size="small"
                              className={isResolved ? 'bg-green-500 text-white' : 'bg-accent hover:bg-accent/80'}
                              onClick={() => toggleForeshadowingRole(f, 'resolved')}
                            >
                              回收
                            </TButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-2">暂无伏笔，可在伏笔面板中创建</div>
                )}
              </div>
            )}

            {/* Connections */}
            {event && (
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                  <LinkIcon className="w-4 h-4" />
                  事件关联
                </label>
                <div className="space-y-2 mb-3">
                  {relatedConnections.map((conn) => {
                    const isSource = conn.sourceEventId === event.id;
                    const otherId = isSource ? conn.targetEventId : conn.sourceEventId;
                    const otherEvent = allEvents.find((e) => e.id === otherId);
                    return (
                      <div key={conn.id} className="flex items-center gap-2 text-xs p-2 rounded bg-accent/30">
                        {isSource ? (
                          <>
                            <span className="truncate max-w-[120px]">{event.title}</span>
                            <ArrowRightIcon className="w-3 h-3 shrink-0" />
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">{conn.type}</span>
                            <ArrowRightIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{otherEvent?.title ?? otherId.slice(0, 8)}</span>
                          </>
                        ) : (
                          <>
                            <span className="truncate max-w-[120px]">{otherEvent?.title ?? otherId.slice(0, 8)}</span>
                            <ArrowRightIcon className="w-3 h-3 shrink-0" />
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">{conn.type}</span>
                            <ArrowRightIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{event.title}</span>
                          </>
                        )}
                        <TButton
                          type="button"
                          variant="text"
                          shape="square"
                          size="small"
                          className="ml-auto p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteConnection(conn.id)}
                          icon={<DeleteIcon size={12} />}
                        />
                      </div>
                    );
                  })}
                </div>
                {otherEvents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <TSelect
                      value={newConnectionTargetId}
                      onChange={(val) => setNewConnectionTargetId(val as string)}
                      options={[
                        { label: '选择目标事件...', value: '' },
                        ...otherEvents.map((ev) => ({ label: ev.title, value: ev.id }))
                      ]}
                      size="small"
                      className="flex-1"
                    />
                    <TSelect
                      value={newConnectionType}
                      onChange={(val) => setNewConnectionType(val as ConnectionType)}
                      options={CONNECTION_TYPES.map((t) => ({ label: t, value: t }))}
                      size="small"
                    />
                    <TButton
                      type="button"
                      theme="primary"
                      shape="square"
                      size="small"
                      onClick={handleCreateConnection}
                      disabled={!newConnectionTargetId || createConnection.isPending}
                      icon={<PlusIcon size={14} />}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>

        <div className="flex justify-between pt-2 px-1 pb-1 shrink-0 border-t border-border bg-card">
          {event ? (
            <TButton
              type="button"
              variant="outline"
              theme="danger"
              onClick={handleDelete}
              icon={<DeleteIcon size={16} />}
            >
              删除
            </TButton>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <TButton
              type="button"
              variant="outline"
              onClick={onClose}
            >
              取消
            </TButton>
            <TButton
              type="submit"
              theme="primary"
              disabled={!title.trim() || updateEvent.isPending || createEvent.isPending || isSubmitting}
              loading={isSubmitting}
              icon={<SaveIcon size={16} />}
            >
              保存
            </TButton>
          </div>
        </div>
      </form>
    </div>
  );
}
