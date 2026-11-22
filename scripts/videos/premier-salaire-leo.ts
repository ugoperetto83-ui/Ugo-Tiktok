// ARCHIVE — vidéo « Le premier salaire de Léo » (style pop). Pour la re-rendre : copier ce fichier sur scripts/video-data.ts puis `npm run make -- out/premier-salaire-leo.mp4`.
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
  salary: 1600, // € net par mois
  needs: 0.5, // règle 50/30/20
  wants: 0.3,
  future: 0.2,
  marketRate: 0.08, // rendement annuel moyen supposé
  startAge: 22,
  endAge: 52,
} as const;

const A = ASSUMPTIONS;
const YEARS_N = A.endAge - A.startAge; // 30 ans
const SAVED = A.salary * A.future; // 320 €/mois
const LEFT = A.salary - SAVED; // 1 280 €/mois pour vivre
const PAID = SAVED * 12 * YEARS_N; // 115 200 € → « 115 000 € »
const FINAL = Math.round(futureValue(SAVED, A.marketRate, YEARS_N)); // ≈ 435 008 € → « plus de 430 000 € »

export const COMPUTED = {SAVED, LEFT, PAID, FINAL};

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

export type Scene =
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
  '320\u00A0€',
  '430\u00A0000\u00A0€',
  '50\u00A0%',
  '30\u00A0%',
  '20\u00A0%',
  'intérêts composés',
  '1\u00A0280\u00A0€',
  'paie-toi en premier',
];

// ---------------------------------------------------------------------------
// Scénario : « Le premier salaire de Léo » (~25 s, style pop)
// ---------------------------------------------------------------------------

const NAME = VIDEO_CONFIG.mascot.name;
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, '\u00A0');
const pct = (x: number) => `${Math.round(x * 100)}\u00A0%`;
const AGES = Array.from({length: YEARS_N + 1}, (_, i) => A.startAge + i);

export const SCENES: Scene[] = [
  {
    id: 'hook',
    visual: 'notify',
    durationInSeconds: 6,
    subtitle: `${NAME} met ${SAVED}\u00A0€ de côté chaque mois, dès son premier salaire. À ${A.endAge}\u00A0ans\u00A0: plus de 430\u00A0000\u00A0€.`,
    accent: 'emerald',
    whooshIn: false,
    eyebrow: `Le premier salaire de ${NAME}`,
    notifLabel: 'Virement reçu',
    items: [{label: 'Salaire', amount: A.salary, icon: 'euro', incoming: true}],
    itemsAt: 0.2,
    itemGap: 0.5,
    from: 0,
    to: FINAL,
    animation: {delay: 3.4, duration: 2.0, endAtWord: '430\u00A0000\u00A0€'},
    impactAtEnd: true,
    character: {pose: 'phone', then: 'happy', holdsPhone: true},
  },
  {
    id: 'jars',
    visual: 'jars',
    durationInSeconds: 6,
    subtitle: `La règle de ${NAME}\u00A0: ${pct(A.needs)} pour les besoins, ${pct(A.wants)} pour les envies, ${pct(A.future)} pour le futur.`,
    accent: 'emerald',
    title: 'La règle 50/30/20',
    total: A.salary,
    totalLabel: `${fmt(A.salary)}\u00A0€ net`,
    jars: [
      {label: 'Besoins', share: A.needs, color: 'violet'},
      {label: 'Envies', share: A.wants, color: 'coral'},
      {label: 'Futur', share: A.future, color: 'mint'},
    ],
    fillAt: [1.15, 2.75, 4.1],
    fillDuration: 0.9,
    character: {pose: 'think', then: 'happy'},
  },
  {
    id: 'chart',
    visual: 'chart',
    durationInSeconds: 5,
    subtitle: 'Grâce aux intérêts composés, 115\u00A0000\u00A0€ versés deviennent plus de 430\u00A0000\u00A0€.',
    accent: 'emerald',
    title: `${SAVED}\u00A0€/mois de ${A.startAge} à ${A.endAge} ans`,
    xValues: AGES,
    xLabelSuffix: ' ans',
    xTicks: [22, 32, 42, 52],
    series: [
      {label: `Versé · ${SAVED}\u00A0€/mois`, style: 'muted', values: AGES.map((age) => SAVED * 12 * (age - A.startAge))},
      {label: 'Investi à 8\u00A0%/an', style: 'neon', values: growthSeries(SAVED, A.marketRate, A.startAge, A.startAge, A.endAge)},
    ],
    animation: {delay: 0.3, duration: 3.6},
    character: {pose: 'point', then: 'happy'},
  },
  {
    id: 'left',
    visual: 'counter',
    durationInSeconds: 4.5,
    subtitle: `Et il reste quand même 1\u00A0280\u00A0€ par mois pour vivre et se faire plaisir.`,
    accent: 'emerald',
    eyebrow: 'Chaque mois, pour vivre',
    caption: `Besoins ${fmt(A.salary * A.needs)}\u00A0€ · Envies ${fmt(A.salary * A.wants)}\u00A0€`,
    from: 0,
    to: LEFT,
    animation: {delay: 0.15, duration: 2.0, endAtWord: '1\u00A0280\u00A0€'},
    impactAtEnd: true,
    character: {pose: 'idle', then: 'happy', holdsCup: true},
  },
  {
    id: 'cta',
    visual: 'statement',
    durationInSeconds: 4,
    subtitle: 'Ton premier salaire\u00A0? Paie-toi en premier, avant de dépenser le reste.',
    accent: 'emerald',
    lines: [{text: 'Paie-toi'}, {text: 'en premier.', highlight: true}],
    caption: 'Avant de dépenser le reste.',
    disclaimer: 'Exemple illustratif · rendement moyen non garanti · pas un conseil en investissement',
    impactAt: 0.35,
    character: {pose: 'idle', then: 'happy'},
  },
];
