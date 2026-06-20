import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  TimeIcon,
  ListIcon,
  BookOpenIcon,
  ChartHistogramIcon,
  RelationalGraphIcon,
  PieIcon,
  TreeIcon,
  UserIcon,
  GlobeIcon,
  RemindIcon,
  LinkIcon,
  RobotIcon,
  EditIcon,
  SettingIcon,
  MenuUnfoldIcon,
  MenuFoldIcon,
  type IconParkIconProps,
} from '@/lib/icons';
import { TMenu, TMenuItem, TMenuGroup, TButton } from '@/components/ui-tdesign';
import { useUIStore } from '@/stores/useUIStore';
import { useViewStore, type ViewId } from '@/stores/useViewStore';
import { useThemeStore } from '@/stores/useThemeStore';

type IconComponent = (props: IconParkIconProps) => React.ReactElement;

type PanelType =
  | 'properties'
  | 'event-editor'
  | 'ai'
  | 'characters'
  | 'worldview'
  | 'foreshadowing'
  | 'connections'
  | 'consistency'
  | 'shortcuts';

interface NavItem {
  id: string;
  label: string;
  icon: IconComponent;
  type: 'view' | 'panel';
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: '视图',
    items: [
      { id: 'timeline', label: '时间轴', icon: TimeIcon, type: 'view' },
      { id: 'outline', label: '大纲', icon: ListIcon, type: 'view' },
      { id: 'narrative', label: '叙事', icon: BookOpenIcon, type: 'view' },
      { id: 'gantt', label: '甘特', icon: ChartHistogramIcon, type: 'view' },
      { id: 'tree', label: '树状', icon: TreeIcon, type: 'view' },
      { id: 'stats', label: '统计', icon: PieIcon, type: 'view' },
      { id: 'relationship', label: '关系图', icon: RelationalGraphIcon, type: 'view' },
    ],
  },
  {
    group: '创作',
    items: [
      { id: 'characters', label: '角色', icon: UserIcon, type: 'panel' },
      { id: 'worldview', label: '世界观', icon: GlobeIcon, type: 'panel' },
      { id: 'foreshadowing', label: '伏笔', icon: RemindIcon, type: 'panel' },
      { id: 'ai', label: 'AI 助手', icon: RobotIcon, type: 'panel' },
    ],
  },
  {
    group: '工具',
    items: [
      { id: 'connections', label: '关联', icon: LinkIcon, type: 'panel' },
      { id: 'consistency', label: '一致性', icon: SettingIcon, type: 'panel' },
      { id: 'event-editor', label: '事件编辑器', icon: EditIcon, type: 'panel' },
    ],
  },
];

interface SideNavProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function SideNav({ collapsed, onToggle }: SideNavProps) {
  const activeView = useViewStore((s) => s.activeView);
  const setActiveView = useViewStore((s) => s.setActiveView);
  const activePanel = useUIStore((s) => s.activePanel);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const isDark = useThemeStore((s) => {
    const t = s.theme;
    if (t === 'system') {
      return typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false;
    }
    return t === 'midnight' || t === 'contrast';
  });

  const menuTheme = isDark ? 'dark' : 'light';
  const activeValue = activePanel ?? activeView;

  const itemMap = useMemo(() => {
    const map: Record<string, NavItem> = {};
    NAV_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        map[item.id] = item;
      });
    });
    return map;
  }, []);

  const handleChange = (value: string | number) => {
    const item = itemMap[value as string];
    if (!item) return;
    if (item.type === 'view') {
      setActiveView(item.id as ViewId);
    } else {
      setActivePanel(item.id as PanelType);
    }
  };

  const ToggleIcon = collapsed ? MenuUnfoldIcon : MenuFoldIcon;

  return (
    <nav
      className={cn(
        'relative flex flex-col gap-1 border-r border-border bg-card/80 py-2 shadow-sm backdrop-blur-sm transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-14' : 'w-48',
      )}
      style={{ zIndex: 'var(--z-sidenav)' }}
    >
      <div className={cn('flex px-2 pb-2', collapsed ? 'justify-center' : 'justify-end')}>
        <TButton
          variant="text"
          shape="circle"
          size="small"
          onClick={onToggle}
          aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
          className="size-8 border border-border bg-background/80 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          icon={<ToggleIcon size={16} />}
        />
      </div>

      <TMenu
        collapsed={collapsed}
        theme={menuTheme}
        value={activeValue}
        onChange={handleChange}
        width={['100%', '100%']}
        className="flex-1"
      >
        {NAV_GROUPS.map((group) => (
          <TMenuGroup key={group.group} title={group.group}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <TMenuItem key={item.id} value={item.id} icon={<Icon />}>
                  {item.label}
                </TMenuItem>
              );
            })}
          </TMenuGroup>
        ))}
      </TMenu>
    </nav>
  );
}
