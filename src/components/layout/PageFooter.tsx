import { ShieldCheck } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';

export default function PageFooter() {
  const { manager } = useWorkspace();
  return (
    <footer className="page-footer">
      <span>
        <ShieldCheck size={14} />
        {manager
          ? 'Вы видите все объекты и задачи компании'
          : 'Вы видите только назначенные вам задачи'}
      </span>
      <span>
        Контур <span className="footer-dot">·</span> Пространство для работы
      </span>
    </footer>
  );
}
