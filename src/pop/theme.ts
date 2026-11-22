import type React from 'react';
import type {Accent} from '../../scripts/video-data';

/** Identité « Pop sticker » : fond crème, couleurs franches, contours noirs épais, ombres décalées. */
export const POP = {
  bg: '#FFF4DC',
  ink: '#151515',
  white: '#FFFFFF',
  violet: '#7C5CFF',
  violetLight: '#D9D0FF',
  coral: '#FF6B57',
  yellow: '#FFD23F',
  mint: '#22C79A',
  mintLight: '#C8F5E6',
  coffee: '#7A4A2E',
  coffeeLight: '#C98B5E',
  skin: '#FFCBA4',
  grey: '#B9B2A6',
  greyLight: '#ECE5D8',
  textDim: '#5B5650',
} as const;

export const POP_FONT = "'Fredoka', 'Inter', system-ui, sans-serif";

/** Contour des stickers (px). */
export const OUTLINE = 6;

export const popAccent = (accent: Accent) => (accent === 'gold' ? POP.coral : POP.mint);

/** Carte « sticker » : fond plein, contour noir, ombre décalée dure. */
export const sticker = (bg: string = POP.white, shadow = 12, radius = 36): React.CSSProperties => ({
  background: bg,
  border: `${OUTLINE}px solid ${POP.ink}`,
  borderRadius: radius,
  boxShadow: `${shadow}px ${shadow}px 0 ${POP.ink}`,
});
