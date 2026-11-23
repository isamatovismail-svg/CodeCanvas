import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/useEditorStore';

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      currentProject: null,
      files: [],
      activeFileName: 'index.html',
      isSaving: false,
      hasUnsavedChanges: false,
      selectedElement: null,
      viewMode: 'visual',
      viewportSize: 'desktop',
      previewKey: 0,
      consoleLogs: [],
      collaborators: [],
    });
  });

  it('initializes with default states', () => {
    const state = useEditorStore.getState();
    expect(state.viewMode).toBe('visual');
    expect(state.viewportSize).toBe('desktop');
    expect(state.hasUnsavedChanges).toBe(false);
  });

  it('updates project and starter files correctly', () => {
    const mockProject = {
      id: 'proj-123',
      title: 'Test Store Project',
      is_public: false,
      active_framework: 'vanilla',
      owner_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      files: [
        {
          id: 'file-1',
          project_id: 'proj-123',
          name: 'index.html',
          file_type: 'html' as const,
          content: '<h1>Hello World</h1>',
          is_entry_point: true,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'file-2',
          project_id: 'proj-123',
          name: 'styles.css',
          file_type: 'css' as const,
          content: 'body { color: blue; }',
          is_entry_point: false,
          created_at: '',
          updated_at: '',
        },
      ],
    };

    useEditorStore.getState().setProject(mockProject);
    const state = useEditorStore.getState();

    expect(state.currentProject?.id).toBe('proj-123');
    expect(state.files.length).toBe(2);
    expect(state.activeFileName).toBe('index.html');
  });

  it('handles local file content modifications and flags unsaved changes', () => {
    useEditorStore.setState({
      files: [
        {
          id: 'f1',
          project_id: 'p1',
          name: 'styles.css',
          file_type: 'css',
          content: 'body { margin: 0; }',
          is_entry_point: false,
          created_at: '',
          updated_at: '',
        },
      ],
      hasUnsavedChanges: false,
    });

    useEditorStore.getState().updateFileContentLocally('styles.css', 'body { margin: 10px; }');
    const state = useEditorStore.getState();

    expect(state.files[0].content).toBe('body { margin: 10px; }');
    expect(state.hasUnsavedChanges).toBe(true);
  });

  it('switches view mode and responsive device viewport', () => {
    useEditorStore.getState().setViewMode('split');
    expect(useEditorStore.getState().viewMode).toBe('split');

    useEditorStore.getState().setViewportSize('mobile');
    expect(useEditorStore.getState().viewportSize).toBe('mobile');
  });

  it('records and clears console logs', () => {
    useEditorStore.getState().addConsoleLog({
      level: 'warn',
      message: 'Suspicious CSS rule detected',
      timestamp: Date.now(),
    });

    expect(useEditorStore.getState().consoleLogs.length).toBe(1);
    expect(useEditorStore.getState().consoleLogs[0].level).toBe('warn');

    useEditorStore.getState().clearConsoleLogs();
    expect(useEditorStore.getState().consoleLogs.length).toBe(0);
  });

  it('manages collaborator presence and live cursors', () => {
    const collaborator = {
      userId: 'user-collab-1',
      userName: 'Alice',
      userColor: '#3b82f6',
      joinedAt: Date.now(),
    };

    useEditorStore.getState().addCollaborator(collaborator);
    expect(useEditorStore.getState().collaborators.length).toBe(1);

    useEditorStore.getState().updateLiveCursor('user-collab-1', {
      x: 100,
      y: 200,
      userColor: '#3b82f6',
      userName: 'Alice',
    });

    const cursors = useEditorStore.getState().liveCursors;
    expect(cursors['user-collab-1'].x).toBe(100);
    expect(cursors['user-collab-1'].y).toBe(200);

    useEditorStore.getState().removeCollaborator('user-collab-1');
    expect(useEditorStore.getState().collaborators.length).toBe(0);
    expect(useEditorStore.getState().liveCursors['user-collab-1']).toBeUndefined();
  });
});
