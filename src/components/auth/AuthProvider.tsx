import type { ReactNode } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { useAuthSession } from '../../hooks/useAuthSession';
export default function AuthProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}
