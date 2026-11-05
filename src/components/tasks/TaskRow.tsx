import { Check, ClipboardList, ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { date, type Task } from '../../domain';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';

export default function TaskRow({ t }: { t: Task }) {
  const { data, projectId, profile, open } = useWorkspace();
  return (
    <button className="task-row" onClick={() => open({ kind: 'detail', id: t.id })}>
      <span className="task-name">
        <span className={`task-mark ${t.status === 'accepted' ? 'done' : ''}`}>
          {t.status === 'accepted' ? <Check size={14} /> : <ClipboardList size={15} />}
        </span>
        <span>
          <strong>{t.title}</strong>
          {!projectId && <small>{data.projects.find((p) => p.id === t.project_id)?.name}</small>}
        </span>
      </span>
      <span>
        <Badge status={t.status} />
      </span>
      <span className="person">
        <Avatar name={profile(t.assignee_id)} small />
        {profile(t.assignee_id)}
      </span>
      <span className="muted task-date">{date(t.created_at)}</span>
      <ChevronRight size={16} />
    </button>
  );
}
