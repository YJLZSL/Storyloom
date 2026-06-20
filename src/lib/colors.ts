// Storyloom 统一调色板
// 所有业务颜色集中在此，禁止在组件中硬编码颜色值。

// ===== 轨道 / 事件 调色板（10 色） =====
export const TRACK_COLORS = [
  '#c4703a', '#2563eb', '#16a34a', '#dc2626',
  '#7c3aed', '#0891b2', '#db2777', '#ea580c',
  '#65a30d', '#4f46e5',
] as const;

export const TRACK_COLOR_SET = new Set(TRACK_COLORS);

export const DEFAULT_TRACK_COLOR = TRACK_COLORS[0];

// ===== 连线类型配色（时间轴视图） =====
export interface ConnectionStyle {
  color: string;
  dashArray: string;
}

export const TIMELINE_CONNECTION_STYLES: Record<string, ConnectionStyle> = {
  '因果':   { color: '#3b82f6', dashArray: 'none' },
  '闪回':   { color: '#8b5cf6', dashArray: '8 4' },
  '伏笔':   { color: '#22c55e', dashArray: '3 5' },
  '平行':   { color: '#f59e0b', dashArray: 'none' },
  '对比':   { color: '#ef4444', dashArray: '8 4' },
  '呼应':   { color: '#14b8a6', dashArray: 'none' },
  '转折':   { color: '#f97316', dashArray: '3 5' },
  // 英文键兜底（兼容旧数据）
  'causal':        { color: '#3b82f6', dashArray: 'none' },
  'flashback':     { color: '#8b5cf6', dashArray: '8 4' },
  'foreshadowing': { color: '#22c55e', dashArray: '3 5' },
  'parallel':      { color: '#f59e0b', dashArray: 'none' },
  'contrast':      { color: '#ef4444', dashArray: '8 4' },
  'echo':          { color: '#14b8a6', dashArray: 'none' },
  'twist':         { color: '#f97316', dashArray: '3 5' },
};

export function getTimelineConnectionStyle(type: string): ConnectionStyle {
  return TIMELINE_CONNECTION_STYLES[type] ?? { color: '#6b7280', dashArray: 'none' };
}

// ===== 树状时间轴连线配色（更沉稳的版本） =====
export const TREE_CONNECTION_COLORS: Record<string, string> = {
  '因果': '#3B5BDB',
  '闪回': '#7c3aed',
  '伏笔': '#ea580c',
  '平行': '#16a34a',
  '对比': '#dc2626',
  '呼应': '#0891b2',
  '转折': '#db2777',
  'causal': '#3B5BDB',
  'flashback': '#7c3aed',
  'foreshadowing': '#ea580c',
  'parallel': '#16a34a',
  'contrast': '#dc2626',
  'echo': '#0891b2',
  'twist': '#db2777',
};

export function getTreeConnectionColor(type: string): string {
  return TREE_CONNECTION_COLORS[type] ?? '#6b7280';
}

// ===== 关系图节点配色 =====
export type GraphNodeType = 'character' | 'event' | 'world-setting';

export const NODE_COLORS: Record<GraphNodeType, string> = {
  character: '#3B5BDB',
  event: '#16A34A',
  'world-setting': '#EA580C',
};

export function getNodeColor(type: GraphNodeType): string {
  return NODE_COLORS[type] ?? '#6b7280';
}

export const LEGEND_ITEMS: { type: GraphNodeType; label: string; color: string }[] = [
  { type: 'character', label: '人物', color: NODE_COLORS.character },
  { type: 'event', label: '事件', color: NODE_COLORS.event },
  { type: 'world-setting', label: '地点/世界观', color: NODE_COLORS['world-setting'] },
];

// ===== 伏笔状态配色 =====
export const FORESHADOWING_STATUS_COLORS: Record<string, string> = {
  planted: '#eab308',
  developed: '#3b82f6',
  resolved: '#22c55e',
  abandoned: '#9ca3af',
};

export const FORESHADOWING_STATUS_VARS: Record<string, string> = {
  planted: '--warning',
  developed: '--info',
  resolved: '--success',
  abandoned: '--muted-foreground',
};

export function getForeshadowingStatusColor(status: string): string {
  return FORESHADOWING_STATUS_COLORS[status] ?? '#9ca3af';
}

export function getForeshadowingStatusVar(status: string): string {
  return FORESHADOWING_STATUS_VARS[status] ?? '--muted-foreground';
}

// ===== 主题预览色（用于 ThemeSelector 动态生成，替代硬编码 hex） =====
// 这些值必须与 index.css 中各主题的 --primary 和 --background 一致
export const THEME_PREVIEW_TOKENS: Record<string, { bg: string; primary: string }> = {
  luosheng:  { bg: '#FAF6ED', primary: '#B8860B' },
  midnight:  { bg: '#0F172A', primary: '#38BDF8' },
  forest:    { bg: '#E8F0E2', primary: '#2F7A41' },
  'ink-wash':{ bg: '#F5F5F0', primary: '#1A1A1A' },
  contrast:  { bg: '#000000', primary: '#FFFF00' },
  system:    { bg: '#FAF6ED', primary: '#0F172A' },
};

export function getThemePreviewGradient(themeId: string): string {
  const tokens = THEME_PREVIEW_TOKENS[themeId] ?? THEME_PREVIEW_TOKENS.luosheng;
  return `linear-gradient(135deg, ${tokens.bg} 0%, ${tokens.bg} 50%, ${tokens.primary} 50%, ${tokens.primary} 100%)`;
}

// ===== 通用语义颜色（映射到 Tailwind / CSS 变量） =====
export const SEMANTIC_COLORS = {
  destructive: 'rgb(var(--destructive))',
  success: 'rgb(var(--success))',
  warning: 'rgb(var(--warning))',
  info: 'rgb(var(--info))',
  primary: 'rgb(var(--primary))',
  muted: 'rgb(var(--muted))',
  border: 'rgb(var(--border))',
  foreground: 'rgb(var(--foreground))',
  'muted-foreground': 'rgb(var(--muted-foreground))',
} as const;
