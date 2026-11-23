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
  overdraft: 50, // solde à −50 €
  daysPerMonth: 10, // jours à découvert chaque mois
  agiosRate: 0.16, // taux annuel du découvert (TAEG courant)
  commission: 8, // commission d'intervention par paiement (plafond légal 8 €/opération)
  paymentsPerMonth: 2, // paiements passés à découvert chaque mois
  cushion: 100, // coussin de sécurité conseillé (€)
} as const;

const A = ASSUMPTIONS;
const AGIOS_MONTH = (A.overdraft * A.agiosRate * A.daysPerMonth) / 365; // ≈ 0,22 €
const AGIOS_YEAR = AGIOS_MONTH * 12; // ≈ 2,63 €
const COMMISSIONS_MONTH = A.commission * A.paymentsPerMonth; // 16 €
const COMMISSIONS_YEAR = COMMISSIONS_MONTH * 12; // 192 €
const TOTAL_YEAR = Math.round(AGIOS_YEAR + COMMISSIONS_YEAR); // ≈ 195 € → « près de 200 € »

export const COMPUTED = {AGIOS_MONTH, AGIOS_YEAR, COMMISSIONS_MONTH, COMMISSIONS_YEAR, TOTAL_YEAR};

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
  'moins 50\u00A0€',
  '200\u00A0€',
  '3\u00A0€',
  '8\u00A0€',
  'alerte de solde',
  '100\u00A0€',
  'zéro frais',
  'Léo & la Thune',
];

// ---------------------------------------------------------------------------
// Scénario : « Le découvert et les agios » (~22 s, style pop + carte de fin)
// ---------------------------------------------------------------------------

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, '\u00A0');

export const SCENES: Scene[] = [
  {
    id: 'hook',
    visual: 'counter',
    durationInSeconds: 5,
    subtitle: `Ta banque te fait payer d’être à moins ${A.overdraft}\u00A0€. Sur un an, près de 200\u00A0€ de frais.`,
    accent: 'gold',
    whooshIn: false,
    eyebrow: `Ton compte à −${A.overdraft} €`,
    caption: 'de frais sur un an',
    from: 0,
    to: TOTAL_YEAR,
    animation: {delay: 0.3, duration: 2.2, endAtWord: '200\u00A0€'},
    impactAtEnd: true,
    character: {pose: 'phone', holdsPhone: true, then: 'shock'},
  },
  {
    id: 'split',
    visual: 'split',
    durationInSeconds: 6,
    subtitle: `Les agios\u00A0? À peine 3\u00A0€ par an. Le vrai piège, c’est ${A.commission}\u00A0€ de commission à chaque paiement.`,
    accent: 'emerald',
    left: {
      title: 'Agios',
      detail: `${Math.round(A.agiosRate * 100)} % · ${A.daysPerMonth} j/mois`,
      from: 0,
      to: Math.round(AGIOS_YEAR),
      invested: A.overdraft,
      investedLabel: 'Découvert',
      style: 'winner',
    },
    right: {
      title: 'Frais',
      detail: `commission · ${A.paymentsPerMonth}/mois`,
      from: 0,
      to: COMMISSIONS_YEAR,
      invested: A.commission,
      investedLabel: 'Par paiement',
      style: 'loser',
    },
    gapLabel: 'Total sur 1 an',
    gapValue: TOTAL_YEAR,
    animation: {delay: 0.35, duration: 2.8},
    character: {pose: 'think', then: 'shock'},
  },
  {
    id: 'checklist',
    visual: 'checklist',
    durationInSeconds: 5.5,
    subtitle: `La parade\u00A0: une alerte de solde, et ${A.cushion}\u00A0€ de côté. Tout ça disparaît.`,
    accent: 'emerald',
    title: 'Ton relevé du mois',
    items: [
      {label: 'Commission · 12/03', amount: A.commission, icon: 'euro'},
      {label: 'Commission · 21/03', amount: A.commission, icon: 'euro'},
      {label: 'Agios · mars', amount: Math.round(AGIOS_MONTH * 100) / 100, icon: 'euro'},
    ],
    amountSuffix: '',
    stamp: 'Évité',
    strikeAt: 1.2,
    strikeGap: 0.5,
    savedLabel: `+${fmt(TOTAL_YEAR)}\u00A0€/an gardés`,
    character: {pose: 'point', then: 'happy'},
  },
  {
    id: 'cta',
    visual: 'statement',
    durationInSeconds: 3.5,
    subtitle: 'Zéro découvert, zéro frais. Ta thune reste à toi.',
    accent: 'emerald',
    lines: [{text: 'Zéro découvert,'}, {text: 'zéro frais.', highlight: true}],
    caption: 'Ta thune reste à toi.',
    disclaimer: 'Exemple illustratif · frais variables selon ta banque · pas un conseil financier',
    impactAt: 1.2,
    character: {pose: 'idle', then: 'happy'},
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
