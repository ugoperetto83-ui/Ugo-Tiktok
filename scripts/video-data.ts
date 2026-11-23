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
  gameBudget: 10, // budget jeu mensuel proposé par Léo (€)
  months: 12,
} as const;

const A = ASSUMPTIONS;

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
  /** Icône posée dans la barre vide (to = 0) à la place du gobelet de café. */
  emptyIcon?: SubItem['icon'];
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
  icon: 'play' | 'music' | 'gym' | 'star' | 'euro' | 'gamepad' | 'gem';
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

// ---------------------------------------------------------------------------
// Scénario : « Micro-achats : ton skin vaut 400 € » (~24 s, style pop, Léo + carte de fin)
// ---------------------------------------------------------------------------

/** Achats in-app d'un mois type (noms génériques, prix indicatifs). */
export const PURCHASES: SubItem[] = [
  {label: 'Passe de combat', amount: 9.99, icon: 'gamepad'},
  {label: 'Pack de gemmes', amount: 4.99, icon: 'gem'},
  {label: 'Skin légendaire', amount: 14.99, icon: 'gamepad'},
  {label: 'Coffre mystère', amount: 3.49, icon: 'star'},
];

const MONTHLY = PURCHASES.reduce((s, p) => s + p.amount, 0); // 33,46 €
const YEARLY = MONTHLY * A.months; // 401,52 € → « 400 € »
const YEARLY_SHOWN = Math.round(YEARLY / 10) * 10; // 400
const KEPT = Math.round((MONTHLY - A.gameBudget) * A.months); // 282 € → « près de 280 € »
const KEPT_SAID = Math.round(KEPT / 10) * 10; // 280

export const COMPUTED = {MONTHLY, YEARLY, YEARLY_SHOWN, KEPT, KEPT_SAID};

const NAME = VIDEO_CONFIG.mascot.name;
const eur = (n: number) => `${n} €`;

/** Mots-clés mis en valeur dans les sous-titres (insensible à la casse). */
export const KEYWORDS: string[] = [
  eur(YEARLY_SHOWN),
  eur(A.gameBudget),
  eur(KEPT_SAID),
  'revendre',
  '48 heures',
  'Léo & la Thune',
];

export const SCENES: Scene[] = [
  {
    id: 'hook',
    visual: 'notify',
    durationInSeconds: 4.5,
    subtitle: `5 € par-ci, 10 € par-là… En un an, ton skin vaut ${eur(YEARLY_SHOWN)}.`,
    accent: 'gold',
    whooshIn: false,
    eyebrow: `Les achats in-app de ${NAME}`,
    notifLabel: 'Achat in-app',
    items: PURCHASES,
    itemsAt: 0.15,
    itemGap: 0.6,
    from: 0,
    to: YEARLY_SHOWN,
    suffix: '/an',
    animation: {delay: 2.6, duration: 1.6, endAtWord: eur(YEARLY_SHOWN)},
    impactAtEnd: true,
    character: {pose: 'phone', then: 'shock', holdsPhone: true},
  },
  {
    id: 'split',
    visual: 'split',
    durationInSeconds: 5,
    subtitle: `Le souci : ton skin, tu ne pourras jamais le revendre. Tes ${eur(YEARLY_SHOWN)}, eux, seraient encore là.`,
    accent: 'emerald',
    left: {
      title: 'Le skin',
      detail: 'valeur de revente',
      from: 0,
      to: 0,
      invested: YEARLY_SHOWN,
      investedLabel: 'Dépensé',
      emptyIcon: 'gamepad',
      style: 'loser',
    },
    right: {
      title: 'La thune',
      detail: 'gardée sur ton compte',
      from: 0,
      to: YEARLY_SHOWN,
      invested: YEARLY_SHOWN,
      investedLabel: 'Mis de côté',
      style: 'winner',
    },
    gapLabel: 'Différence',
    gapValue: YEARLY_SHOWN,
    animation: {delay: 0.35, duration: 2.8},
    character: {pose: 'think', then: 'point'},
  },
  {
    id: 'budget',
    visual: 'counter',
    durationInSeconds: 5,
    subtitle: `La règle de ${NAME} : un budget jeu de ${eur(A.gameBudget)} par mois. Tu gardes près de ${eur(KEPT_SAID)} par an.`,
    accent: 'gold',
    eyebrow: `Budget jeu : ${eur(A.gameBudget)}/mois`,
    caption: `${eur(YEARLY_SHOWN)} − ${eur(A.gameBudget * A.months)} de jeu`,
    from: 0,
    to: KEPT,
    animation: {delay: 1.4, duration: 2.2, endAtWord: eur(KEPT_SAID)},
    impactAtEnd: true,
    character: {pose: 'idle', then: 'happy'},
  },
  {
    id: 'cta',
    visual: 'statement',
    durationInSeconds: 4,
    subtitle: 'Et avant chaque achat, attends 48 heures. Si tu le veux encore, vas-y.',
    accent: 'emerald',
    lines: [{text: 'Attends'}, {text: '48 h.', highlight: true}],
    caption: 'Si tu le veux encore, vas-y.',
    disclaimer: 'Exemple illustratif · prix indicatifs · pas un conseil financier',
    impactAt: 0.35,
    character: {pose: 'point', then: 'happy'},
  },
  {
    id: 'endcard',
    visual: 'endcard',
    durationInSeconds: 2.5,
    subtitle: 'Abonne-toi à Léo & la Thune pour la suite !',
    voiceText: 'Abonne-toi à Léo et la Thune pour la suite !',
    accent: 'gold',
    cta: 'Abonne-toi pour la suite',
    button: 'S’abonner',
  },
];
