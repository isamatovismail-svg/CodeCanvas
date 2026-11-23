import React, { useState } from 'react';
import { History, RotateCcw, Plus, X, Clock, FileText } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { versionApi } from '../../services/api';

interface VersionHistoryModalProps {
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ onClose }) => {
  const { currentProject, versions, restoreVersion, loadVersions } = useEditorStore();
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !newTitle.trim()) return;
    try {
      setIsCreating(true);
      await versionApi.create(currentProject.id, newTitle.trim());
      setNewTitle('');
      await loadVersions();
    } catch (err) {
      console.error('Failed to create version snapshot', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (confirm(`Restore version #${versionNumber}? Your current state will be backed up automatically.`)) {
      await restoreVersion(versionId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-canvas-panel border border-canvas-border rounded-xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-canvas-border mb-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base">
            <History className="w-5 h-5 text-blue-400" />
            <span>Version History & Snapshots</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-canvas-hover text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create Snapshot Form */}
        <form onSubmit={handleCreateSnapshot} className="flex items-center space-x-2 mb-4">
          <input
            type="text"
            placeholder="Snapshot title (e.g. 'Before changing buttons')..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-canvas-bg border border-canvas-border rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
          />
          <button
            type="submit"
            disabled={isCreating || !newTitle.trim()}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Snapshot</span>
          </button>
        </form>

        {/* Versions List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {versions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No version snapshots saved yet. Click "Save" or create a snapshot above.
            </div>
          ) : (
            versions.map((ver) => {
              const fileCount = ver.snapshot?.files?.length || 0;
              const dateStr = new Date(ver.created_at).toLocaleString();
              return (
                <div
                  key={ver.id}
                  className="p-3 rounded-lg bg-canvas-bg hover:bg-canvas-surface border border-canvas-border flex items-center justify-between transition"
                >
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        v{ver.version_number}
                      </span>
                      <span className="text-xs font-semibold text-white">{ver.title}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-[10px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <FileText className="w-3 h-3" />
                        <span>{fileCount} files</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestore(ver.id, ver.version_number)}
                    className="px-2.5 py-1 rounded bg-canvas-surface hover:bg-blue-600 border border-canvas-border hover:border-transparent text-xs font-medium text-slate-300 hover:text-white transition flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
