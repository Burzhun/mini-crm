import { useWorkspace } from '../../hooks/useWorkspace';

export default function SectionHeader() {
  const { view, projectId, filteredProjects, filteredTasks, setFilter } = useWorkspace();
  return (
    <div className="section-top">
      <div className="section-tabs">
        <button className="selected" onClick={() => setFilter('all')}>
          {view === 'projects' && !projectId
            ? 'Все объекты'
            : view === 'review'
              ? 'Ожидают проверки'
              : 'Список задач'}
          <span>
            {view === 'projects' && !projectId ? filteredProjects.length : filteredTasks.length}
          </span>
        </button>
        {view === 'projects' && !projectId && (
          <span className="section-description">От идеи до результата</span>
        )}
      </div>
    </div>
  );
}
