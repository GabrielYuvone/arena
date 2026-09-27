// MIDI panel — devices, MIDI LEARN, mapping list.

import { useEffect, useState } from 'react';
import { Radio, Trash2, Crosshair, Usb } from 'lucide-react';
import type { MidiMapping, TargetRef, LayerParamKey } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { midiEngine } from '../../midi/engine';
import { telemetry } from '../../store/telemetry';
import { useTelemetryTick } from '../../hooks/useTelemetry';
import { LAYER_PARAM_LABELS, targetLabel } from '../../utils/params';
import { Button, Panel, Select, Badge } from '../ui/Controls';
import { TargetPicker } from './AudioPanel';
import { launchClip } from '../../clips/launch';
import { uid } from '../../utils/id';

export function MidiPanel() {
  const mappings = useProjectStore((s) => s.midiMappings);
  const addMidiMapping = useProjectStore((s) => s.addMidiMapping);
  const removeMidiMapping = useProjectStore((s) => s.removeMidiMapping);
  const layers = useProjectStore((s) => s.layers);
  const clips = useProjectStore((s) => s.clips);
  const showToast = useUIStore((s) => s.showToast);
  const [learnTarget, setLearnTarget] = useState<TargetRef | null>(null);
  const [learning, setLearning] = useState(false);
  const [init, setInit] = useState(false);
  useTelemetryTick(150);

  useEffect(() => {
    if (!init) {
      setInit(true);
      void midiEngine.init().then((ok) => {
        if (ok) telemetry.notify();
      });
    }
  }, [init]);

  // note triggers → clip launches
  useEffect(() => {
    return midiEngine.onMessage((e) => {
      if (e.kind !== 'noteon') return;
      const st = useProjectStore.getState();
      for (const m of st.midiMappings) {
        if (m.type !== 'note') continue;
        if (m.number !== e.number) continue;
        if (m.channel >= 0 && m.channel !== e.channel) continue;
        const target = m.target;
        if (target.kind === 'clip') {
          launchClip(target.clipId);
        }
      }
    });
  }, []);

  const defaultTarget: TargetRef = learnTarget ??
    (layers.length > 0
      ? { kind: 'layer', layerId: layers[layers.length - 1].id, param: 'opacity' as LayerParamKey }
      : { kind: 'master', param: 'opacity' });

  const startLearn = () => {
    const target = defaultTarget;
    setLearnTarget(target);
    setLearning(true);
    midiEngine.startLearn(target, (partial, _label) => {
      const mapping: MidiMapping = {
        ...partial,
        id: uid('midi'),
        label: targetLabel(partial.target, {
          layerName: (id) => layers.find((l) => l.id === id)?.name ?? id.slice(0, 4),
        }),
      };
      addMidiMapping(mapping);
      setLearning(false);
      setLearnTarget(null);
      showToast(
        `Mapped ${partial.type === 'cc' ? `CC${partial.number}` : `Note${partial.number}`} → ${mapping.label}`,
      );
    });
  };

  return (
    <Panel title="MIDI" bodyClassName="p-1.5 space-y-2">
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 px-2 h-7 border text-2xs font-mono ${
            midiEngine.devices.some((d) => d.state === 'connected')
              ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300'
              : 'border-line bg-surface-3 text-txt-low'
          }`}
        >
          <Radio size={11} />
          {midiEngine.devices.some((d) => d.state === 'connected') ? 'MIDI CONNECTED' : 'NO MIDI DEVICE'}
        </div>
        <Button
          size="sm"
          onClick={() => void midiEngine.init().then(() => midiEngine.refreshDevices())}
          title="Re-scan MIDI devices"
        >
          <Usb size={11} /> SCAN
        </Button>
      </div>

      <div className="space-y-0.5">
        {midiEngine.devices.length === 0 && (
          <div className="text-2xs text-txt-low">No input devices detected.</div>
        )}
        {midiEngine.devices.map((d) => (
          <div key={d.id} className="flex items-center gap-1.5 text-2xs text-txt-mid bg-surface-0 border border-line px-1.5 py-1">
            <span className={`w-1.5 h-1.5 rounded-full ${d.state === 'connected' ? 'bg-emerald-400' : 'bg-txt-low'}`} />
            <span className="flex-1 truncate">{d.name}</span>
            <Badge>{d.manufacturer || 'generic'}</Badge>
          </div>
        ))}
      </div>

      <div className="border border-line bg-surface-3 p-1.5 space-y-1.5">
        <div className="text-2xs uppercase tracking-wider text-txt-mid flex items-center gap-1">
          <Crosshair size={11} /> MIDI Learn
        </div>
        <TargetPicker
          target={defaultTarget}
          onChange={(t) => {
            setLearnTarget(t);
            if (learning) {
              midiEngine.cancelLearn();
              setLearning(false);
            }
          }}
        />
        <Button
          size="sm"
          variant={learning ? 'danger' : 'primary'}
          className="w-full"
          onClick={() => {
            if (learning) {
              midiEngine.cancelLearn();
              setLearning(false);
            } else {
              startLearn();
            }
          }}
        >
          {learning ? 'MOVE A MIDI CONTROL… (cancel)' : 'START MIDI LEARN'}
        </Button>
      </div>

      <div className="space-y-1">
        <div className="text-2xs uppercase tracking-wider text-txt-mid">Mappings ({mappings.length})</div>
        {mappings.length === 0 && (
          <div className="text-2xs text-txt-low border border-dashed border-line p-2 text-center">
            No mappings yet. Use MIDI LEARN.
          </div>
        )}
        {mappings.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5 bg-surface-3 border border-line px-1.5 py-1">
            <Badge color="accent">
              {m.type === 'cc' ? `CC ${m.number}` : `N ${m.number}`}
            </Badge>
            <span className="flex-1 text-2xs text-txt-mid truncate">
              {targetLabel(m.target, {
                layerName: (id) => layers.find((l) => l.id === id)?.name ?? id.slice(0, 4),
                clipName: (id) => clips.find((c) => c.id === id)?.name ?? id.slice(0, 4),
              })}
            </span>
            <button
              className="text-txt-low hover:text-red-400"
              title="Delete mapping"
              onClick={() => removeMidiMapping(m.id)}
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      <div className="text-2xs text-txt-low">
        <Select
          className="w-full"
          value=""
          onChange={(e) => {
            if (!e.target.value) return;
            const [type, num] = e.target.value.split(':');
            const layer = layers[layers.length - 1];
            if (!layer) return;
            addMidiMapping({
              id: uid('midi'),
              type: type as 'cc' | 'note',
              channel: -1,
              number: Number(num),
              target:
                type === 'note'
                  ? { kind: 'clip', clipId: clips[0]?.id ?? '' }
                  : { kind: 'layer', layerId: layer.id, param: 'opacity' },
              label: 'Quick map',
            });
            e.target.value = '';
          }}
          title="Quick-add common mappings"
        >
          <option value="">+ Quick mapping…</option>
          <option value="cc:1">CC 1 → Layer 1 Opacity</option>
          <option value="cc:2">CC 2 → Layer 1 Speed</option>
          <option value="cc:3">CC 3 → Layer 1 Scale</option>
          <option value="cc:7">CC 7 → Master Opacity</option>
          <option value="note:36">Note 36 → Clip 1</option>
        </Select>
        <div className="pt-1">
          Layer params: {Object.keys(LAYER_PARAM_LABELS).length} available for mapping.
        </div>
      </div>
    </Panel>
  );
}
