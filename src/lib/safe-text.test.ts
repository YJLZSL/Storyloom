import { describe, it, expect } from 'vitest';
import { safeWorkspaceName, safeDescription } from './safe-text';

describe('safeWorkspaceName', () => {
  it('为 null/undefined/空串返回兜底', () => {
    expect(safeWorkspaceName(null)).toBe('未命名工作区');
    expect(safeWorkspaceName(undefined)).toBe('未命名工作区');
    expect(safeWorkspaceName('')).toBe('未命名工作区');
  });

  it('纯空白与全问号识别为异常', () => {
    expect(safeWorkspaceName('   ')).toBe('未命名工作区');
    expect(safeWorkspaceName('?????')).toBe('未命名工作区');
    expect(safeWorkspaceName('？？？')).toBe('未命名工作区');
  });

  it('夹杂空白的问号串被归一后保留', () => {
    // 归一后 "?? ?" 不是纯问号串，按正常名称返回
    expect(safeWorkspaceName('?? ?')).toBe('?? ?');
  });

  it('保留正常名称并做空白归一', () => {
    expect(safeWorkspaceName('我的小说')).toBe('我的小说');
    expect(safeWorkspaceName('  hello  ')).toBe('hello');
    expect(safeWorkspaceName('hello\u200Bworld')).toBe('hello world');
  });
});

describe('safeDescription', () => {
  it('异常输入返回兜底', () => {
    expect(safeDescription(null)).toBe('暂无描述');
    expect(safeDescription('')).toBe('暂无描述');
    expect(safeDescription('?????')).toBe('暂无描述');
  });

  it('超长截断', () => {
    const long = 'a'.repeat(80);
    const result = safeDescription(long);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBe(60);
  });

  it('短文本不截断', () => {
    expect(safeDescription('一段描述')).toBe('一段描述');
  });
});
