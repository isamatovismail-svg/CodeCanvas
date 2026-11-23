import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { projectApi } from '../services/api';
import { TopToolbar } from '../components/editor/TopToolbar';
import { LeftSidebar } from '../components/editor/LeftSidebar';
import { RightSidebar } from '../components/editor/RightSidebar';
import { BottomPanel } from '../components/editor/BottomPanel';
import { LivePreview } from '../components/preview/LivePreview';
import { CodeEditor } from '../components/code-editor/CodeEditor';
import { VersionHistoryModal } from '../components/editor/VersionHistoryModal';
import { RefreshCw } from 'lucide-react';

interface EditorPageProps {
  projectId: string;
  onBackToDashboard: () => void;
}

export const EditorPage: React.FC<EditorPageProps> = ({
  projectId,
  onBackToDashboard,
}) => {
  const { setProject, viewMode } = useEditorStore();
  const [loading, setLoading] = useState(true);
  const [showVersions, setShowVersions] = useState(false);

  // Initialize Real-Time WebSocket Channel
  const { sendCursorMove, sendElementSelect, sendCodeUpdate } = useWebSocket(projectId);

  useEffect(() => {
    let isMounted = true;
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const project = await projectApi.get(projectId);
        if (isMounted) {
          setProject(project);
        }
      } catch (err) {
        console.error('Failed to load project', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProjectDetails();
    return () => {
      isMounted = false;
    };
  }, [projectId, setProject]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-canvas-bg flex flex-col items-center justify-center space-y-3 text-slate-300">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm font-medium">Loading project workspace...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas-bg text-slate-100 overflow-hidden">
      {/* Top Navigation & Controls */}
      <TopToolbar
        onBackToDashboard={onBackToDashboard}
        onOpenVersions={() => setShowVersions(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Files, Elements DOM Tree, Assets */}
        <LeftSidebar />

        {/* Center Panel: Code Editor, Visual Preview, or Split */}
        <main className="flex-1 flex overflow-hidden">
          {viewMode === 'visual' && (
            <LivePreview
              onCursorMove={sendCursorMove}
              onElementSelect={sendElementSelect}
            />
          )}

          {viewMode === 'code' && (
            <CodeEditor onCodeChange={sendCodeUpdate} />
          )}

          {viewMode === 'split' && (
            <div className="flex-1 flex h-full">
              <div className="w-1/2 h-full">
                <CodeEditor onCodeChange={sendCodeUpdate} />
              </div>
              <div className="w-1/2 h-full">
                <LivePreview
                  onCursorMove={sendCursorMove}
                  onElementSelect={sendElementSelect}
                />
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar: Style Properties & AI Assistant */}
        <RightSidebar />
      </div>

      {/* Bottom Collapsible Panel: Console, Errors, Realtime status */}
      <BottomPanel />

      {/* Version History Modal */}
      {showVersions && (
        <VersionHistoryModal onClose={() => setShowVersions(false)} />
      )}
    </div>
  );
};
