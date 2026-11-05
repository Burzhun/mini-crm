import type { Profile, Snapshot } from '../domain';
import type { View, StatusFilter } from '../types/workspace';

export function profileName(profiles: Profile[], id: string) {
  return profiles.find((profile) => profile.id === id)?.name || 'Пользователь';
}

export function selectWorkspace(
  data: Snapshot,
  selection: { view: View; projectId: string | null; query: string; filter: StatusFilter },
  manager: boolean,
) {
  const { view, projectId, query, filter } = selection;
  const search = query.toLowerCase();
  const selectedProject = data.projects.find((project) => project.id === projectId);
  const projectTasks = data.tasks.filter((task) => !projectId || task.project_id === projectId);
  const reviewCount = data.tasks.filter((task) => task.status === 'review').length;
  const filteredTasks = projectTasks.filter(
    (task) =>
      (view !== 'review' || task.status === 'review') &&
      (filter === 'all' || task.status === filter) &&
      `${task.title} ${task.description} ${profileName(data.profiles, task.assignee_id)} ${data.projects.find((project) => project.id === task.project_id)?.name}`
        .toLowerCase()
        .includes(search),
  );
  const filteredProjects = data.projects.filter(
    (project) =>
      `${project.name} ${project.address}`.toLowerCase().includes(search) &&
      (filter === 'all' ||
        data.tasks.some((task) => task.project_id === project.id && task.status === filter)),
  );
  const pageTitle =
    selectedProject?.name ||
    (view === 'projects'
      ? 'Объекты'
      : view === 'review'
        ? 'На проверке'
        : manager
          ? 'Все задачи'
          : 'Мои задачи');
  const headingCount = selectedProject
    ? projectTasks.length
    : view === 'projects'
      ? data.projects.length
      : view === 'review'
        ? reviewCount
        : data.tasks.length;
  return {
    selectedProject,
    projectTasks,
    reviewCount,
    filteredTasks,
    filteredProjects,
    pageTitle,
    headingCount,
  };
}
