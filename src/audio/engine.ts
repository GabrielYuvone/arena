// AudioEngine: Web Audio analysis (volume/bass/mid/treble) from:
// - audio associated with video clips
// - standalone audio files
// - system audio (when the browser supports it)

import { telemetry } from '../store/telemetry';
import { mediaEngine } from '../canvas/media';
import { clamp } from '../utils/id';

export class AudioEngine {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private fileElement: HTMLAudioElement | null = null;
  private fileSource: MediaElementAudioSourceNode | null = null;
  private systemStream: MediaStream | null = null;
  private systemSource: MediaStreamAudioSourceNode | null = null;
  private videoGains = new Map<HTMLMediaElement, GainNode>();
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private timeData: Uint8Array<ArrayBuffer> | null = null;
  private smoothed = { volume: 0, bass: 0, mid: 0, treble: 0 };

  ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.timeData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    telemetry.audioRunning = this.ctx.state === 'running';
    return this.ctx;
  }

  setVolume(v: number): void {
    if (!this.masterGain) return;
    this.masterGain.gain.value = clamp(v, 0, 1);
  }

  /** Route an active video element through the analyser (idempotent). */
  connectVideo(element: HTMLMediaElement): void {
    const ctx = this.ensure();
    if (this.videoGains.has(element)) return;
    const src = mediaEngine.captureAudio(element, ctx);
    if (!src) {
      // already captured previously — try to ignore
      return;
    }
    const gain = ctx.createGain();
    gain.gain.value = 1;
    src.connect(gain);
    gain.connect(this.analyser!);
    this.videoGains.set(element, gain);
  }

  /** Load and analyze a standalone audio file. */
  async loadFile(file: File): Promise<string> {
    const ctx = this.ensure();
    this.disconnectFile();
    const url = URL.createObjectURL(file);
    const el = new Audio();
    el.src = url;
    el.loop = true;
    el.crossOrigin = 'anonymous';
    await el.play().catch(() => undefined);
    try {
      this.fileSource = ctx.createMediaElementSource(el);
      this.fileSource.connect(this.analyser!);
    } catch {
      /* already captured */
    }
    this.fileElement = el;
    return file.name;
  }

  disconnectFile(): void {
    if (this.fileElement) {
      this.fileElement.pause();
      this.fileElement.removeAttribute('src');
      this.fileElement = null;
    }
    if (this.fileSource) {
      try {
        this.fileSource.disconnect();
      } catch {
        /* */
      }
      this.fileSource = null;
    }
  }

  /** Capture system audio via getDisplayMedia (Chrome/Edge). */
  async startSystemCapture(): Promise<boolean> {
    try {
      const ctx = this.ensure();
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      // keep video track alive silently? stop video to save resources
      stream.getVideoTracks().forEach((t) => t.stop());
      this.stopSystemCapture();
      this.systemStream = stream;
      this.systemSource = ctx.createMediaStreamSource(stream);
      this.systemSource.connect(this.analyser!);
      return true;
    } catch {
      return false;
    }
  }

  stopSystemCapture(): void {
    if (this.systemSource) {
      try {
        this.systemSource.disconnect();
      } catch {
        /* */
      }
      this.systemSource = null;
    }
    if (this.systemStream) {
      this.systemStream.getTracks().forEach((t) => t.stop());
      this.systemStream = null;
    }
  }

  /** Compute normalized levels (0..1) with light smoothing. */
  sample(): { volume: number; bass: number; mid: number; treble: number } {
    if (!this.analyser || !this.freqData || !this.timeData) return this.smoothed;
    const analyser = this.analyser;
    analyser.getByteFrequencyData(this.freqData);
    analyser.getByteTimeDomainData(this.timeData);

    // volume: RMS of time domain
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const v = (this.timeData[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.timeData.length);
    const volume = clamp(rms * 3, 0, 1);

    const bins = this.freqData.length;
    const avgRange = (from: number, to: number) => {
      let s = 0;
      let n = 0;
      for (let i = Math.floor(from * bins); i < Math.floor(to * bins); i++) {
        s += this.freqData![i];
        n++;
      }
      return n ? s / n / 255 : 0;
    };

    const bass = clamp(avgRange(0, 0.08) * 1.6, 0, 1);
    const mid = clamp(avgRange(0.08, 0.35) * 1.9, 0, 1);
    const treble = clamp(avgRange(0.35, 1) * 2.4, 0, 1);

    // smoothing for UI + modulation
    const k = 0.25;
    this.smoothed.volume += (volume - this.smoothed.volume) * k;
    this.smoothed.bass += (bass - this.smoothed.bass) * k;
    this.smoothed.mid += (mid - this.smoothed.mid) * k;
    this.smoothed.treble += (treble - this.smoothed.treble) * k;

    telemetry.levels = { ...this.smoothed };
    telemetry.audioRunning = this.ctx?.state === 'running';
    return this.smoothed;
  }

  dispose(): void {
    this.disconnectFile();
    this.stopSystemCapture();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.analyser = null;
  }
}

export const audioEngine = new AudioEngine();
