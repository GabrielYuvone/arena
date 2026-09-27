// Project serialization: export/import JSON (no embedded media, file references only).

import type { ProjectData } from '../types';
import { emptyProject } from '../store/projectStore';
import { uid } from '../utils/id';

export function exportProjectJSON(data: ProjectData): string {
  const exportable: ProjectData & { exportInfo: object } = {
    ...data,
    // keep media metadata but never blobs — filenames serve as re-link references
    exportInfo: {
      app: 'VJ Studio',
      exportedAt: new Date().toISOString(),
      note: 'Media files are referenced by fileName. Drag files onto clips to re-link.',
    },
  };
  return JSON.stringify(exportable, null, 2);
}

export function downloadJSON(data: ProjectData): void {
  const json = exportProjectJSON(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.name.replace(/[^\w\- ]+/g, '') || 'vj-project'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseProjectJSON(text: string): ProjectData {
  const raw = JSON.parse(text) as Partial<ProjectData>;
  if (!raw || typeof raw !== 'object') throw new Error('Invalid project file');
  const base = emptyProject();
  const data: ProjectData = {
    ...base,
    ...raw,
    version: 1,
    id: raw.id ? String(raw.id) : uid('project'),
    name: raw.name ? String(raw.name) : base.name,
    width: Number(raw.width) || base.width,
    height: Number(raw.height) || base.height,
    fps: Number(raw.fps) || base.fps,
    columns: Number(raw.columns) || base.columns,
    rows: Number(raw.rows) || base.rows,
    layers: Array.isArray(raw.layers) && raw.layers.length > 0 ? raw.layers : base.layers,
    clips: Array.isArray(raw.clips) ? raw.clips : [],
    media: Array.isArray(raw.media) ? raw.media : [],
    midiMappings: Array.isArray(raw.midiMappings) ? raw.midiMappings : [],
    keyBindings: Array.isArray(raw.keyBindings) ? raw.keyBindings : [],
    audioModulations: Array.isArray(raw.audioModulations) ? raw.audioModulations : [],
    masterEffects: Array.isArray(raw.masterEffects) ? raw.masterEffects : [],
    bpm: Number(raw.bpm) || base.bpm,
    quantization: raw.quantization ?? base.quantization,
    accentColor: raw.accentColor || base.accentColor,
    masterOpacity: Number(raw.masterOpacity ?? 1),
    masterBrightness: Number(raw.masterBrightness ?? 1),
  };
  // sanitize clips
  data.clips = data.clips.map((c) => ({
    ...c,
    mediaId: data.media.some((m) => m.id === c.mediaId) ? c.mediaId : null,
  }));
  return data;
}
