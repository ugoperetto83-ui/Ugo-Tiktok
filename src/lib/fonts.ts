import {continueRender, delayRender, staticFile} from 'remotion';

const WEIGHTS: [string, number][] = [
  ['Inter-Medium.otf', 500],
  ['Inter-Bold.otf', 700],
  ['Inter-ExtraBold.otf', 800],
  ['Inter-Black.otf', 900],
];

/** Police arrondie du style « pop ». */
const ROUNDED: [string, number][] = [
  ['Fredoka-500.woff2', 500],
  ['Fredoka-600.woff2', 600],
  ['Fredoka-700.woff2', 700],
];

let loaded = false;

/** Charge Inter depuis /public/fonts et bloque le rendu tant que la police n'est pas prête. */
export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Chargement des polices');
  const faces = [
    ...WEIGHTS.map(([file, weight]) => ['Inter', file, weight, 'opentype'] as const),
    ...ROUNDED.map(([file, weight]) => ['Fredoka', file, weight, 'woff2'] as const),
  ];
  Promise.all(
    faces.map(([family, file, weight, format]) => {
      const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('${format}')`, {
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
