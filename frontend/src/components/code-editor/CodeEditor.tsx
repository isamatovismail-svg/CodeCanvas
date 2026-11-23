import React, { useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useEditorStore } from '../../store/useEditorStore';
import { FileCode, FileText, Code2, Sparkles } from 'lucide-react';

interface CodeEditorProps {
  onCodeChange?: (filename: string, content: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ onCodeChange }) => {
  const {
    files,
    activeFileName,
    setActiveFile,
    updateFileContentLocally,
    refreshPreview,
    hasUnsavedChanges,
  } = useEditorStore();

  const activeFile = files.find((f) => f.name === activeFileName) || files[0];
  const editorRef = useRef<any>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Map file extension to Monaco language
  const getLanguage = (fileName: string) => {
    if (fileName.endsWith('.html') || fileName.endsWith('.htm')) return 'html';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.js') || fileName.endsWith('.mjs')) return 'javascript';
    if (fileName.endsWith('.json')) return 'json';
    return 'plaintext';
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;

    // Configure dark theme options
    monaco.editor.defineTheme('codecanvas-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f172a',
        'editor.lineHighlightBackground': '#1e293b55',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#94a3b8',
      },
    });
    monaco.editor.setTheme('codecanvas-dark');
  };

  const handleContentChange = (value: string | undefined) => {
    if (value === undefined || !activeFile) return;

    // Update store state immediately
    updateFileContentLocally(activeFile.name, value);

    // Debounce preview refresh and broadcast
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      refreshPreview();
      if (onCodeChange) {
        onCodeChange(activeFile.name, value);
      }
    }, 400);
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-canvas-panel border-r border-canvas-border overflow-hidden">
      {/* File Tabs Header */}
      <div className="flex items-center justify-between border-b border-canvas-border bg-canvas-bg px-2 h-10 select-none">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          {files.map((file) => {
            const isActive = file.name === activeFileName;
            return (
              <button
                key={file.name}
                onClick={() => setActiveFile(file.name)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-t text-xs font-medium border-b-2 transition ${
                  isActive
                    ? 'border-blue-500 bg-canvas-panel text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-canvas-panel/50'
                }`}
              >
                {file.name.endsWith('.html') && <FileCode className="w-3.5 h-3.5 text-orange-400" />}
                {file.name.endsWith('.css') && <FileText className="w-3.5 h-3.5 text-sky-400" />}
                {file.name.endsWith('.js') && <Code2 className="w-3.5 h-3.5 text-yellow-400" />}
                <span>{file.name}</span>
                {isActive && hasUnsavedChanges && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Format Code Button */}
        <button
          onClick={handleFormatCode}
          title="Format Code (Alt+Shift+F)"
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-canvas-surface hover:bg-canvas-hover text-[11px] text-slate-300 transition"
        >
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span>Format</span>
        </button>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full h-full relative">
        {activeFile ? (
          <Editor
            height="100%"
            language={getLanguage(activeFile.name)}
            value={activeFile.content}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            onChange={handleContentChange}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: 'all',
              smoothScrolling: true,
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            No active file selected
          </div>
        )}
      </div>
    </div>
  );
};
