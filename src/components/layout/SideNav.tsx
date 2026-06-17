import {
  Clock,
  List,
  BookOpen,
  BarChart3,
  Network,
  PieChart,
  Users,
  Globe,
  Lightbulb,
  Link,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';

type ViewMode = 'timeline' | 'outline' | 'narrative' | 'gantt' | 'statistics' | 'relationship';
type PanelType = 'properties' | 'ai' | 'characters' | 'worldview' | 'foreshadowing' | 'connections';

interface ViewItem {
  key: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface PanelItem {
  key: PanelType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const VIEW_ITEMS: ViewItem[] = [
  { key: 'timeline', label: '时间轴', icon: Clock },
  { key: 'outline', label: '大纲', icon: List },
  { key: 'narrative', label: '叙事', icon: BookOpen },
  { key: 'gantt', label: '甘特', icon: BarChart3 },
  { key: 'relationship', label: '关系图', icon: Network },
  { key: 'statistics', label: '统计', icon: PieChart },
];

const PANEL_ITEMS: PanelItem[] = [
  { key: 'characters', label: '角色面板', icon: Users },
  { key: 'worldview', label: '世界观面板', icon: Globe },
  { key: 'foreshadowing', label: '伏笔面板', icon: Lightbulb },
  { key: 'connections', label: '关联面板', icon: Link },
  { key: 'ai', label: 'AI 面板', icon: Bot },
];

export function SideNav() {
  const viewMode = useTimelineStore((s) => s.viewMode);
  const setViewMode = useTimelineStore((s) => s.setViewMode);
  const activePanel = useUIStore((s) => s.activePanel);
  const setActivePanel = useUIStore((s) => s.setActivePanel);

  return (
    <nav className="flex w-14 flex-col items-center gap-1 border-r border-border bg-card py-2">
      {VIEW_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = viewMode === item.key;
        return (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(isActive && 'bg-accent text-accent-foreground')}
                onClick={() => setViewMode(item.key)}
              >
                <Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}

      <div className="my-1 h-px w-8 bg-border" />

      {PANEL_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activePanel === item.key;
        return (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(isActive && 'bg-accent text-accent-foreground')}
                onClick={() => setActivePanel(item.key)}
              >
                <Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
