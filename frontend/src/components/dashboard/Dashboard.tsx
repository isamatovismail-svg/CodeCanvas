import React, { useState, useEffect } from 'react';
import {
  Plus,
  Upload,
  FileCode,
  Archive,
  Trash2,
  Edit3,
  ExternalLink,
  Download,
  Clock,
  Sparkles,
  Layout,
  Layers,
  Code2,
} from 'lucide-react';
import { Project } from '../../types';
import { projectApi } from '../../services/api';

interface DashboardProps {
  onOpenProject: (projectId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState<Project | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [importTab, setImportTab] = useState<'paste' | 'zip'>('paste');
  const [importHtml, setImportHtml] = useState('');
  const [importCss, setImportCss] = useState('');
  const [importJs, setImportJs] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectApi.list();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setIsSubmitting(true);
      const proj = await projectApi.create({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      onOpenProject(proj.id);
    } catch (err) {
      console.error('Error creating project', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setIsSubmitting(true);
      const proj = await projectApi.importPaste({
        title: newTitle.trim(),
        description: newDesc.trim() || 'Imported via code paste',
        html_code: importHtml,
        css_code: importCss,
        js_code: importJs,
      });
      setShowImportModal(false);
      onOpenProject(proj.id);
    } catch (err) {
      console.error('Error importing paste', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportZip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !importFile) return;
    try {
      setIsSubmitting(true);
      const proj = await projectApi.importZip(newTitle.trim(), importFile);
      setShowImportModal(false);
      onOpenProject(proj.id);
    } catch (err) {
      console.error('Error importing ZIP', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRenameModal || !renameTitle.trim()) return;
    try {
      await projectApi.update(showRenameModal.id, { title: renameTitle.trim() });
      setShowRenameModal(null);
      fetchProjects();
    } catch (err) {
      console.error('Failed to rename project', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await projectApi.delete(id);
        fetchProjects();
      } catch (err) {
        console.error('Failed to delete project', err);
      }
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-canvas-bg text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-canvas-border bg-canvas-panel/80 backdrop-blur px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layout className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">CodeCanvas</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Visual Studio
              </span>
            </div>
            <p className="text-xs text-slate-400">AI-Powered Real-Time Visual Website Editor</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setNewTitle('');
              setNewDesc('');
              setImportHtml('');
              setImportCss('');
              setImportJs('');
              setImportFile(null);
              setShowImportModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-canvas-surface hover:bg-canvas-hover border border-canvas-border text-sm font-medium transition text-slate-200"
          >
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Import Website</span>
          </button>

          <button
            onClick={() => {
              setNewTitle('');
              setNewDesc('');
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-10">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-slate-900 border border-blue-900/30 p-8 mb-10 shadow-xl">
          <div className="max-w-2xl relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full-Stack Visual & Code Synchronization</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
              Design visually. Export clean code.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Import any HTML/CSS/JS site or start from our modern templates. Click any element to edit text,
              adjust styles, swap imagery, or prompt the AI assistant. Every visual edit updates the underlying
              code in real time.
            </p>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setNewTitle('Modern Landing Page');
                  setShowCreateModal(true);
                }}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-lg shadow-blue-600/30 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Start from Template</span>
              </button>
            </div>
          </div>
        </div>

        {/* Projects Controls & Filter */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-white tracking-tight">Your Projects</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-canvas-surface border border-canvas-border text-xs text-slate-400 font-medium">
              {projects.length}
            </span>
          </div>

          <div className="w-72">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-canvas-panel border border-canvas-border rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Project Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-canvas-panel/50 border border-canvas-border animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="border border-dashed border-canvas-border rounded-2xl p-12 text-center bg-canvas-panel/30">
            <Layers className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No projects found</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
              Create a new website project or import an existing HTML/CSS code archive to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => onOpenProject(p.id)}
                className="group relative bg-canvas-panel hover:bg-canvas-surface/80 border border-canvas-border hover:border-blue-500/50 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-blue-500/5"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Code2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                        {p.active_framework}
                      </span>
                    </div>

                    {/* Actions menu */}
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        title="Rename"
                        onClick={() => {
                          setShowRenameModal(p);
                          setRenameTitle(p.title);
                        }}
                        className="p-1.5 rounded-md hover:bg-canvas-hover text-slate-400 hover:text-slate-200 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <a
                        href={projectApi.exportZipUrl(p.id)}
                        download
                        title="Download ZIP"
                        className="p-1.5 rounded-md hover:bg-canvas-hover text-slate-400 hover:text-slate-200 transition"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        title="Delete"
                        onClick={(e) => handleDelete(p.id, e)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition mb-1">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {p.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-canvas-border flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1 font-medium text-blue-400 group-hover:translate-x-0.5 transition">
                    <span>Open Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-canvas-panel border border-canvas-border rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Create New Website Project</h3>
            <p className="text-xs text-slate-400 mb-5">
              Initializes a new project with starter HTML, CSS, JavaScript, and live visual editing bridge.
            </p>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme SaaS Landing Page"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of your project..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-canvas-surface hover:bg-canvas-hover text-sm font-medium text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-canvas-panel border border-canvas-border rounded-xl w-full max-w-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Import Existing Website</h3>
            <p className="text-xs text-slate-400 mb-4">
              Import static HTML, CSS, JavaScript, or upload a ZIP archive of your existing project.
            </p>

            {/* Tab switcher */}
            <div className="flex items-center space-x-2 border-b border-canvas-border pb-3 mb-5">
              <button
                type="button"
                onClick={() => setImportTab('paste')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                  importTab === 'paste'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>Paste Code</span>
              </button>
              <button
                type="button"
                onClick={() => setImportTab('zip')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                  importTab === 'zip'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>Upload ZIP</span>
              </button>
            </div>

            {importTab === 'paste' ? (
              <form onSubmit={handleImportPaste}>
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Imported Landing Page"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">HTML Code</label>
                    <textarea
                      rows={4}
                      placeholder="Paste your HTML code here (<!DOCTYPE html>...)"
                      value={importHtml}
                      onChange={(e) => setImportHtml(e.target.value)}
                      className="w-full bg-canvas-bg font-mono text-xs border border-canvas-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">CSS Code</label>
                    <textarea
                      rows={3}
                      placeholder="Paste CSS styles here..."
                      value={importCss}
                      onChange={(e) => setImportCss(e.target.value)}
                      className="w-full bg-canvas-bg font-mono text-xs border border-canvas-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">JavaScript Code</label>
                    <textarea
                      rows={3}
                      placeholder="Paste JS code here..."
                      value={importJs}
                      onChange={(e) => setImportJs(e.target.value)}
                      className="w-full bg-canvas-bg font-mono text-xs border border-canvas-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 rounded-lg bg-canvas-surface hover:bg-canvas-hover text-sm font-medium text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-lg shadow-blue-600/30 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Importing...' : 'Import Website'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleImportZip}>
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Zip Website"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Website Archive (.ZIP) *
                  </label>
                  <div className="border-2 border-dashed border-canvas-border rounded-xl p-8 text-center bg-canvas-bg/50 hover:border-blue-500/50 transition">
                    <input
                      type="file"
                      id="zip-upload"
                      accept=".zip"
                      required
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImportFile(e.target.files[0]);
                          if (!newTitle) {
                            setNewTitle(e.target.files[0].name.replace('.zip', ''));
                          }
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="zip-upload" className="cursor-pointer">
                      <Archive className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-white mb-1">
                        {importFile ? importFile.name : 'Click to select ZIP file'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Extracts index.html, CSS, JS, and image assets securely
                      </p>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 rounded-lg bg-canvas-surface hover:bg-canvas-hover text-sm font-medium text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !importFile}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-lg shadow-blue-600/30 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Uploading...' : 'Extract & Import'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-canvas-panel border border-canvas-border rounded-xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Rename Project</h3>
            <form onSubmit={handleRename}>
              <input
                type="text"
                required
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition mb-5"
              />
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(null)}
                  className="px-4 py-2 rounded-lg bg-canvas-surface hover:bg-canvas-hover text-sm font-medium text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
