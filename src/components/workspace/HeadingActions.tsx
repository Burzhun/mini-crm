import { Pencil, Trash2, Plus } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';

export default function HeadingActions() {
  const { selectedProject, view, projectId, open } = useWorkspace();
  return (
    <div className="heading-actions">
      {selectedProject && (
        <>
          <button
            className="secondary"
            aria-label="Редактировать объект"
            onClick={() => open({ kind: 'project', item: selectedProject })}
          >
            <Pencil size={16} />
          </button>
          <button
            className="secondary"
            aria-label="Удалить объект"
            onClick={() =>
              open({
                kind: 'delete',
                type: 'projects',
                id: selectedProject.id,
                name: selectedProject.name,
              })
            }
          >
            <Trash2 size={16} />
          </button>
        </>
      )}
      <button
        className="primary"
        onClick={() => open({ kind: view === 'projects' && !projectId ? 'project' : 'task' })}
      >
        <Plus size={18} />
        {view === 'projects' && !projectId ? 'Новый объект' : 'Новая задача'}
      </button>
    </div>
  );
}
