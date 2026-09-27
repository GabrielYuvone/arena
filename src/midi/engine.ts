// MidiEngine: Web MIDI access, device list, CC/note values, MIDI LEARN.

import type { MidiDevice, MidiMapping, TargetRef } from '../types';
import { telemetry } from '../store/telemetry';
import { uid } from '../utils/id';

export type LearnCallback = (mapping: Omit<MidiMapping, 'id' | 'label'>, label: string) => void;

export class MidiEngine {
  access: MIDIAccess | null = null;
  supported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  devices: MidiDevice[] = [];
  /** last raw value (0..1) per control: `cc:channel:number` / `note:channel:number` */
  values = new Map<string, number>();
  /** note-on states for trigger handling */
  noteOn = new Map<string, boolean>();
  learning = false;
  learnTarget: TargetRef | null = null;
  private onLearn: LearnCallback | null = null;
  private listeners = new Set<(e: MidiEventPayload) => void>();
  private boundHandler = (e: Event) => this.handleMessage(e as MIDIMessageEvent);

  async init(): Promise<boolean> {
    if (!this.supported) return false;
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.refreshDevices();
      this.access.inputs.forEach((input) => {
        input.addEventListener('midimessage', this.boundHandler);
      });
      this.access.onstatechange = () => {
        this.refreshDevices();
        this.access?.inputs.forEach((input) => {
          input.removeEventListener('midimessage', this.boundHandler);
          input.addEventListener('midimessage', this.boundHandler);
        });
      };
      telemetry.midiSupported = true;
      telemetry.midiDeviceName = this.devices[0]?.name ?? null;
      return true;
    } catch {
      telemetry.midiSupported = true;
      return false;
    }
  }

  refreshDevices(): void {
    if (!this.access) return;
    this.devices = Array.from(this.access.inputs.values()).map((input) => ({
      id: input.id,
      name: input.name ?? 'MIDI In',
      manufacturer: input.manufacturer ?? '',
      state: input.state,
    }));
    telemetry.midiDeviceName = this.devices.find((d) => d.state === 'connected')?.name ?? null;
    telemetry.notify();
  }

  startLearn(target: TargetRef, cb: LearnCallback): void {
    this.learning = true;
    this.learnTarget = target;
    this.onLearn = cb;
  }

  cancelLearn(): void {
    this.learning = false;
    this.learnTarget = null;
    this.onLearn = null;
  }

  onMessage(fn: (e: MidiEventPayload) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private handleMessage(e: MIDIMessageEvent): void {
    const data = e.data;
    if (!data || data.length < 2) return;
    const status = data[0];
    const type = status & 0xf0;
    const channel = status & 0x0f;
    const d1 = data[1];
    const d2 = data.length > 2 ? data[2] : 0;

    telemetry.midiActivity = Date.now();

    let payload: MidiEventPayload | null = null;

    if (type === 0xb0) {
      // Control Change
      const key = `cc:${channel}:${d1}`;
      const norm = d2 / 127;
      this.values.set(key, norm);
      payload = { kind: 'cc', channel, number: d1, value: norm };
      if (this.learning && this.learnTarget) {
        this.onLearn?.(
          { type: 'cc', channel: -1, number: d1, target: this.learnTarget },
          `CC ${d1} → learn`,
        );
        this.cancelLearn();
      }
    } else if (type === 0x90 && d2 > 0) {
      const key = `note:${channel}:${d1}`;
      this.values.set(key, 1);
      this.noteOn.set(key, true);
      payload = { kind: 'noteon', channel, number: d1, value: 1 };
      if (this.learning && this.learnTarget) {
        this.onLearn?.(
          { type: 'note', channel: -1, number: d1, target: this.learnTarget },
          `Note ${d1} → learn`,
        );
        this.cancelLearn();
      }
    } else if (type === 0x80 || (type === 0x90 && d2 === 0)) {
      const key = `note:${channel}:${d1}`;
      this.noteOn.set(key, false);
      this.values.set(key, 0);
      payload = { kind: 'noteoff', channel, number: d1, value: 0 };
    }

    if (payload) {
      this.listeners.forEach((fn) => fn(payload!));
    }
  }

  /** Value for a mapping (0..1) or null when untouched. */
  mappingValue(mapping: MidiMapping): number | null {
    const key =
      mapping.type === 'cc'
        ? `cc:${mapping.channel >= 0 ? mapping.channel : 0}:${mapping.number}`
        : `note:${mapping.channel >= 0 ? mapping.channel : 0}:${mapping.number}`;
    // omni: scan any channel
    if (mapping.channel < 0) {
      for (const [k, v] of this.values) {
        const parts = k.split(':');
        if (parts[0] === mapping.type && Number(parts[2]) === mapping.number) return v;
      }
      return null;
    }
    return this.values.get(key) ?? null;
  }

  /** All values for override computation. */
  snapshot(): Map<string, number> {
    return this.values;
  }

  dispose(): void {
    this.access?.inputs.forEach((input) => {
      input.removeEventListener('midimessage', this.boundHandler);
    });
  }
}

export interface MidiEventPayload {
  kind: 'cc' | 'noteon' | 'noteoff';
  channel: number;
  number: number;
  value: number;
}

export function makeMidiMappingId(): string {
  return uid('midi');
}

export const midiEngine = new MidiEngine();
