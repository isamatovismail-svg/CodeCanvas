import React from 'react';
import { Sliders, Sparkles } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { StyleEditor } from '../properties/StyleEditor';
import { AIAssistant } from '../ai-assistant/AIAssistant';

export const RightSidebar: React.FC = () => {
  const { activeRightTab, setActiveRightTab } = useEditorStore();

  return (
    <aside className="w-80 h-full border-l border-canvas-border bg-canvas-panel flex flex-col select-none">
      {/* Tab Switcher Header */}
      <div className="flex items-center border-b border-canvas-border bg-canvas-bg h-10 px-2 space-x-1">
        <button
          onClick={() => setActiveRightTab('styles')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded text-xs font-medium transition ${
            activeRightTab === 'styles'
              ? 'bg-canvas-panel text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Properties</span>
        </button>

        <button
          onClick={() => setActiveRightTab('ai')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded text-xs font-medium transition ${
            activeRightTab === 'ai'
              ? 'bg-canvas-panel text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Assistant</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeRightTab === 'styles' ? <StyleEditor /> : <AIAssistant />}
      </div>
    </aside>
  );
};
