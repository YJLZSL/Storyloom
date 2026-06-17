import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores/useUIStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useHistoryStore } from '@/stores/historyStore';
import {
  useCreateEvent,
  useCreateCharacter,
  useCreateWorkspace,
  useImportWorkspace,
} from '@/services/api-hooks';
import { api } from '@/services/api';
import { toast } from 'sonner';
import type { ExportData } from '../../../shared/types';
import type { CommandContext } from '@/lib/command-registry';

// 从 command-registry 重导出，保持向后兼容
export { defaultCommands as commands, CATEGORY_LABELS } from '@/lib/command-registry';
export type {
  Command,
  CommandCategory,
  CommandContext,
  ViewMode,
  ThemeMode,
  UIPanelType,
} from '@/lib/command-registry';

/**
 * 构建 CommandContext 的 Hook，供 CommandPalette 和 AppShell 共用
 */
export function useCommandContext(): CommandContext {
  const setViewMode = useTimelineStore((s) => s.setViewMode);
  const setSelectedEvent = useTimelineStore((s) => s.setSelectedEvent);
  const setSelectedCharacter = useTimelineStore((s) => s.setSelectedCharacter);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);

  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const toggleFocusMode = useUIStore((s) => s.toggleFocusMode);
  const activePanel = useUIStore((s) => s.activePanel);

  const setTheme = useThemeStore((s) => s.setTheme);

  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);

  const createEventMutation = useCreateEvent();
  const createCharacterMutation = useCreateCharacter();
  const createWorkspaceMutation = useCreateWorkspace();
  const importWorkspaceMutation = useImportWorkspace();
  const qc = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const close = () => setCommandPaletteOpen(false);

  const handleCreateEvent = () => {
    if (!workspaceId) {
      toast.error('请先选择一个工作区');
      return;
    }
    createEventMutation.mutate(
      { workspaceId, data: { title: '新事件' } },
      {
        onSuccess: (event) => {
          setSelectedEvent(event.id);
          setViewMode('timeline');
          scrollToEvent(event.id);
          setActivePanel('event-editor');
        },
      },
    );
  };

  const handleCreateCharacter = () => {
    if (!workspaceId) {
      toast.error('请先选择一个工作区');
      return;
    }
    createCharacterMutation.mutate(
      { workspaceId, data: { name: '新角色' } },
      {
        onSuccess: (character) => {
          setSelectedCharacter(character.id);
          setActivePanel('characters');
        },
      },
    );
  };

  const handleCreateWorkspace = () => {
    createWorkspaceMutation.mutate(
      { name: `新工作区 ${new Date().toLocaleDateString()}` },
      {
        onSuccess: (workspace) => {
          setCurrentWorkspace(workspace.id);
        },
      },
    );
  };

  const handleExport = async () => {
    if (!workspaceId) {
      toast.error('请先选择一个工作区');
      return;
    }
    try {
      const data = await api.get<ExportData>(`/api/workspaces/${workspaceId}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch {
      toast.error('导出失败');
    }
  };

  const handleImport = () => {
    if (!workspaceId) {
      toast.error('请先选择一个工作区');
      return;
    }
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.className = 'hidden';
      document.body.appendChild(input);
      fileInputRef.current = input;
    }
    fileInputRef.current.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !workspaceId) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as ExportData;
          importWorkspaceMutation.mutate(
            { workspaceId, data, strategy: 'skip' },
            { onSuccess: () => toast.success('导入成功'), onError: () => toast.error('导入失败') },
          );
        } catch {
          toast.error('文件解析失败，请检查 JSON 格式');
        }
      };
      reader.readAsText(file);
      (e.target as HTMLInputElement).value = '';
    };
    fileInputRef.current.click();
  };

  const handleSave = async () => {
    if (!workspaceId) {
      toast.error('请先选择一个工作区');
      return;
    }
    try {
      const snapshot = await api.get<ExportData>(`/api/workspaces/${workspaceId}/export`);
      await api.post(`/api/workspaces/${workspaceId}/auto-saves`, {
        dataJson: JSON.stringify(snapshot),
      });
      toast.success('已保存');
    } catch {
      toast.error('保存失败');
    }
  };

  const sanitizeEventPayload = (data: Record<string, unknown>): Record<string, unknown> => {
    const allowed = [
      'id', 'trackId', 'title', 'summary', 'description', 'location',
      'startTime', 'endTime', 'orderIndex', 'narrativeOrder', 'color', 'tagsJson',
    ];
    const payload: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data) {
        const value = data[key];
        if (key === 'startTime' || key === 'endTime') {
          if (value instanceof Date) {
            payload[key] = value.getTime();
          } else if (typeof value === 'string') {
            const ms = new Date(value).getTime();
            payload[key] = Number.isNaN(ms) ? null : ms;
          } else {
            payload[key] = value;
          }
        } else {
          payload[key] = value;
        }
      }
    }
    return payload;
  };

  const handleUndo = async () => {
    const record = useHistoryStore.getState().undo();
    if (!record) {
      toast.info('无可撤销操作');
      return;
    }
    try {
      if (record.entityType === 'event') {
        if (record.action === 'create') {
          await api.delete(`/api/workspaces/${record.workspaceId}/events/${record.entityId}`);
        } else if (record.action === 'delete') {
          await api.post(
            `/api/workspaces/${record.workspaceId}/events`,
            sanitizeEventPayload(record.data),
          );
        } else if (record.action === 'update') {
          await api.patch(
            `/api/workspaces/${record.workspaceId}/events/${record.entityId}`,
            record.data,
          );
        }
        qc.invalidateQueries({ queryKey: ['events', record.workspaceId] });
        toast.success('已撤销');
      } else {
        toast.info('该操作的撤销功能开发中');
      }
    } catch {
      toast.error('撤销失败');
    }
  };

  const handleRedo = async () => {
    const record = useHistoryStore.getState().redo();
    if (!record) {
      toast.info('无可重做操作');
      return;
    }
    try {
      if (record.entityType === 'event') {
        if (record.action === 'create') {
          await api.post(
            `/api/workspaces/${record.workspaceId}/events`,
            sanitizeEventPayload(record.data),
          );
        } else if (record.action === 'delete') {
          await api.delete(`/api/workspaces/${record.workspaceId}/events/${record.entityId}`);
        } else if (record.action === 'update') {
          const after = (record.meta?.after as Record<string, unknown>) || {};
          await api.patch(
            `/api/workspaces/${record.workspaceId}/events/${record.entityId}`,
            after,
          );
        }
        qc.invalidateQueries({ queryKey: ['events', record.workspaceId] });
        toast.success('已重做');
      } else {
        toast.info('该操作的重做功能开发中');
      }
    } catch {
      toast.error('重做失败');
    }
  };

  const handleToggleSidebar = () => {
    setActivePanel(activePanel === null ? 'properties' : null);
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleOpenCommandPalette = () => {
    setCommandPaletteOpen(!useUIStore.getState().commandPaletteOpen);
  };

  return {
    setViewMode,
    setSelectedEvent,
    setSelectedCharacter,
    scrollToEvent,
    setActivePanel,
    setTheme,
    createEvent: handleCreateEvent,
    createCharacter: handleCreateCharacter,
    createWorkspace: handleCreateWorkspace,
    exportWorkspace: handleExport,
    importWorkspace: handleImport,
    toggleFocusMode,
    toggleSidebar: handleToggleSidebar,
    openSettings: handleOpenSettings,
    openCommandPalette: handleOpenCommandPalette,
    save: handleSave,
    undo: handleUndo,
    redo: handleRedo,
    close,
  };
}
