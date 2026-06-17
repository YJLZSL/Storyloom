import { useState } from 'react';
import {
  Clock,
  List,
  BookOpen,
  BarChart3,
  Network,
  PieChart,
  ZoomIn,
  ZoomOut,
  Plus,
  Save,
  Command,
  Sun,
  Moon,
  ChevronDown,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useWorkspaces, useWorkspace } from '@/services/api-hooks';
import { useCommandContext } from '@/components/command-palette/commands';

type ViewMode = 'timeline' | 'outline' | 'narrative' | 'gantt' | 'statistics' | 'relationship';

const VIEWS: { key: ViewMode; label: string }[] = [
  { key: 'timeline', label: '时间轴' },
  { key: 'outline', label: '大纲' },
  { key: 'narrative', label: '叙事' },
  { key: 'gantt', label: '甘特' },
  { key: 'statistics', label: '统计' },
  { key: 'relationship', label: '关系图' },
];

export function TopToolbar() {
  const viewMode = useTimelineStore((s) => s.viewMode);
  const setViewMode = useTimelineStore((s) => s.setViewMode);
  const zoom = useTimelineStore((s) => s.zoom);
  const zoomIn = useTimelineStore((s) => s.zoomIn);
  const zoomOut = useTimelineStore((s) => s.zoomOut);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);

  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: workspaces } = useWorkspaces();
  const { data: currentWorkspace } = useWorkspace(currentWorkspaceId);
  const ctx = useCommandContext();

  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    setTheme(theme === 'light' ? 'dark' : 'light', e.nativeEvent);
  };

  const handleSelectWorkspace = (id: string) => {
    setCurrentWorkspace(id);
    setSheetOpen(false);
  };

  return (
    <header className="flex h-12 items-center gap-2 border-b border-border bg-card px-3">
      {/* 左侧：工作区名称（点击切换工作区） */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 font-medium"
        onClick={() => setSheetOpen(true)}
      >
        <FolderOpen className="size-4" />
        <span className="max-w-[160px] truncate">
          {currentWorkspace?.name || '选择工作区'}
        </span>
        <ChevronDown className="size-3.5 opacity-60" />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* 中间：视图切换按钮组 */}
      <div className="flex items-center gap-0.5">
        {VIEWS.map((v) => (
          <Tooltip key={v.key}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1.5',
                  viewMode === v.key && 'bg-accent text-accent-foreground',
                )}
                onClick={() => setViewMode(v.key)}
              >
                <ViewIcon mode={v.key} />
                <span className="hidden lg:inline">{v.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{v.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="flex-1" />

      {/* 右侧：工具区 */}
      <div className="flex items-center gap-1">
        {/* 缩放控制 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={zoomOut}>
              <ZoomOut />
            </Button>
          </TooltipTrigger>
          <TooltipContent>缩小</TooltipContent>
        </Tooltip>

        <span className="w-12 text-center text-xs font-mono tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={zoomIn}>
              <ZoomIn />
            </Button>
          </TooltipTrigger>
          <TooltipContent>放大</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* 新建事件 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={ctx.createEvent}>
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>新建事件</TooltipContent>
        </Tooltip>

        {/* 保存 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={ctx.save}>
              <Save />
            </Button>
          </TooltipTrigger>
          <TooltipContent>保存 (Ctrl+S)</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* 命令面板入口 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Command className="size-3.5" />
              <span className="hidden md:inline text-xs text-muted-foreground">
                Ctrl+K
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>命令面板 (Ctrl+K)</TooltipContent>
        </Tooltip>

        {/* 主题切换 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleThemeToggle}>
              {theme === 'light' ? <Moon /> : <Sun />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {theme === 'light' ? '切换到墨黑主题' : '切换到素纸主题'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* 工作区切换 Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle>选择工作区</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 p-3">
            {workspaces?.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                暂无工作区，请新建一个。
              </p>
            )}
            {workspaces?.map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => handleSelectWorkspace(ws.id)}
                className={cn(
                  'flex flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                  ws.id === currentWorkspaceId && 'bg-accent text-accent-foreground',
                )}
              >
                <span className="font-medium">{ws.name}</span>
                {ws.description && (
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {ws.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function ViewIcon({ mode }: { mode: ViewMode }) {
  switch (mode) {
    case 'timeline':
      return <Clock className="size-4" />;
    case 'outline':
      return <List className="size-4" />;
    case 'narrative':
      return <BookOpen className="size-4" />;
    case 'gantt':
      return <BarChart3 className="size-4" />;
    case 'statistics':
      return <PieChart className="size-4" />;
    case 'relationship':
      return <Network className="size-4" />;
    default:
      return null;
  }
}
