import {
  Building2,
  ArrowUpRight,
  MapPin,
  ClipboardList,
  CheckCheck,
  MoreHorizontal,
} from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { date, type Project } from '../../domain';
import Avatar from '../ui/Avatar';

export default function ProjectCard({ project: p, index: i }: { project: Project; index: number }) {
  const { data, manager, profile, open, openProject } = useWorkspace();
  const tasks = data.tasks.filter((t) => t.project_id === p.id);
  const done = tasks.filter((t) => t.status === 'accepted').length;
  const people = [...new Set(tasks.map((t) => t.assignee_id))];
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <article className="project-card">
      <button
        className="project-open"
        onClick={() => {
          openProject(p.id);
        }}
      >
        <div className="project-card-top">
          <span className={`project-symbol symbol-${i % 3}`}>
            <Building2 size={25} strokeWidth={1.5} />
          </span>
          <span
            className={`project-state ${tasks.length && done === tasks.length ? 'completed' : ''}`}
          >
            <i />
            {!tasks.length ? 'Нет задач' : done === tasks.length ? 'Завершён' : 'В работе'}
          </span>
          <ArrowUpRight className="project-arrow" size={18} />
        </div>
        <h2>{p.name}</h2>
        <p className="project-address">
          <MapPin size={14} />
          {p.address}
        </p>
        <div className="project-progress">
          <div>
            <span>Выполнение задач</span>
            <strong>{percent}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div className="project-numbers">
          <span>
            <ClipboardList size={15} />
            {tasks.length}{' '}
            {tasks.length === 1
              ? 'задача'
              : tasks.length > 1 && tasks.length < 5
                ? 'задачи'
                : 'задач'}
          </span>
          <span>
            <CheckCheck size={15} />
            {done} принято
          </span>
        </div>
        <div className="project-card-foot">
          <div className="avatar-stack">
            {people.slice(0, 3).map((id) => (
              <Avatar key={id} name={profile(id)} small />
            ))}
            {!people.length && <span className="muted">Команда не назначена</span>}
          </div>
          <span>
            {tasks.filter((t) => t.status === 'review').length > 0 ? (
              <span className="review-note">
                <i />
                {tasks.filter((t) => t.status === 'review').length} на проверке
              </span>
            ) : (
              <span className="muted">Создан {date(p.created_at).replace('2026 г.', '')}</span>
            )}
          </span>
        </div>
      </button>
      {manager && (
        <button
          className="card-menu icon-button"
          aria-label={`Редактировать ${p.name}`}
          onClick={() => open({ kind: 'project', item: p })}
        >
          <MoreHorizontal size={19} />
        </button>
      )}
    </article>
  );
}
