// TRANSPORT bar: play/pause/stop/restart, reverse, BPM + tap, quantize, record, perf mode.

import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Repeat,
  Circle,
  Zap,
  Timer,
  SlidersHorizontal,
  Radio,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { usePlaybackStore } from '../../store/playbackStore';
import { useUIStore } from '../../store/uiStore';
import { useTelemetryTick } from '../../hooks/useTelemetry';
import { telemetry } from '../../store/telemetry';
import { bpmClock } from '../../utils/bpm';
import { QUANTIZE_OPTIONS, type Quantization } from '../../types';
import { restartAll, stopAllLayers } from '../../clips/launch';
import { visualEngine } from '../../canvas/engine';
import { Button, Select } from '../ui/Controls';
import { audioEngine } from '../../audio/engine';

export function TransportBar() {
  const transport = usePlaybackStore((s) => s.transport);
  const reverse = usePlaybackStore((s) => s.reverse);
  const record = usePlaybackStore((s) => s.record);
  const recordTime = usePlaybackStore((s) => s.recordTime);
  const bpm = useProjectStore((s) => s.bpm);
  const quantization = useProjectStore((s) => s.quantization);
  const setBpm = useProjectStore((s) => s.setBpm);
  const setQuantization = useProjectStore((s) => s.setQuantization);
  const performanceMode = useUIStore((s) => s.performanceMode);
  const setPerformanceMode = useUIStore((s) => s.setPerformanceMode);
  const togglePlay = usePlaybackStore((s) => s.togglePlay);
  const setReverse = usePlaybackStore((s) => s.setReverse);
  const setRecord = usePlaybackStore((s) => s.setRecord);
  const showToast = useUIStore((s) => s.showToast);

  useTelemetryTick(100);
  const beatPhase = telemetry.beatPhase;

  const tap = () => {
    const v = bpmClock.tap();
    setBpm(Math.round(v * 10) / 10);
    audioEngine.ensure();
  };

  const toggleRecord = () => {
    if (visualEngine.isRecording()) {
      visualEngine.stopRecording();
      setRecord(false);
      showToast('Recording saved (WebM)');
    } else {
      audioEngine.ensure();
      const ok = visualEngine.startRecording(useProjectStore.getState().fps);
      setRecord(ok);
      if (!ok) showToast('Recording could not start');
    }
  };

  return (
    <div className="flex items-center gap-2 h-11 px-2 bg-surface-2 border border-line shrink-0">
      {/* transport */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="md" title="Restart clips (F5)" onClick={restartAll}>
          <RotateCcw size={14} />
        </Button>
        <button
          className={`w-10 h-9 flex items-center justify-center border transition-colors ${
            transport === 'playing'
              ? 'bg-accent text-surface-0 border-accent'
              : 'bg-surface-3 text-txt-hi border-line hover:border-accent/60'
          }`}
          title="Play / Pause (Space)"
          onClick={() => {
            togglePlay();
            audioEngine.ensure();
          }}
        >
          {transport === 'playing' ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <Button
          variant="ghost"
          size="md"
          title="Stop all clips (Esc)"
          onClick={() => {
            stopAllLayers();
            usePlaybackStore.getState().stop();
          }}
        >
          <Square size={13} />
        </Button>
        <Button
          variant="ghost"
          size="md"
          active={reverse}
          title="Reverse playback"
          onClick={() => setReverse(!reverse)}
        >
          <Repeat size={13} className={reverse ? 'scale-x-[-1]' : ''} />
        </Button>
      </div>

      <div className="w-px h-7 bg-line" />

      {/* BPM */}
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col items-center leading-none">
          <span className="text-2xs text-txt-low tracking-wider">BPM</span>
          <input
            className="w-14 bg-surface-0 border border-line text-accent text-sm font-mono text-center outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            type="number"
            min={20}
            max={300}
            value={bpm}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) {
                bpmClock.setBpm(v);
                setBpm(v);
              }
            }}
            title="BPM value"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <Button size="xs" onClick={tap} title="Tap tempo">
            <Zap size={10} /> TAP
          </Button>
          <Button
            size="xs"
            onClick={() => {
              bpmClock.syncAnchor();
              bpmClock.restart();
              showToast('Synced to beat 1');
            }}
            title="Restart beat clock"
          >
            <Timer size={10} /> SYNC
          </Button>
        </div>
        {/* beat indicator */}
        <div className="flex items-end gap-0.5 h-8">
          {[0, 1, 2, 3].map((b) => {
            const beatIdx = telemetry.beatCount % 4;
            const active = beatIdx === b;
            return (
              <div
                key={b}
                className={`w-1.5 transition-all ${active ? 'bg-accent' : 'bg-surface-5'}`}
                style={{ height: active ? '100%' : '35%' }}
              />
            );
          })}
          <div className="w-8 h-8 ml-1 border border-line relative overflow-hidden">
            <div
              className="absolute bottom-0 inset-x-0 bg-accent/50"
              style={{ height: `${beatPhase * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="w-px h-7 bg-line" />

      {/* quantization */}
      <div className="flex items-center gap-1">
        <span className="text-2xs text-txt-low uppercase tracking-wider">Quant</span>
        <Select
          value={quantization}
          onChange={(e) => setQuantization(e.target.value as Quantization)}
          title="Clip launch quantization"
          className="w-[80px]"
        >
          {QUANTIZE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex-1" />

      {/* audio + midi quick status */}
      <div className="flex items-center gap-1.5 text-2xs font-mono">
        <span className={`flex items-center gap-1 ${telemetry.audioRunning ? 'text-emerald-400' : 'text-txt-low'}`}>
          <Radio size={10} /> AUD
        </span>
        <span
          className={`flex items-center gap-1 ${
            Date.now() - telemetry.midiActivity < 1500 ? 'text-accent' : telemetry.midiDeviceName ? 'text-txt-mid' : 'text-txt-low'
          }`}
        >
          <SlidersHorizontal size={10} /> MIDI
        </span>
      </div>

      <div className="w-px h-7 bg-line" />

      {/* record */}
      <button
        className={`flex items-center gap-1.5 h-8 px-3 border font-mono text-2xs ${
          record
            ? 'bg-red-600 text-white border-red-500 animate-pulse'
            : 'bg-surface-3 text-red-300 border-line hover:border-red-500'
        }`}
        title="Record output (WebM)"
        onClick={toggleRecord}
      >
        <Circle size={11} fill="currentColor" />
        REC {record ? formatRecTime(recordTime) : ''}
      </button>

      {/* performance mode */}
      <Button
        variant={performanceMode ? 'accent' : 'default'}
        size="md"
        onClick={() => setPerformanceMode(!performanceMode)}
        title="Performance mode (P)"
      >
        PERF
      </Button>
    </div>
  );
}

function formatRecTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Small BPM + FPS readout used in performance mode header. */
export function PerfStatus() {
  useTelemetryTick(200);
  return (
    <div className="flex items-center gap-3 text-2xs font-mono text-txt-mid">
      <span>
        BPM <span className="text-accent">{useProjectStore.getState().bpm}</span>
      </span>
      <span>
        FPS <span className="text-accent">{telemetry.fps.toFixed(0)}</span>
      </span>
      <span>
        AUD{' '}
        <span className="text-accent">
          {(telemetry.levels.volume * 100).toFixed(0)}%
        </span>
      </span>
      <span>
        MIDI{' '}
        <span className="text-accent">{telemetry.midiDeviceName ? 'ON' : 'OFF'}</span>
      </span>
    </div>
  );
}
