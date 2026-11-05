import { ChevronLeft } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import DemoBanner from '../layout/DemoBanner';
import PageFooter from '../layout/PageFooter';
import PageHeading from './PageHeading';
import WorkspaceStats from './WorkspaceStats';
import SectionHeader from './SectionHeader';
import WorkspaceToolbar from './WorkspaceToolbar';
import WorkspaceResults from './WorkspaceResults';
export default function WorkspaceContent() {
  const { demo, selectedProject, openProject, error, modal, refresh } = useWorkspace();
  return (
    <main className="content">
      {demo && <DemoBanner />}
      {selectedProject && (
        <button className="back-link" onClick={() => openProject(null)}>
          <ChevronLeft size={16} />
          Все объекты
        </button>
      )}
      <PageHeading />
      {error && !modal && (
        <div className="error" role="alert">
          {error}
          <button onClick={() => void refresh()}>Повторить</button>
        </div>
      )}
      <WorkspaceStats />
      <section className="workspace-section">
        <SectionHeader />
        <WorkspaceToolbar />
        <WorkspaceResults />
      </section>
      <PageFooter />
    </main>
  );
}
