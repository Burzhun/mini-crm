import type { Task } from '../../domain';
import { useWorkspace } from '../../hooks/useWorkspace';
import TaskSummary from './TaskSummary';
import TaskStatusActions from './TaskStatusActions';
import TaskHistory from './TaskHistory';
import TaskAdminActions from './TaskAdminActions';
export default function TaskDetail({ task }: { task: Task }) {
  const { manager } = useWorkspace();
  return (
    <div className="task-detail">
      <TaskSummary task={task} />
      <TaskStatusActions task={task} />
      <TaskHistory taskId={task.id} />
      {manager && <TaskAdminActions task={task} />}
    </div>
  );
}
