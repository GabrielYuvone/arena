// EFFECTS panel — effect chain for selected layer (or master chain).

import { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Power,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import type { EffectInstance, EffectType } from '../../types';
import { EFFECT_DEFS, getEffectDef } from '../../effects/registry';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Slider } from '../ui/Slider';
import { Button, Select, Panel } from '../ui/Controls';

export function EffectsPanel() {
  const layers = useProjectStore((s) => s.layers);
  const masterEffects = useProjectStore((s) => s.masterEffects);
  const selectedLayerId = useUIStore((s) => s.selectedLayerId);
  const [scope, setScope] = useState<'layer' | 'master'>('layer');

  const layer = layers.find((l) => l.id === selectedLayerId) ?? layers[layers.length - 1];
  const isMaster = scope === 'master';
  const effects = isMaster ? masterEffects : layer?.effects ?? [];
  const targetId = isMaster ? null : layer?.id ?? null;

  return (
    <Panel
      title="Effects"
      right={
        <div className="flex items-center gap-1">
          <Select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'layer' | 'master')}
            className="h-5 text-2xs"
          >
            <option value="layer">{layer ? layer.name : 'Layer'}</option>
            <option value="master">MASTER</option>
          </Select>
        </div>
      }
      bodyClassName="p-1.5 space-y-1.5"
    >
      <AddEffectControl layerId={targetId} />
      {effects.length === 0 && (
        <div className="text-2xs text-txt-low text-center py-6 border border-dashed border-line">
          <Sparkles size={16} className="mx-auto mb-1 opacity-40" />
          No effects in chain.
          <br />
          Add one above — order matters.
        </div>
      )}
      {effects.map((fx, index) => (
        <EffectCard
          key={fx.id}
          fx={fx}
          index={index}
          count={effects.length}
          layerId={targetId}
        />
      ))}
    </Panel>
  );
}

function AddEffectControl({ layerId }: { layerId: string | null }) {
  const addEffect = useProjectStore((s) => s.addEffect);
  const [type, setType] = useState<string>('brightness');
  const categories = Array.from(new Set(EFFECT_DEFS.map((d) => d.category)));

  return (
    <div className="flex items-center gap-1">
      <Select value={type} onChange={(e) => setType(e.target.value)} className="flex-1">
        {categories.map((cat) => (
          <optgroup key={cat} label={cat.toUpperCase()}>
            {EFFECT_DEFS.filter((d) => d.category === cat).map((d) => (
              <option key={d.type} value={d.type}>
                {d.name}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      <Button
        size="sm"
        variant="primary"
        onClick={() => addEffect(layerId, type as EffectType)}
        title="Add effect to chain"
      >
        <Plus size={12} /> ADD
      </Button>
    </div>
  );
}

function EffectCard({
  fx,
  index,
  count,
  layerId,
}: {
  fx: EffectInstance;
  index: number;
  count: number;
  layerId: string | null;
}) {
  const updateEffect = useProjectStore((s) => s.updateEffect);
  const setEffectParam = useProjectStore((s) => s.setEffectParam);
  const removeEffect = useProjectStore((s) => s.removeEffect);
  const moveEffect = useProjectStore((s) => s.moveEffect);
  const def = getEffectDef(fx.type);

  return (
    <div
      className={`border ${
        fx.enabled && !fx.bypass ? 'border-line bg-surface-3' : 'border-line/60 bg-surface-2 opacity-70'
      }`}
    >
      <div className="flex items-center gap-1 px-1.5 h-7 border-b border-line/70">
        <span className="w-4 text-2xs font-mono text-txt-low">{index + 1}</span>
        <button
          className="text-txt-low hover:text-accent"
          title={fx.enabled ? 'Disable effect' : 'Enable effect'}
          onClick={() => updateEffect(layerId, fx.id, { enabled: !fx.enabled })}
        >
          {fx.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button
          className={`text-txt-low hover:text-amber-300 ${fx.bypass ? 'text-amber-400' : ''}`}
          title="Bypass (render skipped, settings kept)"
          onClick={() => updateEffect(layerId, fx.id, { bypass: !fx.bypass })}
        >
          <Power size={12} />
        </button>
        <span className="flex-1 text-2xs text-txt-hi truncate">{def?.name ?? fx.type}</span>
        <button
          className="text-txt-low hover:text-txt-hi disabled:opacity-20"
          disabled={index === 0}
          title="Move up"
          onClick={() => moveEffect(layerId, fx.id, -1)}
        >
          <ChevronUp size={12} />
        </button>
        <button
          className="text-txt-low hover:text-txt-hi disabled:opacity-20"
          disabled={index === count - 1}
          title="Move down"
          onClick={() => moveEffect(layerId, fx.id, 1)}
        >
          <ChevronDown size={12} />
        </button>
        <button
          className="text-txt-low hover:text-red-400"
          title="Remove effect"
          onClick={() => removeEffect(layerId, fx.id)}
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="p-1.5 space-y-1.5">
        {def?.params.map((p) => (
          <Slider
            key={p.key}
            label={p.label}
            value={fx.params[p.key] ?? p.default}
            min={p.min}
            max={p.max}
            step={p.step}
            defaultValue={p.default}
            precision={p.step >= 1 ? 0 : 2}
            onChange={(v) => setEffectParam(layerId, fx.id, p.key, v)}
          />
        ))}
      </div>
    </div>
  );
}
