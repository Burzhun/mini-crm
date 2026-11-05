import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import LoginPage from './LoginPage';
import WorkspaceProvider from '../workspace/WorkspaceProvider';
import Workspace from '../workspace/Workspace';
export default function AuthGate() {
  const { authLoading, user, demo } = useAuth();
  if (authLoading && !user)
    return (
      <div className="loading-screen">
        <LoaderCircle className="spin" />
        <p>Загружаем рабочее пространство…</p>
      </div>
    );
  if (!user) return <LoginPage />;
  return (
    <WorkspaceProvider key={`${demo}:${user.id}`} user={user} demo={demo}>
      <Workspace />
    </WorkspaceProvider>
  );
}
