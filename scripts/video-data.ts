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
  coffee: 4, // € par café
  daysPerMonth: 30,
  marketRate: 0.08, // rendement annuel moyen supposé
  startAge: 20,
  endAge: 50,
} as const;

const A = ASSUMPTIONS;
const YEARS_N = A.endAge - A.startAge; // 30 ans
const MONTHLY = A.coffee * A.daysPerMonth; // 120 €/mois
const INVESTED_VALUE = Math.round(futureValue(MONTHLY, A.marketRate, YEARS_N)); // ≈ 163 127 € → « plus de 160 000 € »
const PAID = MONTHLY * 12 * YEARS_N; // 43 200 €
const CUPS = PAID / A.coffee; // 10 800 cafés
const TRUE_PRICE = INVESTED_VALUE / CUPS; // ≈ 15,1 € par café → « environ 15 € »

export const COMPUTED = {MONTHLY, INVESTED_VALUE, PAID, CUPS, TRUE_PRICE};

// ---------------------------------------------------------------------------
// Types de scènes
// ---------------------------------------------------------------------------

export type Accent = 'emerald' | 'gold';

/** Poses du personnage (style « pop »). */
export type CharacterPose = 'idle' | 'order' | 'shock' | 'think' | 'happy' | 'point';

export type CharacterCue = {
  /** Pose au début de la scène. */
  pose: CharacterPose;
  /** Pose prise à la fin de l'animation principale (compteur, barres, courbe, impact). */
  then?: CharacterPose;
  /** Tient un gobelet de café. */
  holdsCup?: boolean;
};

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
  /** Personnage fil rouge (style « pop » uniquement). */
  character?: CharacterCue;
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
  /** Libellé du montant `invested` (défaut : « Versé »). */
  investedLabel?: string;
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

/** Le personnage commande au comptoir ; le prix affiché explose ensuite en compteur. */
export type OrderScene = SceneBase & {
  visual: 'order';
  eyebrow: string;
  /** Bulle de dialogue du personnage. */
  bubble: string;
  /** Étiquette collée sur le gobelet (ex : « 4 € »). */
  priceLabel: string;
  /** Arrivée du gobelet sur le comptoir (s). */
  cupAt: number;
  from: number;
  to: number;
  caption?: string;
  animation: AnimationTiming;
  impactAtEnd?: boolean;
};

export type Scene = CounterScene | ChartScene | SplitScene | StatementScene | OrderScene;

// ---------------------------------------------------------------------------
// Configuration globale
// ---------------------------------------------------------------------------

export const VIDEO_CONFIG = {
  id: 'FinanceViral',
  /** Identité visuelle : 'dark' (Dark Finance Minimalist) ou 'pop' (sticker coloré + personnage). */
  style: 'pop' as 'dark' | 'pop',
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
  '4\u00A0€',
  '160\u00A0000\u00A0€',
  '8\u00A0%',
  'rien',
  'intérêts composés',
  '15\u00A0€',
  'investis',
];

// ---------------------------------------------------------------------------
// Scénario : « Ton café à 4 € par jour te coûte 160 000 € » (~25 s, style pop)
// ---------------------------------------------------------------------------

const AGES = Array.from({length: YEARS_N + 1}, (_, i) => A.startAge + i);
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, '\u00A0');

export const SCENES: Scene[] = [
  {
    id: 'hook',
    visual: 'order',
    durationInSeconds: 5,
    subtitle: 'Ton petit café à 4\u00A0€ par jour\u00A0? En vrai, il te coûte plus de 160\u00A0000\u00A0€.',
    accent: 'gold',
    whooshIn: false,
    eyebrow: 'Ton café quotidien',
    bubble: 'Un latte, svp\u00A0!',
    priceLabel: `${A.coffee}\u00A0€`,
    cupAt: 0.8,
    caption: `${MONTHLY}\u00A0€/mois · 8\u00A0%/an · ${YEARS_N}\u00A0ans`,
    from: A.coffee,
    to: INVESTED_VALUE,
    animation: {delay: 2.1, duration: 2.0, endAtWord: '160\u00A0000\u00A0€'},
    impactAtEnd: true,
    character: {pose: 'order', then: 'shock'},
  },
  {
    id: 'split',
    visual: 'split',
    durationInSeconds: 6,
    subtitle: 'Bu chaque jour, il ne reste rien. Investi à 8\u00A0% par an, il devient plus de 160\u00A0000\u00A0€.',
    accent: 'emerald',
    left: {
      title: 'Bu',
      detail: `${YEARS_N} ans de cafés`,
      from: 0,
      to: 0,
      invested: PAID,
      investedLabel: 'Dépensé',
      style: 'loser',
    },
    right: {
      title: 'Investi',
      detail: 'à 8\u00A0%/an',
      from: 0,
      to: INVESTED_VALUE,
      invested: PAID,
      investedLabel: 'Versé',
      style: 'winner',
    },
    gapLabel: 'Différence',
    gapValue: INVESTED_VALUE,
    animation: {delay: 0.35, duration: 2.8},
    character: {pose: 'think', then: 'happy'},
  },
  {
    id: 'chart',
    visual: 'chart',
    durationInSeconds: 5,
    subtitle: 'Au début, ça monte doucement. Puis les intérêts composés font décoller la courbe.',
    accent: 'emerald',
    title: `${A.coffee}\u00A0€/jour de ${A.startAge} à ${A.endAge} ans`,
    xValues: AGES,
    xLabelSuffix: ' ans',
    xTicks: [20, 30, 40, 50],
    series: [
      {
        label: `Versé · ${MONTHLY}\u00A0€/mois`,
        style: 'muted',
        values: AGES.map((age) => MONTHLY * 12 * (age - A.startAge)),
      },
      {
        label: 'Investi à 8\u00A0%/an',
        style: 'neon',
        values: growthSeries(MONTHLY, A.marketRate, A.startAge, A.startAge, A.endAge),
      },
    ],
    animation: {delay: 0.3, duration: 3.6},
    character: {pose: 'point', then: 'happy'},
  },
  {
    id: 'true-price',
    visual: 'counter',
    durationInSeconds: 4,
    subtitle: 'Au final, chaque café à 4\u00A0€ te coûte en vrai environ 15\u00A0€.',
    accent: 'gold',
    eyebrow: 'Le vrai prix d’un café',
    caption: `${fmt(INVESTED_VALUE)}\u00A0€ ÷ ${fmt(CUPS)} cafés`,
    from: A.coffee,
    to: Math.round(TRUE_PRICE),
    animation: {delay: 0.4, duration: 2.4, endAtWord: '15\u00A0€'},
    impactAtEnd: true,
    character: {pose: 'idle', then: 'shock', holdsCup: true},
  },
  {
    id: 'cta',
    visual: 'statement',
    durationInSeconds: 4.5,
    subtitle: 'Pas besoin d’arrêter le café. Investis aussi un peu chaque mois, dès aujourd’hui.',
    accent: 'emerald',
    lines: [{text: 'Bois ton café,'}, {text: 'investis aussi.', highlight: true}],
    caption: 'Un peu chaque mois, dès aujourd’hui.',
    disclaimer: 'Exemple illustratif · rendement moyen non garanti · pas un conseil en investissement',
    impactAt: 0.35,
    character: {pose: 'idle', then: 'happy', holdsCup: true},
  },
];
