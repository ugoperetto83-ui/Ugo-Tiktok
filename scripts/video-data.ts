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

// ---------------------------------------------------------------------------
// Hypothèses du scénario
// ---------------------------------------------------------------------------

export const ASSUMPTIONS = {
  monthly: 200, // € investis par mois
  marketRate: 0.08, // rendement annuel moyen supposé (S&P 500)
  cashRate: 0.02, // Livret A / cash
  earlyStart: 20,
  lateStart: 30,
  endAge: 55,
} as const;

const A = ASSUMPTIONS;
const EARLY = Math.round(futureValue(A.monthly, A.marketRate, A.endAge - A.earlyStart)); // ≈ 413 560 €
const LATE = Math.round(futureValue(A.monthly, A.marketRate, A.endAge - A.lateStart)); // ≈ 175 454 €
const GAP = EARLY - LATE; // ≈ 238 106 € → « près de 240 000 € »
const INVESTED_EARLY = A.monthly * 12 * (A.endAge - A.earlyStart);
const INVESTED_LATE = A.monthly * 12 * (A.endAge - A.lateStart);

export const COMPUTED = {EARLY, LATE, GAP, INVESTED_EARLY, INVESTED_LATE};

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
  'intérêts composés',
  'liberté',
  'inflation',
  'S&P 500',
  '240 000 €',
  '10 ans',
  '8 %',
  'aujourd’hui',
  '10 premières années',
  'temps',
];

// ---------------------------------------------------------------------------
// Scénario : « Pourquoi attendre 10 ans pour investir te coûte 240 000 € » (20 s)
// ---------------------------------------------------------------------------

const AGES = Array.from({length: A.endAge - A.earlyStart + 1}, (_, i) => A.earlyStart + i);

export const SCENES: Scene[] = [
  {
    id: 'hook',
    visual: 'counter',
    durationInSeconds: 3,
    subtitle: 'Attendre 10 ans pour investir te coûte près de 240 000 €.',
    accent: 'gold',
    whooshIn: false,
    eyebrow: 'Le prix de 10 ans d’attente',
    caption: '200 €/mois · 8 %/an · jusqu’à 55 ans',
    from: 0,
    to: GAP,
    animation: {delay: 0.25, duration: 2.1, endAtWord: '240\u00A0000\u00A0€'},
    impactAtEnd: true,
  },
  {
    id: 'split',
    visual: 'split',
    durationInSeconds: 4.5,
    subtitle: 'Même 200 € par mois, même 8 % par an. Seule différence : l’âge de départ.',
    accent: 'emerald',
    left: {
      title: 'Dès 20 ans',
      detail: '35 ans d’investissement',
      from: 0,
      to: EARLY,
      invested: INVESTED_EARLY,
      style: 'winner',
    },
    right: {
      title: 'Dès 30 ans',
      detail: '25 ans d’investissement',
      from: 0,
      to: LATE,
      invested: INVESTED_LATE,
      style: 'loser',
    },
    gapLabel: 'Écart à 55 ans',
    gapValue: GAP,
    animation: {delay: 0.35, duration: 2.6},
  },
  {
    id: 'chart',
    visual: 'chart',
    durationInSeconds: 5,
    subtitle: 'Le Livret A suit à peine l’inflation. Le S&P 500 profite des intérêts composés.',
    accent: 'emerald',
    title: '200 €/mois de 20 à 55 ans',
    xValues: AGES,
    xLabelSuffix: ' ans',
    xTicks: [20, 30, 40, 55],
    series: [
      {
        label: 'Livret A / Cash · 2 %',
        style: 'muted',
        values: growthSeries(A.monthly, A.cashRate, A.earlyStart, A.earlyStart, A.endAge),
      },
      {
        label: 'Investissement S&P 500 · 8 %',
        style: 'neon',
        values: growthSeries(A.monthly, A.marketRate, A.earlyStart, A.earlyStart, A.endAge),
      },
    ],
    animation: {delay: 0.3, duration: 3.6},
  },
  {
    id: 'final-number',
    visual: 'counter',
    durationInSeconds: 4,
    subtitle: 'Tes 10 premières années rapportent plus que les 25 suivantes.',
    accent: 'emerald',
    eyebrow: 'Ton patrimoine à 55 ans',
    caption: `en commençant à 20 ans · ${new Intl.NumberFormat('fr-FR').format(INVESTED_EARLY).replace(/\s/g, ' ')} € versés`,
    from: 0,
    to: EARLY,
    animation: {delay: 0.25, duration: 2.6},
    impactAtEnd: true,
  },
  {
    id: 'cta',
    visual: 'statement',
    durationInSeconds: 3.5,
    subtitle: 'Le temps est ton meilleur actif. Ta liberté commence aujourd’hui.',
    accent: 'emerald',
    lines: [{text: 'Commence'}, {text: 'aujourd’hui.', highlight: true}],
    caption: 'Pas dans 10 ans.',
    disclaimer: 'Exemple illustratif · rendement moyen non garanti · pas un conseil en investissement',
    impactAt: 0.35,
  },
];
