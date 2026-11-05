import { useWorkspace } from '../../hooks/useWorkspace';
import Sidebar from '../layout/Sidebar';
import Topbar from '../layout/Topbar';
import Toast from '../layout/Toast';
import ModalHost from '../dialogs/ModalHost';
import WorkspaceContent from './WorkspaceContent';
export default function Workspace() {
  const { notice } = useWorkspace();
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <WorkspaceContent />
      </div>
      {notice && <Toast notice={notice} />}
      <ModalHost />
    </div>
  );
}
