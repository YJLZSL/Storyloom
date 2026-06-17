// ============================================
// 快捷键注册表 — when 上下文 + 跨平台 Mod 映射 + 冲突检测 + 持久化
// ============================================

import { isMac } from './platform';
import { getAllCommands, getCommand } from './command-registry';
import type { CommandCategory } from './command-registry';
import { useUIStore } from '@/stores/useUIStore';
import { useTimelineStore } from '@/stores/useTimelineStore';

// --- 类型定义 ---

/** 快捷键生效的上下文条件 */
export type WhenContext = 'global' | 'timelineFocus' | 'editorFocus' | 'modalOpen';

/** 快捷键分类（复用命令分类） */
export type ShortcutCategory = CommandCategory;

/** 快捷键绑定（运行时状态，可自定义） */
export interface ShortcutBinding {
  /** 唯一标识，与命令 ID 一致 */
  id: string;
  /** 默认按键组合，如 ['Mod', 'K'] */
  defaultKeys: string[];
  /** 当前按键组合（可能与 defaultKeys 不同） */
  keys: string[];
  /** 生效上下文条件 */
  when: WhenContext;
  /** 是否启用 */
  enabled: boolean;
  /** 描述文本 */
  description: string;
  /** 分类 */
  category: ShortcutCategory;
}

// --- 常量 ---

const STORAGE_KEY = 'shortcut-bindings';

const MODIFIER_KEYS = new Set(['mod', 'ctrl', 'meta', 'cmd', 'shift', 'alt']);

// --- 工具函数 ---

/** 将快捷键字符串（如 "Mod+K"）解析为数组 ['Mod', 'K'] */
function parseShortcut(s: string): string[] {
  return s.split('+').map((p) => p.trim()).filter(Boolean);
}

/** 规范化按键组合用于冲突比较（小写 + 排序） */
function normalizeKeys(keys: string[]): string {
  return keys.map((k) => k.toLowerCase()).sort().join('+');
}

// --- 默认绑定（从命令注册表派生） ---

function buildDefaultBindings(): Map<string, ShortcutBinding> {
  const map = new Map<string, ShortcutBinding>();
  for (const cmd of getAllCommands()) {
    if (!cmd.shortcut) continue;
    const keys = parseShortcut(cmd.shortcut);
    map.set(cmd.id, {
      id: cmd.id,
      defaultKeys: keys,
      keys: [...keys],
      when: 'global',
      enabled: true,
      description: cmd.title,
      category: cmd.category,
    });
  }
  return map;
}

let bindings: Map<string, ShortcutBinding> = buildDefaultBindings();

// --- 持久化 ---

function loadCustomBindings(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const custom = JSON.parse(stored) as Record<string, { keys: string[]; enabled?: boolean }>;
    for (const [id, customBinding] of Object.entries(custom)) {
      const binding = bindings.get(id);
      if (binding) {
        bindings.set(id, {
          ...binding,
          keys: [...customBinding.keys],
          enabled: customBinding.enabled ?? true,
        });
      }
    }
  } catch {
    // 忽略解析错误
  }
}

function saveCustomBindings(): void {
  const custom: Record<string, { keys: string[]; enabled: boolean }> = {};
  for (const binding of bindings.values()) {
    const isDefault =
      JSON.stringify(binding.keys) === JSON.stringify(binding.defaultKeys) && binding.enabled;
    if (!isDefault) {
      custom[binding.id] = { keys: binding.keys, enabled: binding.enabled };
    }
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch {
    // 忽略写入错误
  }
}

// 初始化时加载自定义绑定
loadCustomBindings();

// --- 订阅机制 ---

let version = 0;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  version++;
  listeners.forEach((cb) => cb());
}

/** 订阅快捷键变更 */
export function subscribeShortcuts(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** 获取当前版本号（用于 useSyncExternalStore） */
export function getShortcutsVersion(): number {
  return version;
}

// --- 查询接口 ---

/** 获取所有快捷键绑定（按分类排序） */
export function getAllShortcuts(): ShortcutBinding[] {
  return Array.from(bindings.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.id.localeCompare(b.id);
  });
}

/** 获取单个快捷键绑定 */
export function getShortcut(id: string): ShortcutBinding | undefined {
  return bindings.get(id);
}

/** 获取分类标签 */
export function getCategoryLabel(category: ShortcutCategory): string {
  const labels: Record<ShortcutCategory, string> = {
    view: '视图',
    action: '操作',
    theme: '主题',
    edit: '编辑',
    system: '系统',
  };
  return labels[category];
}

// --- 修改接口 ---

/** 启用/禁用快捷键 */
export function setShortcutEnabled(id: string, enabled: boolean): void {
  const binding = bindings.get(id);
  if (binding && binding.enabled !== enabled) {
    bindings.set(id, { ...binding, enabled });
    saveCustomBindings();
    notifyListeners();
  }
}

/** 自定义绑定按键组合 */
export function rebindShortcut(id: string, keys: string[]): void {
  const binding = bindings.get(id);
  if (binding) {
    bindings.set(id, { ...binding, keys: [...keys] });
    saveCustomBindings();
    notifyListeners();
  }
}

/** 重置为默认绑定 */
export function resetShortcut(id: string): void {
  const binding = bindings.get(id);
  if (binding) {
    bindings.set(id, { ...binding, keys: [...binding.defaultKeys], enabled: true });
    saveCustomBindings();
    notifyListeners();
  }
}

/** 重置所有快捷键为默认 */
export function resetAllShortcuts(): void {
  for (const [id, binding] of bindings) {
    bindings.set(id, { ...binding, keys: [...binding.defaultKeys], enabled: true });
  }
  saveCustomBindings();
  notifyListeners();
}

// --- 冲突检测 ---

/** 查找与指定按键组合冲突的快捷键（排除自身） */
export function findConflicts(keys: string[], excludeId?: string): ShortcutBinding[] {
  const normalized = normalizeKeys(keys);
  return Array.from(bindings.values()).filter((b) => {
    if (b.id === excludeId) return false;
    return normalizeKeys(b.keys) === normalized;
  });
}

// --- 上下文推导 ---

/** 根据当前 UI 状态推导生效的上下文 */
export function getCurrentContext(): WhenContext {
  const ui = useUIStore.getState();
  const timeline = useTimelineStore.getState();
  if (ui.commandPaletteOpen || ui.settingsOpen) return 'modalOpen';
  if (ui.activePanel === 'event-editor') return 'editorFocus';
  if (timeline.viewMode === 'timeline') return 'timelineFocus';
  return 'global';
}

/** 判断快捷键在指定上下文下是否激活 */
function isShortcutActive(binding: ShortcutBinding, ctx: WhenContext): boolean {
  if (binding.when === 'global') return true;
  return binding.when === ctx;
}

// --- 匹配引擎 ---

/**
 * 判断键盘事件是否匹配指定按键组合
 * 支持 Mod 元键：macOS → metaKey，其他 → ctrlKey
 */
export function matchesShortcut(e: KeyboardEvent, keys: string[]): boolean {
  const parts = keys.map((k) => k.toLowerCase());
  const mac = isMac();

  const needMod = parts.includes('mod');
  const needCtrl = parts.includes('ctrl');
  const needMeta = parts.includes('meta') || parts.includes('cmd');
  const needShift = parts.includes('shift');
  const needAlt = parts.includes('alt');

  const keyPart = parts.find((p) => !MODIFIER_KEYS.has(p));
  if (!keyPart) return false;

  // Mod 键检查
  if (needMod) {
    if (mac ? !e.metaKey : !e.ctrlKey) return false;
  }
  // 显式 Ctrl / Meta 检查
  if (needCtrl && !e.ctrlKey) return false;
  if (needMeta && !e.metaKey) return false;

  // Shift / Alt 必须精确匹配
  if (needShift !== e.shiftKey) return false;
  if (needAlt !== e.altKey) return false;

  // 未要求任何修饰键时，不允许修饰键被按下
  if (!needMod && !needCtrl && !needMeta) {
    if (e.ctrlKey || e.metaKey) return false;
  }

  return e.key.toLowerCase() === keyPart;
}

/**
 * 尝试匹配并执行快捷键对应的命令
 * @param e 键盘事件
 * @param ctx 当前上下文
 * @param commandContext 命令执行上下文
 * @returns 是否匹配并执行了某个快捷键
 */
export function tryHandleShortcut(
  e: KeyboardEvent,
  ctx: WhenContext,
  commandContext: import('./command-registry').CommandContext,
): boolean {
  for (const shortcut of getAllShortcuts()) {
    if (!shortcut.enabled) continue;
    if (!isShortcutActive(shortcut, ctx)) continue;
    if (!matchesShortcut(e, shortcut.keys)) continue;

    const cmd = getCommand(shortcut.id);
    if (cmd) {
      e.preventDefault();
      e.stopPropagation();
      cmd.handler(commandContext);
      return true;
    }
  }
  return false;
}
