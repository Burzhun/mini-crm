import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function DemoLogin() {
  const { enterDemo } = useAuth();
  return (
    <div className="demo-login">
      <span className="eyebrow">ПОСМОТРЕТЬ БЕЗ РЕГИСТРАЦИИ</span>
      <p>Демонстрационные данные в этом браузере</p>
      <button className="secondary full" onClick={() => enterDemo('manager')}>
        Открыть демо постановщика <ArrowUpRight size={16} />
      </button>
      <div className="demo-workers">
        <button onClick={() => enterDemo('worker-1')}>Исполнитель: Михаил</button>
        <button onClick={() => enterDemo('worker-2')}>Исполнитель: Анна</button>
      </div>
    </div>
  );
}
