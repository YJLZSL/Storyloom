import { Dropdown } from 'tdesign-react';
import type { DropdownOption } from 'tdesign-react';
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
  type IconParkIconProps,
} from '@/lib/icons';
import { TButton, TSlider, TTooltip, TPopup, TTabs, TTabPanel } from '@/components/ui-tdesign';
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
      className="relative flex flex-col border-b border-border bg-background/80 backdrop-blur"
      style={{ zIndex: 'var(--z-toolbar)' }}
    >
      <div className="flex h-12 items-center gap-2 px-3">
        <Dropdown
          options={workspaceOptions}
          trigger="click"
          placement="bottom-left"
          minColumnWidth={180}
          onClick={handleDropdownClick}
        >
          <TButton variant="text" size="small" className="gap-1.5 font-medium">
            <FolderOpenIcon />
            <span className="max-w-[160px] truncate">
              {currentWorkspace?.name || '选择工作区'}
            </span>
            <DownIcon className="opacity-60" />
          </TButton>
        </Dropdown>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <TTooltip content="缩小 (Ctrl+-)" placement="bottom">
            <TButton
              variant="text"
              size="small"
              shape="square"
              icon={<ZoomOutIcon />}
              onClick={() => zoomOut(0.1)}
            />
          </TTooltip>

          <div className="flex w-40 flex-col gap-0.5 px-2">
            <span className="text-center text-[10px] font-mono tabular-nums text-muted-foreground">
              Zoom: {Math.round(zoom * 100)}%
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
              icon={<ZoomInIcon />}
              onClick={() => zoomIn(0.1)}
            />
          </TTooltip>

          <div className="mx-1 h-6 w-px bg-border" />

          <TTooltip content="新建事件" placement="bottom">
            <TButton
              variant="text"
              size="small"
              theme="success"
              icon={<PlusIcon />}
              onClick={ctx.createEvent}
            >
              新建事件
            </TButton>
          </TTooltip>

          <TTooltip content="保存 (Ctrl+S)" placement="bottom">
            <TButton variant="text" size="small" icon={<SaveIcon />} onClick={ctx.save}>
              保存
            </TButton>
          </TTooltip>

          <div className="mx-1 h-6 w-px bg-border" />

          <TTooltip content="命令面板 (Ctrl+K)" placement="bottom">
            <TButton
              variant="outline"
              size="small"
              icon={<CommandIcon />}
              onClick={() => setCommandPaletteOpen(true)}
            >
              <span className="text-xs text-muted-foreground">Ctrl+K</span>
            </TButton>
          </TTooltip>

          <LanguageSelector />

          <TTooltip content="设置" placement="bottom">
            <TButton
              variant="text"
              size="small"
              shape="square"
              icon={<SettingIcon />}
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
              icon={<PaletteIcon />}
              aria-label="选择主题"
            />
          </TPopup>
        </div>
      </div>

      <div className="flex h-9 items-center gap-1 border-t border-border/50 bg-background/50 px-2">
        <TTabs
          value={activeView}
          onChange={(value) => setActiveView(value as ViewId)}
          theme="normal"
          className="toolbar-tabs h-full"
        >
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TTabPanel
                key={tab.id}
                value={tab.id}
                label={
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-4" />
                    {tab.label}
                  </span>
                }
              />
            );
          })}
        </TTabs>
      </div>
    </header>
  );
}
