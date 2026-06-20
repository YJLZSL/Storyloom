import { useLayoutEffect, type ReactNode } from 'react';
import type { ConfigProviderProps } from 'tdesign-react';
import { useThemeStore, type ThemeId } from '@/stores/useThemeStore';

/**
 * 将 Storyloom 主题变量映射到 TDesign 的 --td-* CSS 令牌。
 * Storyloom 的令牌格式为 "R G B" 空格分隔（可被 rgb() 直接使用），
 * TDesign 使用完整的颜色值（如 #B8860B 或 rgb(...））。
 */

function rgbToHex(rgbStr: string): string {
  const parts = rgbStr.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return rgbStr;
  const [r, g, b] = parts;
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function rgbWithAlpha(rgbStr: string, alpha: number): string {
  const parts = rgbStr.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return rgbStr;
  const [r, g, b] = parts;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCssVar(name: string): string {
  if (typeof document === 'undefined') return '';
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value;
}

function withFallback(value: string, fallback: string): string {
  return value.trim() ? value : fallback;
}

function resolveEffectiveTheme(theme: ThemeId): Exclude<ThemeId, 'system'> {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined' || !window.matchMedia) return 'luosheng';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'midnight' : 'luosheng';
}

/**
 * 洛笙主题的 canonical RGB 值，作为 CSS 变量读取失败时的 fallback，
 * 确保在 DOM/样式未就绪时也不会回退到 TDesign 默认蓝色。
 */
const LUOSHENG_PRIMARY_RGB = '184 134 11';
const LUOSHENG_SUCCESS_RGB = '22 163 74';

interface TDesignColorMapping {
  '--td-brand-color': string;
  '--td-brand-color-hover': string;
  '--td-brand-color-focus': string;
  '--td-brand-color-active': string;
  '--td-brand-color-disabled': string;
  '--td-brand-color-light': string;
  '--td-brand-color-light-hover': string;
  '--td-success-color': string;
  '--td-success-color-hover': string;
  '--td-warning-color': string;
  '--td-error-color': string;
  '--td-bg-color-page': string;
  '--td-bg-color-container': string;
  '--td-bg-color-container-hover': string;
  '--td-bg-color-secondarycontainer': string;
  '--td-text-color-primary': string;
  '--td-text-color-secondary': string;
  '--td-text-color-placeholder': string;
  '--td-border-level-1-color': string;
  '--td-border-level-2-color': string;
  '--td-radius-default': string;
  '--td-radius-small': string;
  '--td-radius-large': string;
  '--td-shadow-1': string;
  '--td-shadow-2': string;
}

function buildMapping(theme: ThemeId): Partial<TDesignColorMapping> {
  const effectiveTheme = resolveEffectiveTheme(theme);
  const isLuosheng = effectiveTheme === 'luosheng';

  const primary = isLuosheng
    ? withFallback(getCssVar('--primary'), LUOSHENG_PRIMARY_RGB)
    : getCssVar('--primary');
  const success = isLuosheng
    ? withFallback(getCssVar('--success'), LUOSHENG_SUCCESS_RGB)
    : getCssVar('--success');
  const background = getCssVar('--background');
  const card = getCssVar('--card');
  const muted = getCssVar('--muted');
  const foreground = getCssVar('--foreground');
  const mutedForeground = getCssVar('--muted-foreground');
  const border = getCssVar('--border');
  const destructive = getCssVar('--destructive');
  const warning = getCssVar('--warning');
  const primaryHex = rgbToHex(primary);
  const successHex = rgbToHex(success);
  const warningHex = rgbToHex(warning);
  const destructiveHex = rgbToHex(destructive);

  // 根据主题调整阴影强度
  const shadowIntensity =
    effectiveTheme === 'contrast' ? 0 : effectiveTheme === 'midnight' ? 0.25 : 0.08;

  return {
    '--td-brand-color': primaryHex,
    '--td-brand-color-hover': rgbWithAlpha(primary, 0.85),
    '--td-brand-color-focus': rgbWithAlpha(primary, 0.9),
    '--td-brand-color-active': rgbWithAlpha(primary, 1),
    '--td-brand-color-disabled': rgbWithAlpha(primary, 0.4),
    '--td-brand-color-light': rgbWithAlpha(primary, 0.12),
    '--td-brand-color-light-hover': rgbWithAlpha(primary, 0.2),
    '--td-success-color': successHex,
    '--td-success-color-hover': rgbWithAlpha(success, 0.85),
    '--td-warning-color': warningHex,
    '--td-error-color': destructiveHex,
    '--td-bg-color-page': rgbToHex(background),
    '--td-bg-color-container': rgbToHex(card),
    '--td-bg-color-container-hover': rgbWithAlpha(muted, 0.6),
    '--td-bg-color-secondarycontainer': rgbToHex(muted),
    '--td-text-color-primary': rgbToHex(foreground),
    '--td-text-color-secondary': rgbToHex(mutedForeground),
    '--td-text-color-placeholder': rgbWithAlpha(mutedForeground, 0.7),
    '--td-border-level-1-color': rgbWithAlpha(border, 0.6),
    '--td-border-level-2-color': rgbToHex(border),
    '--td-radius-default': '8px',
    '--td-radius-small': '4px',
    '--td-radius-large': '12px',
    '--td-shadow-1': `0 1px 2px rgba(0,0,0,${shadowIntensity})`,
    '--td-shadow-2': `0 4px 12px rgba(0,0,0,${shadowIntensity * 1.5})`,
  };
}

function applyTDesignTheme(theme: ThemeId): () => void {
  if (typeof document === 'undefined') return () => {};
  const root = document.documentElement;
  let rafId: number | null = null;
  let loadHandler: (() => void) | null = null;

  const apply = () => {
    const mapping = buildMapping(theme);
    Object.entries(mapping).forEach(([key, value]) => {
      if (value) root.style.setProperty(key, value);
    });
  };

  const isCssReady = () => getCssVar('--primary').length > 0;

  if (isCssReady()) {
    apply();
  } else {
    const check = () => {
      if (isCssReady()) {
        apply();
      } else {
        rafId = requestAnimationFrame(check);
      }
    };
    rafId = requestAnimationFrame(check);

    loadHandler = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      apply();
    };
    window.addEventListener('load', loadHandler, { once: true });
  }

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (loadHandler) window.removeEventListener('load', loadHandler);
  };
}

export function TDesignThemeAdapter({ children }: { children: ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

  useLayoutEffect(() => {
    return applyTDesignTheme(theme);
  }, [theme]);

  return <>{children}</>;
}

/**
 * 供 ConfigProvider 使用的 globalConfig。
 * 主要用于关闭部分 TDesign 默认动画或统一文案，不承载颜色映射。
 */
export function getTDesignGlobalConfig(): ConfigProviderProps['globalConfig'] {
  return {
    animation: { exclude: [] },
  };
}
