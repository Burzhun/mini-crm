import { useWorkspace } from '../../hooks/useWorkspace';
import { date, type Task } from '../../domain';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';

export default function TaskSummary({ task }: { task: Task }) {
  const { data, profile } = useWorkspace();
  return (
    <>
      <div className="detail-title">
        <Badge status={task.status} />
        <h2>{task.title}</h2>
      </div>
      <div className="detail-meta">
        <div>
          <span>Объект</span>
          <strong>{data.projects.find((p) => p.id === task.project_id)?.name}</strong>
        </div>
        <div>
          <span>Исполнитель</span>
          <strong>
            <Avatar name={profile(task.assignee_id)} small />
            {profile(task.assignee_id)}
          </strong>
        </div>
        <div>
          <span>Постановщик</span>
          <strong>{profile(task.author_id)}</strong>
        </div>
        <div>
          <span>Дата создания</span>
          <strong>{date(task.created_at, true)}</strong>
        </div>
      </div>
      <div className="detail-description">
        <h3>Описание</h3>
        <p>{task.description || 'Описание не добавлено.'}</p>
      </div>
    </>
  );
}
