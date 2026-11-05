import { Check, Clock3, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { date, labels } from '../../domain';

export default function TaskHistory({ taskId }: { taskId: string }) {
  const { data, profile } = useWorkspace();
  return (
    <section className="history">
      <h3>
        История изменений <span>{data.history.filter((h) => h.task_id === taskId).length}</span>
      </h3>
      {data.history
        .filter((h) => h.task_id === taskId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
        .map((h) => (
          <div className="history-item" key={h.id}>
            <span className={`history-dot ${h.to_status === 'accepted' ? 'green' : ''}`}>
              {h.to_status === 'accepted' ? <Check size={12} /> : <Clock3 size={12} />}
            </span>
            <div>
              <div className="history-person">
                <strong>{profile(h.actor_id)}</strong>
                <time>{date(h.created_at, true)}</time>
              </div>
              <p>
                {h.from_status ? (
                  <>
                    {labels[h.from_status]}
                    <ArrowRight size={12} />
                    <strong>{labels[h.to_status]}</strong>
                  </>
                ) : (
                  <>
                    Создал задачу <strong>«Новая»</strong>
                  </>
                )}
              </p>
              {h.comment && <blockquote>{h.comment}</blockquote>}
            </div>
          </div>
        ))}
    </section>
  );
}
