import { useWorkspace } from '../../hooks/useWorkspace';
import { type Task } from '../../domain';

export default function TaskFields({ task }: { task?: Task }) {
  const { data, projectId } = useWorkspace();
  return (
    <>
      <label>
        Название задачи
        <input
          name="title"
          required
          pattern=".*\S.*"
          maxLength={240}
          placeholder="Что нужно сделать?"
          defaultValue={task?.title}
        />
      </label>
      <label>
        Описание
        <textarea
          name="description"
          maxLength={10000}
          rows={4}
          placeholder="Подробности, требования и ожидаемый результат"
          defaultValue={task?.description}
        />
      </label>
      <label>
        Объект
        <select
          aria-label="Объект"
          name="project_id"
          required
          defaultValue={task?.project_id || projectId || ''}
        >
          <option value="" disabled>
            Выберите объект
          </option>
          {data.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Исполнитель
        <select
          aria-label="Исполнитель"
          name="assignee_id"
          required
          defaultValue={task?.assignee_id || ''}
        >
          <option value="" disabled>
            Назначьте исполнителя
          </option>
          {data.profiles
            .filter((p) => p.role === 'worker')
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </label>
      {!data.projects.length && <p className="muted">Сначала создайте объект.</p>}
      {!data.profiles.some((p) => p.role === 'worker') && (
        <p className="muted">Администратору нужно добавить исполнителей в базу.</p>
      )}
    </>
  );
}
