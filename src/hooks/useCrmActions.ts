import type { Repository } from '../api';
import type { Task, Status } from '../domain';
import type { ProjectValues, TaskValues, DeleteTarget } from '../types/workspace';
import type { useCrmData } from './useCrmData';
import type { useWorkspaceNavigation } from './useWorkspaceNavigation';

export function useCrmActions(
  repository: Repository,
  execute: ReturnType<typeof useCrmData>['execute'],
  navigation: ReturnType<typeof useWorkspaceNavigation>,
) {
  async function save(action: () => Promise<void>, message: string) {
    const success = await execute(action, message);
    if (success) navigation.close();
    return success;
  }
  function saveProject(values: ProjectValues, id?: string) {
    return save(() => repository.project(values, id), 'Объект сохранён');
  }
  function saveTask(values: TaskValues, id?: string) {
    return save(() => repository.task(values, id), 'Задача сохранена');
  }
  function remove(target: DeleteTarget) {
    return save(async () => {
      await repository.remove(target.type, target.id);
      if (target.type === 'projects' && target.id === navigation.projectId)
        navigation.openProject(null);
    }, 'Удалено');
  }
  function changeStatus(task: Task, target: Status, comment: string) {
    return execute(() => repository.transition(task, target, comment), 'Статус задачи обновлён');
  }
  function refresh() {
    return execute(async () => {}, 'Данные обновлены');
  }
  return { saveProject, saveTask, remove, changeStatus, refresh };
}
