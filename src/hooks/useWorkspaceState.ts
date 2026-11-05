import { useMemo } from 'react';
import { Repository } from '../api';
import type { Profile } from '../domain';
import type { WorkspaceModal } from '../types/workspace';
import { profileName, selectWorkspace } from '../utils/workspaceSelectors';
import { useCrmData } from './useCrmData';
import { useWorkspaceNavigation } from './useWorkspaceNavigation';
import { useCrmActions } from './useCrmActions';

export function useWorkspaceState(user: Profile, demo: boolean) {
  const repository = useMemo(() => new Repository(demo, user), [user, demo]);
  const crm = useCrmData(repository);
  const navigation = useWorkspaceNavigation();
  const actions = useCrmActions(repository, crm.execute, navigation);
  const manager = user.role === 'manager';
  const selection = selectWorkspace(crm.data, navigation, manager);

  function open(modal: WorkspaceModal) {
    crm.clearError();
    navigation.open(modal);
  }
  function close() {
    if (!crm.busy) {
      crm.clearError();
      navigation.close();
    }
  }

  return {
    user,
    demo,
    manager,
    ...navigation,
    ...selection,
    ...actions,
    data: crm.data,
    loading: crm.loading,
    busy: crm.busy,
    error: crm.error,
    notice: crm.notice,
    reportError: crm.reportError,
    profile: (id: string) => profileName(crm.data.profiles, id),
    open,
    close,
  };
}
