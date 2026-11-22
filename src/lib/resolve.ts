/**
 * Résout les scènes à partir de la voix off générée :
 *  - durée de chaque scène = longueur EXACTE du fichier audio + marge (config `voice`),
 *  - animations compressées si la scène devient plus courte qu'elles,
 *  - `endAtWord` : l'animation se termine quand la voix prononce le mot ciblé.
 * Sans manifeste (voix pas encore générée), les durées de secours du fichier de données s'appliquent.
 */
import manifestJson from '../../scripts/voice-manifest.json';
import {SCENES, VIDEO_CONFIG, type AnimationTiming, type Scene} from '../../scripts/video-data';
import {findWordTime, type ResolvedScene, type VoiceClip, type VoiceWord} from './timeline';

type ManifestEntry = {file: string; text: string; duration: number; words: VoiceWord[]};
type Manifest = {scenes: Record<string, ManifestEntry | undefined>};

/** Temps minimum à garder après la fin d'une animation, avant la coupe (s). */
const MIN_HOLD = 0.45;

const fitTiming = (timing: AnimationTiming, sceneDuration: number, voice?: VoiceClip): AnimationTiming => {
  if (timing.endAtWord && voice) {
    const t = findWordTime(voice, timing.endAtWord);
    if (t !== null) {
      const end = Math.min(t, sceneDuration - 0.2);
      return {...timing, duration: Math.max(0.5, end - timing.delay)};
    }
  }
  const end = timing.delay + timing.duration;
  const max = sceneDuration - MIN_HOLD;
  if (end <= max) return timing;
  const k = Math.max(0.3, max / end);
  return {...timing, delay: timing.delay * k, duration: timing.duration * k};
};

const withTimings = (scene: Scene, duration: number, voice?: VoiceClip): ResolvedScene => {
  const base = {...scene, durationInSeconds: duration, voice};
  switch (scene.visual) {
    case 'counter':
    case 'split':
    case 'chart':
      return {...base, animation: fitTiming(scene.animation, duration, voice)} as ResolvedScene;
    case 'order': {
      const animation = fitTiming(scene.animation, duration, voice);
      return {...base, animation, cupAt: Math.min(scene.cupAt, animation.delay * 0.8)} as ResolvedScene;
    }
    case 'statement':
      return {
        ...base,
        impactAt: scene.impactAt === undefined ? undefined : Math.min(scene.impactAt, duration - 0.6),
      } as ResolvedScene;
  }
};

export const resolveScenes = (
  scenes: Scene[] = SCENES,
  manifest: Manifest = manifestJson as Manifest,
): ResolvedScene[] => {
  const cfg = VIDEO_CONFIG.voice;
  return scenes.map((scene, i) => {
    const entry = manifest.scenes[scene.id];
    const spoken = scene.voiceText ?? scene.subtitle;
    const last = i === scenes.length - 1;
    if (!entry || entry.text !== spoken) {
      // Voix absente ou obsolète (texte modifié depuis la génération) : durée de secours.
      return withTimings(scene, scene.durationInSeconds);
    }
    const offset = i === 0 ? cfg.leadIn : 0;
    const voice: VoiceClip = {
      file: entry.file,
      duration: entry.duration,
      offset,
      words: entry.words,
      matchesSubtitle: scene.voiceText === undefined,
    };
    const duration = offset + entry.duration + cfg.padding + (last ? cfg.endHold : 0);
    return withTimings(scene, duration, voice);
  });
};
