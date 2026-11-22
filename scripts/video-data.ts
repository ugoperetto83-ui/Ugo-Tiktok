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

/** Abonnements oubliés (prix illustratifs, noms génériques). */
export const SUBSCRIPTIONS: SubItem[] = [
  {label: 'Streaming vidéo', amount: 13.99, icon: 'play'},
  {label: 'Musique', amount: 7.99, icon: 'music'},
  {label: 'Salle de sport', amount: 17.99, icon: 'gym'},
  {label: 'Appli premium', amount: 4.99, icon: 'star'},
];

export const ASSUMPTIONS = {
  marketRate: 0.08, // rendement annuel moyen supposé
  years: 30,
} as const;

const A = ASSUMPTIONS;
const MONTHLY = SUBSCRIPTIONS.reduce((sum, s) => sum + s.amount, 0); // 44,96 € → « 45 € »
const YEARLY = MONTHLY * 12; // 539,52 € → « 540 € »
const SPENT = Math.round(YEARLY * A.years); // ≈ 16 186 € → « plus de 16 000 € »
const INVESTED_VALUE = Math.round(futureValue(MONTHLY, A.marketRate, A.years)); // ≈ 61 119 € → « plus de 60 000 € »

export const COMPUTED = {MONTHLY, YEARLY, SPENT, INVESTED_VALUE};

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
  icon: 'play' | 'music' | 'gym' | 'star';
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

export type Scene = CounterScene | ChartScene | SplitScene | StatementScene | OrderScene | NotifyScene | ChecklistScene;

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
  '540\u00A0€',
  '45\u00A0€',
  '16\u00A0000\u00A0€',
  '60\u00A0000\u00A0€',
  '8\u00A0%',
  'résilies',
  'investis',
];

// ---------------------------------------------------------------------------
// Scénario : « Tes abonnements oubliés te coûtent 540 € par an » (~25 s, style pop, Léo)
// ---------------------------------------------------------------------------

const NAME = VIDEO_CONFIG.mascot.name;
const euros = (n: number) => `${Math.round(n)}\u00A0€`;

export const SCENES: Scene[] = [
  {
    id: 'hook',
    visual: 'notify',
    durationInSeconds: 4.5,
    subtitle: `Streaming, musique, salle de sport, appli… Ces ${SUBSCRIPTIONS.length} abonnements oubliés te coûtent 540\u00A0€ par an.`,
    accent: 'gold',
    whooshIn: false,
    eyebrow: `Les abos de ${NAME}`,
    notifLabel: 'Prélèvement',
    items: SUBSCRIPTIONS,
    itemsAt: 0.15,
    itemGap: 0.83,
    from: 0,
    to: Math.round(YEARLY),
    suffix: '/an',
    animation: {delay: 3.3, duration: 1.8, endAtWord: '540\u00A0€'},
    impactAtEnd: true,
    character: {pose: 'phone', then: 'shock', holdsPhone: true},
  },
  {
    id: 'thirty-years',
    visual: 'counter',
    durationInSeconds: 5,
    subtitle: `Ça paraît rien, ${euros(MONTHLY)} par mois. Mais sur 30\u00A0ans, c’est plus de 16\u00A0000\u00A0€ envolés.`,
    accent: 'gold',
    eyebrow: `${A.years} ans d’abonnements`,
    caption: `${euros(MONTHLY)}/mois × 12 × ${A.years} ans`,
    from: 0,
    to: SPENT,
    animation: {delay: 1.6, duration: 2.4, endAtWord: '16\u00A0000\u00A0€'},
    impactAtEnd: true,
    character: {pose: 'think', then: 'shock'},
  },
  {
    id: 'split',
    visual: 'split',
    durationInSeconds: 5,
    subtitle: `Investis à 8\u00A0% par an, ces mêmes ${euros(MONTHLY)} deviendraient plus de 60\u00A0000\u00A0€.`,
    accent: 'emerald',
    left: {
      title: 'Abonné',
      detail: `${SUBSCRIPTIONS.length} abos oubliés`,
      from: 0,
      to: 0,
      invested: SPENT,
      investedLabel: 'Dépensé',
      style: 'loser',
    },
    right: {
      title: 'Investi',
      detail: 'à 8\u00A0%/an',
      from: 0,
      to: INVESTED_VALUE,
      invested: SPENT,
      investedLabel: 'Versé',
      style: 'winner',
    },
    gapLabel: 'Différence',
    gapValue: INVESTED_VALUE,
    animation: {delay: 0.35, duration: 2.8},
    character: {pose: 'think', then: 'happy'},
  },
  {
    id: 'cleanup',
    visual: 'checklist',
    durationInSeconds: 5,
    subtitle: 'Alors fais le tri\u00A0: chaque abonnement que tu n’as pas utilisé ce mois-ci, tu le résilies.',
    accent: 'emerald',
    title: `Le grand tri de ${NAME}`,
    items: SUBSCRIPTIONS,
    amountSuffix: '/mois',
    stamp: 'Résilié',
    strikeAt: 0.9,
    strikeGap: 0.55,
    savedLabel: `+${euros(MONTHLY)}/mois à investir`,
    character: {pose: 'point', then: 'happy'},
  },
  {
    id: 'cta',
    visual: 'statement',
    durationInSeconds: 4.5,
    subtitle: 'Garde seulement ce que tu utilises vraiment, et investis tout le reste chaque mois.',
    accent: 'emerald',
    lines: [{text: 'Résilie,'}, {text: 'investis.', highlight: true}],
    caption: 'Garde seulement ce que tu utilises.',
    disclaimer: 'Exemple illustratif · prix indicatifs · rendement moyen non garanti · pas un conseil en investissement',
    impactAt: 0.35,
    character: {pose: 'idle', then: 'happy'},
  },
];
