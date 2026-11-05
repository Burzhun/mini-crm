import { ChevronRight, RefreshCw, CircleHelp } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import Avatar from '../ui/Avatar';

export default function Topbar() {
  const { user, demo, selectedProject, pageTitle, busy, loading, refresh, open } = useWorkspace();
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Рабочее пространство</span>
        <ChevronRight size={14} />
        <strong>{selectedProject ? 'Объекты' : pageTitle}</strong>
        {selectedProject && (
          <>
            <ChevronRight size={14} />
            <span className="truncate">{selectedProject.name}</span>
          </>
        )}
      </div>
      <div className="topbar-right">
        <span className={`connection ${demo ? 'demo' : ''}`}>
          <i />
          {demo ? 'Деморежим' : 'Supabase'}
        </span>
        <button
          className="icon-button"
          aria-label="Обновить данные"
          disabled={busy || loading}
          onClick={() => void refresh()}
        >
          <RefreshCw size={17} />
        </button>
        <button className="icon-button" aria-label="Справка" onClick={() => open({ kind: 'help' })}>
          <CircleHelp size={19} />
        </button>
        <Avatar name={user.name} small />
      </div>
    </header>
  );
}
