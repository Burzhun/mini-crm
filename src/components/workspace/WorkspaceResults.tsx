import { LoaderCircle } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import ProjectList from '../projects/ProjectList';
import TaskTable from '../tasks/TaskTable';
export default function WorkspaceResults() {
  const { loading, view, projectId, filteredTasks } = useWorkspace();
  if (loading)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" />
        <p>Загружаем данные…</p>
      </div>
    );
  return view === 'projects' && !projectId ? <ProjectList /> : <TaskTable tasks={filteredTasks} />;
}
