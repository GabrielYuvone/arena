// KeyboardManager: configurable shortcuts, ignores typing in inputs.

import type { KeyBinding } from '../types';

export type KeyHandler = (binding: KeyBinding, e: KeyboardEvent) => void;

function normalizeKey(key: string): string {
  if (key === ' ') return ' ';
  return key.length === 1 ? key.toLowerCase() : key;
}

export class KeyboardManager {
  private bindings: KeyBinding[] = [];
  private handler: KeyHandler | null = null;
  private recording = false;
  private onRecord: ((key: string) => void) | null = null;

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    const isTyping =
      tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;

    if (this.recording) {
      e.preventDefault();
      e.stopPropagation();
      const key = normalizeKey(e.key);
      this.recording = false;
      this.onRecord?.(key);
      this.onRecord = null;
      return;
    }

    if (isTyping) return;

    const key = normalizeKey(e.key);
    const binding = this.bindings.find((b) => normalizeKey(b.key) === key);
    if (binding && this.handler) {
      e.preventDefault();
      this.handler(binding, e);
    }
  };

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown, true);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown, true);
  }

  setBindings(bindings: KeyBinding[]): void {
    this.bindings = bindings;
  }

  setHandler(handler: KeyHandler): void {
    this.handler = handler;
  }

  /** Capture next keypress (for shortcut editing). */
  recordNext(cb: (key: string) => void): void {
    this.recording = true;
    this.onRecord = cb;
  }

  isRecording(): boolean {
    return this.recording;
  }
}

export const keyboardManager = new KeyboardManager();
