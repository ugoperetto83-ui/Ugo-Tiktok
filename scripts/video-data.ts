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

/** Versement mensuel nécessaire pour atteindre `target` en `years` ans (inverse de futureValue). */
export const requiredMonthly = (target: number, annualRate: number, years: number): number =>
  target / futureValue(1, annualRate, years);

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
  phonePrice: 1200, // prix du dernier modèle (€)
  years: 10, // horizon
  keepYears: 3, // « garder le tien 2 ans de plus » : un téléphone tous les 3 ans
  marketRate: 0.07, // rendement annuel moyen supposé de l'écart placé
  startYear: 2026,
} as const;

const A = ASSUMPTIONS;
const PHONES_EVERY_YEAR = A.years; // 10 téléphones
const PHONES_KEEP = Math.ceil(A.years / A.keepYears); // 4 téléphones (années 0, 3, 6, 9)
const SPENT_EVERY_YEAR = PHONES_EVERY_YEAR * A.phonePrice; // 12 000 €
const SPENT_KEEP = PHONES_KEEP * A.phonePrice; // 4 800 €
const GAP = SPENT_EVERY_YEAR - SPENT_KEEP; // 7 200 €
const GAP_MONTHLY = GAP / A.years / 12; // 60 €/mois
const INVESTED_GAP = Math.round(futureValue(GAP_MONTHLY, A.marketRate, A.years)); // ≈ 9 948 € → « près de 10 000 € »

export const COMPUTED = {PHONES_EVERY_YEAR, PHONES_KEEP, SPENT_EVERY_YEAR, SPENT_KEEP, GAP, GAP_MONTHLY, INVESTED_GAP};

// ---------------------------------------------------------------------------
// Types de scènes
// ---------------------------------------------------------------------------

export type Accent = 'emerald' | 'gold';

/** Poses du personnage (style « pop »). */
export type CharacterPose = 'idle' | 'order' | 'shock' | 'think' | 'happy' | 'point' | 'phone';

export type CharacterCue = {
  /** Pose au début de la scène. */
  pose: CharacterPose;
  /** Pose prise à la fin de l'animation principale (compteur, barres, courbe, impact). */
  then?: CharacterPose;
  /** Tient un gobelet de café. */
  holdsCup?: boolean;
  /** Tient un téléphone (pose « phone » conseillée). */
  holdsPhone?: boolean;
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

/** Un abonnement (ou toute dépense récurrente) affiché en notification / ligne de liste. */
export type SubItem = {
  label: string;
  /** Montant mensuel (€, centimes acceptés). */
  amount: number;
  icon: 'play' | 'music' | 'gym' | 'star' | 'euro';
  /** Argent reçu (affiché « +… € » en vert) plutôt que prélevé. */
  incoming?: boolean;
};

/** Notifications de prélèvement qui s'empilent sur un téléphone, puis compteur du total. */
export type NotifyScene = SceneBase & {
  visual: 'notify';
  eyebrow: string;
  /** Petit libellé au-dessus de chaque notification (ex : « Prélèvement »). */
  notifLabel: string;
  items: SubItem[];
  /** Arrivée de la 1re notification (s) puis écart entre deux (s). */
  itemsAt: number;
  itemGap: number;
  from: number;
  to: number;
  /** Suffixe affiché après le compteur (ex : « /an »). */
  suffix?: string;
  caption?: string;
  animation: AnimationTiming;
  impactAtEnd?: boolean;
};

/** Liste d'abonnements barrés un à un (tampon), puis pastille d'économie. */
export type ChecklistScene = SceneBase & {
  visual: 'checklist';
  title: string;
  items: SubItem[];
  /** Suffixe des montants (ex : « /mois »). */
  amountSuffix: string;
  /** Tampon posé sur chaque ligne barrée. */
  stamp: string;
  /** Première rature (s) puis écart entre deux (s). */
  strikeAt: number;
  strikeGap: number;
  /** Pastille finale (ex : « +45 €/mois à investir »). */
  savedLabel: string;
};

/** Un bocal de la répartition budgétaire. */
export type Jar = {
  label: string;
  /** Part du total (0–1). */
  share: number;
  color: 'violet' | 'coral' | 'mint';
};

/** Le total tombe en pièces dans des bocaux qui se remplissent un à un. */
export type JarsScene = SceneBase & {
  visual: 'jars';
  title: string;
  /** Montant réparti (€). */
  total: number;
  totalLabel: string;
  jars: Jar[];
  /** Début du remplissage de chaque bocal (s, à caler sur les mots de la voix). */
  fillAt: number[];
  /** Durée de remplissage d'un bocal (s). */
  fillDuration: number;
};

/** Carte de fin : logo du compte (scripts/brand.ts) + appel à s'abonner. */
export type EndCardScene = SceneBase & {
  visual: 'endcard';
  /** Texte de la pastille (ex : « Abonne-toi pour la suite »). */
  cta: string;
  /** Texte du bouton (ex : « S'abonner »). */
  button: string;
};

export type Scene =
  | EndCardScene
  | CounterScene
  | ChartScene
  | SplitScene
  | StatementScene
  | OrderScene
  | NotifyScene
  | ChecklistScene
  | JarsScene;

// ---------------------------------------------------------------------------
// Configuration globale
// ---------------------------------------------------------------------------

export const VIDEO_CONFIG = {
  id: 'FinanceViral',
  /** Identité visuelle : 'dark' (Dark Finance Minimalist) ou 'pop' (sticker coloré + personnage). */
  style: 'pop' as 'dark' | 'pop',
  /** Mascotte de la série (style « pop »). */
  mascot: {name: 'Léo'},
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
  '12\u00A0000\u00A0€',
  '4\u00A0800\u00A0€',
  '7\u00A0200\u00A0€',
  '60\u00A0€',
  '10\u00A0000\u00A0€',
  'Garde-le.',
  'Léo & la Thune',
];

// ---------------------------------------------------------------------------
// Scénario : « Le téléphone neuf à chaque sortie » (~25 s, style pop + carte de fin)
// ---------------------------------------------------------------------------

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, '\u00A0');
const YEARS = Array.from({length: A.years + 1}, (_, i) => A.startYear + i);

export const SCENES: Scene[] = [
  {
    id: 'hook',
    visual: 'counter',
    durationInSeconds: 4.5,
    subtitle: `Un téléphone neuf à chaque sortie\u00A0? C’est ${fmt(SPENT_EVERY_YEAR)}\u00A0€ en ${A.years}\u00A0ans.`,
    accent: 'gold',
    whooshIn: false,
    eyebrow: 'Le dernier modèle, chaque année',
    caption: `${PHONES_EVERY_YEAR} téléphones × ${fmt(A.phonePrice)}\u00A0€`,
    from: 0,
    to: SPENT_EVERY_YEAR,
    animation: {delay: 0.2, duration: 1.6, endAtWord: `${fmt(SPENT_EVERY_YEAR)}\u00A0€`},
    impactAtEnd: true,
    character: {pose: 'phone', holdsPhone: true, then: 'shock'},
  },
  {
    id: 'split',
    visual: 'split',
    durationInSeconds: 5,
    subtitle: `Garde le tien 2\u00A0ans de plus\u00A0: ${PHONES_KEEP} téléphones au lieu de ${PHONES_EVERY_YEAR}, soit ${fmt(SPENT_KEEP)}\u00A0€.`,
    // Le montant seul en fin de phrase était lu en anglais par la voix multilingue : on l'écrit en toutes lettres.
    voiceText: `Garde le tien 2 ans de plus : ${PHONES_KEEP} téléphones au lieu de ${PHONES_EVERY_YEAR}, soit quatre mille huit cents euros.`,
    accent: 'emerald',
    left: {
      title: 'Chaque année',
      detail: `${PHONES_EVERY_YEAR} téléphones · ${A.years} ans`,
      from: 0,
      to: SPENT_EVERY_YEAR,
      invested: A.phonePrice,
      investedLabel: 'Le tél',
      style: 'loser',
    },
    right: {
      title: `Tous les ${A.keepYears} ans`,
      detail: `${PHONES_KEEP} téléphones · ${A.years} ans`,
      from: 0,
      to: SPENT_KEEP,
      invested: A.phonePrice,
      investedLabel: 'Le tél',
      style: 'winner',
    },
    gapLabel: 'Économie',
    gapValue: GAP,
    animation: {delay: 0.35, duration: 2.6},
    character: {pose: 'think', then: 'happy'},
  },
  {
    id: 'chart',
    visual: 'chart',
    durationInSeconds: 5,
    subtitle: `Les ${fmt(GAP)}\u00A0€ d’écart, c’est ${fmt(GAP_MONTHLY)}\u00A0€ par mois. Placés, ils travaillent pour toi.`,
    accent: 'emerald',
    title: `${fmt(GAP_MONTHLY)}\u00A0€/mois placés à ${Math.round(A.marketRate * 100)}\u00A0%`,
    xValues: YEARS,
    xLabelSuffix: '',
    xTicks: [YEARS[0], YEARS[5], YEARS[A.years]],
    series: [
      {label: 'Tél neuf chaque année · 0\u00A0€ de côté', style: 'muted', values: YEARS.map(() => 0)},
      {label: `Tous les ${A.keepYears} ans · ${fmt(GAP_MONTHLY)}\u00A0€/mois placés`, style: 'neon', values: YEARS.map((_, y) => Math.round(futureValue(GAP_MONTHLY, A.marketRate, y)))},
    ],
    animation: {delay: 0.3, duration: 3.6},
    character: {pose: 'point', then: 'happy'},
  },
  {
    id: 'final',
    visual: 'counter',
    durationInSeconds: 4,
    subtitle: `Au bout de ${A.years}\u00A0ans\u00A0: près de 10\u00A0000\u00A0€ dans ta poche.`,
    accent: 'gold',
    eyebrow: `Après ${A.years} ans`,
    caption: `${fmt(GAP)}\u00A0€ versés + les intérêts`,
    from: 0,
    to: INVESTED_GAP,
    animation: {delay: 0.3, duration: 1.8, endAtWord: '10\u00A0000\u00A0€'},
    impactAtEnd: true,
    character: {pose: 'idle', then: 'happy'},
  },
  {
    id: 'cta',
    visual: 'statement',
    durationInSeconds: 3.5,
    subtitle: 'Ton téléphone marche encore\u00A0? Garde-le. Ta thune te dira merci.',
    accent: 'emerald',
    lines: [{text: 'Il marche\u00A0?'}, {text: 'Garde-le.', highlight: true}],
    caption: 'Ta thune te dira merci.',
    disclaimer: 'Exemple illustratif · rendement moyen non garanti · pas un conseil en investissement',
    impactAt: 1.6,
    character: {pose: 'phone', holdsPhone: true, then: 'happy'},
  },
  {
    id: 'endcard',
    visual: 'endcard',
    durationInSeconds: 2.5,
    subtitle: 'Abonne-toi à Léo & la Thune pour la suite\u00A0!',
    voiceText: 'Abonne-toi à Léo et la Thune pour la suite !',
    accent: 'gold',
    cta: 'Abonne-toi pour la suite',
    button: 'S’abonner',
  },
];
