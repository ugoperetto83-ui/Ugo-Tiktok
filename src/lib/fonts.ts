import {continueRender, delayRender, staticFile} from 'remotion';

const WEIGHTS: [string, number][] = [
  ['Inter-Medium.otf', 500],
  ['Inter-Bold.otf', 700],
  ['Inter-ExtraBold.otf', 800],
  ['Inter-Black.otf', 900],
];

let loaded = false;

/** Charge Inter depuis /public/fonts et bloque le rendu tant que la police n'est pas prête. */
export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Chargement de la police Inter');
  Promise.all(
    WEIGHTS.map(([file, weight]) => {
      const face = new FontFace('Inter', `url(${staticFile(`fonts/${file}`)}) format('opentype')`, {
        weight: String(weight),
        style: 'normal',
      });
      return face.load().then((f) => document.fonts.add(f));
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
};
