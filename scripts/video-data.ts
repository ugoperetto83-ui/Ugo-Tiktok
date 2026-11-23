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
  classicPrice: 35, // forfait opérateur classique (€/mois)
  cheapPrice: 10, // forfait low-cost équivalent (€/mois)
  marketRate: 0.08, // rendement annuel moyen supposé si l'écart est placé
  years: 10,
} as const;

const A = ASSUMPTIONS;
const MONTHLY_GAP = A.classicPrice - A.cheapPrice; // 25 €
const YEARLY_GAP = MONTHLY_GAP * 12; // 300 €
const INVESTED_VALUE = Math.round(futureValue(MONTHLY_GAP, A.marketRate, A.years)); // ≈ 4 346 € → « plus de 4 300 € »
const PAID = YEARLY_GAP * A.years; // 3 000 €

export const COMPUTED = {MONTHLY_GAP, YEARLY_GAP, INVESTED_VALUE, PAID};

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
  icon: 'play' | 'music' | 'gym' | 'star' | 'euro' | 'signal';
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
  '25\u00A0€',
  '300\u00A0€',
  '4\u00A0300\u00A0€',
  'même réseau',
  'code RIO',
  '3179',
  'Léo & la Thune',
];

// ---------------------------------------------------------------------------
// Scénario : « Ton forfait mobile : 25 € de trop chaque mois » (~25 s, style pop + carte de fin)
// ---------------------------------------------------------------------------

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, '\u00A0');
const euros = (n: number) => `${fmt(n)}\u00A0€`;
// Arrondi « parlé » du montant placé, au centaine inférieure (4 346 → 4 300).
const SPOKEN_VALUE = euros(Math.floor(INVESTED_VALUE / 100) * 100);

export const SCENES: Scene[] = [
  {
    id: 'hook',
    visual: 'notify',
    durationInSeconds: 4.5,
    subtitle: `Ton forfait à ${euros(A.classicPrice)}\u00A0? Tu paies ${euros(MONTHLY_GAP)} de trop chaque mois.`,
    accent: 'gold',
    whooshIn: false,
    eyebrow: 'Le forfait de Léo',
    notifLabel: 'Prélèvement',
    items: [{label: 'Forfait mobile', amount: A.classicPrice, icon: 'signal'}],
    itemsAt: 0.5,
    itemGap: 0.8,
    from: 0,
    to: MONTHLY_GAP,
    suffix: '/mois',
    caption: 'payés pour rien',
    animation: {delay: 1.6, duration: 1.5, endAtWord: euros(MONTHLY_GAP)},
    impactAtEnd: true,
    character: {pose: 'phone', then: 'shock', holdsPhone: true},
  },
  {
    id: 'split',
    visual: 'split',
    durationInSeconds: 5,
    subtitle: `Classique\u00A0: ${euros(A.classicPrice)}. Low-cost\u00A0: ${euros(A.cheapPrice)}. ${euros(YEARLY_GAP)} d’écart par an.`,
    accent: 'emerald',
    left: {
      title: 'Classique',
      detail: 'par mois',
      from: 0,
      to: A.classicPrice,
      invested: A.classicPrice * 12,
      investedLabel: 'Par an',
      style: 'loser',
    },
    right: {
      title: 'Low-cost',
      detail: 'par mois',
      from: 0,
      to: A.cheapPrice,
      invested: A.cheapPrice * 12,
      investedLabel: 'Par an',
      style: 'winner',
    },
    gapLabel: 'En trop par an',
    gapValue: YEARLY_GAP,
    animation: {delay: 0.35, duration: 2.6},
    character: {pose: 'think', then: 'happy'},
  },
  {
    id: 'tip',
    visual: 'statement',
    durationInSeconds: 5,
    subtitle: 'Souvent le même réseau, et tu gardes ton numéro\u00A0: code RIO au 3179.',
    voiceText: 'Souvent le même réseau, et tu gardes ton numéro : code RIO au 31 79.',
    accent: 'emerald',
    lines: [{text: 'Même réseau.'}, {text: 'Même numéro.', highlight: true}],
    caption: 'Code RIO : appelle le 3179 (gratuit)',
    impactAt: 1.2,
    character: {pose: 'point', then: 'happy'},
  },
  {
    id: 'invest',
    visual: 'counter',
    durationInSeconds: 4.5,
    subtitle: `Et ces ${euros(MONTHLY_GAP)} placés à 8\u00A0% par an\u00A0? Plus de ${SPOKEN_VALUE} en ${A.years}\u00A0ans.`,
    accent: 'gold',
    eyebrow: `${euros(MONTHLY_GAP)}/mois placés ${A.years} ans`,
    caption: `${euros(PAID)} versés · 8\u00A0%/an`,
    from: 0,
    to: INVESTED_VALUE,
    animation: {delay: 0.5, duration: 2.2, endAtWord: SPOKEN_VALUE},
    impactAtEnd: true,
    character: {pose: 'idle', then: 'shock'},
  },
  {
    id: 'cta',
    visual: 'statement',
    durationInSeconds: 3.5,
    subtitle: `Compare ton forfait ce soir. Cinq minutes pour ${euros(YEARLY_GAP)} par an.`,
    accent: 'emerald',
    lines: [{text: 'Compare ton'}, {text: 'forfait.', highlight: true}],
    caption: `5 minutes = ${euros(YEARLY_GAP)}/an`,
    disclaimer: 'Prix indicatifs · rendement moyen non garanti · pas un conseil en investissement',
    impactAt: 0.35,
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
