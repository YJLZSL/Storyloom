import { useEffect } from 'react';
import { useWorkspaces } from '@/services/api-hooks.js';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore.js';

export function WorkspaceInitializer() {
  const { data: workspaces, isSuccess } = useWorkspaces();
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);

  useEffect(() => {
    if (currentWorkspaceId != null) return;
    if (!isSuccess) return;
    if (!workspaces || workspaces.length !== 1) return;

    setCurrentWorkspace(workspaces[0].id);
  }, [currentWorkspaceId, isSuccess, workspaces, setCurrentWorkspace]);

  return null;
}
