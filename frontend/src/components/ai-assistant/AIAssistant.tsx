import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle,
  Layers,
  Wand2,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { aiApi } from '../../services/api';
import { AIOperation } from '../../types';

export const AIAssistant: React.FC = () => {
  const {
    currentProject,
    selectedElement,
    applyStyleChange,
    applyTextChange,
    refreshPreview,
    addConsoleLog,
  } = useEditorStore();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [operations, setOperations] = useState<AIOperation[]>([]);
  const [provider, setProvider] = useState<string | null>(null);

  const quickPrompts = [
    'Change the header background to blue',
    'Make this button bigger with rounded corners',
    'Make the layout mobile-friendly',
    'Add modern glowing accent shadow',
  ];

  const handleRunAI = async (promptText: string) => {
    if (!currentProject || !promptText.trim()) return;

    try {
      setLoading(true);
      setResultMessage(null);
      setOperations([]);

      const res = await aiApi.edit(currentProject.id, {
        prompt: promptText.trim(),
        selected_element_id: selectedElement?.elementId,
        selected_element_tag: selectedElement?.tagName,
        selected_element_classes: selectedElement?.className,
      });

      setResultMessage(res.message);
      setOperations(res.operations);
      setProvider(res.provider);

      // Apply the generated structured operations immediately
      for (const op of res.operations) {
        if (op.op_type === 'update_style' && op.styles) {
          for (const [prop, val] of Object.entries(op.styles)) {
            await applyStyleChange(prop, val);
          }
        } else if (op.op_type === 'update_text' && op.text_content) {
          await applyTextChange(op.text_content);
        }
      }

      refreshPreview();

      addConsoleLog({
        level: 'info',
        message: `AI Assistant: Executed ${res.operations.length} structured operations (${res.provider}).`,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error('AI assistant error', err);
      setResultMessage(err?.response?.data?.detail || 'Failed to process AI request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
      {/* AI Header Card */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-blue-950/20 border border-indigo-800/40">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm mb-1.5">
          <Sparkles className="w-4 h-4" />
          <span>AI Design Assistant</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Executes precise, structured visual editing operations without rewriting or corrupting your
          original code architecture.
        </p>
      </div>

      {/* Target Element Context Indicator */}
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-canvas-bg border border-canvas-border">
        <Layers className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-[11px] text-slate-400">Context:</span>
        {selectedElement ? (
          <span className="font-mono text-blue-400 font-semibold text-[11px]">
            &lt;{selectedElement.tagName} #{selectedElement.elementId}&gt;
          </span>
        ) : (
          <span className="text-slate-400 font-medium text-[11px]">Active Website Document</span>
        )}
      </div>

      {/* Prompt Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRunAI(prompt);
        }}
        className="space-y-2.5"
      >
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your design change (e.g. 'Change header background to blue')..."
          className="w-full bg-canvas-bg border border-canvas-border rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition resize-none placeholder-slate-500"
        />

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
        >
          {loading ? (
            <Wand2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>{loading ? 'Generating Operations...' : 'Execute AI Edit'}</span>
        </button>
      </form>

      {/* Quick Prompt Suggestions */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
          Suggested Prompts
        </span>
        <div className="flex flex-col space-y-1.5">
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => {
                setPrompt(q);
                handleRunAI(q);
              }}
              className="text-left px-2.5 py-1.5 rounded-lg bg-canvas-bg hover:bg-canvas-hover border border-canvas-border text-[11px] text-slate-300 hover:text-white transition flex items-center justify-between group"
            >
              <span>{q}</span>
              <Sparkles className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition" />
            </button>
          ))}
        </div>
      </div>

      {/* Result & Structured Operations Display */}
      {resultMessage && (
        <div className="p-3 rounded-lg bg-canvas-bg border border-canvas-border space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-white flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Result</span>
            </span>
            {provider && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {provider}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-300">{resultMessage}</p>

          {operations.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-canvas-border">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Applied Operations
              </span>
              {operations.map((op, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-canvas-panel border border-canvas-border font-mono text-[10px] text-slate-300"
                >
                  <div className="text-blue-400 font-semibold">{op.op_type}</div>
                  {op.explanation && <div className="text-slate-400">{op.explanation}</div>}
                  {op.styles && (
                    <div className="text-emerald-400 mt-1">
                      {JSON.stringify(op.styles, null, 2)}
                    </div>
                  )}
                  {op.text_content && (
                    <div className="text-amber-400 mt-1">Text: "{op.text_content}"</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
