import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { RefreshCw, AlertTriangle, Monitor, Tablet, Smartphone } from 'lucide-react';

interface LivePreviewProps {
  onCursorMove?: (x: number, y: number) => void;
  onElementSelect?: (elementId: string) => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  onCursorMove,
  onElementSelect,
}) => {
  const {
    currentProject,
    viewportSize,
    previewKey,
    setSelectedElement,
    setDomTree,
    addConsoleLog,
    applyTextChange,
    liveCursors,
  } = useEditorStore();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate container max-width for responsive device modes
  const getViewportWidth = () => {
    switch (viewportSize) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      case 'desktop':
      default:
        return '100%';
    }
  };

  // Preview URL with previewKey for forced cache-busting refresh
  const previewUrl = currentProject
    ? `/api/v1/projects/${currentProject.id}/preview?v=${previewKey}`
    : '';

  useEffect(() => {
    setIsLoading(true);
  }, [previewKey, currentProject?.id]);

  // Handle messages from the injected CodeCanvas Bridge inside preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'codecanvas-preview') return;

      switch (data.type) {
        case 'preview-ready':
          setIsLoading(false);
          // Request initial DOM hierarchy tree
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              { target: 'codecanvas-preview', type: 'get-dom-tree' },
              '*'
            );
          }
          break;

        case 'element-selected':
          setSelectedElement(data.payload);
          if (onElementSelect && data.payload?.elementId) {
            onElementSelect(data.payload.elementId);
          }
          break;

        case 'text-edited':
          if (data.payload?.elementId && data.payload?.newText !== undefined) {
            applyTextChange(data.payload.newText);
          }
          break;

        case 'dom-tree-response':
          if (data.payload?.tree) {
            setDomTree(data.payload.tree);
          }
          break;

        case 'console-log':
          addConsoleLog({
            level: data.payload.level || 'info',
            message: data.payload.message || '',
            timestamp: data.payload.timestamp || Date.now(),
          });
          break;

        case 'runtime-error':
          addConsoleLog({
            level: 'error',
            message: `Runtime Error: ${data.payload.message}`,
            timestamp: data.payload.timestamp || Date.now(),
            filename: data.payload.filename,
            lineno: data.payload.lineno,
          });
          break;

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setSelectedElement, setDomTree, addConsoleLog, applyTextChange, onElementSelect]);

  // Track cursor movement over preview area for real-time collaboration
  const handleMouseMove = (e: React.MouseEvent) => {
    if (onCursorMove && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      onCursorMove(x, y);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative flex-1 h-full bg-[#060911] flex items-center justify-center p-4 overflow-hidden select-none"
    >
      {/* Device frame container */}
      <div
        className="relative h-full flex flex-col items-center justify-center transition-all duration-300 ease-in-out shadow-2xl rounded-xl border border-canvas-border bg-black overflow-hidden"
        style={{
          width: getViewportWidth(),
          maxWidth: '100%',
        }}
      >
        {/* Responsive status pill in corner */}
        <div className="absolute top-2 right-2 z-10 flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur border border-canvas-border text-[10px] text-slate-400">
          {viewportSize === 'mobile' && <Smartphone className="w-3 h-3 text-blue-400" />}
          {viewportSize === 'tablet' && <Tablet className="w-3 h-3 text-blue-400" />}
          {viewportSize === 'desktop' && <Monitor className="w-3 h-3 text-blue-400" />}
          <span>{viewportSize.toUpperCase()}</span>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-canvas-bg/60 backdrop-blur-sm flex items-center justify-center space-x-2 text-sm text-slate-300">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Rendering live preview...</span>
          </div>
        )}

        {/* Sandboxed iframe */}
        {previewUrl ? (
          <iframe
            id="codecanvas-preview-iframe"
            ref={iframeRef}
            src={previewUrl}
            title="CodeCanvas Live Preview"
            sandbox="allow-scripts allow-modals allow-same-origin"
            className="w-full h-full border-none bg-white"
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 text-sm">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p>No project loaded</p>
          </div>
        )}

        {/* Collaborators' Live Cursors Rendered Over Preview */}
        {Object.entries(liveCursors).map(([uid, cursor]) => (
          <div
            key={uid}
            className="absolute pointer-events-none transition-all duration-75 z-20"
            style={{
              left: `${cursor.x}px`,
              top: `${cursor.y}px`,
            }}
          >
            {/* SVG Cursor Pointer */}
            <svg
              className="w-4 h-4 drop-shadow-md"
              viewBox="0 0 24 24"
              fill={cursor.userColor}
              stroke="white"
              strokeWidth="1.5"
            >
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" />
            </svg>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded shadow text-white whitespace-nowrap"
              style={{ backgroundColor: cursor.userColor }}
            >
              {cursor.userName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
