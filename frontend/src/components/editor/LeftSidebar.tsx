import React, { useState } from 'react';
import {
  FolderTree,
  ListTree,
  Image,
  FileCode,
  FileText,
  Code2,
  Plus,
  Trash2,
  ChevronDown,
  Upload,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { fileApi } from '../../services/api';
import { DOMTreeNode } from '../../types';

export const LeftSidebar: React.FC = () => {
  const {
    currentProject,
    files,
    activeFileName,
    setActiveFile,
    activeLeftTab,
    setActiveLeftTab,
    domTree,
    selectedElement,
  } = useEditorStore();

  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('html');

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !newFileName.trim()) return;

    try {
      await fileApi.create(currentProject.id, {
        name: newFileName.trim(),
        file_type: newFileType,
        content: newFileType === 'html' ? '<!DOCTYPE html><html><body></body></html>' : '',
      });
      setShowAddFileModal(false);
      setNewFileName('');
      // Reload files
      const updated = await fileApi.list(currentProject.id);
      useEditorStore.getState().setFiles(updated);
      setActiveFile(newFileName.trim());
    } catch (err) {
      console.error('Failed to create file', err);
    }
  };

  const handleDeleteFile = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProject) return;
    if (confirm(`Delete file "${filename}"?`)) {
      try {
        await fileApi.delete(currentProject.id, filename);
        const updated = await fileApi.list(currentProject.id);
        useEditorStore.getState().setFiles(updated);
        if (activeFileName === filename && updated.length > 0) {
          setActiveFile(updated[0].name);
        }
      } catch (err) {
        console.error('Failed to delete file', err);
      }
    }
  };

  // Select element from DOM tree
  const handleSelectTreeNode = (node: DOMTreeNode) => {
    const iframe = document.getElementById('codecanvas-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          target: 'codecanvas-preview',
          type: 'select-element-by-id',
          elementId: node.elementId,
        },
        '*'
      );
    }
  };

  // Recursive Tree Node Item
  const renderTreeNode = (node: DOMTreeNode, depth: number = 0) => {
    const isSelected = selectedElement?.elementId === node.elementId;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.elementId} style={{ paddingLeft: `${depth * 12}px` }} className="text-xs">
        <div
          onClick={() => handleSelectTreeNode(node)}
          className={`group flex items-center space-x-1.5 py-1 px-2 rounded cursor-pointer transition select-none ${
            isSelected
              ? 'bg-blue-600 text-white font-semibold'
              : 'hover:bg-canvas-hover text-slate-300'
          }`}
        >
          {hasChildren ? (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          ) : (
            <span className="w-3 h-3 inline-block" />
          )}
          <span className="font-mono text-[11px] text-blue-400 group-hover:text-blue-300">
            &lt;{node.tagName}&gt;
          </span>
          {node.id && (
            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">#{node.id}</span>
          )}
          {node.textSnippet && (
            <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
              "{node.textSnippet}"
            </span>
          )}
        </div>
        {hasChildren && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 h-full border-r border-canvas-border bg-canvas-panel flex flex-col select-none">
      {/* Tab Switcher Header */}
      <div className="flex items-center border-b border-canvas-border bg-canvas-bg h-10 px-2 space-x-1">
        <button
          onClick={() => setActiveLeftTab('files')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded text-xs font-medium transition ${
            activeLeftTab === 'files'
              ? 'bg-canvas-panel text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Files</span>
        </button>
        <button
          onClick={() => setActiveLeftTab('elements')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded text-xs font-medium transition ${
            activeLeftTab === 'elements'
              ? 'bg-canvas-panel text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListTree className="w-3.5 h-3.5" />
          <span>Elements</span>
        </button>
        <button
          onClick={() => setActiveLeftTab('assets')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded text-xs font-medium transition ${
            activeLeftTab === 'assets'
              ? 'bg-canvas-panel text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          <span>Assets</span>
        </button>
      </div>

      {/* Tab 1: Project Files Tree */}
      {activeLeftTab === 'files' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Project Explorer
            </span>
            <button
              onClick={() => setShowAddFileModal(true)}
              title="Add New File"
              className="p-1 rounded hover:bg-canvas-hover text-slate-400 hover:text-white transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {files.map((file) => {
              const isActive = file.name === activeFileName;
              return (
                <div
                  key={file.name}
                  onClick={() => setActiveFile(file.name)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium'
                      : 'hover:bg-canvas-hover text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {file.name.endsWith('.html') && (
                      <FileCode className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                    )}
                    {file.name.endsWith('.css') && (
                      <FileText className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                    )}
                    {file.name.endsWith('.js') && (
                      <Code2 className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                    )}
                    <span className="truncate">{file.name}</span>
                    {file.is_entry_point && (
                      <span className="text-[9px] px-1 rounded bg-black/30 text-slate-200">
                        entry
                      </span>
                    )}
                  </div>

                  {!file.is_entry_point && (
                    <button
                      onClick={(e) => handleDeleteFile(file.name, e)}
                      title="Delete File"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Elements Hierarchy DOM Tree */}
      {activeLeftTab === 'elements' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              DOM Hierarchy
            </span>
          </div>

          {domTree ? (
            <div className="space-y-0.5">{renderTreeNode(domTree)}</div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              Loading DOM element tree...
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Assets Manager */}
      {activeLeftTab === 'assets' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Assets & Media
            </span>
          </div>

          <label
            htmlFor="sidebar-asset-upload"
            className="w-full py-2 px-3 border border-dashed border-canvas-border rounded-lg text-center cursor-pointer hover:border-blue-500 transition block mb-4"
          >
            <Upload className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <span className="text-xs text-slate-300 block">Upload Media File</span>
            <input
              id="sidebar-asset-upload"
              type="file"
              accept="image/*"
              onChange={async (e) => {
                if (currentProject && e.target.files && e.target.files[0]) {
                  await fileApi.uploadAsset(currentProject.id, e.target.files[0]);
                  alert('Asset uploaded successfully!');
                }
              }}
              className="hidden"
            />
          </label>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Uploaded images are stored under your project's isolated storage directory and can be
            assigned directly to any element.
          </p>
        </div>
      )}

      {/* Add File Modal */}
      {showAddFileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-canvas-panel border border-canvas-border rounded-xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Add Project File</h3>
            <form onSubmit={handleCreateFile}>
              <div className="mb-3">
                <label className="block text-[10px] uppercase font-semibold text-slate-300 mb-1">
                  Filename
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. about.html, theme.css"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="mb-5">
                <label className="block text-[10px] uppercase font-semibold text-slate-300 mb-1">
                  File Type
                </label>
                <select
                  value={newFileType}
                  onChange={(e) => setNewFileType(e.target.value)}
                  className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="html">HTML document (.html)</option>
                  <option value="css">Stylesheet (.css)</option>
                  <option value="js">JavaScript (.js)</option>
                  <option value="json">JSON data (.json)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddFileModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-canvas-surface hover:bg-canvas-hover text-xs font-medium text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
