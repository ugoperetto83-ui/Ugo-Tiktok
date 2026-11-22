// ARCHIVE — vidéo « L’inflation à 3 % divise ton épargne par 2 en 24 ans ». Pour la re-rendre : copier ce fichier sur scripts/video-data.ts puis `npm run make -- out/inflation-24-ans.mp4`.
/**
 * DONNÉES DE LA VIDÉO — aucune logique visuelle ici.
 *
 * Pour créer une nouvelle vidéo : modifie `VIDEO_CONFIG`, `KEYWORDS` et `SCENES`,
 * puis lance `npm run voice` (voix off edge-tts) et `npm run render`.
 *
 * Voix off : chaque `subtitle` est lu par edge-tts (scripts/generate_voice.py). La durée de
 * chaque scène est alors calée AUTOMATIQUEMENT sur la longueur exacte de son fichier audio
 * (+ `VIDEO_CONFIG.voice.padding`), et les sous-titres sur les horodatages mot par mot de la voix.
 * `durationInSeconds` ne sert que de secours si la voix n'a pas encore été générée.
 * Astuce : utilise une espace insécable ( ) pour garder « 240 000 € » en un seul mot.
 */

// ---------------------------------------------------------------------------
// Helpers financiers (purs) : les chiffres sont calculés, jamais saisis à la main
// ---------------------------------------------------------------------------

/** Valeur future de versements annuels constants (versés en fin d'année), capitalisés au taux annuel. */
export const futureValue = (monthly: number, annualRate: number, years: number): number => {
  const yearly = monthly * 12;
  if (years <= 0) return 0;
  if (annualRate === 0) return yearly * years;
  return yearly * ((Math.pow(1 + annualRate, years) - 1) / annualRate);
};

/** Valeur du portefeuille à chaque âge, de `fromAge` à `toAge` (inclus). 0 avant `startAge`. */
export const growthSeries = (
  monthly: number,
  annualRate: number,
  startAge: number,
  fromAge: number,
  toAge: number,
): number[] => {
  const out: number[] = [];
  for (let age = fromAge; age <= toAge; age++) {
    out.push(Math.round(futureValue(monthly, annualRate, age - startAge)));
  }
  return out;
};

/** Pouvoir d'achat (en euros d'aujourd'hui) d'un capital placé à `rate` pendant `years` ans d'inflation. */
export const realValue = (amount: number, rate: number, inflation: number, years: number): number =>
  amount * Math.pow((1 + rate) / (1 + inflation), years);

/** Pouvoir d'achat année par année, de 0 à `years` (inclus). */
export const realSeries = (amount: number, rate: number, inflation: number, years: number): number[] =>
  Array.from({length: years + 1}, (_, y) => Math.round(realValue(amount, rate, inflation, y)));

// ---------------------------------------------------------------------------
// Hypothèses du scénario
// ---------------------------------------------------------------------------

export const ASSUMPTIONS = {
  savings: 10_000, // € d'épargne
  inflation: 0.03, // inflation annuelle
  years: 24,
  investRate: 0.05, // placement alternatif (rendement nominal)
  basket: 100, // caddie de courses (€ aujourd'hui)
  startYear: 2026,
} as const;

const A = ASSUMPTIONS;
const SLEEPING = Math.round(realValue(A.savings, 0, A.inflation, A.years)); // ≈ 4 919 € → « moins de 5 000 € »
const LOSS = A.savings - SLEEPING; // ≈ 5 081 €
const INVESTED = Math.round(realValue(A.savings, A.investRate, A.inflation, A.years)); // ≈ 15 8xx € (euros constants)
const BASKET = Math.round(A.basket * Math.pow(1 + A.inflation, A.years)); // ≈ 203 € → « plus de 200 € »

export const COMPUTED = {SLEEPING, LOSS, INVESTED, BASKET};

// ---------------------------------------------------------------------------
// Types de scènes
// ---------------------------------------------------------------------------

export type Accent = 'emerald' | 'gold';

export type AnimationTiming = {
  /** Délai avant le début de l'animation (s, relatif au début de la scène). */
  delay: number;
  /** Durée de l'animation (s). Compressée automatiquement si la voix rend la scène plus courte. */
  duration: number;
  /** Optionnel : l'animation se termine pile quand la voix prononce ce mot (ex : '240\u00A0000\u00A0€'). */
  endAtWord?: string;
};

type SceneBase = {
  id: string;
  /** Durée de secours (s), utilisée uniquement sans voix off générée. */
  durationInSeconds: number;
  /** Texte du sous-titre ET de la voix off, synchronisé mot par mot. */
  subtitle: string;
  /** Optionnel : texte lu par la voix s'il doit différer du sous-titre (prononciation). */
  voiceText?: string;
  /** Couleur du halo derrière les chiffres clés. */
  accent: Accent;
  /** Joue un « whoosh » à l'entrée de la scène (défaut : true sauf 1re scène). */
  whooshIn?: boolean;
};

export type CounterScene = SceneBase & {
  visual: 'counter';
  from: number;
  to: number;
  /** Petit libellé au-dessus du compteur. */
  eyebrow: string;
  /** Libellé sous le compteur. */
  caption?: string;
  animation: AnimationTiming;
  /** Impact grave quand le compteur atteint sa valeur finale. */
  impactAtEnd?: boolean;
  /** Sens de la mini-courbe sous le compteur (défaut : 'up'). */
  trend?: 'up' | 'down';
};

export type ChartSeries = {
  label: string;
  /** 'muted' = gris terne, 'neon' = vert néon + aire dégradée. */
  style: 'muted' | 'neon';
  values: number[];
};

export type ChartScene = SceneBase & {
  visual: 'chart';
  title: string;
  /** Valeurs de l'axe X (une par point de chaque série). */
  xValues: number[];
  xLabelSuffix: string;
  /** Graduations X à afficher. */
  xTicks: number[];
  series: ChartSeries[];
  animation: AnimationTiming;
};

export type SplitSide = {
  title: string;
  detail: string;
  from: number;
  to: number;
  invested: number;
  style: 'winner' | 'loser';
};

export type SplitScene = SceneBase & {
  visual: 'split';
  left: SplitSide;
  right: SplitSide;
  /** Badge affiché une fois les barres remplies (ex : l'écart). */
  gapLabel: string;
  gapValue: number;
  animation: AnimationTiming;
};

export type StatementScene = SceneBase & {
  visual: 'statement';
  lines: {text: string; highlight?: boolean}[];
  caption?: string;
  disclaimer?: string;
  /** Instant (s) de l'impact visuel + sonore. */
  impactAt?: number;
};

export type Scene = CounterScene | ChartScene | SplitScene | StatementScene;

// ---------------------------------------------------------------------------
// Configuration globale
// ---------------------------------------------------------------------------

export const VIDEO_CONFIG = {
  id: 'FinanceViral',
  width: 1080,
  height: 1920,
  fps: 60,
  /** Fichier audio mixé généré par `npm run audio` (dans /public). */
  soundtrack: 'sfx/soundtrack.wav',
  /** Volume des bruitages sous la voix (0–1). */
  sfxVolume: 0.55,
  voice: {
    /** Voix edge-tts principale + débit accéléré pour le rythme TikTok. */
    name: 'fr-FR-RemyMultilingualNeural',
    rate: '+12%',
    /** Voix de secours si la principale échoue. */
    fallbackName: 'fr-FR-HenriNeural',
    fallbackRate: '+12%',
    /** Silence ajouté après chaque réplique avant la coupe (s). */
    padding: 0.08,
    /** Silence avant la première réplique (s). */
    leadIn: 0.1,
    /** Temps de pose supplémentaire à la fin de la dernière scène (s). */
    endHold: 0.7,
    /** Dossier de sortie dans /public. */
    dir: 'voice',
  },
} as const;

/** Mots-clés mis en valeur en vert émeraude dans les sous-titres (insensible à la casse). */
export const KEYWORDS: string[] = [
  'inflation',
  'par 2',
  '24\u00A0ans',
  '5\u00A0000\u00A0€',
  '5\u00A0%',
  '200\u00A0€',
  'travailler',
];

// ---------------------------------------------------------------------------
// Scénario : « L'inflation à 3 % divise ton épargne par 2 en 24 ans » (~25 s)
// ---------------------------------------------------------------------------

const YEARS = Array.from({length: A.years + 1}, (_, i) => i);
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, '\u00A0');

export const SCENES: Scene[] = [
  {
    id: 'hook',
    visual: 'counter',
    durationInSeconds: 4,
    subtitle: 'L’inflation à 3\u00A0% divise ton épargne par 2 en seulement 24\u00A0ans.',
    accent: 'gold',
    whooshIn: false,
    eyebrow: `Pouvoir d’achat de ${fmt(A.savings)}\u00A0€`,
    caption: `Inflation 3\u00A0%/an · ${A.startYear} → ${A.startYear + A.years}`,
    from: A.savings,
    to: SLEEPING,
    trend: 'down',
    animation: {delay: 0.25, duration: 2.6, endAtWord: 'ans'},
    impactAtEnd: true,
  },
  {
    id: 'split',
    visual: 'split',
    durationInSeconds: 5.5,
    subtitle: 'Sur ton compte, tu vois toujours 10\u00A0000\u00A0€. Mais en vrai, ils valent moins de 5\u00A0000\u00A0€.',
    accent: 'gold',
    left: {
      title: 'Ton compte',
      detail: `en ${A.startYear + A.years}`,
      from: 0,
      to: A.savings,
      invested: A.savings,
      style: 'winner',
    },
    right: {
      title: 'En vrai',
      detail: 'pouvoir d’achat',
      from: 0,
      to: SLEEPING,
      invested: A.savings,
      style: 'loser',
    },
    gapLabel: 'Perte invisible',
    gapValue: -LOSS,
    animation: {delay: 0.35, duration: 2.8},
  },
  {
    id: 'chart',
    visual: 'chart',
    durationInSeconds: 5.5,
    subtitle: 'L’argent qui dort fond chaque année. Placé à 5\u00A0%, il garde une longueur d’avance sur les prix.',
    accent: 'emerald',
    title: `Pouvoir d’achat de ${fmt(A.savings)}\u00A0€`,
    xValues: YEARS,
    xLabelSuffix: ' ans',
    xTicks: [0, 8, 16, 24],
    series: [
      {
        label: 'Argent qui dort · 0\u00A0%',
        style: 'muted',
        values: realSeries(A.savings, 0, A.inflation, A.years),
      },
      {
        label: 'Placé à 5\u00A0%/an',
        style: 'neon',
        values: realSeries(A.savings, A.investRate, A.inflation, A.years),
      },
    ],
    animation: {delay: 0.3, duration: 3.8},
  },
  {
    id: 'basket',
    visual: 'counter',
    durationInSeconds: 3.5,
    subtitle: `Et ton caddie de 100\u00A0€ coûtera plus de 200\u00A0€ en ${A.startYear + A.years}.`,
    accent: 'gold',
    eyebrow: `Ton caddie de ${A.basket}\u00A0€ en ${A.startYear + A.years}`,
    caption: 'Mêmes courses · inflation 3\u00A0%/an',
    from: A.basket,
    to: BASKET,
    animation: {delay: 0.25, duration: 2.2, endAtWord: '200\u00A0€'},
    impactAtEnd: true,
  },
  {
    id: 'cta',
    visual: 'statement',
    durationInSeconds: 4,
    subtitle: 'Alors ne laisse pas dormir ton épargne. Fais-la travailler plus vite que l’inflation, dès aujourd’hui.',
    accent: 'emerald',
    lines: [{text: 'Fais-la'}, {text: 'travailler.', highlight: true}],
    caption: 'Plus vite que l’inflation.',
    disclaimer: 'Exemple illustratif · inflation et rendement constants supposés · pas un conseil en investissement',
    impactAt: 0.35,
  },
];
