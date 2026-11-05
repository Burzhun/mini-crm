import { Pencil, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { type Task } from '../../domain';

export default function TaskAdminActions({ task }: { task: Task }) {
  const { open } = useWorkspace();
  return (
    <div className="detail-admin">
      <button className="secondary" onClick={() => open({ kind: 'task', item: task })}>
        <Pencil size={15} />
        Редактировать
      </button>
      <button
        className="danger-link"
        onClick={() => open({ kind: 'delete', type: 'tasks', id: task.id, name: task.title })}
      >
        <Trash2 size={15} />
        Удалить задачу
      </button>
    </div>
  );
}
