import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  MapIcon,
  PlusIcon,
  DeleteIcon,
  PinIcon,
} from '@/lib/icons';
import { TButton, TInput, Dialog } from '@/components/ui-tdesign';
import {
  useMaps,
  useCreateMap,
  useUpdateMap,
  useDeleteMap,
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { toast } from 'sonner';
import type { Map as MapType, MapMarker } from '../../../shared/types';

export function MapView() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: maps, isLoading } = useMaps(workspaceId);
  const createMap = useCreateMap();
  const updateMap = useUpdateMap();
  const deleteMap = useDeleteMap();
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const setViewMode = useTimelineStore((s) => s.setViewMode);

  const [selectedMap, setSelectedMap] = useState<MapType | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [mapName, setMapName] = useState('');
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [placingMarker, setPlacingMarker] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const handleCreateMap = () => {
    if (!mapName.trim()) {
      toast.error('请输入地图名称');
      return;
    }
    createMap.mutate(
      { workspaceId: workspaceId!, data: { name: mapName.trim(), width: 800, height: 600, markersJson: '[]' } },
      {
        onSuccess: (data) => {
          toast.success('地图已创建');
          setCreateOpen(false);
          setMapName('');
          setSelectedMap(data);
          setMarkers([]);
        },
        onError: (err) => toast.error(`创建失败: ${err.message}`),
      }
    );
  };

  const handleDeleteMap = (map: MapType) => {
    if (!confirm(`确定删除地图「${map.name}」吗？`)) return;
    deleteMap.mutate(
      { workspaceId: workspaceId!, mapId: map.id },
      {
        onSuccess: () => {
          toast.success('地图已删除');
          if (selectedMap?.id === map.id) setSelectedMap(null);
        },
        onError: (err) => toast.error(`删除失败: ${err.message}`),
      }
    );
  };

  const handleSaveMarkers = () => {
    if (!selectedMap) return;
    updateMap.mutate(
      { workspaceId: workspaceId!, mapId: selectedMap.id, data: { markersJson: JSON.stringify(markers) } },
      {
        onSuccess: () => toast.success('标记已保存'),
        onError: (err) => toast.error(`保存失败: ${err.message}`),
      }
    );
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMarker || !selectedMap) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarker: MapMarker = {
      id: crypto.randomUUID(),
      x,
      y,
      label: '新标记',
      sceneId: null,
      eventId: null,
      iconKey: 'default',
    };
    setMarkers([...markers, newMarker]);
    setPlacingMarker(false);
  };

  const handleLoadMap = (map: MapType) => {
    setSelectedMap(map);
    try {
      const parsed = JSON.parse(map.markersJson || '[]') as MapMarker[];
      setMarkers(parsed);
    } catch {
      setMarkers([]);
    }
  };

  const handleDeleteMarker = (markerId: string) => {
    setMarkers(markers.filter((m) => m.id !== markerId));
  };

  const handleMarkerClick = (marker: MapMarker) => {
    if (marker.eventId) {
      scrollToEvent(marker.eventId);
      setViewMode('timeline');
      toast.success(`已定位到事件`);
    }
  };

  // 地图编辑器视图
  if (selectedMap) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedMap(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← 返回
            </button>
            <span className="text-sm font-semibold">{selectedMap.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <TButton
              theme={placingMarker ? 'success' : 'default'}
              variant="outline"
              size="small"
              onClick={() => setPlacingMarker(!placingMarker)}
            >
              <PinIcon size={12} />
              {placingMarker ? '点击地图放置' : '添加标记'}
            </TButton>
            <TButton theme="primary" size="small" onClick={handleSaveMarkers}>
              保存
            </TButton>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div
            ref={mapRef}
            className={cn(
              'relative mx-auto border-2 border-dashed border-border/50 rounded-lg bg-muted/20',
              placingMarker && 'cursor-crosshair'
            )}
            style={{ width: 800, height: 600, maxWidth: '100%' }}
            onClick={handleMapClick}
          >
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-sm">
              {placingMarker ? '点击放置标记' : '地图区域（点击「添加标记」开始编辑）'}
            </div>

            {/* 标记点 */}
            {markers.map((marker) => (
              <div
                key={marker.id}
                className="absolute group cursor-pointer"
                style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -50%)' }}
                onClick={(e) => { e.stopPropagation(); handleMarkerClick(marker); }}
              >
                <div className="relative">
                  <div className="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-md" />
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-background/80 px-1 rounded">
                    {marker.label}
                  </div>
                  <button
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 size-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px]"
                    onClick={(e) => { e.stopPropagation(); handleDeleteMarker(marker.id); }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 标记列表 */}
          {markers.length > 0 && (
            <div className="mt-4 max-w-[800px] mx-auto">
              <h4 className="text-sm font-medium mb-2">标记列表</h4>
              <div className="flex flex-col gap-1">
                {markers.map((marker) => (
                  <div key={marker.id} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/30 text-sm">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="flex-1">{marker.label}</span>
                    <span className="text-xs text-muted-foreground">({marker.x.toFixed(1)}%, {marker.y.toFixed(1)}%)</span>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteMarker(marker.id)}
                    >
                      <DeleteIcon size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 地图列表视图
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <MapIcon size={18} className="text-primary" />
          <span className="text-sm font-semibold">地图</span>
          {maps && maps.length > 0 && (
            <span className="text-xs text-muted-foreground">({maps.length})</span>
          )}
        </div>
        <TButton theme="success" size="small" onClick={() => setCreateOpen(true)} disabled={!workspaceId}>
          <PlusIcon size={14} />
          新建
        </TButton>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {isLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">加载中...</div>
        )}
        {!isLoading && (!maps || maps.length === 0) && (
          <div className="p-6 text-center">
            <MapIcon size={32} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">暂无地图</p>
            <p className="text-xs text-muted-foreground/60 mt-1">创建地图来标记故事中的地点</p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-2">
          {maps?.map((map) => (
            <div
              key={map.id}
              className={cn(
                'group flex items-center gap-3 p-3 rounded-lg border border-border/50 transition-all cursor-pointer',
                'hover:bg-accent/20 hover:border-primary/30'
              )}
              onClick={() => handleLoadMap(map)}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <MapIcon size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{map.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    try {
                      const m = JSON.parse(map.markersJson || '[]') as MapMarker[];
                      return `${m.length} 个标记`;
                    } catch {
                      return '0 个标记';
                    }
                  })()}
                </div>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 flex size-7 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-all"
                onClick={(e) => { e.stopPropagation(); handleDeleteMap(map); }}
                title="删除地图"
              >
                <DeleteIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 创建地图对话框 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen} header="新建地图" width={380}>
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">地图名称</label>
            <TInput
              value={mapName}
              onChange={(v) => setMapName(v as string)}
              placeholder="输入地图名称..."
              clearable
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <TButton theme="default" variant="outline" size="small" onClick={() => setCreateOpen(false)}>
              取消
            </TButton>
            <TButton theme="success" size="small" onClick={handleCreateMap} disabled={!mapName.trim()}>
              创建
            </TButton>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
