// AUDIO panel — source, visualizer, levels + AUDIO MODULATION (source → target).

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Activity } from 'lucide-react';
import type { AudioModulation, AudioSourceKind, ModSource, TargetRef, LayerParamKey } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { audioEngine } from '../../audio/engine';
import { telemetry } from '../../store/telemetry';
import { useTelemetryTick } from '../../hooks/useTelemetry';
import { LAYER_PARAM_LABELS, targetLabel } from '../../utils/params';
import { Slider } from '../ui/Slider';
import { Button, Panel, Select, Badge, Divider } from '../ui/Controls';
import { uid } from '../../utils/id';

export function AudioPanel() {
  const [source, setSource] = useState<AudioSourceKind>('off');
  const [fileName, setFileName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useTelemetryTick(80);

  // visualizer
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0a0a0b';
      ctx.fillRect(0, 0, w, h);
      const levels = telemetry.levels;
      const bars = [
        { label: 'VOL', v: levels.volume, color: '#22d3ee' },
        { label: 'BASS', v: levels.bass, color: '#f472b6' },
        { label: 'MID', v: levels.mid, color: '#a78bfa' },
        { label: 'TRE', v: levels.treble, color: '#34d399' },
      ];
      const bw = w / bars.length;
      bars.forEach((b, i) => {
        const bh = b.v * (h - 14);
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(i * bw + 4, h - 12 - bh, bw - 8, bh);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#63636b';
        ctx.font = '9px monospace';
        ctx.fillText(b.label, i * bw + 4, h - 2);
      });
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pickFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      audioEngine.ensure();
      const name = await audioEngine.loadFile(f);
      setFileName(name);
      setSource('file');
    };
    input.click();
  };

  return (
    <Panel title="Audio" bodyClassName="p-1.5 space-y-2">
      <div className="flex items-center gap-1">
        <Select
          className="flex-1"
          value={source}
          onChange={(e) => {
            const v = e.target.value as AudioSourceKind;
            setSource(v);
            if (v === 'file') void pickFile();
            if (v === 'system') {
              audioEngine.ensure();
              void audioEngine.startSystemCapture().then((ok) => {
                if (!ok) useUIStore.getState().showToast('System audio not available');
              });
            }
            if (v === 'off') {
              audioEngine.disconnectFile();
              audioEngine.stopSystemCapture();
            }
          }}
          title="Audio analysis source"
        >
          <option value="off">OFF</option>
          <option value="video">VIDEO AUDIO</option>
          <option value="file">AUDIO FILE</option>
          <option value="system">SYSTEM AUDIO</option>
        </Select>
        <Button size="sm" onClick={() => void pickFile()} title="Load audio file">
          FILE…
        </Button>
      </div>
      {fileName && <Badge color="accent">♪ {fileName}</Badge>}
      {source === 'system' && <Badge color="amber">System capture active</Badge>}

      <canvas ref={canvasRef} width={280} height={56} className="w-full border border-line bg-surface-0" />

      <div className="grid grid-cols-4 gap-1 text-center">
        {(['volume', 'bass', 'mid', 'treble'] as const).map((k) => (
          <div key={k} className="bg-surface-0 border border-line py-1">
            <div className="text-2xs text-txt-low uppercase">{k}</div>
            <div className="text-xs font-mono text-accent">
              {(telemetry.levels[k] * 100).toFixed(0)}
            </div>
          </div>
        ))}
      </div>

      <Divider label="Audio Modulation" />
      <AudioModList />
    </Panel>
  );
}

function AudioModList() {
  const mods = useProjectStore((s) => s.audioModulations);
  const addAudioMod = useProjectStore((s) => s.addAudioMod);
  const updateAudioMod = useProjectStore((s) => s.updateAudioMod);
  const removeAudioMod = useProjectStore((s) => s.removeAudioMod);
  const layers = useProjectStore((s) => s.layers);
  const clips = useProjectStore((s) => s.clips);

  const add = () => {
    const layer = layers[layers.length - 1];
    if (!layer) return;
    const mod: AudioModulation = {
      id: uid('mod'),
      source: 'bass',
      target: { kind: 'layer', layerId: layer.id, param: 'scale' },
      amount: 0.35,
      smoothing: 0.2,
      enabled: true,
    };
    addAudioMod(mod);
  };

  return (
    <div className="space-y-1.5">
      <Button size="sm" variant="primary" className="w-full" onClick={add}>
        <Plus size={12} /> ADD MODULATION
      </Button>
      {mods.length === 0 && (
        <div className="text-2xs text-txt-low text-center py-3 border border-dashed border-line">
          Bass → Scale · Treble → Rotation …
        </div>
      )}
      {mods.map((mod) => (
        <div key={mod.id} className={`border ${mod.enabled ? 'border-line bg-surface-3' : 'border-line/50 bg-surface-2 opacity-70'}`}>
          <div className="flex items-center gap-1 px-1.5 h-6 border-b border-line/60">
            <button
              className={`text-txt-low hover:text-accent ${mod.enabled ? 'text-accent' : ''}`}
              title="Enable/disable modulation"
              onClick={() => updateAudioMod(mod.id, { enabled: !mod.enabled })}
            >
              <Activity size={11} />
            </button>
            <span className="flex-1 text-2xs text-txt-mid truncate">
              {mod.source.toUpperCase()} →{' '}
              {targetLabel(mod.target, {
                layerName: (id) => layers.find((l) => l.id === id)?.name ?? id.slice(0, 4),
                clipName: (id) => clips.find((c) => c.id === id)?.name ?? id.slice(0, 4),
              })}
            </span>
            <button
              className="text-txt-low hover:text-red-400"
              title="Remove modulation"
              onClick={() => removeAudioMod(mod.id)}
            >
              <Trash2 size={11} />
            </button>
          </div>
          <div className="p-1.5 space-y-1.5">
            <div className="flex items-center gap-1">
              <span className="text-2xs text-txt-low w-12">SRC</span>
              <Select
                className="flex-1"
                value={mod.source}
                onChange={(e) => updateAudioMod(mod.id, { source: e.target.value as ModSource })}
              >
                <option value="volume">Volume</option>
                <option value="bass">Bass</option>
                <option value="mid">Mid</option>
                <option value="treble">Treble</option>
              </Select>
            </div>
            <TargetPicker
              target={mod.target}
              onChange={(t) => updateAudioMod(mod.id, { target: t })}
            />
            <Slider
              label="Amount"
              value={mod.amount}
              min={-1}
              max={1}
              step={0.01}
              defaultValue={0.35}
              onChange={(v) => updateAudioMod(mod.id, { amount: v })}
            />
            <Slider
              label="Smoothing"
              value={mod.smoothing}
              min={0}
              max={0.99}
              step={0.01}
              defaultValue={0.2}
              onChange={(v) => updateAudioMod(mod.id, { smoothing: v })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TargetPicker({
  target,
  onChange,
}: {
  target: TargetRef;
  onChange: (t: TargetRef) => void;
}) {
  const layers = useProjectStore((s) => s.layers);
  const layerParams = Object.entries(LAYER_PARAM_LABELS) as [LayerParamKey, string][];

  const kind = target.kind;
  const layerId = target.kind === 'layer' || target.kind === 'effect' ? target.layerId : layers[layers.length - 1]?.id ?? '';
  const param = target.kind === 'layer' ? target.param : 'opacity';

  return (
    <div className="flex items-center gap-1">
      <span className="text-2xs text-txt-low w-12">TGT</span>
      <Select
        className="flex-1"
        value={kind === 'layer' ? `${layerId}|${param}` : kind === 'master' ? `master|${target.param}` : 'layer'}
        onChange={(e) => {
          const [a, b] = e.target.value.split('|');
          if (a === 'master') {
            onChange({ kind: 'master', param: (b === 'brightness' ? 'brightness' : b === 'feedback' ? 'feedback' : 'opacity') });
          } else {
            onChange({ kind: 'layer', layerId: a, param: b as LayerParamKey });
          }
        }}
      >
        {layers.map((l) =>
          layerParams.map(([key, label]) => (
            <option key={`${l.id}|${key}`} value={`${l.id}|${key}`}>
              {l.name} · {label}
            </option>
          )),
        )}
        <option value="master|opacity">Master · Opacity</option>
        <option value="master|brightness">Master · Brightness</option>
      </Select>
    </div>
  );
}
