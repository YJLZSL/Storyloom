// ============================================
// 平台检测 — Mod 键映射 (macOS → Cmd, 其他 → Ctrl)
// ============================================

/** 是否为 macOS / iOS 平台 */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  return /Mac|iPod|iPhone|iPad/.test(platform) || /Macintosh/.test(userAgent);
}

/** 获取 Mod 键的显示名称（macOS: ⌘，其他: Ctrl） */
export function getModKeyName(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/** 判断键盘事件的修饰键是否匹配 Mod（macOS: metaKey，其他: ctrlKey） */
export function isModKeyPressed(e: KeyboardEvent): boolean {
  return isMac() ? e.metaKey : e.ctrlKey;
}

/** 将按键组合中的 Mod 替换为平台对应的显示名称 */
export function formatKeysForDisplay(keys: string[]): string {
  const sep = isMac() ? '' : '+';
  return keys
    .map((k) => (k === 'Mod' ? getModKeyName() : k))
    .join(sep);
}
