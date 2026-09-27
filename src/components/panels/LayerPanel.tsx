// LAYERS panel — vertical stack (top layer first), visibility/lock/solo/blend/opacity.

import {
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Headphones,
} from 'lucide-react';
import { BLEND_MODES, type BlendMode } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Select } from '../ui/Controls';

export function LayerPanel() {
  const layers = useProjectStore((s) => s.layers);
  const addLayer = useProjectStore((s) => s.addLayer);
  const updateLayer = useProjectStore((s) => s.updateLayer);
  const removeLayer = useProjectStore((s) => s.removeLayer);
  const duplicateLayer = useProjectStore((s) => s.duplicateLayer);
  const moveLayer = useProjectStore((s) => s.moveLayer);
  const setBlendMode = useProjectStore((s) => s.setBlendMode);
  const clips = useProjectStore((s) => s.clips);
  const selectedLayerId = useUIStore((s) => s.selectedLayerId);
  const selectLayer = useUIStore((s) => s.selectLayer);

  const display = [...layers].reverse(); // top layer first

  return (
    <div className="flex flex-col h-full bg-surface-2 border border-line">
      <header className="flex items-center justify-between h-6 px-2 bg-surface-3 border-b border-line shrink-0">
        <h2 className="text-2xs font-semibold tracking-[0.14em] text-txt-mid uppercase">Layers</h2>
        <button
          className="text-txt-low hover:text-accent"
          title="Add layer"
          onClick={addLayer}
        >
          <Plus size={13} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        {display.map((layer) => {
          const realIndex = layers.findIndex((l) => l.id === layer.id);
          const clip = layer.activeClipId ? clips.find((c) => c.id === layer.activeClipId) : null;
          const selected = selectedLayerId === layer.id;
          return (
            <div
              key={layer.id}
              className={`border-b border-line cursor-pointer ${
                selected ? 'bg-accent/10 border-l-2 border-l-accent' : 'border-l-2 border-l-transparent hover:bg-surface-3'
              }`}
              onClick={() => selectLayer(layer.id)}
            >
              <div className="flex items-center gap-1 px-1.5 py-1">
                <button
                  className="w-4 h-4 flex items-center justify-center text-txt-low hover:text-txt-hi"
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layer.id, { visible: !layer.visible });
                  }}
                >
                  {layer.visible ? <Eye size={11} /> : <EyeOff size={11} className="text-txt-low/50" />}
                </button>
                <button
                  className="w-4 h-4 flex items-center justify-center text-txt-low hover:text-txt-hi"
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layer.id, { locked: !layer.locked });
                  }}
                >
                  {layer.locked ? <Lock size={11} className="text-amber-400" /> : <LockOpen size={11} />}
                </button>
                <button
                  className={`w-4 h-4 flex items-center justify-center hover:text-accent ${
                    layer.solo ? 'text-accent' : 'text-txt-low'
                  }`}
                  title="Solo"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layer.id, { solo: !layer.solo });
                  }}
                >
                  <Headphones size={11} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-2xs text-txt-hi truncate leading-tight">{layer.name}</div>
                  <div className="text-2xs text-txt-low truncate leading-tight">
                    {clip ? clip.name : '— no clip —'}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    className="w-4 h-4 flex items-center justify-center text-txt-low hover:text-txt-hi"
                    title="Move up"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer.id, 1);
                    }}
                  >
                    <ChevronUp size={11} />
                  </button>
                  <button
                    className="w-4 h-4 flex items-center justify-center text-txt-low hover:text-txt-hi"
                    title="Move down"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer.id, -1);
                    }}
                  >
                    <ChevronDown size={11} />
                  </button>
                  <button
                    className="w-4 h-4 flex items-center justify-center text-txt-low hover:text-accent"
                    title="Duplicate layer"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateLayer(layer.id);
                    }}
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    className="w-4 h-4 flex items-center justify-center text-txt-low hover:text-red-400 disabled:opacity-30"
                    title="Delete layer"
                    disabled={layers.length <= 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLayer(layer.id);
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1 px-1.5 pb-1">
                <Select
                  value={layer.blendMode}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setBlendMode(layer.id, e.target.value as BlendMode)}
                  className="w-[86px]"
                  title="Blend mode"
                >
                  {BLEND_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
                <div
                  className="flex-1 h-3 bg-surface-0 border border-line relative cursor-ew-resize"
                  title={`Opacity ${(layer.opacity * 100).toFixed(0)}%`}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const el = e.currentTarget as HTMLElement;
                    const rect = el.getBoundingClientRect();
                    const set = (cx: number) => {
                      const v = Math.min(1, Math.max(0, (cx - rect.left) / rect.width));
                      useProjectStore.getState().updateLayer(layer.id, { opacity: v });
                    };
                    set(e.clientX);
                    const move = (ev: PointerEvent) => set(ev.clientX);
                    const up = () => {
                      window.removeEventListener('pointermove', move);
                      window.removeEventListener('pointerup', up);
                    };
                    window.addEventListener('pointermove', move);
                    window.addEventListener('pointerup', up);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    useProjectStore.getState().updateLayer(layer.id, { opacity: 1 });
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-accent/70"
                    style={{ width: `${layer.opacity * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-2xs font-mono text-txt-hi mix-blend-difference">
                    {(layer.opacity * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between px-1.5 pb-1 text-2xs text-txt-low font-mono">
                <span>{realIndex === 0 ? 'BOTTOM' : `L${realIndex + 1}`}</span>
                <span>
                  {layer.effects.length > 0 ? `${layer.effects.length} fx` : ''}
                  {layer.locked ? ' · locked' : ''}
                  {layer.solo ? ' · solo' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
