import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { WorkspaceCard } from './WorkspaceCard';
import type { Workspace } from '../../../shared/types';

vi.mock('@/services/api-hooks.js', () => ({
  useEvents: () => ({ data: { items: [], total: 0 } }),
}));

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'ws-1',
    name: '正常工作区',
    description: '一个正常描述',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Workspace;
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('WorkspaceCard', () => {
  it('全 ? 名称显示「未命名工作区」', () => {
    const ws = makeWorkspace({ name: '?????' });
    render(<WorkspaceCard workspace={ws} onSelect={() => {}} onDelete={() => {}} />, { wrapper });
    expect(screen.getByText('未命名工作区')).toBeInTheDocument();
  });

  it('全 ? 描述显示「暂无描述」', () => {
    const ws = makeWorkspace({ name: '正常名称', description: '？？？' });
    render(<WorkspaceCard workspace={ws} onSelect={() => {}} onDelete={() => {}} />, { wrapper });
    expect(screen.getByText('暂无描述')).toBeInTheDocument();
  });

  it('正常名称与描述按原样渲染', () => {
    const ws = makeWorkspace({ name: '我的项目', description: '小说大纲' });
    render(<WorkspaceCard workspace={ws} onSelect={() => {}} onDelete={() => {}} />, { wrapper });
    expect(screen.getByText('我的项目')).toBeInTheDocument();
    expect(screen.getByText('小说大纲')).toBeInTheDocument();
  });
});
