// VisualEngine: owns the WebGL renderer, texture cache, output presentation
// and canvas recording (MediaRecorder → WebM).

import { Renderer } from './renderer';
import type { Clip } from '../types';
import { mediaEngine } from './media';
import { telemetry } from '../store/telemetry';

export class VisualEngine {
  renderer: Renderer | null = null;
  glCanvas: HTMLCanvasElement | null = null;
  outputCanvas: HTMLCanvasElement | null = null;
  cueCanvas: HTMLCanvasElement | null = null;
  private outputWin: Window | null = null;
  private outputWinCanvas: HTMLCanvasElement | null = null;
  private outputWinTimer: number | null = null;

  private textures = new Map<string, WebGLTexture>();
  private texturesVersion = new Map<string, number>();

  private recorder: MediaRecorder | null = null;
  private recordChunks: Blob[] = [];
  recordStart = 0;

  init(canvas: HTMLCanvasElement, width: number, height: number): void {
    this.glCanvas = canvas;
    this.renderer = new Renderer(canvas, width, height);
    this.textures.clear();
    this.texturesVersion.clear();
  }

  setSize(width: number, height: number): void {
    this.renderer?.setSize(width, height);
  }

  /** Get (and lazily create) the texture for a clip, uploading the current frame. */
  getTexture(clip: Clip): WebGLTexture | null {
    if (!this.renderer || !clip.mediaId || !clip.kind || clip.kind === 'audio') return null;
    const source = mediaEngine.getClipSource(clip);
    if (!source) return null;

    let tex = this.textures.get(clip.id);
    if (!tex) {
      tex = this.renderer.createTexture();
      this.textures.set(clip.id, tex);
    }

    if (source instanceof HTMLVideoElement) {
      if (source.readyState < 2) return tex;
      try {
        this.renderer.updateTexture(tex, source);
      } catch {
        /* not ready */
      }
    } else if (source.complete && source.naturalWidth > 0) {
      try {
        this.renderer.updateTexture(tex, source);
      } catch {
        /* */
      }
    }
    return tex;
  }

  releaseClip(clipId: string): void {
    const tex = this.textures.get(clipId);
    if (tex && this.renderer) {
      this.renderer.core.gl.deleteTexture(tex);
      this.textures.delete(clipId);
    }
    mediaEngine.releaseClip(clipId);
  }

  reset(): void {
    if (this.renderer) {
      this.textures.forEach((tex) => this.renderer!.core.gl.deleteTexture(tex));
    }
    this.textures.clear();
  }

  // ---------- output presentation ----------

  attachOutputCanvas(canvas: HTMLCanvasElement | null): void {
    this.outputCanvas = canvas;
  }

  attachCueCanvas(canvas: HTMLCanvasElement | null): void {
    this.cueCanvas = canvas;
  }

  present(): void {
    if (!this.glCanvas) return;
    const src = this.glCanvas;
    if (this.outputCanvas) {
      const ctx = this.outputCanvas.getContext('2d');
      if (ctx) {
        if (
          this.outputCanvas.width !== src.width ||
          this.outputCanvas.height !== src.height
        ) {
          this.outputCanvas.width = src.width;
          this.outputCanvas.height = src.height;
        }
        ctx.drawImage(src, 0, 0);
      }
    }
    if (this.outputWinCanvas && this.outputWin && !this.outputWin.closed) {
      const ctx = this.outputWinCanvas.getContext('2d');
      if (ctx) {
        if (
          this.outputWinCanvas.width !== src.width ||
          this.outputWinCanvas.height !== src.height
        ) {
          this.outputWinCanvas.width = src.width;
          this.outputWinCanvas.height = src.height;
        }
        ctx.drawImage(src, 0, 0);
      }
    }
  }

  openOutputWindow(): boolean {
    if (this.outputWin && !this.outputWin.closed) return true;
    const win = window.open('', 'vj-studio-output', 'width=960,height=540');
    if (!win) return false;
    win.document.title = 'VJ Studio — OUTPUT';
    win.document.body.style.margin = '0';
    win.document.body.style.background = '#000';
    win.document.body.style.overflow = 'hidden';
    const canvas = win.document.createElement('canvas');
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.objectFit = 'contain';
    canvas.style.display = 'block';
    win.document.body.appendChild(canvas);
    this.outputWin = win;
    this.outputWinCanvas = canvas;
    // double-click output window → fullscreen
    canvas.addEventListener('dblclick', () => {
      try {
        if (this.outputWinCanvas?.ownerDocument.fullscreenElement) {
          void this.outputWinCanvas.ownerDocument.exitFullscreen();
        } else {
          void canvas.requestFullscreen().catch(() => undefined);
        }
      } catch {
        /* */
      }
    });
    // keep trying to refresh when the window closes
    if (this.outputWinTimer) window.clearInterval(this.outputWinTimer);
    this.outputWinTimer = window.setInterval(() => {
      if (!this.outputWin || this.outputWin.closed) {
        this.closeOutputWindow();
      }
    }, 1000);
    return true;
  }

  closeOutputWindow(): void {
    if (this.outputWinTimer) {
      window.clearInterval(this.outputWinTimer);
      this.outputWinTimer = null;
    }
    if (this.outputWin && !this.outputWin.closed) this.outputWin.close();
    this.outputWin = null;
    this.outputWinCanvas = null;
  }

  isOutputWindowOpen(): boolean {
    return !!this.outputWin && !this.outputWin.closed;
  }

  // ---------- recording ----------

  startRecording(fps: number): boolean {
    if (this.recorder || !this.glCanvas) return false;
    try {
      const stream = this.glCanvas.captureStream(fps || 60);
      const mimeCandidates = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      this.recordChunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordChunks.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || 'video/webm';
        const blob = new Blob(this.recordChunks, { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `vj-recording-${stamp}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
        this.recordChunks = [];
      };
      recorder.start(250);
      this.recorder = recorder;
      this.recordStart = Date.now();
      telemetry.recording = true;
      return true;
    } catch {
      return false;
    }
  }

  stopRecording(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    this.recorder = null;
    telemetry.recording = false;
  }

  isRecording(): boolean {
    return !!this.recorder;
  }
}

export const visualEngine = new VisualEngine();
