import { DateRangePicker } from 'tdesign-react';
import type { DateRangeValue } from 'tdesign-react';
import { PlusIcon, SettingConfigIcon, IdeaIcon } from '@/lib/icons';
import { TButton, TTooltip } from '@/components/ui-tdesign';

interface TimelineToolbarProps {
  workspaceId: string | null;
  visibleDateRange: { startMs: number; endMs: number } | null;
  onDateRangeChange: (range: { startMs: number; endMs: number } | null) => void;
  onCreateTrack: () => void;
  onOpenTrackManager: () => void;
}

function toDateString(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TimelineToolbar({
  workspaceId,
  visibleDateRange,
  onDateRangeChange,
  onCreateTrack,
  onOpenTrackManager,
}: TimelineToolbarProps) {
  const dateRangeValue: DateRangeValue = visibleDateRange
    ? [toDateString(visibleDateRange.startMs), toDateString(visibleDateRange.endMs)]
    : [];

  const handleDateRangeChange = (value: DateRangeValue) => {
    if (!value || value.length !== 2 || !value[0] || !value[1]) {
      onDateRangeChange(null);
      return;
    }
    const start = value[0] instanceof Date ? value[0] : new Date(String(value[0]));
    const end = value[1] instanceof Date ? value[1] : new Date(String(value[1]));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      onDateRangeChange(null);
      return;
    }
    end.setHours(23, 59, 59, 999);
    onDateRangeChange({ startMs: start.getTime(), endMs: end.getTime() });
  };

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-card/80">
      <TButton
        theme="success"
        size="small"
        icon={<PlusIcon size={14} />}
        onClick={onCreateTrack}
        disabled={!workspaceId}
      >
        新建轨道
      </TButton>

      <TButton
        theme="default"
        variant="outline"
        size="small"
        icon={<SettingConfigIcon size={14} />}
        disabled={!workspaceId}
        onClick={onOpenTrackManager}
      >
        时间线管理
      </TButton>

      <div className="flex items-center gap-2 ml-auto">
        <TTooltip content="Ctrl + 滚轮 = 缩放 | 滚轮 = 水平滚动" placement="bottom">
          <button className="flex size-7 items-center justify-center rounded-lg text-muted-foreground/60 transition hover:bg-muted/80 hover:text-foreground">
            <IdeaIcon size={16} />
          </button>
        </TTooltip>
        <span className="text-xs text-muted-foreground">显示范围：</span>
        <DateRangePicker
          value={dateRangeValue}
          onChange={handleDateRangeChange}
          format="YYYY-MM-DD"
          clearable
          placeholder={['开始日期', '结束日期']}
          size="small"
        />
      </div>
    </div>
  );
}
