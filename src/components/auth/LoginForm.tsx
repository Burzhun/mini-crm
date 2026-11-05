import { useState, type FormEvent } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import DemoLogin from './DemoLogin';

export default function LoginForm() {
  const { login: signIn, authError, busy } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  function login(event: FormEvent) {
    event.preventDefault();
    void signIn(email, password);
  }
  return (
    <div className="login-form">
      <span className="eyebrow">ВАШЕ РАБОЧЕЕ ПРОСТРАНСТВО</span>
      <h2>С возвращением</h2>
      <p className="muted">Войдите, чтобы продолжить работу.</p>
      <form onSubmit={login}>
        <label>
          Email
          <input
            autoComplete="username"
            type="email"
            required
            placeholder="name@company.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Пароль
          <input
            autoComplete="current-password"
            type="password"
            required
            placeholder="Введите пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {authError && (
          <p className="error" role="alert">
            {authError}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <>
              Войти в систему
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
      <p className="login-hint">
        Нет доступа? Обратитесь к руководителю.
        <br />
        Регистрация доступна только по приглашению.
      </p>
      <DemoLogin />
    </div>
  );
}
