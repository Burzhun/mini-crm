import { useWorkspace } from '../../hooks/useWorkspace';
import { useAuth } from '../../hooks/useAuth';
import { demoData } from '../../demo';

export default function DemoBanner() {
  const { user } = useWorkspace();
  const { enterDemo } = useAuth();
  return (
    <div className="demo-banner">
      <span>Деморежим · данные хранятся в вашем браузере</span>
      <label>
        Смотреть как
        <select
          aria-label="Демонстрационная роль"
          value={user.id}
          onChange={(e) => enterDemo(e.target.value)}
        >
          {demoData().profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.role === 'manager' ? 'Постановщик' : 'Исполнитель'} · {p.name.split(' ')[0]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
