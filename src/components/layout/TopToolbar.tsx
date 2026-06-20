import { Dropdown } from 'tdesign-react';
import type { DropdownOption } from 'tdesign-react';
import { cn } from '@/lib/utils';
import {
  ZoomInIcon,
  ZoomOutIcon,
  PlusIcon,
  SaveIcon,
  CommandIcon,
  FolderOpenIcon,
  DownIcon,
  DeleteIcon,
  TimeIcon,
  ListIcon,
  BookOpenIcon,
  ChartHistogramIcon,
  TreeIcon,
  PieIcon,
  RelationalGraphIcon,
  SettingIcon,
  PaletteIcon,
  LayersIcon,
  type IconParkIconProps,
} from '@/lib/icons';
import { TButton, TSlider, TTooltip, TPopup } from '@/components/ui-tdesign';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useViewStore, type ViewId } from '@/stores/useViewStore';
import {
  useWorkspaces,
  useWorkspace,
  useCreateWorkspace,
  useDeleteWorkspace,
} from '@/services/api-hooks';
import { useCommandContext } from '@/components/command-palette/commands';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { LanguageSelector } from '@/components/layout/LanguageSelector';
import { toast } from 'sonner';

const ACTION_NEW = '__new__';
const ACTION_DELETE_PREFIX = '__delete__:';

type IconComponent = (props: IconParkIconProps) => React.ReactElement;

interface ViewTab {
  id: ViewId;
  label: string;
  icon: IconComponent;
}

const VIEW_TABS: ViewTab[] = [
  { id: 'timeline', label: '时间轴', icon: TimeIcon },
  { id: 'outline', label: '大纲', icon: ListIcon },
  { id: 'narrative', label: '叙事', icon: BookOpenIcon },
  { id: 'gantt', label: '甘特', icon: ChartHistogramIcon },
  { id: 'tree', label: '树状', icon: TreeIcon },
  { id: 'stats', label: '统计', icon: PieIcon },
  { id: 'relationship', label: '关系图', icon: RelationalGraphIcon },
];

export function TopToolbar() {
  const zoom = useTimelineStore((s) => s.zoom);
  const setZoom = useTimelineStore((s) => s.setZoom);
  const zoomIn = useTimelineStore((s) => s.zoomIn);
  const zoomOut = useTimelineStore((s) => s.zoomOut);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const activeView = useViewStore((s) => s.activeView);
  const setActiveView = useViewStore((s) => s.setActiveView);

  const { data: workspaces } = useWorkspaces();
  const { data: currentWorkspace } = useWorkspace(currentWorkspaceId);
  const createWorkspaceMutation = useCreateWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspace();
  const ctx = useCommandContext();

  const workspaceOptions: DropdownOption[] = [
    ...(workspaces || []).map((ws) => ({
      content: ws.name,
      value: ws.id,
      active: ws.id === currentWorkspaceId,
      children: [
        {
          content: '切换到此工作区',
          value: ws.id,
          prefixIcon: <FolderOpenIcon />,
        },
        {
          content: '删除工作区',
          value: `${ACTION_DELETE_PREFIX}${ws.id}`,
          theme: 'error' as const,
          prefixIcon: <DeleteIcon />,
        },
      ],
    })),
    {
      content: '新建工作区',
      value: ACTION_NEW,
      divider: true,
      prefixIcon: <PlusIcon />,
    },
  ];

  const handleDropdownClick = (option: DropdownOption) => {
    const value = option.value;
    if (typeof value !== 'string') return;
    if (value === ACTION_NEW) {
      createWorkspaceMutation.mutate(
        { name: `新工作区 ${new Date().toLocaleDateString()}` },
        {
          onSuccess: (workspace) => {
            setCurrentWorkspace(workspace.id);
            toast.success('已创建工作区');
          },
          onError: () => toast.error('创建失败'),
        },
      );
      return;
    }
    if (value.startsWith(ACTION_DELETE_PREFIX)) {
      const id = value.slice(ACTION_DELETE_PREFIX.length);
      if (!confirm('确定要删除该工作区吗？此操作不可撤销。')) return;
      deleteWorkspaceMutation.mutate(id, {
        onSuccess: () => {
          if (id === currentWorkspaceId) setCurrentWorkspace(null);
          toast.success('已删除');
        },
        onError: () => toast.error('删除失败'),
      });
      return;
    }
    setCurrentWorkspace(value);
  };

  return (
    <header
      className="relative flex h-11 items-center gap-2 border-b border-border/60 bg-background/90 px-3 backdrop-blur"
      style={{ zIndex: 'var(--z-toolbar)' }}
    >
      {/* 左侧：品牌 + 工作区 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 pr-2 group">
          <LayersIcon className="size-5 text-primary transition-transform duration-300 group-hover:rotate-12" />
          <span className="hidden select-none font-serif text-sm font-semibold tracking-tight sm:inline">
            Storyloom
          </span>
        </div>

        <div className="h-5 w-px bg-border/60" />

        <Dropdown
          options={workspaceOptions}
          trigger="click"
          placement="bottom-left"
          minColumnWidth={180}
          onClick={handleDropdownClick}
        >
          <TButton variant="text" size="small" className="gap-1.5 font-medium rounded-md hover:bg-muted/80">
            <FolderOpenIcon className="size-4 text-muted-foreground" />
            <span className="max-w-[120px] truncate text-xs">
              {currentWorkspace?.name || '选择工作区'}
            </span>
            <DownIcon className="size-3 opacity-60 transition-transform duration-200" />
          </TButton>
        </Dropdown>
      </div>

      {/* 中间：视图 Tab */}
      <nav className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-0.5 rounded-xl bg-muted/40 p-1">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={cn(
                  'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all duration-200',
                  isActive
                    ? 'bg-background font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                )}
              >
                <Icon className={cn('size-3.5 transition-colors', isActive ? 'text-primary' : '')} />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-1">
        <TTooltip content="缩小 (Ctrl+-)" placement="bottom">
          <TButton
            variant="text"
            size="small"
            shape="square"
            className="size-7 hover:bg-muted/80"
            icon={<ZoomOutIcon className="size-4 text-muted-foreground" />}
            onClick={() => zoomOut(0.1)}
          />
        </TTooltip>

        <div className="flex w-28 flex-col gap-0 px-1">
          <span className="text-center text-[9px] font-mono tabular-nums text-muted-foreground/60">
            {Math.round(zoom * 100)}%
          </span>
          <TSlider
            value={Math.round(zoom * 100)}
            min={50}
            max={300}
            step={1}
            onChange={(v) => setZoom((v as number) / 100)}
            label={false}
            inputNumberProps={false}
            className="w-full"
          />
        </div>

        <TTooltip content="放大 (Ctrl+=)" placement="bottom">
          <TButton
            variant="text"
            size="small"
            shape="square"
            className="size-7 hover:bg-muted/80"
            icon={<ZoomInIcon className="size-4 text-muted-foreground" />}
            onClick={() => zoomIn(0.1)}
          />
        </TTooltip>

        <div className="mx-1 h-5 w-px bg-border/60" />

        <TTooltip content="新建事件" placement="bottom">
          <TButton
            variant="text"
            size="small"
            theme="success"
            className="gap-1 text-xs hover:bg-green-50/50 dark:hover:bg-green-900/20"
            icon={<PlusIcon className="size-4" />}
            onClick={ctx.createEvent}
          >
            新建
          </TButton>
        </TTooltip>

        <TTooltip content="保存 (Ctrl+S)" placement="bottom">
          <TButton
            variant="text"
            size="small"
            className="gap-1 text-xs hover:bg-muted/80"
            icon={<SaveIcon className="size-4 text-muted-foreground" />}
            onClick={ctx.save}
          >
            保存
          </TButton>
        </TTooltip>

        <div className="mx-1 h-5 w-px bg-border/60" />

        <TTooltip content="命令面板 (Ctrl+K)" placement="bottom">
          <TButton
            variant="outline"
            size="small"
            className="gap-1 text-xs border-border/60 hover:bg-muted/50"
            icon={<CommandIcon className="size-3.5" />}
            onClick={() => setCommandPaletteOpen(true)}
          >
            <span className="hidden text-[10px] text-muted-foreground sm:inline">Ctrl+K</span>
          </TButton>
        </TTooltip>

        <LanguageSelector />

        <TTooltip content="设置" placement="bottom">
          <TButton
            variant="text"
            size="small"
            shape="square"
            className="size-7 hover:bg-muted/80"
            icon={<SettingIcon className="size-4 text-muted-foreground" />}
            aria-label="设置"
            onClick={() => setSettingsOpen(true)}
          />
        </TTooltip>

        <TPopup
          trigger="click"
          placement="bottom-right"
          content={
            <div
              className="w-80 space-y-3 p-3"
              style={{
                backgroundColor: 'rgb(var(--popover))',
                border: '1px solid rgb(var(--border))',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div className="text-sm font-medium">主题</div>
              <ThemeSelector />
            </div>
          }
        >
          <TButton
            variant="text"
            size="small"
            shape="square"
            className="size-7 hover:bg-muted/80"
            icon={<PaletteIcon className="size-4 text-muted-foreground" />}
            aria-label="选择主题"
          />
        </TPopup>
      </div>
    </header>
  );
}
