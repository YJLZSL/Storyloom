import { useEffect, useRef } from 'react';
import { useWorkspaces } from '@/services/api-hooks.js';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore.js';
import { useSettingsStore } from '@/stores/useSettingsStore.js';

export function WorkspaceInitializer() {
  const { data: workspaces, isSuccess } = useWorkspaces();
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const openLastWorkspace = useSettingsStore((s) => s.openLastWorkspace);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // 只在首次加载时执行一次
    if (hasInitialized.current) return;
    if (!isSuccess) return;

    hasInitialized.current = true;

    // 如果设置不打开上次工作区，则清除当前工作区，显示选择器
    if (!openLastWorkspace) {
      setCurrentWorkspace(null);
      return;
    }

    // 如果当前工作区已存在，不做任何事（已恢复上次状态）
    if (currentWorkspaceId != null) return;

    // 没有工作区，不做任何事
    if (!workspaces || workspaces.length === 0) return;

    // 如果只有一个工作区，自动选择它
    if (workspaces.length === 1) {
      setCurrentWorkspace(workspaces[0].id);
    }
  }, [currentWorkspaceId, isSuccess, workspaces, setCurrentWorkspace, openLastWorkspace]);

  return null;
}
