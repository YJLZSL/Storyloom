import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BookmarkIcon,
  DeleteIcon,
  PlusIcon,
} from '@/lib/icons';
import { TButton, TInput, Dialog } from '@/components/ui-tdesign';
import {
  useBookmarks,
  useCreateBookmark,
  useDeleteBookmark,
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useEvents } from '@/services/api-hooks';
import { toast } from 'sonner';
import { TRACK_COLORS } from '@/lib/colors';
import type { Bookmark } from '../../../shared/types';

export function BookmarkPanel() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: bookmarks, isLoading } = useBookmarks(workspaceId);
  const { data: eventsData } = useEvents(workspaceId);
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const setViewMode = useTimelineStore((s) => s.setViewMode);

  const events = eventsData?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [bookmarkName, setBookmarkName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(TRACK_COLORS[0]);

  const handleCreate = () => {
    if (!selectedEventId || !bookmarkName.trim()) {
      toast.error('请选择事件并输入书签名称');
      return;
    }
    createBookmark.mutate(
      { workspaceId: workspaceId!, data: { eventId: selectedEventId, name: bookmarkName.trim(), color: selectedColor } },
      {
        onSuccess: () => {
          toast.success('书签已创建');
          setCreateOpen(false);
          setBookmarkName('');
          setSelectedEventId('');
        },
        onError: (err) => toast.error(`创建失败: ${err.message}`),
      }
    );
  };

  const handleDelete = (bookmark: Bookmark) => {
    if (!confirm(`确定删除书签「${bookmark.name}」吗？`)) return;
    deleteBookmark.mutate(
      { workspaceId: workspaceId!, bookmarkId: bookmark.id },
      {
        onSuccess: () => toast.success('书签已删除'),
        onError: (err) => toast.error(`删除失败: ${err.message}`),
      }
    );
  };

  const handleJumpToEvent = (bookmark: Bookmark) => {
    scrollToEvent(bookmark.eventId);
    setViewMode('timeline');
    toast.success(`已定位到「${bookmark.name}」`);
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <BookmarkIcon size={18} className="text-primary" />
          <span className="text-sm font-semibold">书签</span>
          {bookmarks && bookmarks.length > 0 && (
            <span className="text-xs text-muted-foreground">({bookmarks.length})</span>
          )}
        </div>
        <TButton theme="success" size="small" onClick={() => setCreateOpen(true)} disabled={!workspaceId}>
          <PlusIcon size={14} />
          新建
        </TButton>
      </div>

      {/* 书签列表 */}
      <div className="flex-1 overflow-auto p-2">
        {isLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">加载中...</div>
        )}
        {!isLoading && (!bookmarks || bookmarks.length === 0) && (
          <div className="p-6 text-center">
            <BookmarkIcon size={32} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">暂无书签</p>
            <p className="text-xs text-muted-foreground/60 mt-1">为重要事件添加书签，快速定位</p>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {bookmarks?.map((bookmark) => (
            <div
              key={bookmark.id}
              className={cn(
                'group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer',
                'hover:bg-accent/30 hover:border-primary/20'
              )}
              style={{ borderLeft: `3px solid ${bookmark.color || '#3b82f6'}` }}
              onClick={() => handleJumpToEvent(bookmark)}
            >
              <BookmarkIcon size={14} style={{ color: bookmark.color || '#3b82f6' }} />
              <span className="flex-1 text-sm truncate">{bookmark.name}</span>
              <button
                className="opacity-0 group-hover:opacity-100 flex size-6 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-all"
                onClick={(e) => { e.stopPropagation(); handleDelete(bookmark); }}
                title="删除书签"
              >
                <DeleteIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 创建书签对话框 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen} header="新建书签" width={420}>
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">选择事件</label>
            <div className="max-h-[200px] overflow-auto border border-border/50 rounded-lg">
              {events.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground text-center">暂无事件</div>
              )}
              {events.map((event) => (
                <button
                  key={event.id}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm transition-colors border-b border-border/30 last:border-b-0',
                    selectedEventId === event.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent/20'
                  )}
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <div className="truncate font-medium">{event.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{event.summary || '无摘要'}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedEvent && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
              <BookmarkIcon size={12} />
              已选择: {selectedEvent.title}
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">书签名称</label>
            <TInput
              value={bookmarkName}
              onChange={(v) => setBookmarkName(v as string)}
              placeholder="输入书签名称..."
              clearable
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">颜色</label>
            <div className="flex flex-wrap gap-2">
              {TRACK_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={cn(
                    'w-6 h-6 rounded-full transition-transform',
                    selectedColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <TButton theme="default" variant="outline" size="small" onClick={() => setCreateOpen(false)}>
              取消
            </TButton>
            <TButton theme="success" size="small" onClick={handleCreate} disabled={!selectedEventId || !bookmarkName.trim()}>
              创建
            </TButton>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
