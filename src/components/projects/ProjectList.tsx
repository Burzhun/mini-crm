import { useWorkspace } from '../../hooks/useWorkspace';
import Empty from '../ui/Empty';
import ProjectCard from './ProjectCard';
import AddProjectCard from './AddProjectCard';
export default function ProjectList() {
  const { filteredProjects, layout, manager, query, filter } = useWorkspace();
  return (
    <div className={`project-grid ${layout === 'list' ? 'as-list' : ''}`}>
      {filteredProjects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}
      {manager && !query && filter === 'all' && <AddProjectCard />}
      {!filteredProjects.length && (query || !manager || filter !== 'all') && (
        <Empty
          title="Объекты не найдены"
          text={
            query || filter !== 'all'
              ? 'Измените поисковый запрос или фильтр.'
              : 'Здесь появятся объекты с вашими задачами.'
          }
        />
      )}
    </div>
  );
}
