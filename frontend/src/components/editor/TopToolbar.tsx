import React, { useState } from 'react';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  RotateCw,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Columns,
  Code2,
  RefreshCw,
  Download,
  History,
  CheckCircle2,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { projectApi } from '../../services/api';

interface TopToolbarProps {
  onBackToDashboard: () => void;
  onOpenVersions: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  onBackToDashboard,
  onOpenVersions,
}) => {
  const {
    currentProject,
    isSaving,
    hasUnsavedChanges,
    saveCurrentFiles,
    viewMode,
    setViewMode,
    viewportSize,
    setViewportSize,
    refreshPreview,
    undo,
    redo,
    collaborators,
    wsStatus,
  } = useEditorStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [projectTitle, setProjectTitle] = useState(currentProject?.title || 'Untitled Project');

  const handleTitleSubmit = async () => {
    setIsEditingTitle(false);
    if (currentProject && projectTitle.trim() && projectTitle !== currentProject.title) {
      try {
        await projectApi.update(currentProject.id, { title: projectTitle.trim() });
      } catch (e) {
        console.error('Failed to update project title', e);
      }
    }
  };

  return (
    <header className="h-14 border-b border-canvas-border bg-canvas-panel flex items-center justify-between px-4 z-30 select-none">
      {/* Left Section: Back, Project Title, Save Status */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBackToDashboard}
          title="Back to Projects"
          className="p-1.5 rounded-lg hover:bg-canvas-hover text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-canvas-border" />

        {isEditingTitle ? (
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            autoFocus
            className="bg-canvas-bg border border-blue-500 rounded px-2 py-0.5 text-sm font-semibold text-white focus:outline-none"
          />
        ) : (
          <span
            onClick={() => setIsEditingTitle(true)}
            title="Click to rename"
            className="text-sm font-bold text-white hover:text-blue-400 transition cursor-pointer max-w-[200px] truncate"
          >
            {projectTitle}
          </span>
        )}

        {/* Save Status Indicator */}
        <div className="flex items-center space-x-1.5 text-xs">
          {isSaving ? (
            <span className="flex items-center text-blue-400 space-x-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </span>
          ) : hasUnsavedChanges ? (
            <span className="flex items-center text-amber-400 space-x-1" title="Unsaved changes">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Unsaved</span>
            </span>
          ) : (
            <span className="flex items-center text-emerald-400 space-x-1" title="All changes saved">
              <CheckCircle2 className="w-3 h-3" />
              <span>Saved</span>
            </span>
          )}
        </div>

        <button
          onClick={() => saveCurrentFiles()}
          disabled={isSaving}
          title="Save Snapshot"
          className="px-2.5 py-1 rounded bg-canvas-surface hover:bg-canvas-hover text-xs font-medium text-slate-300 transition flex items-center space-x-1 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5 text-blue-400" />
          <span>Save</span>
        </button>

        {/* Undo / Redo */}
        <div className="flex items-center space-x-1">
          <button
            onClick={undo}
            title="Undo"
            className="p-1.5 rounded hover:bg-canvas-hover text-slate-400 hover:text-white transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            title="Redo"
            className="p-1.5 rounded hover:bg-canvas-hover text-slate-400 hover:text-white transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Section: Responsive Device Switcher */}
      <div className="flex items-center space-x-1 bg-canvas-surface/70 p-1 rounded-lg border border-canvas-border">
        <button
          onClick={() => setViewportSize('desktop')}
          title="Desktop View (100%)"
          className={`px-2.5 py-1 rounded flex items-center space-x-1.5 text-xs font-medium transition ${
            viewportSize === 'desktop'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Desktop</span>
        </button>
        <button
          onClick={() => setViewportSize('tablet')}
          title="Tablet View (768px)"
          className={`px-2.5 py-1 rounded flex items-center space-x-1.5 text-xs font-medium transition ${
            viewportSize === 'tablet'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Tablet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tablet</span>
        </button>
        <button
          onClick={() => setViewportSize('mobile')}
          title="Mobile View (375px)"
          className={`px-2.5 py-1 rounded flex items-center space-x-1.5 text-xs font-medium transition ${
            viewportSize === 'mobile'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Mobile</span>
        </button>
      </div>

      {/* Right Section: Mode switch, Refresh, Version history, Export, Presence */}
      <div className="flex items-center space-x-2">
        {/* View Mode Switcher */}
        <div className="flex items-center space-x-0.5 bg-canvas-surface/70 p-1 rounded-lg border border-canvas-border mr-2">
          <button
            onClick={() => setViewMode('visual')}
            title="Visual Mode"
            className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition ${
              viewMode === 'visual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Visual</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            title="Split Code & Visual"
            className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition ${
              viewMode === 'split' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Split</span>
          </button>
          <button
            onClick={() => setViewMode('code')}
            title="Code Mode"
            className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition ${
              viewMode === 'code' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Code</span>
          </button>
        </div>

        {/* Refresh Preview */}
        <button
          onClick={refreshPreview}
          title="Reload Preview Frame"
          className="p-1.5 rounded-lg hover:bg-canvas-hover text-slate-400 hover:text-white transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Versions Button */}
        <button
          onClick={onOpenVersions}
          title="Version History & Snapshots"
          className="p-1.5 rounded-lg hover:bg-canvas-hover text-slate-400 hover:text-white transition"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Export ZIP */}
        {currentProject && (
          <a
            href={projectApi.exportZipUrl(currentProject.id)}
            download
            title="Export ZIP Archive"
            className="px-3 py-1.5 rounded-lg bg-canvas-surface hover:bg-canvas-hover border border-canvas-border text-xs font-medium text-slate-200 transition flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Export</span>
          </a>
        )}

        {/* Collaborators Avatar Stack */}
        <div className="flex items-center -space-x-1.5 pl-2">
          {collaborators.slice(0, 3).map((u) => (
            <div
              key={u.userId}
              title={`${u.userName} (Active)`}
              className="w-7 h-7 rounded-full border-2 border-canvas-panel flex items-center justify-center text-[10px] font-bold text-white shadow"
              style={{ backgroundColor: u.userColor }}
            >
              {u.userName.slice(0, 2).toUpperCase()}
            </div>
          ))}
          {collaborators.length > 3 && (
            <div className="w-7 h-7 rounded-full border-2 border-canvas-panel bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
              +{collaborators.length - 3}
            </div>
          )}
          <div
            title={`Real-Time: ${wsStatus}`}
            className={`w-2 h-2 rounded-full ml-1.5 ${
              wsStatus === 'connected'
                ? 'bg-emerald-500'
                : wsStatus === 'connecting'
                ? 'bg-amber-500 animate-ping'
                : 'bg-red-500'
            }`}
          />
        </div>
      </div>
    </header>
  );
};
