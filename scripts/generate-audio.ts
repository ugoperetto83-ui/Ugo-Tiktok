/**
 * Audio procédural — 100 % synthétisé, donc libre de droits.
 *
 *   npm run audio
 *
 * 1. Synthétise 3 bruitages minimalistes : tick (compteur mécanique), whoosh (transition), impact (grave).
 * 2. Les exporte individuellement dans public/sfx/*.wav.
 * 3. Mixe la bande-son (sur les durées de scènes calées sur la voix off) complète (public/sfx/soundtrack.wav) en plaçant chaque son sur la frame exacte
 *    calculée par src/lib/timeline.ts, la même source de vérité que les animations.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VIDEO_CONFIG} from './video-data';
import {buildSfxEvents, totalFrames, type SfxEvent} from '../src/lib/timeline';
import {resolveScenes} from '../src/lib/resolve';

const SR = 48000;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'sfx');

type Stereo = {l: Float32Array; r: Float32Array};

// PRNG déterministe : le même rendu à chaque exécution.
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Filtre à variables d'état (Chamberlin) : passe-bas / passe-bande / passe-haut. */
const makeSvf = () => {
  let low = 0;
  let band = 0;
  return (input: number, cutoff: number, q: number) => {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff, SR / 6)) / SR);
    low += f * band;
    const high = input - low - q * band;
    band += f * high;
    return {low, band, high};
  };
};

const normalize = (buf: Float32Array, peak: number) => {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < buf.length; i++) buf[i] *= peak / max;
  return buf;
};

// ---------------------------------------------------------------------------
// Synthèse
// ---------------------------------------------------------------------------

/** Tick sec de compteur mécanique : clic bruité + résonance métallique très courte. */
const synthTick = (pitch = 1, seed = 1): Float32Array => {
  const rand = mulberry32(seed);
  const n = Math.round(0.05 * SR);
  const out = new Float32Array(n);
  const svf = makeSvf();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const noise = (rand() * 2 - 1) * Math.exp(-t / 0.0007);
    const click = svf(noise, 6000, 0.7).high;
    const ping = Math.sin(2 * Math.PI * 2350 * pitch * t) * Math.exp(-t / 0.006);
    const ping2 = Math.sin(2 * Math.PI * 3720 * pitch * t) * Math.exp(-t / 0.0035) * 0.5;
    const body = Math.sin(2 * Math.PI * 820 * pitch * t) * Math.exp(-t / 0.01) * 0.35;
    out[i] = click * 0.9 + ping * 0.45 + ping2 + body;
  }
  return normalize(out, 0.8);
};

/** Whoosh doux : bruit filtré passe-bande dont la fréquence monte puis redescend, avec panoramique. */
const synthWhoosh = (seed = 7): Stereo => {
  const rand = mulberry32(seed);
  const dur = 0.75;
  const peak = 0.22;
  const n = Math.round(dur * SR);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  const a = makeSvf();
  const b = makeSvf();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = t < peak ? Math.pow(t / peak, 2.2) : Math.exp(-(t - peak) / 0.13);
    const sweep = t < peak ? t / peak : Math.max(0, 1 - (t - peak) / 0.45);
    const fc = 260 * Math.pow(3200 / 260, sweep * 0.92);
    const noise = rand() * 2 - 1;
    const air = a(noise, fc, 0.55).band;
    const body = b(noise, fc * 0.35, 0.9).band * 0.6;
    const s = (air + body) * env;
    const pan = Math.min(1, t / dur) * 1.6 - 0.8; // gauche → droite
    l[i] = s * Math.cos(((pan + 1) * Math.PI) / 4);
    r[i] = s * Math.sin(((pan + 1) * Math.PI) / 4);
  }
  const norm = Math.max(...l.map(Math.abs), ...r.map(Math.abs));
  for (let i = 0; i < n; i++) {
    l[i] *= 0.7 / norm;
    r[i] *= 0.7 / norm;
  }
  return {l, r};
};

/** Impact grave : sub-kick à glissando descendant + transitoire + saturation douce. */
const synthImpact = (pitch = 1, seed = 13): Float32Array => {
  const rand = mulberry32(seed);
  const n = Math.round(1.8 * SR);
  const out = new Float32Array(n);
  const svf = makeSvf();
  let phase = 0;
  let phase2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = (42 + 120 * Math.exp(-t / 0.045)) * pitch;
    phase += (2 * Math.PI * f) / SR;
    phase2 += (2 * Math.PI * f * 2.01) / SR;
    const sub = Math.sin(phase) * Math.exp(-t / 0.6);
    const harm = Math.sin(phase2) * Math.exp(-t / 0.12) * 0.25;
    const transient = svf((rand() * 2 - 1) * Math.exp(-t / 0.012), 1800, 0.8).low * 1.4;
    out[i] = Math.tanh((sub + harm + transient) * 1.9);
  }
  // Fondu de sortie pour éviter tout clic.
  const fade = Math.round(0.05 * SR);
  for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;
  return normalize(out, 0.95);
};

// ---------------------------------------------------------------------------
// WAV
// ---------------------------------------------------------------------------

const writeWav = (path: string, channels: Float32Array[]) => {
  const n = channels[0].length;
  const nc = channels.length;
  const data = Buffer.alloc(n * nc * 2);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nc; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      data.writeInt16LE(Math.round(v * 32767), (i * nc + c) * 2);
    }
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(nc, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * nc * 2, 28);
  header.writeUInt16LE(nc * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
};

// ---------------------------------------------------------------------------
// Mixage sur la timeline
// ---------------------------------------------------------------------------

const mix = (events: SfxEvent[], durationSeconds: number, fps: number): Stereo => {
  const n = Math.ceil(durationSeconds * SR);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  const rand = mulberry32(42);
  const whoosh = synthWhoosh();
  const impacts = new Map<number, Float32Array>();

  const add = (src: Float32Array | Stereo, at: number, gain: number, pan = 0) => {
    const start = Math.round((at / fps) * SR);
    const left = src instanceof Float32Array ? src : src.l;
    const right = src instanceof Float32Array ? src : src.r;
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    for (let i = 0; i < left.length && start + i < n; i++) {
      if (start + i < 0) continue;
      l[start + i] += left[i] * gl;
      r[start + i] += right[i] * gr;
    }
  };

  events.forEach((e, idx) => {
    switch (e.type) {
      case 'tick':
        add(synthTick(e.pitch * (0.97 + rand() * 0.06), idx + 1), e.frame, e.gain * 0.55, (rand() - 0.5) * 0.3);
        break;
      case 'whoosh':
        add(whoosh, e.frame, e.gain);
        break;
      case 'impact': {
        const key = Math.round(e.pitch * 100);
        if (!impacts.has(key)) impacts.set(key, synthImpact(e.pitch));
        add(impacts.get(key)!, e.frame, e.gain * 0.9);
        break;
      }
    }
  });

  // Master : limiteur doux puis normalisation à -1 dBFS.
  let peak = 0;
  for (let i = 0; i < n; i++) {
    l[i] = Math.tanh(l[i] * 1.1);
    r[i] = Math.tanh(r[i] * 1.1);
    peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  }
  const g = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < n; i++) {
    l[i] *= g;
    r[i] *= g;
  }
  // Micro-fondu final.
  const fade = Math.round(0.08 * SR);
  for (let i = 0; i < fade; i++) {
    l[n - 1 - i] *= i / fade;
    r[n - 1 - i] *= i / fade;
  }
  return {l, r};
};

// ---------------------------------------------------------------------------

const main = () => {
  mkdirSync(OUT_DIR, {recursive: true});
  const {fps} = VIDEO_CONFIG;

  const tick = synthTick();
  const whoosh = synthWhoosh();
  const impact = synthImpact();
  writeWav(join(OUT_DIR, 'tick.wav'), [tick, tick]);
  writeWav(join(OUT_DIR, 'whoosh.wav'), [whoosh.l, whoosh.r]);
  writeWav(join(OUT_DIR, 'impact.wav'), [impact, impact]);

  const scenes = resolveScenes(); // durées calées sur la voix off
  const events = buildSfxEvents(scenes, fps);
  const duration = totalFrames(scenes, fps) / fps;
  const track = mix(events, duration, fps);
  writeWav(join(ROOT, 'public', VIDEO_CONFIG.soundtrack), [track.l, track.r]);

  const count = (t: string) => events.filter((e) => e.type === t).length;
  console.log(
    `✔ Bande-son ${duration.toFixed(2)} s → public/${VIDEO_CONFIG.soundtrack}\n` +
      `  ${count('tick')} ticks · ${count('whoosh')} whoosh · ${count('impact')} impacts\n` +
      `✔ Bruitages individuels → public/sfx/{tick,whoosh,impact}.wav`,
  );
};

main();
