import LoginForm from './LoginForm';
import LoginStory from './LoginStory';

export default function LoginPage() {
  return (
    <div className="login-page">
      <LoginStory />
      <main className="login-main">
        <LoginForm />
      </main>
    </div>
  );
}
