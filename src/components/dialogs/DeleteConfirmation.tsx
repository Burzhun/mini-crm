import { useWorkspace } from '../../hooks/useWorkspace';
import type { DeleteTarget } from '../../types/workspace';
export default function DeleteConfirmation({ target }: { target: DeleteTarget }) {
  const { busy, close, remove } = useWorkspace();
  return (
    <div className="entity-form">
      <p className="delete-copy">
        Удалить «{target.name}»?{' '}
        {target.type === 'projects'
          ? 'Будут удалены все задачи объекта. История изменений сохранится в базе.'
          : 'История изменений сохранится в базе.'}{' '}
        Это действие нельзя отменить.
      </p>
      <div className="form-actions">
        <button disabled={busy} className="secondary" onClick={close}>
          Отмена
        </button>
        <button className="danger" disabled={busy} onClick={() => void remove(target)}>
          Удалить
        </button>
      </div>
    </div>
  );
}
