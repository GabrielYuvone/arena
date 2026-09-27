// IndexedDB persistence: projects (JSON state) + media blobs.

import type { ProjectData, ProjectSummary } from '../types';

const DB_NAME = 'vj-studio';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_MEDIA = 'media';

interface ProjectRow {
  id: string;
  name: string;
  updatedAt: number;
  thumbnail: string | null;
  data: ProjectData;
}

interface MediaRow {
  id: string;
  projectId: string;
  blob: Blob;
  name: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function reqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProject(
  data: ProjectData,
  blobs: [string, Blob][],
): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_PROJECTS, STORE_MEDIA], 'readwrite');
    const projects = tx.objectStore(STORE_PROJECTS);
    const media = tx.objectStore(STORE_MEDIA);
    const row: ProjectRow = {
      id: data.id,
      name: data.name,
      updatedAt: Date.now(),
      thumbnail: data.media[0]?.thumbnail ?? data.clips[0]?.thumbnail ?? null,
      data,
    };
    projects.put(row);
    for (const [mediaId, blob] of blobs) {
      media.put({
        id: mediaId,
        projectId: data.id,
        blob,
        name: data.media.find((m) => m.id === mediaId)?.fileName ?? mediaId,
      } satisfies MediaRow);
    }
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function loadProject(id: string): Promise<{ data: ProjectData; blobs: [string, Blob][] }> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_PROJECTS, STORE_MEDIA], 'readonly');
    const row = await reqResult<ProjectRow | undefined>(
      tx.objectStore(STORE_PROJECTS).get(id),
    );
    if (!row) throw new Error('Project not found');
    const mediaRows = await reqResult<MediaRow[]>(
      tx.objectStore(STORE_MEDIA).getAll(),
    );
    const wanted = new Set(row.data.media.map((m) => m.id));
    const blobs: [string, Blob][] = mediaRows
      .filter((m) => wanted.has(m.id))
      .map((m) => [m.id, m.blob]);
    return { data: row.data, blobs };
  } finally {
    db.close();
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_PROJECTS], 'readonly');
    const rows = await reqResult<ProjectRow[]>(tx.objectStore(STORE_PROJECTS).getAll());
    return rows
      .map((r) => ({ id: r.id, name: r.name, updatedAt: r.updatedAt, thumbnail: r.thumbnail }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    db.close();
  }
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_PROJECTS, STORE_MEDIA], 'readwrite');
    tx.objectStore(STORE_PROJECTS).delete(id);
    const mediaRows = await reqResult<MediaRow[]>(tx.objectStore(STORE_MEDIA).getAll());
    mediaRows.filter((m) => m.projectId === id).forEach((m) => {
      tx.objectStore(STORE_MEDIA).delete(m.id);
    });
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function saveBlobDirect(mediaId: string, projectId: string, blob: Blob, name: string): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_MEDIA], 'readwrite');
    tx.objectStore(STORE_MEDIA).put({ id: mediaId, projectId, blob, name } satisfies MediaRow);
    await txDone(tx);
  } finally {
    db.close();
  }
}
