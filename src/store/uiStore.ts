// UI state: selection, panels, modals, performance mode, load progress.

import { create } from 'zustand';
import type { LoadProgress } from '../types';

export type RightTab = 'effects' | 'transform' | 'clip' | 'audio' | 'midi' | 'library';

interface UIStore {
  selectedLayerId: string | null;
  selectedClipId: string | null;
  selectedEffectId: string | null;
  rightTab: RightTab;
  performanceMode: boolean;
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  loadProgress: LoadProgress;
  contextClipId: string | null;
  renamingClipId: string | null;
  toast: string | null;

  selectLayer: (id: string | null) => void;
  selectClip: (id: string | null) => void;
  selectEffect: (id: string | null) => void;
  setRightTab: (tab: RightTab) => void;
  setPerformanceMode: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setShortcutsOpen: (v: boolean) => void;
  setLoadProgress: (p: LoadProgress) => void;
  setContextClipId: (id: string | null) => void;
  setRenamingClipId: (id: string | null) => void;
  showToast: (msg: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedLayerId: null,
  selectedClipId: null,
  selectedEffectId: null,
  rightTab: 'effects',
  performanceMode: false,
  settingsOpen: false,
  shortcutsOpen: false,
  loadProgress: { active: false, label: '', value: 0 },
  contextClipId: null,
  renamingClipId: null,
  toast: null,

  selectLayer: (selectedLayerId) => set({ selectedLayerId }),
  selectClip: (selectedClipId) => set({ selectedClipId }),
  selectEffect: (selectedEffectId) => set({ selectedEffectId }),
  setRightTab: (rightTab) => set({ rightTab }),
  setPerformanceMode: (performanceMode) => set({ performanceMode }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setContextClipId: (contextClipId) => set({ contextClipId }),
  setRenamingClipId: (renamingClipId) => set({ renamingClipId }),
  showToast: (toast) => set({ toast }),
}));
