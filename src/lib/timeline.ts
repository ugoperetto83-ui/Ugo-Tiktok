/**
 * Moteur de timeline PARTAGÉ entre le rendu React (Remotion) et le script audio Node.
 * Aucune dépendance React ici : tout est pur et déterministe, pour que les bruitages
 * tombent exactement sur les frames où les chiffres bougent.
 */
import {Easing} from 'remotion';
import type {AnimationTiming, Scene} from '../../scripts/video-data';

export const toFrames = (seconds: number, fps: number) => Math.round(seconds * fps);

// ---------------------------------------------------------------------------
// Voix off (données produites par scripts/generate_voice.py)
// ---------------------------------------------------------------------------

export type VoiceWord = {text: string; start: number; end: number};

export type VoiceClip = {
  /** Chemin dans /public. */
  file: string;
  /** Durée exacte du fichier audio (s). */
  duration: number;
  /** Décalage de la voix dans la scène (s). */
  offset: number;
  /** Horodatages mot par mot, relatifs au début du fichier (s). */
  words: VoiceWord[];
  /** true si le texte lu est identique au sous-titre (alignement mot à mot possible). */
  matchesSubtitle: boolean;
};

/** Scène après résolution : durée calée sur la voix, animations ajustées. */
export type ResolvedScene = Scene & {voice?: VoiceClip};

/** Ne garde que lettres et chiffres (minuscules) : sert à aligner sous-titres et voix. */
export const alnum = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * Aligne chaque mot du sous-titre sur les segments horodatés de la voix.
 * edge-tts peut regrouper plusieurs mots en un segment (« 10 ans », « 240 000 € ») :
 * on interpole alors à l'intérieur du segment, au prorata des caractères.
 */
export const alignToVoice = (tokens: string[], words: VoiceWord[]): {start: number; end: number}[] | null => {
  const chars: {w: number; pos: number; len: number}[] = [];
  let concat = '';
  words.forEach((w, wi) => {
    const a = alnum(w.text);
    for (let i = 0; i < a.length; i++) chars.push({w: wi, pos: i, len: a.length});
    concat += a;
  });
  const timeAt = (charIdx: number, edge: 'start' | 'end') => {
    const c = chars[charIdx];
    const w = words[c.w];
    const f = (c.pos + (edge === 'end' ? 1 : 0)) / c.len;
    return w.start + f * (w.end - w.start);
  };

  let ptr = 0;
  const out: ({start: number; end: number} | null)[] = [];
  for (const token of tokens) {
    const t = alnum(token);
    if (!t) {
      out.push(null); // ponctuation ou symbole seul : hérite du voisin
      continue;
    }
    const idx = concat.indexOf(t, ptr);
    if (idx < 0 || idx - ptr > 12) return null; // texte trop différent : repli proportionnel
    out.push({start: timeAt(idx, 'start'), end: timeAt(idx + t.length - 1, 'end')});
    ptr = idx + t.length;
  }
  // Remplit les symboles isolés et prolonge chaque mot jusqu'au suivant (pas de « trou » de surlignage).
  const filled = out.map((v, i) => {
    if (v) return v;
    const prev = out.slice(0, i).reverse().find(Boolean);
    const t = prev ? prev.end : 0;
    return {start: t, end: t};
  });
  return filled.map((v, i) => ({start: v.start, end: Math.max(v.end, filled[i + 1]?.start ?? v.end)}));
};

/** Instant (s, dans la scène) où la voix prononce `target` (au milieu du mot), ou null. */
export const findWordTime = (clip: VoiceClip, target: string): number | null => {
  const needle = alnum(target);
  const w = clip.words.find((x) => alnum(x.text) === needle) ?? clip.words.find((x) => alnum(x.text).includes(needle));
  return w ? clip.offset + (w.start + w.end) / 2 : null;
};

// ---------------------------------------------------------------------------
// Scènes
// ---------------------------------------------------------------------------

export type SceneSlot = {scene: ResolvedScene; index: number; from: number; durationInFrames: number};

export const layoutScenes = (scenes: ResolvedScene[], fps: number): SceneSlot[] => {
  let cursor = 0;
  return scenes.map((scene, index) => {
    const durationInFrames = toFrames(scene.durationInSeconds, fps);
    const slot = {scene, index, from: cursor, durationInFrames};
    cursor += durationInFrames;
    return slot;
  });
};

export const totalFrames = (scenes: ResolvedScene[], fps: number) =>
  layoutScenes(scenes, fps).reduce((sum, s) => sum + s.durationInFrames, 0);

// ---------------------------------------------------------------------------
// Easings
// ---------------------------------------------------------------------------

const expoIn = Easing.in(Easing.exp); // 2^(10(t-1)) : l'accélération des intérêts composés
const EXPO_AT_0 = expoIn(0);

/** Accélération exponentielle normalisée (0 → 1 exactement) avec un léger plancher linéaire
 *  pour que le compteur bouge dès le début. */
export const counterEasing = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  const expo = (expoIn(c) - EXPO_AT_0) / (1 - EXPO_AT_0);
  return 0.1 * c + 0.9 * expo;
};

export const chartEasing = Easing.inOut(Easing.cubic);

/** Progression linéaire 0→1 d'une animation, à partir d'une frame relative à la scène. */
export const linearProgress = (frame: number, timing: AnimationTiming, fps: number) => {
  const start = timing.delay * fps;
  const dur = Math.max(1, timing.duration * fps);
  return Math.min(1, Math.max(0, (frame - start) / dur));
};

export const animationEndFrame = (timing: AnimationTiming, fps: number) =>
  toFrames(timing.delay + timing.duration, fps);

// ---------------------------------------------------------------------------
// Sous-titres mot par mot
// ---------------------------------------------------------------------------

export type SubtitleWord = {
  text: string;
  /** Frames absolues. */
  start: number;
  end: number;
  keyword: boolean;
  chunk: number;
};

const PUNCT_END = /[.,:;!?…]$/;
// On ne découpe QUE sur les espaces ordinaires : les espaces insécables gardent « 240 000 € » groupé.
const splitWords = (text: string) => text.split(/[ \t\n]+/).filter(Boolean);
const normalize = (s: string) => s.toLowerCase().replace(/[  ]/g, ' ').replace(/'/g, '’');

const markKeywords = (words: string[], keywords: string[]): boolean[] => {
  const text = words.join(' ');
  const offsets: number[] = [];
  let pos = 0;
  for (const w of words) {
    offsets.push(pos);
    pos += w.length + 1;
  }
  const hay = normalize(text);
  const flags = words.map(() => false);
  const isBoundary = (ch: string | undefined) => ch === undefined || !/[\p{L}\p{N}]/u.test(ch);
  for (const kw of keywords) {
    const needle = normalize(kw);
    let idx = hay.indexOf(needle);
    while (idx !== -1) {
      const endIdx = idx + needle.length;
      if (isBoundary(hay[idx - 1]) && isBoundary(hay[endIdx])) {
        words.forEach((w, i) => {
          const a = offsets[i];
          const b = a + w.length;
          if (a < endIdx && b > idx) flags[i] = true;
        });
      }
      idx = hay.indexOf(needle, idx + 1);
    }
  }
  return flags;
};

export const buildSubtitles = (scenes: ResolvedScene[], fps: number, keywords: string[]): SubtitleWord[] => {
  const out: SubtitleWord[] = [];
  let chunk = 0;
  for (const slot of layoutScenes(scenes, fps)) {
    const words = splitWords(slot.scene.subtitle);
    if (words.length === 0) continue;
    const flags = markKeywords(words, keywords);

    // 1) Voix off disponible : horodatages réels de la voix.
    const voice = slot.scene.voice;
    const aligned = voice && voice.matchesSubtitle ? alignToVoice(words, voice.words) : null;

    // 2) Sinon : répartition proportionnelle (sur la durée de la voix si elle existe).
    // Poids : longueur du mot + pause après la ponctuation.
    const weights = words.map((w) => Math.max(3, w.length) + (PUNCT_END.test(w) ? 4 : 0));
    const total = weights.reduce((a, b) => a + b, 0);
    const winStart = slot.from + toFrames(voice ? voice.offset : 0.12, fps);
    const winEnd = voice
      ? slot.from + toFrames(voice.offset + voice.duration, fps)
      : slot.from + slot.durationInFrames - toFrames(0.2, fps);
    const span = winEnd - winStart;

    let acc = 0;
    let chunkSize = 0;
    let chunkChars = 0;
    chunk++;
    words.forEach((w, i) => {
      const prev = words[i - 1];
      if (chunkSize > 0 && (chunkSize >= 3 || chunkChars + w.length > 18 || (prev && PUNCT_END.test(prev)))) {
        chunk++;
        chunkSize = 0;
        chunkChars = 0;
      }
      let start = Math.round(winStart + (acc / total) * span);
      acc += weights[i];
      let end = Math.round(winStart + (acc / total) * span);
      if (aligned && voice) {
        start = slot.from + toFrames(voice.offset + aligned[i].start, fps);
        end = slot.from + toFrames(voice.offset + aligned[i].end, fps);
      }
      out.push({text: w, start, end, keyword: flags[i], chunk});
      chunkSize++;
      chunkChars += w.length + 1;
    });
  }
  return out;
};

// ---------------------------------------------------------------------------
// Événements sonores (dérivés des animations)
// ---------------------------------------------------------------------------

export type SfxType = 'tick' | 'whoosh' | 'impact';
export type SfxEvent = {type: SfxType; frame: number; gain: number; pitch: number};

/** Le whoosh atteint son pic ~0.22 s après son départ : on l'anticipe pour qu'il tombe sur la coupe. */
export const WHOOSH_PEAK_SECONDS = 0.22;

const ticksForCounter = (
  sceneFrom: number,
  timing: AnimationTiming,
  fps: number,
  gain: number,
  steps = 70,
): SfxEvent[] => {
  const events: SfxEvent[] = [];
  const start = toFrames(timing.delay, fps);
  const end = animationEndFrame(timing, fps);
  const minGap = Math.max(2, Math.round(fps / 30)); // ≤ 30 ticks/s : un vrai compteur mécanique
  let lastStep = 0;
  let lastFrame = -Infinity;
  for (let f = start; f <= end; f++) {
    const p = counterEasing(linearProgress(f, timing, fps));
    const step = Math.floor(p * steps);
    if (step > lastStep && f - lastFrame >= minGap) {
      events.push({type: 'tick', frame: sceneFrom + f, gain: gain * (0.7 + 0.3 * p), pitch: 1 + 0.25 * p});
      lastStep = step;
      lastFrame = f;
    }
  }
  return events;
};

export const buildSfxEvents = (scenes: ResolvedScene[], fps: number): SfxEvent[] => {
  const events: SfxEvent[] = [];
  for (const slot of layoutScenes(scenes, fps)) {
    const {scene, from, index} = slot;
    const whoosh = scene.whooshIn ?? index > 0;
    if (whoosh) {
      events.push({type: 'whoosh', frame: Math.max(0, from - toFrames(WHOOSH_PEAK_SECONDS, fps)), gain: 0.55, pitch: 1});
    }
    switch (scene.visual) {
      case 'order':
        // « Pop » aigu quand le gobelet se pose sur le comptoir.
        events.push({type: 'tick', frame: from + toFrames(scene.cupAt, fps), gain: 0.9, pitch: 1.7});
        events.push(...ticksForCounter(from, scene.animation, fps, 0.5));
        if (scene.impactAtEnd) {
          events.push({type: 'impact', frame: from + animationEndFrame(scene.animation, fps), gain: 1, pitch: 1});
        }
        break;
      case 'counter':
        events.push(...ticksForCounter(from, scene.animation, fps, 0.5));
        if (scene.impactAtEnd) {
          events.push({type: 'impact', frame: from + animationEndFrame(scene.animation, fps), gain: 1, pitch: 1});
        }
        break;
      case 'split':
        events.push(...ticksForCounter(from, scene.animation, fps, 0.42));
        events.push({type: 'impact', frame: from + animationEndFrame(scene.animation, fps), gain: 0.6, pitch: 1.15});
        break;
      case 'chart': {
        // Un tick doux par année franchie par la courbe.
        const n = scene.xValues.length - 1;
        let last = 0;
        const end = animationEndFrame(scene.animation, fps);
        for (let f = toFrames(scene.animation.delay, fps); f <= end; f++) {
          const year = Math.floor(chartEasing(linearProgress(f, scene.animation, fps)) * n);
          if (year > last) {
            events.push({type: 'tick', frame: from + f, gain: 0.28, pitch: 0.8 + (0.35 * year) / n});
            last = year;
          }
        }
        break;
      }
      case 'statement':
        if (scene.impactAt !== undefined) {
          events.push({type: 'impact', frame: from + toFrames(scene.impactAt, fps), gain: 0.9, pitch: 0.9});
        }
        break;
    }
  }
  return events.sort((a, b) => a.frame - b.frame);
};
