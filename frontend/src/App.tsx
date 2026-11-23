import { useState, useEffect } from 'react';
import { Dashboard } from './components/dashboard/Dashboard';
import { EditorPage } from './pages/EditorPage';

export function App() {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('project');
  });

  const handleOpenProject = (id: string) => {
    setCurrentProjectId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('project', id);
    window.history.pushState({}, '', url.toString());
  };

  const handleBackToDashboard = () => {
    setCurrentProjectId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('project');
    window.history.pushState({}, '', url.toString());
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setCurrentProjectId(params.get('project'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentProjectId) {
    return (
      <EditorPage
        projectId={currentProjectId}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  return <Dashboard onOpenProject={handleOpenProject} />;
}

export default App;
