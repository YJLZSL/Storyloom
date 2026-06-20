import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

type Listener = (e: MediaQueryListEvent) => void;

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<Listener>();
  const mql = {
    get matches() {
      return matches;
    },
    media: '',
    onchange: null,
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
    addListener: (listener: Listener) => listeners.add(listener),
    removeListener: (listener: Listener) => listeners.delete(listener),
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;

  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
  return {
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((l) => l({ matches: next } as MediaQueryListEvent));
    },
  };
}

describe('useMediaQuery', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('返回当前匹配状态', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  it('查询变化时同步更新', () => {
    const ctl = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 1024px)'));
    expect(result.current).toBe(false);

    act(() => ctl.setMatches(true));
    expect(result.current).toBe(true);
  });
});
