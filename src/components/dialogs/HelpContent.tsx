import { FolderKanban, ArrowRight, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import Badge from '../ui/Badge';
import { demoAccounts } from '../../api';

export default function HelpContent() {
  const { demo, close } = useWorkspace();
  return (
    <div className="help-content">
      <span className="help-big">
        <FolderKanban size={30} />
      </span>
      <h3>От задачи до результата</h3>
      <p>
        Постановщик создаёт объекты и задачи, назначает исполнителей и проверяет результат.
        Исполнитель берёт свою задачу в работу и отправляет на проверку.
      </p>
      <div className="workflow">
        <Badge status="new" />
        <ArrowRight size={14} />
        <Badge status="in_progress" />
        <ArrowRight size={14} />
        <Badge status="review" />
        <ArrowRight size={14} />
        <Badge status="accepted" />
      </div>
      <p>
        Если нужна доработка, постановщик оставляет обязательный комментарий. Исполнитель исправляет
        результат и снова отправляет его на проверку. Все смены статуса сохраняются в истории.
      </p>
      <div className="security-note">
        <ShieldCheck size={22} />
        <p>
          {demo
            ? 'Вы в демонстрационном режиме. Данные хранятся локально и не защищены базой. Для реальной работы выйдите и войдите по email через Supabase.'
            : 'Права проверяются в базе данных. Исполнитель видит только свои задачи, не может назначать их другим, принимать результат или изменять историю.'}
        </p>
      </div>
      {demo && (
        <details>
          <summary>Демонстрационные аккаунты</summary>
          {demoAccounts.map((a) => (
            <p className="account-line" key={a.id}>
              {a.email} · {a.password}
            </p>
          ))}
          <small>
            Демо открывается кнопками на экране входа; эти аккаунты не созданы в Supabase
            автоматически.
          </small>
        </details>
      )}
      <button className="primary full" onClick={() => close()}>
        Понятно, к работе
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
