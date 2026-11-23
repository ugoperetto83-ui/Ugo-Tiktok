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
  restaurantPrice: 15, // prix du burger au resto / à emporter (€)
  appPrice: 17, // même burger sur l'appli de livraison (prix majorés ≈ +13 %)
  deliveryFee: 2.99, // frais de livraison (€)
  serviceFee: 1.99, // frais de service (€)
  ordersPerWeek: 2,
  weeksPerYear: 52,
} as const;

const A = ASSUMPTIONS;
const DELIVERED_PRICE = Math.round((A.appPrice + A.deliveryFee + A.serviceFee) * 100) / 100; // 21,98 € → « 22 € »
const EXTRA_PER_ORDER = Math.round((DELIVERED_PRICE - A.restaurantPrice) * 100) / 100; // 6,98 € → « 7 € de plus »
const ORDERS_PER_YEAR = A.ordersPerWeek * A.weeksPerYear; // 104 commandes
const YEAR_TOTAL = Math.round(DELIVERED_PRICE * ORDERS_PER_YEAR); // ≈ 2 286 € → « près de 2 300 € »
const YEAR_BURGERS = A.restaurantPrice * ORDERS_PER_YEAR; // 1 560 €
const YEAR_EXTRA = YEAR_TOTAL - YEAR_BURGERS; // ≈ 726 € → « plus de 700 € »

export const COMPUTED = {DELIVERED_PRICE, EXTRA_PER_ORDER, ORDERS_PER_YEAR, YEAR_TOTAL, YEAR_BURGERS, YEAR_EXTRA};

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
  /** Décor : café au comptoir (défaut) ou livraison (scooter + sac + burger). */
  prop?: 'cup' | 'delivery';
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
  icon: 'play' | 'music' | 'gym' | 'star' | 'euro' | 'burger' | 'scooter' | 'fee';
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
  /** Préfixe affiché avant le compteur (ex : « + »). */
  prefix?: string;
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
  sfxVolume: 0.35,
  /** Volume des impacts graves (« boom ») dans le mixage des bruitages (0–1). */
  impactVolume: 0.3,
  voice: {
    /** Voix edge-tts principale + débit accéléré pour le rythme TikTok. */
    name: 'fr-FR-RemyMultilingualNeural',
    rate: '+20%',
    /** Voix de secours si la principale échoue. */
    fallbackName: 'fr-FR-HenriNeural',
    fallbackRate: '+20%',
    /** Silence ajouté après chaque réplique avant la coupe (s). */
    padding: 0.05,
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
  '15\u00A0€',
  '22\u00A0€',
  '7\u00A0€',
  '2\u00A0300\u00A0€',
  '700\u00A0€',
  'à emporter',
  'Léo & la Thune',
];

// ---------------------------------------------------------------------------
// Scénario : « Ton burger à 15 € t'en coûte 22 en vrai » (~25 s, style pop + carte de fin)
// ---------------------------------------------------------------------------

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, '\u00A0');
const cents = (n: number) =>
  new Intl.NumberFormat('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n).replace(/\s/g, '\u00A0');

export const SCENES: Scene[] = [
  {
    id: 'punch',
    visual: 'counter',
    durationInSeconds: 3,
    subtitle: `${Math.round(DELIVERED_PRICE)}\u00A0€ le burger, et t’en commandes combien par semaine\u00A0?`,
    accent: 'gold',
    whooshIn: false,
    eyebrow: 'Ton burger livré',
    caption: 'Tu commandes combien de fois par semaine\u00A0?',
    from: 0,
    to: Math.round(DELIVERED_PRICE),
    animation: {delay: 0, duration: 0.5, endAtWord: `${Math.round(DELIVERED_PRICE)}\u00A0€`},
    impactAtEnd: true,
    character: {pose: 'shock', holdsPhone: true},
  },
  {
    id: 'hook',
    visual: 'order',
    prop: 'delivery',
    durationInSeconds: 5,
    subtitle: `Rembobine\u00A0: au resto, il coûte ${A.restaurantPrice}\u00A0€, livré, ${Math.round(DELIVERED_PRICE)}\u00A0€.`,
    accent: 'gold',
    eyebrow: 'Ta livraison du soir',
    bubble: 'Un burger, livré\u00A0!',
    priceLabel: `${A.restaurantPrice}\u00A0€`,
    cupAt: 0.7,
    caption: `${A.appPrice}\u00A0€ + ${cents(A.deliveryFee)}\u00A0€ + ${cents(A.serviceFee)}\u00A0€`,
    from: A.restaurantPrice,
    to: Math.round(DELIVERED_PRICE),
    animation: {delay: 2.2, duration: 1.1, endAtWord: `${Math.round(DELIVERED_PRICE)}\u00A0€`},
    impactAtEnd: true,
    character: {pose: 'phone', then: 'shock', holdsPhone: true},
  },
  {
    id: 'ticket',
    visual: 'notify',
    durationInSeconds: 6,
    subtitle: `Sur l’appli il passe à ${A.appPrice}\u00A0€, ajoute livraison et frais\u00A0: ${Math.round(EXTRA_PER_ORDER)}\u00A0€ de plus.`,
    accent: 'gold',
    eyebrow: 'Ton ticket',
    notifLabel: 'Commande',
    items: [
      {label: 'Burger (prix appli)', amount: A.appPrice, icon: 'burger'},
      {label: 'Livraison', amount: A.deliveryFee, icon: 'scooter'},
      {label: 'Frais de service', amount: A.serviceFee, icon: 'fee'},
    ],
    itemsAt: 0.9,
    itemGap: 0.8,
    from: 0,
    to: Math.round(EXTRA_PER_ORDER),
    prefix: '+',
    animation: {delay: 2.75, duration: 0.3, endAtWord: `${Math.round(EXTRA_PER_ORDER)}\u00A0€`},
    impactAtEnd: true,
    character: {pose: 'think', then: 'shock'},
  },
  {
    id: 'year',
    visual: 'counter',
    durationInSeconds: 4.5,
    subtitle: 'Deux commandes par semaine, ça fait près de 2\u00A0300\u00A0€ par an.',
    accent: 'gold',
    eyebrow: 'En un an',
    caption: `${ORDERS_PER_YEAR} commandes × ${cents(DELIVERED_PRICE)}\u00A0€`,
    from: 0,
    to: YEAR_TOTAL,
    animation: {delay: 0.5, duration: 2.6, endAtWord: '2\u00A0300\u00A0€'},
    impactAtEnd: true,
    character: {pose: 'idle', then: 'shock'},
  },
  {
    id: 'fees',
    visual: 'jars',
    durationInSeconds: 5,
    subtitle: '1\u00A0560\u00A0€ de burgers… et plus de 700\u00A0€ juste en frais.',
    accent: 'gold',
    title: 'Où part la thune',
    total: YEAR_TOTAL,
    totalLabel: 'Livraison sur 1 an',
    jars: [
      {label: 'Burgers', share: YEAR_BURGERS / YEAR_TOTAL, color: 'mint'},
      {label: 'Frais', share: YEAR_EXTRA / YEAR_TOTAL, color: 'coral'},
    ],
    fillAt: [0.05, 2.3],
    fillDuration: 0.9,
    character: {pose: 'think', then: 'shock'},
  },
  {
    id: 'cta',
    visual: 'statement',
    durationInSeconds: 4.5,
    subtitle: 'Commande à emporter, va le chercher, et garde 700\u00A0€.',
    accent: 'emerald',
    lines: [{text: 'Va le chercher,'}, {text: 'garde 700\u00A0€.', highlight: true}],
    caption: 'Même burger, commandé à emporter.',
    disclaimer: 'Exemple illustratif · prix et frais variables selon l’appli et le resto · pas un conseil financier',
    impactAt: 0.4,
    character: {pose: 'point', then: 'happy'},
  },
  {
    id: 'endcard',
    visual: 'endcard',
    durationInSeconds: 2.2,
    // Carte de fin muette (pas de voix) : juste le « ding » et le bouton qui rebondit.
    subtitle: '',
    accent: 'gold',
    cta: 'Abonne-toi pour la suite',
    button: 'S’abonner',
  },
];
