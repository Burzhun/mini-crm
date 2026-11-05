import type { FormEvent } from 'react';
import type { Project } from '../../domain';
import { useWorkspace } from '../../hooks/useWorkspace';
import ProjectFields from './ProjectFields';
import FormActions from './FormActions';
export default function ProjectForm({ project }: { project?: Project }) {
  const { saveProject } = useWorkspace();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void saveProject(
      { name: String(form.get('name')).trim(), address: String(form.get('address')).trim() },
      project?.id,
    );
  }
  return (
    <form className="entity-form" onSubmit={submit}>
      <ProjectFields project={project} />
      <FormActions submitLabel={project ? 'Сохранить изменения' : 'Создать объект'} />
    </form>
  );
}
