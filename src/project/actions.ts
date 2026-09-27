// High-level project actions used by TopBar, modals and keyboard shortcuts.

import { useProjectStore, emptyProject, defaultKeyBindings } from '../store/projectStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useUIStore } from '../store/uiStore';
import { mediaEngine } from '../canvas/media';
import { visualEngine } from '../canvas/engine';
import { playbackController } from '../clips/playback';
import * as db from './db';
import { downloadJSON, parseProjectJSON } from './serialize';
import { probeMedia } from '../canvas/media';

export function newProject(): void {
  const name = `Project ${new Date().toLocaleTimeString()}`;
  const data = emptyProject(name);
  data.keyBindings = defaultKeyBindings(data.clips, data.layers);
  mediaEngine.clearAll();
  visualEngine.reset();
  playbackController.stopAll();
  useProjectStore.getState().setProject(data);
  usePlaybackStore.getState().stop();
  useUIStore.getState().showToast('New project created');
}

export async function saveCurrentProject(): Promise<void> {
  const st = useProjectStore.getState();
  const data = st.getData();
  if (data.keyBindings.length === 0) {
    data.keyBindings = defaultKeyBindings(data.clips, data.layers);
  }
  const blobs = mediaEngine.allBlobs();
  try {
    await db.saveProject(data, blobs);
    useUIStore.getState().showToast(`Saved “${data.name}”`);
  } catch (err) {
    console.error(err);
    useUIStore.getState().showToast('Save failed (storage full?)');
  }
}

export async function openProject(id: string): Promise<void> {
  const ui = useUIStore.getState();
  ui.setLoadProgress({ active: true, label: 'Loading project…', value: 0.3 });
  try {
    const { data, blobs } = await db.loadProject(id);
    mediaEngine.clearAll();
    visualEngine.reset();
    playbackController.stopAll();
    mediaEngine.restoreBlobs(blobs);
    if (data.keyBindings.length === 0) {
      data.keyBindings = defaultKeyBindings(data.clips, data.layers);
    }
    useProjectStore.getState().setProject(data);
    usePlaybackStore.getState().stop();
    ui.showToast(`Opened “${data.name}”`);
  } catch (err) {
    console.error(err);
    ui.showToast('Could not open project');
  } finally {
    ui.setLoadProgress({ active: false, label: '', value: 0 });
  }
}

export async function saveProjectAs(newName?: string): Promise<void> {
  const st = useProjectStore.getState();
  const data = st.getData();
  data.id = `${data.id}_copy_${Date.now().toString(36)}`;
  data.name = newName || `${data.name} copy`;
  if (data.keyBindings.length === 0) {
    data.keyBindings = defaultKeyBindings(data.clips, data.layers);
  }
  useProjectStore.getState().setProject(data);
  await saveCurrentProject();
  useUIStore.getState().showToast(`Saved as “${data.name}”`);
}

export function exportCurrentProject(): void {
  const data = useProjectStore.getState().getData();
  downloadJSON(data);
  useUIStore.getState().showToast('Project exported as JSON');
}

export async function importProjectFile(file: File): Promise<void> {
  const ui = useUIStore.getState();
  try {
    const text = await file.text();
    const data = parseProjectJSON(text);
    mediaEngine.clearAll();
    visualEngine.reset();
    playbackController.stopAll();
    // media blobs are not embedded — mark as missing until re-linked
    data.media = data.media.map((m) => ({ ...m, thumbnail: m.thumbnail ?? null }));
    useProjectStore.getState().setProject(data);
    usePlaybackStore.getState().stop();
    ui.showToast(`Imported “${data.name}” — re-link media by dragging files onto clips`);
  } catch (err) {
    console.error(err);
    ui.showToast('Invalid project JSON');
  }
}

/** Try auto-relinking media by file name using a folder selection. */
export async function relinkAllFromFiles(files: FileList | File[]): Promise<void> {
  const list = Array.from(files);
  const st = useProjectStore.getState();
  const byName = new Map(list.map((f) => [f.name.toLowerCase(), f]));
  let relinked = 0;
  for (const meta of st.media) {
    if (mediaEngine.hasBlob(meta.id)) continue;
    const file = byName.get(meta.fileName.toLowerCase()) ?? byName.get(`${meta.name.toLowerCase()}.mp4`);
    if (!file) continue;
    try {
      const { meta: fresh, blob } = await probeMedia(file);
      mediaEngine.setBlob(meta.id, blob);
      st.updateMedia(meta.id, { ...fresh, id: meta.id });
      st.clips
        .filter((c) => c.mediaId === meta.id)
        .forEach((c) =>
          st.updateClip(c.id, {
            kind: fresh.kind,
            duration: fresh.duration,
            width: fresh.width,
            height: fresh.height,
            thumbnail: fresh.thumbnail,
            outPoint: fresh.duration || c.outPoint,
          }),
        );
      relinked++;
    } catch {
      /* ignore */
    }
  }
  useUIStore.getState().showToast(
    relinked > 0 ? `Re-linked ${relinked} media file(s)` : 'No matching files found',
  );
}
