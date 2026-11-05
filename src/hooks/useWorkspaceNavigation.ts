import { useState } from 'react';
import type { View, StatusFilter, Layout, WorkspaceModal } from '../types/workspace';

export function useWorkspaceNavigation() {
  const [view, setView] = useState<View>('projects');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [modal, setModal] = useState<WorkspaceModal | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [layout, setLayout] = useState<Layout>('grid');

  function openProject(id: string | null) {
    setProjectId(id);
    setQuery('');
    setFilter('all');
  }
  function navigate(next: View) {
    setView(next);
    openProject(null);
  }

  return {
    view,
    projectId,
    modal,
    query,
    filter,
    layout,
    setQuery,
    setFilter,
    setLayout,
    navigate,
    openProject,
    open: setModal,
    close: () => setModal(null),
  };
}
