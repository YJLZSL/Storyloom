import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Workspace } from '../../../shared/types.js';

interface ChapterRailProps {
  workspaces: Workspace[];
  onSelect: (id: string) => void;
}

function safeDescription(desc: string | null | undefined): string {
  if (!desc) return '暂无描述';
  const cleaned = String(desc)
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, ' ')
    .trim();
  if (!cleaned) return '暂无描述';
  // 数据库中可能残留全 "?" 的占位/乱码数据，直接兜底
  if (/^[?？]+$/.test(cleaned)) return '暂无描述';
  return cleaned.length > 60 ? cleaned.slice(0, 59) + '…' : cleaned;
}

export function ChapterRail({ workspaces, onSelect }: ChapterRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startScrollLeft: number; dragging: boolean; pointerDown: boolean }>({
    startX: 0,
    startScrollLeft: 0,
    dragging: false,
    pointerDown: false,
  });

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      dragging: false,
      pointerDown: true,
    };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !dragState.current.pointerDown) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 4 && !dragState.current.dragging) {
      dragState.current.dragging = true;
    }
    if (dragState.current.dragging) {
      el.scrollLeft = dragState.current.startScrollLeft - dx;
    }
  };

  const handlePointerUp = () => {
    dragState.current.pointerDown = false;
    // dragging 保持当前值；下一次 pointerdown 会重置
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  if (!workspaces || workspaces.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-serif text-sm font-medium text-muted-foreground">
        我的作品 · 横滑浏览
      </h2>
      <div
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden px-2 py-4 scrollbar-thin select-none"
      >
        {workspaces.map((ws) => {
          const firstChar = ws.name?.trim().charAt(0) || '?';
          return (
            <div
              key={ws.id}
              data-testid="chapter-rail-card"
              data-workspace-id={ws.id}
              onClick={() => {
                if (!dragState.current.dragging) onSelect(ws.id);
              }}
              className="flex h-[180px] min-w-[260px] max-w-[260px] cursor-pointer snap-start flex-col overflow-hidden rounded-xl border border-border bg-card shadow-md transition hover:shadow-lg"
            >
              <div className="flex h-[100px] w-full items-center justify-center bg-gradient-to-br from-[hsl(var(--primary)/0.15)] to-[hsl(var(--accent)/0.15)]">
                <span className="font-serif text-4xl font-bold text-foreground/70">
                  {firstChar}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 px-3 py-2">
                <div className="font-serif text-base font-semibold">{ws.name}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">
                  {safeDescription(ws.description)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
