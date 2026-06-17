import { useState, useEffect, useMemo } from 'react';
import { Save, Trash2, Users, Link2, Flame, Globe, ArrowRight, Plus } from 'lucide-react';
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
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import { pushHistoryRecord } from '@/lib/history';
import type { TimelineEvent, ConnectionType, Foreshadowing } from '../../../shared/types';

const colors = [
  '#c4703a', '#2563eb', '#16a34a', '#dc2626', '#7c3aed',
  '#0891b2', '#db2777', '#ea580c', '#65a30d', '#4f46e5',
];

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
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState('');
  const [tags, setTags] = useState('');
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [worldSettingIds, setWorldSettingIds] = useState<string[]>([]);
  const [newConnectionTargetId, setNewConnectionTargetId] = useState('');
  const [newConnectionType, setNewConnectionType] = useState<ConnectionType>('因果');
  const [activeTab, setActiveTab] = useState<'basic' | 'relations'>('basic');

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

  const allEvents = eventsData?.items ?? [];
  const otherEvents = useMemo(() => allEvents.filter((e) => e.id !== event?.id), [allEvents, event?.id]);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setSummary(event.summary || '');
      setDescription(event.description || '');
      setLocation(event.location || '');
      setStartTime(event.startTime ? new Date(event.startTime).toISOString().slice(0, 16) : '');
      setEndTime(event.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : '');
      setColor(event.color || '');
      try {
        const parsed = JSON.parse(event.tagsJson || '[]');
        setTags(Array.isArray(parsed) ? parsed.join(', ') : '');
      } catch {
        setTags('');
      }
    } else {
      setTitle('');
      setSummary('');
      setDescription('');
      setLocation('');
      setStartTime('');
      setEndTime('');
      setColor('');
      setTags('');
      setCharacterIds([]);
      setWorldSettingIds([]);
      setActiveTab('basic');
    }
  }, [event]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || updateEvent.isPending || createEvent.isPending || !workspaceId) return;

    const data = {
      title,
      summary: summary || undefined,
      description: description || undefined,
      location: location || undefined,
      startTime: startTime ? new Date(startTime).getTime() : null,
      endTime: endTime ? new Date(endTime).getTime() : null,
      color: color || undefined,
      tagsJson: JSON.stringify(tags.split(',').map((t) => t.trim()).filter(Boolean)),
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
        };
        for (const key of Object.keys(afterValues)) {
          if (beforeValues[key] !== afterValues[key]) {
            changed[key] = beforeValues[key];
            after[key] = afterValues[key];
          }
        }
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
        await updateEvent.mutateAsync({ workspaceId, eventId: event.id, data });
      } else {
        const result = await createEvent.mutateAsync({ workspaceId, data: { ...data, trackId: undefined } });
        pushHistoryRecord({
          workspaceId,
          entityType: 'event',
          action: 'create',
          entityId: result.id,
          data: result as unknown as Record<string, unknown>,
        });
        setSelectedEvent(result.id);
      }
      onClose();
    } catch {
      // error handled by mutation
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

  const tabClass = (tab: 'basic' | 'relations') =>
    `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
      activeTab === tab
        ? 'bg-primary text-primary-foreground'
        : 'bg-accent text-muted-foreground hover:bg-accent/80'
    }`;

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1 flex gap-2">
        <button type="button" onClick={() => setActiveTab('basic')} className={tabClass('basic')}>
          基本信息
        </button>
        <button type="button" onClick={() => setActiveTab('relations')} className={tabClass('relations')}>
          关联关系
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-1 pt-3 space-y-4">
        {activeTab === 'basic' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">标题 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="事件标题"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">开始时间</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">结束时间</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">地点</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="事件发生的地点"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">摘要</label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="简短描述"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">详细描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={4}
                placeholder="详细描述事件内容"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">颜色</label>
              <div className="flex items-center gap-2 flex-wrap">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-colors ${
                      color === c ? 'border-foreground' : 'border-transparent hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: c,
                      boxShadow: color === c ? `0 0 0 3px ${c}44, 0 2px 8px ${c}55` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">标签（逗号分隔）</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                <Users className="w-4 h-4" />
                关联角色
              </label>
              {characters && characters.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-auto p-2 rounded-md border border-input bg-background">
                  {characters.map((char) => {
                    const selected = characterIds.includes(char.id);
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => {
                          setCharacterIds((prev) =>
                            selected ? prev.filter((id) => id !== char.id) : [...prev, char.id]
                          );
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                          selected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent text-accent-foreground hover:bg-accent/80'
                        }`}
                      >
                        <span>{char.name}</span>
                      </button>
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
                <Globe className="w-4 h-4" />
                相关世界观设定
              </label>
              {worldSettings && worldSettings.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-auto p-2 rounded-md border border-input bg-background">
                  {worldSettings.map((ws) => {
                    const selected = worldSettingIds.includes(ws.id);
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          setWorldSettingIds((prev) =>
                            selected ? prev.filter((id) => id !== ws.id) : [...prev, ws.id]
                          );
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                          selected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent text-accent-foreground hover:bg-accent/80'
                        }`}
                        title={`${ws.category} · ${ws.key}`}
                      >
                        <span>{ws.key}</span>
                      </button>
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
                  <Flame className="w-4 h-4" />
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
                            <button
                              type="button"
                              onClick={() => toggleForeshadowingRole(f, 'planted')}
                              className={`px-2 py-0.5 rounded transition-colors ${
                                isPlanted ? 'bg-yellow-500 text-white' : 'bg-accent hover:bg-accent/80'
                              }`}
                            >
                              埋下
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleForeshadowingRole(f, 'resolved')}
                              className={`px-2 py-0.5 rounded transition-colors ${
                                isResolved ? 'bg-green-500 text-white' : 'bg-accent hover:bg-accent/80'
                              }`}
                            >
                              回收
                            </button>
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
                  <Link2 className="w-4 h-4" />
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
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">{conn.type}</span>
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{otherEvent?.title ?? otherId.slice(0, 8)}</span>
                          </>
                        ) : (
                          <>
                            <span className="truncate max-w-[120px]">{otherEvent?.title ?? otherId.slice(0, 8)}</span>
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">{conn.type}</span>
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{event.title}</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteConnection(conn.id)}
                          className="ml-auto p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {otherEvents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={newConnectionTargetId}
                      onChange={(e) => setNewConnectionTargetId(e.target.value)}
                      className="flex-1 text-xs rounded-md border border-input bg-background px-2 py-1.5"
                    >
                      <option value="">选择目标事件...</option>
                      {otherEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>{ev.title}</option>
                      ))}
                    </select>
                    <select
                      value={newConnectionType}
                      onChange={(e) => setNewConnectionType(e.target.value as ConnectionType)}
                      className="text-xs rounded-md border border-input bg-background px-2 py-1.5"
                    >
                      {CONNECTION_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleCreateConnection}
                      disabled={!newConnectionTargetId || createConnection.isPending}
                      className="p-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-2 sticky bottom-0 bg-card">
          {event ? (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-destructive text-destructive text-sm hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim() || updateEvent.isPending || createEvent.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
