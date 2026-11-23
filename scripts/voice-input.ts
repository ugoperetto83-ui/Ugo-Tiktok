/** Exporte en JSON (stdout) les textes à lire et la config voix — consommé par generate_voice.py. */
import {SCENES, VIDEO_CONFIG} from './video-data';

process.stdout.write(
  JSON.stringify({
    voice: VIDEO_CONFIG.voice,
    // Les scènes sans texte (ex. carte de fin muette) ne sont pas synthétisées : durée de secours.
    scenes: SCENES.map((s) => ({id: s.id, text: s.voiceText ?? s.subtitle})).filter((s) => s.text.trim() !== ''),
  }),
);
