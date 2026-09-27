// TRANSFORM panel — position/scale/rotation/anchor + RESET/CENTER/FIT/FILL.

import { useProjectStore, DEFAULT_TRANSFORM } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Slider } from '../ui/Slider';
import { Button, Panel, Badge } from '../ui/Controls';
import { useState } from 'react';
import { Link, Unlink } from 'lucide-react';

export function TransformPanel() {
  const layers = useProjectStore((s) => s.layers);
  const selectedLayerId = useUIStore((s) => s.selectedLayerId);
  const setLayerTransform = useProjectStore((s) => s.setLayerTransform);
  const [lockAspect, setLockAspect] = useState(true);
  const layer = layers.find((l) => l.id === selectedLayerId) ?? layers[layers.length - 1];

  if (!layer) return null;
  const t = layer.transform;

  const setScale = (axis: 'x' | 'y', v: number) => {
    if (lockAspect) setLayerTransform(layer.id, { scaleX: v, scaleY: v });
    else setLayerTransform(layer.id, axis === 'x' ? { scaleX: v } : { scaleY: v });
  };

  return (
    <Panel
      title="Transform"
      right={<Badge color="accent">{layer.name}</Badge>}
      bodyClassName="p-1.5 space-y-1.5"
    >
      <Slider label="Position X" value={t.x} min={-1} max={1} step={0.005} defaultValue={0} onChange={(v) => setLayerTransform(layer.id, { x: v })} />
      <Slider label="Position Y" value={t.y} min={-1} max={1} step={0.005} defaultValue={0} onChange={(v) => setLayerTransform(layer.id, { y: v })} />

      <div className="flex items-center justify-between pt-1">
        <span className="text-2xs text-txt-low uppercase tracking-wider">Scale</span>
        <button
          className={`flex items-center gap-1 text-2xs ${lockAspect ? 'text-accent' : 'text-txt-low'}`}
          onClick={() => setLockAspect(!lockAspect)}
          title="Lock aspect ratio"
        >
          {lockAspect ? <Link size={11} /> : <Unlink size={11} />}
          {lockAspect ? 'LOCKED' : 'FREE'}
        </button>
      </div>
      <Slider label="Scale X" value={t.scaleX} min={0} max={3} step={0.01} defaultValue={1} onChange={(v) => setScale('x', v)} />
      <Slider label="Scale Y" value={t.scaleY} min={0} max={3} step={0.01} defaultValue={1} onChange={(v) => setScale('y', v)} />
      <Slider label="Rotation" value={t.rotation} min={-180} max={180} step={1} defaultValue={0} unit="°" precision={1} onChange={(v) => setLayerTransform(layer.id, { rotation: v })} />
      <Slider label="Anchor X" value={t.anchorX} min={0} max={1} step={0.01} defaultValue={0.5} onChange={(v) => setLayerTransform(layer.id, { anchorX: v })} />
      <Slider label="Anchor Y" value={t.anchorY} min={0} max={1} step={0.01} defaultValue={0.5} onChange={(v) => setLayerTransform(layer.id, { anchorY: v })} />

      <div className="grid grid-cols-4 gap-1 pt-1">
        <Button size="sm" onClick={() => setLayerTransform(layer.id, { ...DEFAULT_TRANSFORM })}>
          RESET
        </Button>
        <Button
          size="sm"
          onClick={() => setLayerTransform(layer.id, { x: 0, y: 0 })}
          title="Center position"
        >
          CENTER
        </Button>
        <Button
          size="sm"
          onClick={() => setLayerTransform(layer.id, { scaleX: 1, scaleY: 1, x: 0, y: 0, rotation: 0 })}
          title="Fit inside output"
        >
          FIT
        </Button>
        <Button
          size="sm"
          onClick={() => setLayerTransform(layer.id, { scaleX: 1.5, scaleY: 1.5, x: 0, y: 0, rotation: 0 })}
          title="Fill output (overscan)"
        >
          FILL
        </Button>
      </div>
    </Panel>
  );
}

export function LayerControls() {
  const layers = useProjectStore((s) => s.layers);
  const selectedLayerId = useUIStore((s) => s.selectedLayerId);
  const setLayerParam = useProjectStore((s) => s.setLayerParam);
  const layer = layers.find((l) => l.id === selectedLayerId) ?? layers[layers.length - 1];
  if (!layer) return null;
  const p = layer.params;

  return (
    <Panel title="Layer Controls" right={<Badge>{layer.name}</Badge>} bodyClassName="p-1.5 space-y-1.5">
      <Slider label="Opacity" value={layer.opacity} min={0} max={1} step={0.01} defaultValue={1} onChange={(v) => setLayerParam(layer.id, 'opacity', v)} />
      <Slider label="Brightness" value={p.brightness} min={0} max={2} step={0.01} defaultValue={1} onChange={(v) => setLayerParam(layer.id, 'brightness', v)} />
      <Slider label="Contrast" value={p.contrast} min={0} max={2} step={0.01} defaultValue={1} onChange={(v) => setLayerParam(layer.id, 'contrast', v)} />
      <Slider label="Saturation" value={p.saturation} min={0} max={2} step={0.01} defaultValue={1} onChange={(v) => setLayerParam(layer.id, 'saturation', v)} />
      <Slider label="Hue" value={p.hue} min={-180} max={180} step={1} defaultValue={0} unit="°" precision={1} onChange={(v) => setLayerParam(layer.id, 'hue', v)} />
      <Slider label="Speed" value={p.speed} min={0} max={4} step={0.01} defaultValue={1} unit="x" onChange={(v) => setLayerParam(layer.id, 'speed', v)} />
      <Slider label="Blur" value={p.blur} min={0} max={1} step={0.01} defaultValue={0} onChange={(v) => setLayerParam(layer.id, 'blur', v)} />
      <Slider label="Scale" value={layer.transform.scaleX} min={0} max={3} step={0.01} defaultValue={1} onChange={(v) => setLayerParam(layer.id, 'scale', v)} />
      <Slider label="Rotation" value={layer.transform.rotation} min={-180} max={180} step={1} defaultValue={0} unit="°" precision={1} onChange={(v) => setLayerParam(layer.id, 'rotation', v)} />
      <Slider label="Position X" value={layer.transform.x} min={-1} max={1} step={0.005} defaultValue={0} onChange={(v) => setLayerParam(layer.id, 'x', v)} />
      <Slider label="Position Y" value={layer.transform.y} min={-1} max={1} step={0.005} defaultValue={0} onChange={(v) => setLayerParam(layer.id, 'y', v)} />
    </Panel>
  );
}
