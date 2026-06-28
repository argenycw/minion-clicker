import { adventureAudioClips, adventureAudioClipsById, adventureAudioCues, adventureAudioDefaults, type AdventureAudioCueDefinition } from './definitions';
import type { AdventureAudioCue, AdventureAudioPoint } from './types';

const DEFAULT_BASE_PATH = '/audio/sfx/';
const MIN_AUDIBLE_DISTANCE = 48;

export type AdventureAudioPlaybackOptions = {
  volume?: number;
  rate?: number;
};

export class AdventureAudioSystem {
  private context?: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer>>();
  private lastPlayed = new Map<string, number>();
  private enabled = true;
  private masterVolume = 0.85;

  constructor(private readonly basePath = DEFAULT_BASE_PATH) {}

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setMasterVolume(volume: number) {
    this.masterVolume = clamp(volume, 0, 1);
  }

  async unlock() {
    const context = this.getContext();
    if (context.state === 'suspended') await context.resume();
    void this.preloadAll();
  }

  async preloadAll() {
    await Promise.all(adventureAudioClips.map((clip) => this.loadClip(clip.id)));
  }

  playUi(cue: AdventureAudioCue, options: AdventureAudioPlaybackOptions = {}) {
    return this.play(cue, 0, options);
  }

  playWorld(
    cue: AdventureAudioCue,
    source: AdventureAudioPoint,
    listener: AdventureAudioPoint,
    options: AdventureAudioPlaybackOptions = {},
  ) {
    const preset = getCue(cue);
    const dx = source.x - listener.x;
    const dy = source.y - listener.y;
    const distance = Math.hypot(dx, dy);
    const maxDistance = preset.maxDistance ?? adventureAudioDefaults.maxDistance;
    if (distance > maxDistance) return;
    const falloff = 1 - clamp((distance - MIN_AUDIBLE_DISTANCE) / (maxDistance - MIN_AUDIBLE_DISTANCE), 0, 1);
    const pan = clamp(dx / (maxDistance * 0.55), -1, 1);
    return this.play(cue, pan, {
      ...options,
      volume: (options.volume ?? 1) * falloff * falloff,
    });
  }

  private async play(cue: AdventureAudioCue, pan: number, options: AdventureAudioPlaybackOptions) {
    if (!this.enabled || this.masterVolume <= 0) return;
    const preset = getCue(cue);
    const now = performance.now();
    const lastPlayed = this.lastPlayed.get(cue) ?? -Infinity;
    if (now - lastPlayed < preset.minIntervalMs) return;
    this.lastPlayed.set(cue, now);

    const context = this.getContext();
    if (context.state === 'suspended') return;

    const buffer = await this.loadClip(preset.clipId).catch(() => undefined);
    if (!buffer) return;

    const source = context.createBufferSource();
    source.buffer = buffer;
    const rate = preset.rate ?? adventureAudioDefaults.rate;
    source.playbackRate.value = options.rate ?? randomBetween(rate[0], rate[1]);

    const gain = context.createGain();
    gain.gain.value = clamp(preset.volume * this.masterVolume * (options.volume ?? 1), 0, 1);

    const panner = context.createStereoPanner();
    panner.pan.value = pan;

    source.connect(gain);
    gain.connect(panner);
    panner.connect(context.destination);
    source.start();
  }

  private getContext() {
    this.context ??= new AudioContext();
    return this.context;
  }

  private loadClip(id: string) {
    const cached = this.buffers.get(id);
    if (cached) return Promise.resolve(cached);
    const existing = this.loading.get(id);
    if (existing) return existing;

    const clip = adventureAudioClipsById[id as keyof typeof adventureAudioClipsById];
    if (!clip) return Promise.reject(new Error(`Unknown audio clip: ${id}`));
    const loading = fetch(`${this.basePath}${clip.file}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load audio clip ${id}: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => this.getContext().decodeAudioData(data))
      .then((buffer) => {
        this.buffers.set(id, buffer);
        this.loading.delete(id);
        return buffer;
      })
      .catch((error) => {
        this.loading.delete(id);
        throw error;
      });
    this.loading.set(id, loading);
    return loading;
  }
}

function getCue(cue: AdventureAudioCue): AdventureAudioCueDefinition {
  const definition = adventureAudioCues[cue];
  if (!definition) throw new Error(`Unknown audio cue: ${cue}`);
  return definition;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
