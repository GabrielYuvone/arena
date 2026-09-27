// CLIP inspector — playback mode, in/out, speed, loop, metadata.

import { Play, SkipBack, SkipForward, Zap } from 'lucide-react';
import type { PlaybackMode } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Slider } from '../ui/Slider';
import { Button, Panel, Select, Badge, Row } from '../ui/Controls';
import { formatTime } from '../../utils/id';
import { launchClip } from '../../clips/launch';

const MODES: { value: PlaybackMode; label: string; hint: string }[] = [
  { value: 'loop', label: 'LOOP', hint: 'Repeat in→out' },
  { value: 'once', label: 'ONCE', hint: 'Play to out, stop' },
  { value: 'pingpong', label: 'PING PONG', hint: 'Forward and back' },
  { value: 'hold', label: 'HOLD', hint: 'Freeze on last frame' },
];

export function ClipInspector() {
  const clips = useProjectStore((s) => s.clips);
  const updateClip = useProjectStore((s) => s.updateClip);
  const selectedClipId = useUIStore((s) => s.selectedClipId);
  const clip = clips.find((c) => c.id === selectedClipId);

  if (!clip) {
    return (
      <Panel title="Clip" bodyClassName="p-3">
        <div className="text-2xs text-txt-low text-center py-8">
          Select a clip in the matrix
          <br />
          to edit its properties.
        </div>
      </Panel>
    );
  }

  const duration = clip.duration || 0;

  return (
    <Panel
      title="Clip"
      right={<Badge color="accent">{clip.kind ?? 'empty'}</Badge>}
      bodyClassName="p-1.5 space-y-1.5"
    >
      <Row>
        <span className="text-2xs text-txt-low w-14 shrink-0 uppercase">Name</span>
        <input
          className="flex-1 h-6 bg-surface-0 border border-line text-2xs text-txt-hi px-1.5 outline-none focus:border-accent"
          value={clip.name}
          onChange={(e) => updateClip(clip.id, { name: e.target.value })}
        />
      </Row>

      {clip.thumbnail && (
        <div className="border border-line">
          <img src={clip.thumbnail} alt="" className="w-full h-24 object-cover" />
        </div>
      )}

      <Row>
        <span className="text-2xs text-txt-low w-14 shrink-0 uppercase">Mode</span>
        <Select
          className="flex-1"
          value={clip.playbackMode}
          onChange={(e) => updateClip(clip.id, { playbackMode: e.target.value as PlaybackMode })}
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label} — {m.hint}
            </option>
          ))}
        </Select>
      </Row>

      <Row>
        <span className="text-2xs text-txt-low w-14 shrink-0 uppercase">Loop</span>
        <Button
          size="xs"
          active={clip.loop}
          onClick={() => updateClip(clip.id, { loop: !clip.loop })}
          title="Loop playback"
        >
          {clip.loop ? 'ON' : 'OFF'}
        </Button>
        <Badge>{formatTime(duration)}</Badge>
        {clip.width > 0 && (
          <Badge>
            {clip.width}×{clip.height}
          </Badge>
        )}
        {clip.fps > 0 && <Badge>{clip.fps}fps</Badge>}
      </Row>

      <div className="space-y-1 pt-1 border-t border-line">
        <div className="flex items-center justify-between">
          <span className="text-2xs text-txt-low uppercase tracking-wider">In / Out</span>
          <div className="flex gap-1">
            <Button
              size="xs"
              title="Set IN to current position"
              onClick={() => updateClip(clip.id, { inPoint: 0 })}
            >
              <SkipBack size={10} /> IN
            </Button>
            <Button
              size="xs"
              title="Set OUT to full duration"
              onClick={() => updateClip(clip.id, { outPoint: duration })}
            >
              OUT <SkipForward size={10} />
            </Button>
          </div>
        </div>
        <Slider
          label="In Point"
          value={clip.inPoint}
          min={0}
          max={Math.max(duration, 0.1)}
          step={0.01}
          defaultValue={0}
          unit="s"
          onChange={(v) => updateClip(clip.id, { inPoint: Math.min(v, clip.outPoint > 0 ? clip.outPoint - 0.05 : duration) })}
        />
        <Slider
          label="Out Point"
          value={clip.outPoint || duration}
          min={0}
          max={Math.max(duration, 0.1)}
          step={0.01}
          defaultValue={duration}
          unit="s"
          onChange={(v) => updateClip(clip.id, { outPoint: Math.max(v, clip.inPoint + 0.05) })}
        />
        <div className="flex items-center gap-1 text-2xs text-txt-low">
          <span>
            RANGE {formatTime(clip.inPoint)} → {formatTime(clip.outPoint || duration)}
          </span>
          <span className="flex-1" />
          <Button size="xs" onClick={() => updateClip(clip.id, { inPoint: 0, outPoint: duration })}>
            RESET RANGE
          </Button>
        </div>
      </div>

      <div className="pt-1 border-t border-line">
        <Slider
          label="Clip Speed"
          value={clip.speed}
          min={0}
          max={8}
          step={0.01}
          defaultValue={1}
          unit="x"
          onChange={(v) => updateClip(clip.id, { speed: v })}
        />
        <div className="flex gap-1 pt-1">
          {[0.1, 0.25, 0.5, 1, 2, 4].map((s) => (
            <Button key={s} size="xs" active={Math.abs(clip.speed - s) < 0.001} onClick={() => updateClip(clip.id, { speed: s })}>
              {s}x
            </Button>
          ))}
        </div>
      </div>

      <div className="pt-1 border-t border-line space-y-1">
        <div className="flex items-center justify-between text-2xs text-txt-low">
          <span>Shortcut</span>
          <span className="font-mono">{clip.shortcut?.toUpperCase() ?? '—'}</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Button size="sm" variant="primary" onClick={() => launchClip(clip.id)}>
            <Play size={11} /> LAUNCH
          </Button>
          <Button
            size="sm"
            onClick={() => {
              updateClip(clip.id, { speed: 1, inPoint: 0, outPoint: duration, playbackMode: 'loop' });
            }}
          >
            <Zap size={11} /> RESET
          </Button>
        </div>
      </div>

      <div className="text-2xs text-txt-low pt-1 border-t border-line">
        <Row>
          <span className="w-14 uppercase">ID</span>
          <span className="font-mono truncate">{clip.id}</span>
        </Row>
        <Row>
          <span className="w-14 uppercase">Media</span>
          <span className="font-mono truncate">{clip.mediaId ?? 'missing'}</span>
        </Row>
      </div>
    </Panel>
  );
}
