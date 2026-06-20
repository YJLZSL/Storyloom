import { AppShell } from '@/components/layout/AppShell';
import { WorkspaceInitializer } from '@/components/workspace/WorkspaceInitializer';
import { UpdateNotifier } from '@/components/system/UpdateNotifier';

function App() {
  return (
    <>
      <WorkspaceInitializer />
      <AppShell />
      <UpdateNotifier />
    </>
  );
}

export default App;
