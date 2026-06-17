// ============================================
// 命令注册表 — 统一命令定义，命令面板与快捷键系统共用
// ============================================

import type { ComponentType } from 'react';
import {
  Clock,
  List,
  BookOpen,
  BarChart3,
  PieChart,
  Network,
  Plus,
  UserPlus,
  FolderPlus,
  Download,
  Upload,
  Sun,
  Moon,
  Command,
  Save,
  Undo2,
  Redo2,
  Maximize,
  PanelLeft,
  Settings,
} from 'lucide-react';

// --- 类型定义 ---

export type CommandCategory = 'view' | 'action' | 'theme' | 'edit' | 'system';

export type ViewMode = 'timeline' | 'outline' | 'narrative' | 'gantt' | 'statistics' | 'relationship';
export type ThemeMode = 'light' | 'dark';
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
  { id: 'view-timeline', title: '切换到时间轴', icon: Clock, category: 'view', shortcut: 'Mod+1', handler: (ctx) => { ctx.setViewMode('timeline'); ctx.close(); } },
  { id: 'view-outline', title: '切换到大纲', icon: List, category: 'view', shortcut: 'Mod+2', handler: (ctx) => { ctx.setViewMode('outline'); ctx.close(); } },
  { id: 'view-narrative', title: '切换到叙事', icon: BookOpen, category: 'view', shortcut: 'Mod+3', handler: (ctx) => { ctx.setViewMode('narrative'); ctx.close(); } },
  { id: 'view-gantt', title: '切换到甘特图', icon: BarChart3, category: 'view', shortcut: 'Mod+4', handler: (ctx) => { ctx.setViewMode('gantt'); ctx.close(); } },
  { id: 'view-statistics', title: '切换到统计', icon: PieChart, category: 'view', shortcut: 'Mod+5', handler: (ctx) => { ctx.setViewMode('statistics'); ctx.close(); } },
  { id: 'view-relationship', title: '切换到关系图', icon: Network, category: 'view', shortcut: 'Mod+6', handler: (ctx) => { ctx.setViewMode('relationship'); ctx.close(); } },

  // 操作
  { id: 'action-new-event', title: '新建事件', icon: Plus, category: 'action', shortcut: 'Mod+N', handler: (ctx) => { ctx.createEvent(); ctx.close(); } },
  { id: 'action-new-character', title: '新建角色', icon: UserPlus, category: 'action', handler: (ctx) => { ctx.createCharacter(); ctx.close(); } },
  { id: 'action-new-workspace', title: '新建工作区', icon: FolderPlus, category: 'action', handler: (ctx) => { ctx.createWorkspace(); ctx.close(); } },
  { id: 'action-export', title: '导出工作区', icon: Download, category: 'action', handler: (ctx) => { ctx.exportWorkspace(); ctx.close(); } },
  { id: 'action-import', title: '导入工作区', icon: Upload, category: 'action', handler: (ctx) => { ctx.importWorkspace(); ctx.close(); } },

  // 编辑
  { id: 'edit-save', title: '保存', icon: Save, category: 'edit', shortcut: 'Mod+S', handler: (ctx) => { ctx.save(); ctx.close(); } },
  { id: 'edit-undo', title: '撤销', icon: Undo2, category: 'edit', shortcut: 'Mod+Z', handler: (ctx) => { ctx.undo(); ctx.close(); } },
  { id: 'edit-redo', title: '重做', icon: Redo2, category: 'edit', shortcut: 'Mod+Shift+Z', handler: (ctx) => { ctx.redo(); ctx.close(); } },

  // 系统
  { id: 'system-command-palette', title: '打开命令面板', icon: Command, category: 'system', shortcut: 'Mod+K', handler: (ctx) => { ctx.openCommandPalette(); } },
  { id: 'system-focus-mode', title: '切换专注模式', icon: Maximize, category: 'system', shortcut: 'F11', handler: (ctx) => { ctx.toggleFocusMode(); ctx.close(); } },
  { id: 'system-toggle-sidebar', title: '切换侧边栏', icon: PanelLeft, category: 'system', shortcut: 'Mod+B', handler: (ctx) => { ctx.toggleSidebar(); ctx.close(); } },
  { id: 'system-settings', title: '打开设置', icon: Settings, category: 'system', shortcut: 'Mod+,', handler: (ctx) => { ctx.openSettings(); ctx.close(); } },

  // 主题
  { id: 'theme-light', title: '切换到亮色主题', icon: Sun, category: 'theme', handler: (ctx) => { ctx.setTheme('light'); ctx.close(); } },
  { id: 'theme-dark', title: '切换到暗色主题', icon: Moon, category: 'theme', handler: (ctx) => { ctx.setTheme('dark'); ctx.close(); } },
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
