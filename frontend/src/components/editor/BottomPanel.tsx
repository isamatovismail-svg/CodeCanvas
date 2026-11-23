import React from 'react';
import {
  Terminal,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  ChevronUp,
  ChevronDown,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const BottomPanel: React.FC = () => {
  const {
    showConsole,
    toggleConsole,
    consoleLogs,
    clearConsoleLogs,
    wsStatus,
    collaborators,
  } = useEditorStore();

  const errorCount = consoleLogs.filter((l) => l.level === 'error').length;

  return (
    <div
      className={`border-t border-canvas-border bg-canvas-panel flex flex-col transition-all duration-200 ${
        showConsole ? 'h-48' : 'h-8'
      }`}
    >
      {/* Drawer Header Bar */}
      <div
        onClick={toggleConsole}
        className="h-8 px-4 flex items-center justify-between bg-canvas-bg/90 cursor-pointer hover:bg-canvas-bg transition select-none text-xs"
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-medium text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>Developer Console & Errors</span>
          </div>

          {errorCount > 0 && (
            <span className="flex items-center space-x-1 px-1.5 py-0.2 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">
              <AlertCircle className="w-2.5 h-2.5" />
              <span>{errorCount}</span>
            </span>
          )}

          <span className="text-[10px] text-slate-500">
            ({consoleLogs.length} events)
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* WebSocket Presence Status Pill */}
          <div className="flex items-center space-x-1.5 text-[11px]">
            {wsStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="text-slate-400">
              {wsStatus === 'connected'
                ? `Realtime Active (${collaborators.length} online)`
                : 'Connecting...'}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              clearConsoleLogs();
            }}
            title="Clear Console"
            className="p-1 hover:text-white text-slate-400 transition"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          {showConsole ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Console Log Content Area */}
      {showConsole && (
        <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1 bg-[#050811]">
          {consoleLogs.length === 0 ? (
            <div className="text-slate-500 italic px-2 py-3">
              Console is clean. Runtime errors and iframe logs will display here.
            </div>
          ) : (
            consoleLogs.map((log) => {
              const time = new Date(log.timestamp).toLocaleTimeString();
              let icon = <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
              let textColor = 'text-slate-300';
              let bgColor = 'hover:bg-slate-800/40';

              if (log.level === 'warn') {
                icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
                textColor = 'text-amber-300';
                bgColor = 'bg-amber-950/20';
              } else if (log.level === 'error') {
                icon = <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
                textColor = 'text-red-300';
                bgColor = 'bg-red-950/20';
              }

              return (
                <div
                  key={log.id}
                  className={`flex items-start space-x-2 px-2 py-1 rounded ${bgColor} ${textColor}`}
                >
                  <span className="text-[10px] text-slate-500 flex-shrink-0">{time}</span>
                  {icon}
                  <div className="flex-1 break-all">
                    <span>{log.message}</span>
                    {log.filename && (
                      <span className="text-[10px] text-slate-500 ml-2">
                        ({log.filename}:{log.lineno})
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
