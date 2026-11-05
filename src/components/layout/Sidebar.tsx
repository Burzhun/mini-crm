import {
  HardHat,
  Building2,
  ClipboardList,
  CheckCheck,
  ShieldCheck,
  ArrowUpRight,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useAuth } from '../../hooks/useAuth';
import Brand from '../ui/Brand';
import Avatar from '../ui/Avatar';

export default function Sidebar() {
  const { user, manager, view, data, reviewCount, navigate, open, reportError } = useWorkspace();
  const { logout } = useAuth();
  return (
    <aside className="sidebar">
      <Brand />
      <div className="workspace">
        <div className="workspace-icon">
          <HardHat size={20} />
        </div>
        <div>
          <strong>Строительная компания</strong>
          <small>Рабочее пространство</small>
        </div>
      </div>
      <span className="nav-label">УПРАВЛЕНИЕ</span>
      <nav>
        <button
          className={view === 'projects' ? 'active' : ''}
          onClick={() => navigate('projects')}
        >
          <Building2 size={19} />
          Объекты<span className="nav-count">{data.projects.length}</span>
        </button>
        <button className={view === 'tasks' ? 'active' : ''} onClick={() => navigate('tasks')}>
          <ClipboardList size={19} />
          {manager ? 'Все задачи' : 'Мои задачи'}
          <span className="nav-count">{data.tasks.length}</span>
        </button>
        {manager && (
          <button className={view === 'review' ? 'active' : ''} onClick={() => navigate('review')}>
            <CheckCheck size={19} />
            На проверке
            {reviewCount > 0 && <span className="nav-count highlight">{reviewCount}</span>}
          </button>
        )}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card">
          <span className="help-icon">
            <ShieldCheck size={19} />
          </span>
          <strong>Всё на своих местах</strong>
          <p>
            {manager
              ? 'Объекты, команда и задачи — в одном рабочем пространстве.'
              : 'Вам доступны ваши задачи и связанные с ними объекты.'}
          </p>
          <button onClick={() => open({ kind: 'help' })}>
            Как это работает <ArrowUpRight size={14} />
          </button>
        </div>
        <button className="user-profile" onClick={() => open({ kind: 'help' })}>
          <Avatar name={user.name} />
          <span>
            <strong>{user.name}</strong>
            <small>{manager ? 'Постановщик' : 'Исполнитель'}</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <button className="logout" onClick={() => void logout().catch(reportError)}>
          <LogOut size={15} />
          Выйти из аккаунта
        </button>
      </div>
    </aside>
  );
}
