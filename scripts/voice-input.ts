/** Exporte en JSON (stdout) les textes à lire et la config voix — consommé par generate_voice.py. */
import {SCENES, VIDEO_CONFIG} from './video-data';

process.stdout.write(
  JSON.stringify({
    voice: VIDEO_CONFIG.voice,
    scenes: SCENES.map((s) => ({id: s.id, text: s.voiceText ?? s.subtitle})),
  }),
);
