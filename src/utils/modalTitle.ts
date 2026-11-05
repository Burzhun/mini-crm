import type { WorkspaceModal } from '../types/workspace';
export function modalTitle(modal: WorkspaceModal) {
  switch (modal.kind) {
    case 'project':
      return modal.item ? 'Редактировать объект' : 'Новый объект';
    case 'task':
      return modal.item ? 'Редактировать задачу' : 'Новая задача';
    case 'detail':
      return 'Карточка задачи';
    case 'delete':
      return 'Подтвердите удаление';
    case 'help':
      return 'Как работает Контур';
  }
}
