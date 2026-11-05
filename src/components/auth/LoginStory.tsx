import { Building2, ShieldCheck } from 'lucide-react';
import Brand from '../ui/Brand';

export default function LoginStory() {
  return (
    <div className="login-story">
      <Brand />
      <div>
        <span className="eyebrow light">СТРОИМ ВМЕСТЕ. РАБОТАЕМ СИСТЕМНО.</span>
        <h1>
          Каждый объект.
          <br />
          Каждая задача.
          <br />
          <em>Всё под контролем.</em>
        </h1>
        <p>Единое рабочее пространство для вашей строительной команды.</p>
      </div>
      <span className="login-foot">
        <ShieldCheck size={17} /> Доступ к данным — только по вашей роли
      </span>
      <div className="blueprint" aria-hidden="true">
        <Building2 size={310} strokeWidth={0.5} />
      </div>
    </div>
  );
}
