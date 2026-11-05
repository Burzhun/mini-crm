import { useState } from 'react';
import { ArrowDownLeft, Check, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { transitions, actionLabels, type Task } from '../../domain';

export default function TaskStatusActions({ task }: { task: Task }) {
  const { user, manager, busy, changeStatus } = useWorkspace();
  const [comment, setComment] = useState('');
  const availableTransitions = transitions(user.role, task, user.id);
  if (!availableTransitions.length) return null;
  return (
    <div className="status-actions">
      <label>
        Комментарий{manager ? ' (обязателен для доработки)' : ' (необязательно)'}
        <textarea
          maxLength={4000}
          rows={3}
          placeholder={
            manager
              ? 'Добавьте замечания или комментарий к приёмке'
              : 'Расскажите о результате работы'
          }
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      <div>
        {availableTransitions.map((s) => (
          <button
            key={s}
            className={s === 'rework' ? 'secondary' : 'primary'}
            disabled={busy}
            onClick={() =>
              void changeStatus(task, s, comment).then((success) => {
                if (success) setComment('');
              })
            }
          >
            {s === 'rework' ? (
              <ArrowDownLeft size={16} />
            ) : s === 'accepted' ? (
              <Check size={16} />
            ) : (
              <ArrowRight size={16} />
            )}{' '}
            {actionLabels[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
