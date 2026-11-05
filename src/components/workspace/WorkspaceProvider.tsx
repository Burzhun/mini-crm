import type { ReactNode } from 'react';
import type { Profile } from '../../domain';
import { WorkspaceContext } from '../../contexts/WorkspaceContext';
import { useWorkspaceState } from '../../hooks/useWorkspaceState';
export default function WorkspaceProvider({
  user,
  demo,
  children,
}: {
  user: Profile;
  demo: boolean;
  children: ReactNode;
}) {
  const workspace = useWorkspaceState(user, demo);
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}
