// MEDIA LIBRARY — search, filter, sort, preview, delete, drag into clips.

import { useMemo, useState } from 'react';
import { Search, Trash2, Upload, Film, Image as ImageIcon, Music } from 'lucide-react';
import type { MediaKind } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { mediaEngine } from '../../canvas/media';
import { importFiles } from '../../clips/import';
import { formatBytes, formatTime } from '../../utils/id';
import { Button, Panel, Select, Badge } from '../ui/Controls';

type SortKey = 'name' | 'date' | 'duration' | 'size' | 'type';

export function MediaLibrary() {
  const media = useProjectStore((s) => s.media);
  const removeMedia = useProjectStore((s) => s.removeMedia);
  const clips = useProjectStore((s) => s.clips);
  const updateClip = useProjectStore((s) => s.updateClip);
  const showToast = useUIStore((s) => s.showToast);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | MediaKind>('all');
  const [sort, setSort] = useState<SortKey>('date');
  const [dropActive, setDropActive] = useState(false);

  const items = useMemo(() => {
    let list = [...media];
    if (filter !== 'all') list = list.filter((m) => m.kind === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q) || m.fileName.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'duration':
          return b.duration - a.duration;
        case 'size':
          return b.size - a.size;
        case 'type':
          return a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name);
        default:
          return b.createdAt - a.createdAt;
      }
    });
    return list;
  }, [media, filter, query, sort]);

  return (
    <Panel title="Media Library" bodyClassName="p-1.5 space-y-1.5">
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <Search size={11} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-txt-low" />
          <input
            className="w-full h-6 bg-surface-0 border border-line text-2xs text-txt-hi pl-5 pr-1.5 outline-none focus:border-accent"
            placeholder="Search media…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | MediaKind)} title="Filter">
          <option value="all">ALL</option>
          <option value="video">VIDEO</option>
          <option value="image">IMAGE</option>
          <option value="audio">AUDIO</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} title="Sort">
          <option value="date">DATE</option>
          <option value="name">NAME</option>
          <option value="duration">DUR</option>
          <option value="size">SIZE</option>
          <option value="type">TYPE</option>
        </Select>
      </div>

      <div
        className={`border border-dashed ${dropActive ? 'border-accent bg-accent/10' : 'border-line'} p-1.5 text-center`}
        onDragOver={(e) => {
          e.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropActive(false);
          if (e.dataTransfer.files.length > 0) void importFiles(e.dataTransfer.files);
        }}
      >
        <Button
          size="sm"
          onClick={() => document.querySelector<HTMLInputElement>('#lib-file')?.click()}
        >
          <Upload size={11} /> ADD MEDIA
        </Button>
        <input
          id="lib-file"
          type="file"
          multiple
          accept="video/*,image/*,audio/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void importFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="text-2xs text-txt-low mt-1">Drop files here or onto a clip cell</div>
      </div>

      <div className="space-y-1">
        {items.length === 0 && (
          <div className="text-2xs text-txt-low text-center py-4">Library is empty.</div>
        )}
        {items.map((m) => {
          const usedBy = clips.filter((c) => c.mediaId === m.id);
          return (
            <div
              key={m.id}
              className="flex items-center gap-1.5 bg-surface-3 border border-line p-1"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/x-vj-media', m.id)}
            >
              {m.thumbnail ? (
                <img src={m.thumbnail} alt="" className="w-12 h-7 object-cover border border-line shrink-0" />
              ) : (
                <div className="w-12 h-7 bg-surface-0 border border-line flex items-center justify-center shrink-0">
                  {m.kind === 'audio' ? <Music size={12} /> : m.kind === 'image' ? <ImageIcon size={12} /> : <Film size={12} />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-2xs text-txt-hi truncate">{m.name}</div>
                <div className="flex items-center gap-1 text-2xs text-txt-low font-mono">
                  <Badge>{m.kind}</Badge>
                  {m.duration > 0 && <span>{formatTime(m.duration)}</span>}
                  {m.width > 0 && (
                    <span>
                      {m.width}×{m.height}
                    </span>
                  )}
                  <span>{formatBytes(m.size)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <button
                  className="text-txt-low hover:text-accent text-2xs"
                  title="Assign to selected clip"
                  onClick={() => {
                    const st = useUIStore.getState().selectedClipId;
                    if (!st) {
                      showToast('Select a clip cell first');
                      return;
                    }
                    updateClip(st, {
                      mediaId: m.id,
                      kind: m.kind,
                      name: m.name,
                      duration: m.duration,
                      width: m.width,
                      height: m.height,
                      fps: m.fps || 30,
                      thumbnail: m.thumbnail,
                      inPoint: 0,
                      outPoint: m.duration || 0,
                    });
                    showToast(`Assigned “${m.name}” to clip`);
                  }}
                >
                  →CLIP
                </button>
                <button
                  className="text-txt-low hover:text-red-400"
                  title={`Delete media${usedBy.length ? ` (used by ${usedBy.length} clip(s))` : ''}`}
                  onClick={() => {
                    mediaEngine.releaseMedia(m.id);
                    removeMedia(m.id);
                  }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
