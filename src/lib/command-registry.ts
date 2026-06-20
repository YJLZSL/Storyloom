// ============================================
// 命令注册表 — 统一命令定义，命令面板与快捷键系统共用
// ============================================

import type { ComponentType } from 'react';
import {
  TimeIcon,
  ListIcon,
  BookOpenIcon,
  ChartHistogramIcon,
  PieIcon,
  RelationalGraphIcon,
  PlusIcon,
  UserIcon,
  FolderOpenIcon,
  DownloadIcon,
  UploadIcon,
  SunIcon,
  MoonIcon,
  TreeIcon,
  BookOpenIcon as ScrollTextIcon,
  ContrastIcon,
  MonitorIcon,
  CommandIcon,
  SaveIcon,
  UndoIcon,
  RedoIcon,
  FullScreenIcon,
  PanelLeftIcon,
  SettingIcon,
} from '@/lib/icons';

// --- 类型定义 ---

export type CommandCategory = 'view' | 'action' | 'theme' | 'edit' | 'system';

export type ViewMode = 'timeline' | 'outline' | 'narrative' | 'gantt' | 'statistics' | 'relationship';
export type ThemeMode = 'luosheng' | 'midnight' | 'forest' | 'ink-wash' | 'contrast' | 'system';
export type UIPanelType =
  | 'properties'
  | 'event-editor'
  | 'ai'
  | 'characters'
  | 'worldview'
  | 'foreshadowing'
  | 'connections'
  | 'consistency'
  | 'shortcuts'
  | null;

export interface CommandContext {
  setViewMode: (mode: ViewMode) => void;
  setSelectedEvent: (id: string | null) => void;
  setSelectedCharacter: (id: string | null) => void;
  scrollToEvent: (id: string | null) => void;
  setActivePanel: (panel: UIPanelType) => void;
  setTheme: (theme: ThemeMode) => void;
  createEvent: () => void;
  createCharacter: () => void;
  createWorkspace: () => void;
  exportWorkspace: () => void;
  importWorkspace: () => void;
  toggleFocusMode: () => void;
  toggleSidebar: () => void;
  openSettings: () => void;
  openCommandPalette: () => void;
  save: () => void;
  undo: () => void;
  redo: () => void;
  close: () => void;
}

export interface Command {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  category: CommandCategory;
  handler: (ctx: CommandContext) => void;
  /** 默认快捷键组合字符串，如 "Mod+K" */
  shortcut?: string;
}

export const CATEGORY_LABELS: Record<CommandCategory, string> = {
  view: '视图',
  action: '操作',
  theme: '主题',
  edit: '编辑',
  system: '系统',
};

// --- 默认命令定义 ---

export const defaultCommands: Command[] = [
  // 视图
  { id: 'view-timeline', title: '切换到时间轴', icon: TimeIcon, category: 'view', shortcut: 'Mod+1', handler: (ctx) => { ctx.setViewMode('timeline'); ctx.close(); } },
  { id: 'view-outline', title: '切换到大纲', icon: ListIcon, category: 'view', shortcut: 'Mod+2', handler: (ctx) => { ctx.setViewMode('outline'); ctx.close(); } },
  { id: 'view-narrative', title: '切换到叙事', icon: BookOpenIcon, category: 'view', shortcut: 'Mod+3', handler: (ctx) => { ctx.setViewMode('narrative'); ctx.close(); } },
  { id: 'view-gantt', title: '切换到甘特图', icon: ChartHistogramIcon, category: 'view', shortcut: 'Mod+4', handler: (ctx) => { ctx.setViewMode('gantt'); ctx.close(); } },
  { id: 'view-statistics', title: '切换到统计', icon: PieIcon, category: 'view', shortcut: 'Mod+5', handler: (ctx) => { ctx.setViewMode('statistics'); ctx.close(); } },
  { id: 'view-relationship', title: '切换到关系图', icon: RelationalGraphIcon, category: 'view', shortcut: 'Mod+6', handler: (ctx) => { ctx.setViewMode('relationship'); ctx.close(); } },

  // 操作
  { id: 'action-new-event', title: '新建事件', icon: PlusIcon, category: 'action', shortcut: 'Mod+N', handler: (ctx) => { ctx.createEvent(); ctx.close(); } },
  { id: 'action-new-character', title: '新建角色', icon: UserIcon, category: 'action', handler: (ctx) => { ctx.createCharacter(); ctx.close(); } },
  { id: 'action-new-workspace', title: '新建工作区', icon: FolderOpenIcon, category: 'action', handler: (ctx) => { ctx.createWorkspace(); ctx.close(); } },
  { id: 'action-export', title: '导出工作区', icon: DownloadIcon, category: 'action', handler: (ctx) => { ctx.exportWorkspace(); ctx.close(); } },
  { id: 'action-import', title: '导入工作区', icon: UploadIcon, category: 'action', handler: (ctx) => { ctx.importWorkspace(); ctx.close(); } },

  // 编辑
  { id: 'edit-save', title: '保存', icon: SaveIcon, category: 'edit', shortcut: 'Mod+S', handler: (ctx) => { ctx.save(); ctx.close(); } },
  { id: 'edit-undo', title: '撤销', icon: UndoIcon, category: 'edit', shortcut: 'Mod+Z', handler: (ctx) => { ctx.undo(); ctx.close(); } },
  { id: 'edit-redo', title: '重做', icon: RedoIcon, category: 'edit', shortcut: 'Mod+Shift+Z', handler: (ctx) => { ctx.redo(); ctx.close(); } },

  // 系统
  { id: 'system-command-palette', title: '打开命令面板', icon: CommandIcon, category: 'system', shortcut: 'Mod+K', handler: (ctx) => { ctx.openCommandPalette(); } },
  { id: 'system-focus-mode', title: '切换专注模式', icon: FullScreenIcon, category: 'system', shortcut: 'F11', handler: (ctx) => { ctx.toggleFocusMode(); ctx.close(); } },
  { id: 'system-toggle-sidebar', title: '切换侧边栏', icon: PanelLeftIcon, category: 'system', shortcut: 'Mod+B', handler: (ctx) => { ctx.toggleSidebar(); ctx.close(); } },
  { id: 'system-settings', title: '打开设置', icon: SettingIcon, category: 'system', shortcut: 'Mod+,', handler: (ctx) => { ctx.openSettings(); ctx.close(); } },

  // 主题
  { id: 'theme-luosheng', title: '主题：洛圣', icon: SunIcon, category: 'theme', handler: (ctx) => { ctx.setTheme('luosheng'); ctx.close(); } },
  { id: 'theme-midnight', title: '主题：子夜', icon: MoonIcon, category: 'theme', handler: (ctx) => { ctx.setTheme('midnight'); ctx.close(); } },
  { id: 'theme-forest', title: '主题：森林', icon: TreeIcon, category: 'theme', handler: (ctx) => { ctx.setTheme('forest'); ctx.close(); } },
  { id: 'theme-ink-wash', title: '主题：水墨', icon: ScrollTextIcon, category: 'theme', handler: (ctx) => { ctx.setTheme('ink-wash'); ctx.close(); } },
  { id: 'theme-contrast', title: '主题：高对比', icon: ContrastIcon, category: 'theme', handler: (ctx) => { ctx.setTheme('contrast'); ctx.close(); } },
  { id: 'theme-system', title: '主题：跟随系统', icon: MonitorIcon, category: 'theme', handler: (ctx) => { ctx.setTheme('system'); ctx.close(); } },
];

// --- 注册表 ---

const registry = new Map<string, Command>();

/** 注册命令 */
export function registerCommand(cmd: Command): void {
  registry.set(cmd.id, cmd);
}

/** 注销命令 */
export function unregisterCommand(id: string): void {
  registry.delete(id);
}

/** 查询单个命令 */
export function getCommand(id: string): Command | undefined {
  return registry.get(id);
}

/** 查询所有命令 */
export function getAllCommands(): Command[] {
  return Array.from(registry.values());
}

/** 按分类查询命令 */
export function getCommandsByCategory(category: CommandCategory): Command[] {
  return getAllCommands().filter((c) => c.category === category);
}

// 注册默认命令
for (const cmd of defaultCommands) {
  registerCommand(cmd);
}
