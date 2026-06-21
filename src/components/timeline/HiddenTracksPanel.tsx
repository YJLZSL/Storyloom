import { EyesIcon } from '@/lib/icons';
import type { Track } from '../../../shared/types';

interface HiddenTracksPanelProps {
  hiddenTracks: Track[];
  workspaceId: string | null;
  contentWidth: number;
  onRestoreTrack: (trackId: string) => void;
  isPending: boolean;
}

export function HiddenTracksPanel({
  hiddenTracks,
  workspaceId,
  contentWidth,
  onRestoreTrack,
  isPending,
}: HiddenTracksPanelProps) {
  if (hiddenTracks.length === 0 || !workspaceId) return null;

  return (
    <div
      className="relative border-t-2 border-dashed border-border/50"
      style={{ width: contentWidth }}
    >
      <div className="px-4 py-2 bg-muted/20 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-muted-foreground">
            已隐藏 {hiddenTracks.length} 条轨道
          </span>
          <span className="text-[10px] text-muted-foreground/60">点击恢复显示</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {hiddenTracks.map((track) => (
            <button
              key={track.id}
              disabled={isPending}
              className="relative z-10 pointer-events-auto inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-border bg-background transition hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onRestoreTrack(track.id);
              }}
            >
              <EyesIcon size={16} />
              <span
                className="max-w-[120px] truncate"
                style={{ color: track.color || undefined }}
              >
                {track.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
