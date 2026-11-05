import type { WorkspaceModal } from '../../types/workspace';
import { useWorkspace } from '../../hooks/useWorkspace';
import ProjectForm from '../forms/ProjectForm';
import TaskForm from '../forms/TaskForm';
import TaskDetail from '../tasks/TaskDetail';
import DeleteConfirmation from './DeleteConfirmation';
import HelpContent from './HelpContent';
export default function ModalContent({ modal }: { modal: WorkspaceModal }) {
  const { data } = useWorkspace();
  switch (modal.kind) {
    case 'project':
      return <ProjectForm project={modal.item} />;
    case 'task':
      return <TaskForm task={modal.item} />;
    case 'detail': {
      const task = data.tasks.find((task) => task.id === modal.id);
      return task ? <TaskDetail key={task.id} task={task} /> : null;
    }
    case 'delete':
      return <DeleteConfirmation target={modal} />;
    case 'help':
      return <HelpContent />;
  }
}
