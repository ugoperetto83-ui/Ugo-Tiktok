import type {Accent} from '../scripts/video-data';

export const COLORS = {
  bg: '#0A0A0C',
  grid: '#FFFFFF',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.32)',
  emerald: '#10B981',
  emeraldNeon: '#34F5B0',
  gold: '#F59E0B',
  muted: '#6B7280',
  mutedDark: '#3A3F47',
  card: 'rgba(255,255,255,0.035)',
  cardBorder: 'rgba(255,255,255,0.08)',
} as const;

export const accentColor = (accent: Accent) => (accent === 'gold' ? COLORS.gold : COLORS.emerald);

export const FONT_FAMILY = "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif";

/** Zones sûres TikTok (UI du haut, légende + boutons en bas, icônes à droite). */
export const SAFE = {
  top: 180,
  bottom: 420,
  side: 70,
  right: 150,
  /** Zone visuelle principale (au-dessus des sous-titres). */
  visualTop: 230,
  visualBottom: 1220,
  /** Centre vertical des sous-titres (tiers inférieur, au-dessus de l'UI TikTok). */
  subtitleY: 1395,
} as const;

/** Chiffres à chasse fixe : les compteurs ne « tremblent » pas en s'incrémentant. */
export const TABULAR: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1, "cv11" 1',
};
