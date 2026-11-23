import { create } from 'zustand';
import { Project, ProjectFile, ProjectVersion, SelectedElementInfo, DOMTreeNode, CollaboratorUser, ConsoleLogEntry } from '../types';
import { fileApi, versionApi } from '../services/api';

interface EditorState {
  // Project & Files
  currentProject: Project | null;
  files: ProjectFile[];
  activeFileName: string;
  isSaving: boolean;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;
  versions: ProjectVersion[];

  // Undo / Redo history for visual edits
  history: Array<{ files: ProjectFile[]; selectedElement: SelectedElementInfo | null }>;
  historyIndex: number;

  // View & Responsive Controls
  viewMode: 'visual' | 'code' | 'split';
  viewportSize: 'desktop' | 'tablet' | 'mobile';
  previewKey: number;

  // Visual Selection
  selectedElement: SelectedElementInfo | null;
  domTree: DOMTreeNode | null;
  activeLeftTab: 'files' | 'elements' | 'assets';
  activeRightTab: 'styles' | 'ai';

  // WebSocket & Presence
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  collaborators: CollaboratorUser[];
  currentUser: CollaboratorUser | null;
  liveCursors: Record<string, { x: number; y: number; userColor: string; userName: string }>;

  // Console Logs & Errors
  consoleLogs: ConsoleLogEntry[];
  showConsole: boolean;

  // Actions
  setProject: (project: Project) => void;
  setFiles: (files: ProjectFile[]) => void;
  setActiveFile: (name: string) => void;
  updateFileContentLocally: (filename: string, content: string) => void;
  saveCurrentFiles: () => Promise<void>;
  setViewMode: (mode: 'visual' | 'code' | 'split') => void;
  setViewportSize: (size: 'desktop' | 'tablet' | 'mobile') => void;
  refreshPreview: () => void;
  setSelectedElement: (el: SelectedElementInfo | null) => void;
  setDomTree: (tree: DOMTreeNode | null) => void;
  setActiveLeftTab: (tab: 'files' | 'elements' | 'assets') => void;
  setActiveRightTab: (tab: 'styles' | 'ai') => void;
  setWsStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
  setCurrentUser: (user: CollaboratorUser) => void;
  setCollaborators: (users: CollaboratorUser[]) => void;
  addCollaborator: (user: CollaboratorUser) => void;
  removeCollaborator: (userId: string) => void;
  updateLiveCursor: (userId: string, data: { x: number; y: number; userColor: string; userName: string }) => void;
  addConsoleLog: (entry: Omit<ConsoleLogEntry, 'id'>) => void;
  clearConsoleLogs: () => void;
  toggleConsole: () => void;
  loadVersions: () => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;

  // Visual Edit Synchronization Actions
  applyStyleChange: (property: string, value: string) => Promise<void>;
  applyTextChange: (newText: string) => Promise<void>;
  applyAttributeChange: (attribute: string, value: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentProject: null,
  files: [],
  activeFileName: 'index.html',
  isSaving: false,
  lastSavedAt: null,
  hasUnsavedChanges: false,
  versions: [],

  history: [],
  historyIndex: -1,

  viewMode: 'visual',
  viewportSize: 'desktop',
  previewKey: 0,

  selectedElement: null,
  domTree: null,
  activeLeftTab: 'files',
  activeRightTab: 'styles',

  wsStatus: 'disconnected',
  collaborators: [],
  currentUser: null,
  liveCursors: {},

  consoleLogs: [],
  showConsole: false,

  setProject: (project) => {
    const files = project.files || [];
    const entry = files.find((f) => f.is_entry_point) || files[0];
    set({
      currentProject: project,
      files: files,
      activeFileName: entry ? entry.name : 'index.html',
      versions: project.versions || [],
      history: [{ files: files, selectedElement: null }],
      historyIndex: 0,
      hasUnsavedChanges: false,
      lastSavedAt: new Date(),
    });
  },

  setFiles: (files) => set({ files }),

  setActiveFile: (activeFileName) => set({ activeFileName }),

  updateFileContentLocally: (filename, content) => {
    set((state) => {
      const updatedFiles = state.files.map((f) =>
        f.name === filename ? { ...f, content } : f
      );
      return {
        files: updatedFiles,
        hasUnsavedChanges: true,
      };
    });
  },

  saveCurrentFiles: async () => {
    const { currentProject, files, isSaving } = get();
    if (!currentProject || isSaving) return;

    set({ isSaving: true });
    try {
      // Save each modified file
      for (const f of files) {
        await fileApi.update(currentProject.id, f.name, f.content);
      }
      // Create version snapshot
      const ver = await versionApi.create(currentProject.id, 'Snapshot');
      set((state) => ({
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: new Date(),
        versions: [ver, ...state.versions],
      }));
    } catch (err) {
      console.error('Failed to save files:', err);
      set({ isSaving: false });
    }
  },

  setViewMode: (viewMode) => set({ viewMode }),
  setViewportSize: (viewportSize) => set({ viewportSize }),
  refreshPreview: () => set((state) => ({ previewKey: state.previewKey + 1 })),

  setSelectedElement: (selectedElement) => set({ selectedElement }),
  setDomTree: (domTree) => set({ domTree }),
  setActiveLeftTab: (activeLeftTab) => set({ activeLeftTab }),
  setActiveRightTab: (activeRightTab) => set({ activeRightTab }),

  setWsStatus: (wsStatus) => set({ wsStatus }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setCollaborators: (collaborators) => set({ collaborators }),
  addCollaborator: (user) =>
    set((state) => ({
      collaborators: [...state.collaborators.filter((u) => u.userId !== user.userId), user],
    })),
  removeCollaborator: (userId) =>
    set((state) => {
      const nextCursors = { ...state.liveCursors };
      delete nextCursors[userId];
      return {
        collaborators: state.collaborators.filter((u) => u.userId !== userId),
        liveCursors: nextCursors,
      };
    }),
  updateLiveCursor: (userId, data) =>
    set((state) => ({
      liveCursors: {
        ...state.liveCursors,
        [userId]: data,
      },
    })),

  addConsoleLog: (entry) =>
    set((state) => ({
      consoleLogs: [
        ...state.consoleLogs.slice(-100), // Keep last 100 entries
        { ...entry, id: Math.random().toString(36).substring(7) },
      ],
    })),
  clearConsoleLogs: () => set({ consoleLogs: [] }),
  toggleConsole: () => set((state) => ({ showConsole: !state.showConsole })),

  loadVersions: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      const versions = await versionApi.list(currentProject.id);
      set({ versions });
    } catch (e) {
      console.error('Failed to load versions', e);
    }
  },

  restoreVersion: async (versionId) => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      await versionApi.restore(currentProject.id, versionId);
      // Reload project files
      const updatedFiles = await fileApi.list(currentProject.id);
      set((state) => ({
        files: updatedFiles,
        previewKey: state.previewKey + 1,
        selectedElement: null,
      }));
    } catch (e) {
      console.error('Failed to restore version', e);
    }
  },

  applyStyleChange: async (property, value) => {
    const { currentProject, selectedElement } = get();
    if (!currentProject || !selectedElement) return;

    // Send postMessage to preview iframe for instantaneous visual update
    const iframe = document.getElementById('codecanvas-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          target: 'codecanvas-preview',
          type: 'update-element-style',
          elementId: selectedElement.elementId,
          property,
          value,
        },
        '*'
      );
    }

    // Update local selectedElement state
    set((state) => {
      if (!state.selectedElement) return {};
      return {
        selectedElement: {
          ...state.selectedElement,
          styles: {
            ...state.selectedElement.styles,
            [property]: value,
          },
        },
      };
    });

    // Synchronize to backend HTML
    try {
      const res = await fileApi.applyElementUpdate(currentProject.id, {
        element_id: selectedElement.elementId,
        styles: { [property]: value },
      });
      if (res && res.updated_html) {
        set((state) => ({
          files: state.files.map((f) =>
            f.name === res.filename ? { ...f, content: res.updated_html } : f
          ),
          hasUnsavedChanges: true,
        }));
      }
    } catch (err) {
      console.error('Error synchronizing style edit:', err);
    }
  },

  applyTextChange: async (newText) => {
    const { currentProject, selectedElement } = get();
    if (!currentProject || !selectedElement) return;

    const iframe = document.getElementById('codecanvas-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          target: 'codecanvas-preview',
          type: 'update-element-text',
          elementId: selectedElement.elementId,
          text: newText,
        },
        '*'
      );
    }

    set((state) => {
      if (!state.selectedElement) return {};
      return {
        selectedElement: {
          ...state.selectedElement,
          textContent: newText,
        },
      };
    });

    try {
      const res = await fileApi.applyElementUpdate(currentProject.id, {
        element_id: selectedElement.elementId,
        text_content: newText,
      });
      if (res && res.updated_html) {
        set((state) => ({
          files: state.files.map((f) =>
            f.name === res.filename ? { ...f, content: res.updated_html } : f
          ),
          hasUnsavedChanges: true,
        }));
      }
    } catch (err) {
      console.error('Error synchronizing text edit:', err);
    }
  },

  applyAttributeChange: async (attribute, value) => {
    const { currentProject, selectedElement } = get();
    if (!currentProject || !selectedElement) return;

    const iframe = document.getElementById('codecanvas-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          target: 'codecanvas-preview',
          type: 'update-element-attribute',
          elementId: selectedElement.elementId,
          attribute,
          value,
        },
        '*'
      );
    }

    set((state) => {
      if (!state.selectedElement) return {};
      return {
        selectedElement: {
          ...state.selectedElement,
          attributes: {
            ...state.selectedElement.attributes,
            [attribute]: value,
          },
        },
      };
    });

    try {
      const res = await fileApi.applyElementUpdate(currentProject.id, {
        element_id: selectedElement.elementId,
        attributes: { [attribute]: value },
      });
      if (res && res.updated_html) {
        set((state) => ({
          files: state.files.map((f) =>
            f.name === res.filename ? { ...f, content: res.updated_html } : f
          ),
          hasUnsavedChanges: true,
        }));
      }
    } catch (err) {
      console.error('Error synchronizing attribute edit:', err);
    }
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prev = history[newIndex];
      set({
        files: prev.files,
        selectedElement: prev.selectedElement,
        historyIndex: newIndex,
        previewKey: get().previewKey + 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const next = history[newIndex];
      set({
        files: next.files,
        selectedElement: next.selectedElement,
        historyIndex: newIndex,
        previewKey: get().previewKey + 1,
      });
    }
  },
}));
