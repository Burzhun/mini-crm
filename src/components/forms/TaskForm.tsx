import type { FormEvent } from 'react';
import type { Task } from '../../domain';
import { useWorkspace } from '../../hooks/useWorkspace';
import TaskFields from './TaskFields';
import FormActions from './FormActions';
export default function TaskForm({ task }: { task?: Task }) {
  const { saveTask } = useWorkspace();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void saveTask(
      {
        title: String(form.get('title')).trim(),
        description: String(form.get('description')).trim(),
        project_id: String(form.get('project_id')),
        assignee_id: String(form.get('assignee_id')),
      },
      task?.id,
    );
  }
  return (
    <form className="entity-form" onSubmit={submit}>
      <TaskFields task={task} />
      <FormActions submitLabel={task ? 'Сохранить изменения' : 'Создать задачу'} />
    </form>
  );
}
