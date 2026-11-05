import { ClipboardList, Clock3, CheckCheck, Check } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import Stat from '../ui/Stat';

export default function WorkspaceStats() {
  const { projectTasks } = useWorkspace();
  return (
    <div className="stats">
      <Stat
        label="Всего задач"
        value={projectTasks.length}
        icon={<ClipboardList size={20} />}
        note="В рабочем пространстве"
      />
      <Stat
        label="В работе"
        value={projectTasks.filter((t) => t.status === 'in_progress').length}
        icon={<Clock3 size={20} />}
        note="Команда уже занимается"
        tone="blue"
      />
      <Stat
        label="На проверке"
        value={projectTasks.filter((t) => t.status === 'review').length}
        icon={<CheckCheck size={20} />}
        note="Ожидают решения"
        tone="orange"
      />
      <Stat
        label="Принято"
        value={projectTasks.filter((t) => t.status === 'accepted').length}
        icon={<Check size={20} />}
        note="Работа выполнена"
        tone="green"
      />
    </div>
  );
}
