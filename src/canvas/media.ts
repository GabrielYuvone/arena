// MediaEngine: owns media blobs, object URLs and per-clip media elements.

import type { Clip, MediaMeta } from '../types';
import { uid } from '../utils/id';

type ClipSource = HTMLVideoElement | HTMLImageElement;

class MediaEngine {
  private blobs = new Map<string, Blob>();
  private urls = new Map<string, string>();
  private clipSources = new Map<string, ClipSource>();
  private audioCaptured = new Set<HTMLMediaElement>();

  setBlob(mediaId: string, blob: Blob): void {
    this.blobs.set(mediaId, blob);
  }

  getBlob(mediaId: string): Blob | undefined {
    return this.blobs.get(mediaId);
  }

  getUrl(mediaId: string): string | null {
    const existing = this.urls.get(mediaId);
    if (existing) return existing;
    const blob = this.blobs.get(mediaId);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    this.urls.set(mediaId, url);
    return url;
  }

  /** Element used as texture source for a clip (created on demand). */
  getClipSource(clip: Clip): ClipSource | null {
    if (!clip.mediaId || !clip.kind) return null;
    let source = this.clipSources.get(clip.id);
    if (source) {
      if (source instanceof HTMLVideoElement) {
        if (!source.src) {
          const url = this.getUrl(clip.mediaId);
          if (url) {
            source.src = url;
            source.load();
          }
        }
      } else if (!source.src) {
        const url = this.getUrl(clip.mediaId);
        if (url) source.src = url;
      }
      return source;
    }
    const url = this.getUrl(clip.mediaId);
    if (!url) return null;

    if (clip.kind === 'video' || clip.kind === 'audio') {
      const video = document.createElement('video');
      video.src = url;
      video.muted = false;
      video.volume = 1;
      video.loop = false;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      source = video;
    } else {
      const img = new Image();
      img.src = url;
      source = img;
    }
    this.clipSources.set(clip.id, source);
    return source;
  }

  /** Ensure a media element's audio is routed through Web Audio (once). */
  captureAudio(element: HTMLMediaElement, ctx: AudioContext): MediaElementAudioSourceNode | null {
    if (this.audioCaptured.has(element)) return null;
    try {
      const src = ctx.createMediaElementSource(element);
      this.audioCaptured.add(element);
      return src;
    } catch {
      return null;
    }
  }

  isAudioCaptured(element: HTMLMediaElement): boolean {
    return this.audioCaptured.has(element);
  }

  releaseClip(clipId: string): void {
    const source = this.clipSources.get(clipId);
    if (source instanceof HTMLVideoElement) {
      source.pause();
      source.removeAttribute('src');
      source.load();
    }
    this.clipSources.delete(clipId);
  }

  releaseMedia(mediaId: string): void {
    const url = this.urls.get(mediaId);
    if (url) {
      URL.revokeObjectURL(url);
      this.urls.delete(mediaId);
    }
    this.blobs.delete(mediaId);
  }

  clearAll(): void {
    this.clipSources.forEach((_, id) => this.releaseClip(id));
    this.urls.forEach((url) => URL.revokeObjectURL(url));
    this.urls.clear();
    this.blobs.clear();
    this.clipSources.clear();
  }

  hasBlob(mediaId: string): boolean {
    return this.blobs.has(mediaId);
  }

  /** Register blobs from a loaded project. */
  restoreBlobs(entries: [string, Blob][]): void {
    entries.forEach(([id, blob]) => this.blobs.set(id, blob));
  }

  allBlobs(): [string, Blob][] {
    return Array.from(this.blobs.entries());
  }
}

export const mediaEngine = new MediaEngine();

// ---------- media import + probing ----------

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|mkv)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|avif)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|flac|aac|m4a)$/i;

export function kindForFile(file: File): 'video' | 'image' | 'audio' | null {
  if (file.type.startsWith('video/') || VIDEO_EXT.test(file.name)) return 'video';
  if (file.type.startsWith('image/') || IMAGE_EXT.test(file.name)) return 'image';
  if (file.type.startsWith('audio/') || AUDIO_EXT.test(file.name)) return 'audio';
  return null;
}

/** Probe a media file and return metadata + thumbnail (first non-black frame). */
export async function probeMedia(
  file: File,
  onProgress?: (p: number) => void,
): Promise<{ meta: MediaMeta; blob: Blob }> {
  const kind = kindForFile(file);
  if (!kind) throw new Error(`Unsupported file: ${file.name}`);
  const id = uid('media');
  onProgress?.(0.1);

  if (kind === 'image') {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const thumbnail = drawThumb(img, img.naturalWidth, img.naturalHeight);
      onProgress?.(1);
      return {
        meta: {
          id,
          name: file.name.replace(/\.[^.]+$/, ''),
          kind,
          mimeType: file.type || 'image/*',
          size: file.size,
          duration: 0,
          width: img.naturalWidth,
          height: img.naturalHeight,
          fps: 0,
          thumbnail,
          createdAt: Date.now(),
          fileName: file.name,
        },
        blob: file,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (kind === 'audio') {
    onProgress?.(1);
    return {
      meta: {
        id,
        name: file.name.replace(/\.[^.]+$/, ''),
        kind,
        mimeType: file.type || 'audio/*',
        size: file.size,
        duration: 0,
        width: 0,
        height: 0,
        fps: 0,
        thumbnail: null,
        createdAt: Date.now(),
        fileName: file.name,
      },
      blob: file,
    };
  }

  // video: seek across a few positions, pick brightest frame as thumbnail
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    await once(video, 'loadedmetadata');
    onProgress?.(0.35);
    const duration = isFinite(video.duration) ? video.duration : 0;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const candidates = duration > 0 ? [0.1, 0.25, 0.45, 0.7] : [0];
    let best: string | null = null;
    let bestScore = -1;
    for (let i = 0; i < candidates.length; i++) {
      const t = duration * candidates[i];
      try {
        await seekVideo(video, t);
        const { dataUrl, score } = drawThumbWithScore(video, width, height);
        if (score > bestScore) {
          bestScore = score;
          best = dataUrl;
        }
        if (score > 28) break; // good enough (non-black)
      } catch {
        // ignore seek failures
      }
      onProgress?.(0.35 + (0.6 * (i + 1)) / candidates.length);
    }
    onProgress?.(1);
    return {
      meta: {
        id,
        name: file.name.replace(/\.[^.]+$/, ''),
        kind,
        mimeType: file.type || 'video/*',
        size: file.size,
        duration,
        width,
        height,
        fps: 30,
        thumbnail: best,
        createdAt: Date.now(),
        fileName: file.name,
      },
      blob: file,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

function once(el: HTMLMediaElement, event: string): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      el.removeEventListener(event, handler);
      resolve();
    };
    el.addEventListener(event, handler);
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      reject(new Error('seek failed'));
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = Math.max(0, time);
  });
}

function drawThumbWithScore(
  source: HTMLVideoElement | HTMLImageElement,
  w: number,
  h: number,
): { dataUrl: string; score: number } {
  const canvas = document.createElement('canvas');
  const tw = 160;
  const th = Math.max(2, Math.round((tw * (h || 9)) / (w || 16)));
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', score: 0 };
  ctx.drawImage(source, 0, 0, tw, th);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
  // brightness score from a tiny sample
  const sample = ctx.getImageData(0, 0, tw, th).data;
  let sum = 0;
  const pixels = sample.length / 4;
  for (let i = 0; i < sample.length; i += 16) {
    sum += sample[i] + sample[i + 1] + sample[i + 2];
  }
  const score = sum / (pixels / 4) / 3;
  return { dataUrl, score };
}

function drawThumb(source: HTMLVideoElement | HTMLImageElement, w: number, h: number): string {
  return drawThumbWithScore(source, w, h).dataUrl;
}
