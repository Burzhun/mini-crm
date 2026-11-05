import { Plus } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';

export default function AddProjectCard() {
  const { open } = useWorkspace();
  return (
    <button className="add-project-card" onClick={() => open({ kind: 'project' })}>
      <span>
        <Plus size={24} />
      </span>
      <strong>Следующий большой проект</strong>
      <p>Добавьте объект и начните работу</p>
    </button>
  );
}
