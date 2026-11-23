import React, { useState } from 'react';
import {
  Type,
  Palette,
  Maximize2,
  Box,
  Image as ImageIcon,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Sliders,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { fileApi } from '../../services/api';

export const StyleEditor: React.FC = () => {
  const {
    currentProject,
    selectedElement,
    applyStyleChange,
    applyTextChange,
    applyAttributeChange,
  } = useEditorStore();

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  if (!selectedElement) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <Sliders className="w-10 h-10 text-slate-600 mb-3" />
        <h4 className="text-sm font-semibold text-slate-300 mb-1">No Element Selected</h4>
        <p className="text-xs text-slate-500 max-w-[220px]">
          Click any element inside the website preview or DOM tree to visually inspect and edit its styles.
        </p>
      </div>
    );
  }

  const { tagName, elementId, className, textContent, styles, attributes } = selectedElement;
  const isImage = tagName.toLowerCase() === 'img';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentProject || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    try {
      setIsUploadingImage(true);
      const res = await fileApi.uploadAsset(currentProject.id, file);
      if (res && res.url) {
        await applyAttributeChange('src', res.url);
      }
    } catch (err) {
      console.error('Failed to upload image', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 space-y-6 text-xs text-slate-300">
      {/* Selected Element Header Badge */}
      <div className="p-3 rounded-lg bg-canvas-bg border border-canvas-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
            &lt;{tagName}&gt;
          </span>
          <span className="font-mono text-slate-400 truncate max-w-[140px]" title={elementId}>
            #{elementId}
          </span>
        </div>
        {className && (
          <span className="text-[10px] text-slate-500 truncate max-w-[80px]" title={className}>
            .{className.split(' ')[0]}
          </span>
        )}
      </div>

      {/* 1. Direct Text Content Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
            <Type className="w-3.5 h-3.5 text-blue-400" />
            <span>Text Content</span>
          </label>
        </div>
        <textarea
          rows={3}
          value={textContent || ''}
          onChange={(e) => applyTextChange(e.target.value)}
          placeholder="Enter text..."
          className="w-full bg-canvas-bg border border-canvas-border rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition resize-none"
        />
      </div>

      {/* 2. Image Replacement Panel (If Image Tag or has src) */}
      {isImage && (
        <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 space-y-3">
          <div className="flex items-center space-x-2 text-blue-400 font-semibold text-[11px] uppercase tracking-wider">
            <ImageIcon className="w-4 h-4" />
            <span>Image Source</span>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Image URL / Path</label>
            <input
              type="text"
              value={attributes?.src || ''}
              onChange={(e) => applyAttributeChange('src', e.target.value)}
              placeholder="https://... or /assets/..."
              className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Alt Text</label>
            <input
              type="text"
              value={attributes?.alt || ''}
              onChange={(e) => applyAttributeChange('alt', e.target.value)}
              placeholder="Descriptive alt text"
              className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label
              htmlFor="image-replace-upload"
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center space-x-2 cursor-pointer transition shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploadingImage ? 'Uploading...' : 'Upload Replacement Image'}</span>
            </label>
            <input
              id="image-replace-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* 3. Typography Controls */}
      <div className="space-y-3 pt-2 border-t border-canvas-border">
        <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
          <Type className="w-3.5 h-3.5 text-indigo-400" />
          <span>Typography</span>
        </label>

        {/* Font Size & Weight Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-[10px] text-slate-400 mb-1">Font Size</span>
            <input
              type="text"
              value={styles?.fontSize || ''}
              onChange={(e) => applyStyleChange('fontSize', e.target.value)}
              placeholder="16px, 1.25rem"
              className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 mb-1">Font Weight</span>
            <select
              value={styles?.fontWeight || '400'}
              onChange={(e) => applyStyleChange('fontWeight', e.target.value)}
              className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="300">Light (300)</option>
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semi-Bold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">Extra-Bold (800)</option>
            </select>
          </div>
        </div>

        {/* Text Alignment */}
        <div>
          <span className="block text-[10px] text-slate-400 mb-1.5">Text Align</span>
          <div className="grid grid-cols-4 gap-1 bg-canvas-bg p-1 rounded-lg border border-canvas-border">
            {[
              { val: 'left', icon: AlignLeft },
              { val: 'center', icon: AlignCenter },
              { val: 'right', icon: AlignRight },
              { val: 'justify', icon: AlignJustify },
            ].map(({ val, icon: Icon }) => (
              <button
                key={val}
                onClick={() => applyStyleChange('textAlign', val)}
                className={`py-1 rounded flex items-center justify-center transition ${
                  styles?.textAlign === val ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Text Color */}
        <div>
          <span className="block text-[10px] text-slate-400 mb-1">Text Color</span>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={styles?.color?.startsWith('#') ? styles.color : '#ffffff'}
              onChange={(e) => applyStyleChange('color', e.target.value)}
              className="w-8 h-8 rounded border border-canvas-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={styles?.color || ''}
              onChange={(e) => applyStyleChange('color', e.target.value)}
              placeholder="#ffffff or rgba(...)"
              className="flex-1 bg-canvas-bg border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
            />
          </div>
        </div>
      </div>

      {/* 4. Background & Appearance */}
      <div className="space-y-3 pt-2 border-t border-canvas-border">
        <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
          <Palette className="w-3.5 h-3.5 text-pink-400" />
          <span>Colors & Background</span>
        </label>

        <div>
          <span className="block text-[10px] text-slate-400 mb-1">Background Color</span>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={styles?.backgroundColor?.startsWith('#') ? styles.backgroundColor : '#1e293b'}
              onChange={(e) => applyStyleChange('backgroundColor', e.target.value)}
              className="w-8 h-8 rounded border border-canvas-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={styles?.backgroundColor || ''}
              onChange={(e) => applyStyleChange('backgroundColor', e.target.value)}
              placeholder="#1e293b or transparent"
              className="flex-1 bg-canvas-bg border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
            />
          </div>
        </div>
      </div>

      {/* 5. Sizing & Dimensions */}
      <div className="space-y-3 pt-2 border-t border-canvas-border">
        <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
          <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Dimensions & Layout</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-[10px] text-slate-400 mb-1">Width</span>
            <input
              type="text"
              value={styles?.width || ''}
              onChange={(e) => applyStyleChange('width', e.target.value)}
              placeholder="auto, 100%, 300px"
              className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 mb-1">Height</span>
            <input
              type="text"
              value={styles?.height || ''}
              onChange={(e) => applyStyleChange('height', e.target.value)}
              placeholder="auto, 150px"
              className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        <div>
          <span className="block text-[10px] text-slate-400 mb-1">Display</span>
          <select
            value={styles?.display || 'block'}
            onChange={(e) => applyStyleChange('display', e.target.value)}
            className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="block">block</option>
            <option value="flex">flex</option>
            <option value="grid">grid</option>
            <option value="inline-block">inline-block</option>
            <option value="inline">inline</option>
            <option value="none">none</option>
          </select>
        </div>
      </div>

      {/* 6. Spacing (Margin & Padding) */}
      <div className="space-y-3 pt-2 border-t border-canvas-border">
        <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
          <Box className="w-3.5 h-3.5 text-amber-400" />
          <span>Spacing (Margin & Padding)</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-[10px] text-slate-400 mb-1">Margin</span>
            <input
              type="text"
              value={styles?.margin || ''}
              onChange={(e) => applyStyleChange('margin', e.target.value)}
              placeholder="e.g. 1rem 0 or 16px"
              className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 mb-1">Padding</span>
            <input
              type="text"
              value={styles?.padding || ''}
              onChange={(e) => applyStyleChange('padding', e.target.value)}
              placeholder="e.g. 0.75rem 1.5rem"
              className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>
      </div>

      {/* 7. Borders & Corners */}
      <div className="space-y-3 pt-2 border-t border-canvas-border pb-6">
        <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
          <Box className="w-3.5 h-3.5 text-cyan-400" />
          <span>Border & Radius</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-[10px] text-slate-400 mb-1">Border Radius</span>
            <input
              type="text"
              value={styles?.borderRadius || ''}
              onChange={(e) => applyStyleChange('borderRadius', e.target.value)}
              placeholder="8px, 0.5rem, 9999px"
              className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 mb-1">Border</span>
            <input
              type="text"
              value={styles?.border || ''}
              onChange={(e) => applyStyleChange('border', e.target.value)}
              placeholder="1px solid #334155"
              className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
