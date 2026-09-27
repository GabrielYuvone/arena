// Media import flow: probe files, generate thumbnails, attach to clips, save blobs.

import type { Clip, MediaMeta } from '../types';
import { mediaEngine, probeMedia } from '../canvas/media';
import { useProjectStore, clipKeyFor, createClip } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { saveBlobDirect } from '../project/db';

export async function importFiles(files: FileList | File[], targetClipId?: string): Promise<void> {
  const list = Array.from(files).filter((f) => f instanceof File);
  if (list.length === 0) return;
  const ui = useUIStore.getState();

  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    ui.setLoadProgress({
      active: true,
      label: `Importing ${file.name}`,
      value: i / list.length,
    });
    try {
      const { meta, blob } = await probeMedia(file, (p) => {
        ui.setLoadProgress({
          active: true,
          label: `Analyzing ${file.name}`,
          value: (i + p) / list.length,
        });
      });
      mediaEngine.setBlob(meta.id, blob);
      useProjectStore.getState().addMedia(meta);
      void saveBlobDirect(meta.id, useProjectStore.getState().id, blob, meta.fileName).catch(
        () => undefined,
      );

      // attach to target clip or first compatible empty slot
      if (targetClipId) {
        attachToClip(targetClipId, meta);
        targetClipId = undefined; // further files go to empty slots
      } else {
        attachToFreeSlot(meta);
      }
    } catch (err) {
      console.error(err);
      ui.showToast(`Failed: ${file.name}`);
    }
  }
  ui.setLoadProgress({ active: false, label: '', value: 0 });
}

function attachToClip(clipId: string, meta: MediaMeta): void {
  const st = useProjectStore.getState();
  st.updateClip(clipId, {
    mediaId: meta.id,
    kind: meta.kind,
    name: meta.name,
    duration: meta.duration,
    fps: meta.fps || 30,
    width: meta.width,
    height: meta.height,
    thumbnail: meta.thumbnail,
    inPoint: 0,
    outPoint: meta.duration || 0,
  });
}

function attachToFreeSlot(meta: MediaMeta): void {
  const st = useProjectStore.getState();
  // occupied slots
  const occupied = new Set(st.clips.map((c) => `${c.column}:${c.row}`));
  let target: Clip | null = null;
  for (let col = 0; col < st.columns; col++) {
    for (let row = 0; row < st.rows; row++) {
      if (!occupied.has(`${col}:${row}`)) {
        target = createClip(col, row, meta.name);
        break;
      }
    }
    if (target) break;
  }
  if (!target) {
    // replace the first clip without media
    const empty = st.clips.find((c) => !c.mediaId);
    if (empty) {
      attachToClip(empty.id, meta);
      return;
    }
    useUIStore.getState().showToast('Clip matrix full — drop files onto a clip to replace');
    return;
  }
  const clip: Clip = {
    ...target,
    mediaId: meta.id,
    kind: meta.kind,
    name: meta.name,
    duration: meta.duration,
    fps: meta.fps || 30,
    width: meta.width,
    height: meta.height,
    thumbnail: meta.thumbnail,
    inPoint: 0,
    outPoint: meta.duration || 0,
    shortcut: clipKeyFor(target.column, target.row),
  };
  st.addClip(clip);
}

/** Attach an existing library media item to a clip slot. */
export function attachMediaToClip(mediaId: string, clipId: string): void {
  const st = useProjectStore.getState();
  const meta = st.media.find((m) => m.id === mediaId);
  if (!meta) return;
  st.updateClip(clipId, {
    mediaId: meta.id,
    kind: meta.kind,
    name: meta.name,
    duration: meta.duration,
    fps: meta.fps || 30,
    width: meta.width,
    height: meta.height,
    thumbnail: meta.thumbnail,
    inPoint: 0,
    outPoint: meta.duration || 0,
  });
}

export function attachMediaToNewSlot(mediaId: string, column: number, row: number): void {
  const st = useProjectStore.getState();
  const meta = st.media.find((m) => m.id === mediaId);
  if (!meta) return;
  const existing = st.clips.find((c) => c.column === column && c.row === row);
  if (existing) {
    attachMediaToClip(mediaId, existing.id);
    return;
  }
  const clip = createClip(column, row, meta.name);
  st.addClip({
    ...clip,
    mediaId: meta.id,
    kind: meta.kind,
    name: meta.name,
    duration: meta.duration,
    fps: meta.fps || 30,
    width: meta.width,
    height: meta.height,
    thumbnail: meta.thumbnail,
    inPoint: 0,
    outPoint: meta.duration || 0,
    shortcut: clipKeyFor(column, row),
  });
}

/** Re-link a missing media entry by file name (after JSON import). */
export async function relinkMediaFile(mediaId: string, file: File): Promise<void> {
  const { meta, blob } = await probeMedia(file);
  mediaEngine.setBlob(mediaId, blob);
  const st = useProjectStore.getState();
  st.updateMedia(mediaId, {
    ...meta,
    id: mediaId,
    fileName: file.name,
  });
  // update clips referencing this media
  st.clips
    .filter((c) => c.mediaId === mediaId)
    .forEach((c) =>
      st.updateClip(c.id, {
        kind: meta.kind,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        fps: meta.fps || c.fps,
        thumbnail: meta.thumbnail,
        outPoint: meta.duration || c.outPoint,
      }),
    );
  void saveBlobDirect(mediaId, st.id, blob, file.name).catch(() => undefined);
}
