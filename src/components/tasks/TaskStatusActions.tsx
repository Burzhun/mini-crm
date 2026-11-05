import { useId, useRef, useState } from 'react';
import { ArrowDownLeft, Check, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { transitions, actionLabels, type Task, type Status } from '../../domain';

export default function TaskStatusActions({ task }: { task: Task }) {
  const { user, manager, busy, changeStatus } = useWorkspace();
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();
  const availableTransitions = transitions(user.role, task, user.id);

  async function submitStatus(target: Status) {
    if (target === 'rework' && !comment.trim()) {
      setCommentError('Укажите, что нужно доработать.');
      commentRef.current?.focus();
      return;
    }
    setCommentError('');
    const success = await changeStatus(task, target, comment);
    if (success) setComment('');
  }

  if (!availableTransitions.length) return null;
  return (
    <div className="status-actions">
      <label>
        Комментарий{manager ? ' (обязателен для доработки)' : ' (необязательно)'}
        <textarea
          ref={commentRef}
          aria-invalid={!!commentError}
          aria-describedby={commentError ? errorId : undefined}
          maxLength={4000}
          rows={3}
          placeholder={
            manager
              ? 'Добавьте замечания или комментарий к приёмке'
              : 'Расскажите о результате работы'
          }
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (e.target.value.trim()) setCommentError('');
          }}
        />
      </label>
      {commentError && (
        <p id={errorId} className="field-error" role="alert">
          {commentError}
        </p>
      )}
      <div>
        {availableTransitions.map((s) => (
          <button
            key={s}
            className={s === 'rework' ? 'secondary' : 'primary'}
            disabled={busy}
            onClick={() => void submitStatus(s)}
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
