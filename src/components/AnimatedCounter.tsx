import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {AnimationTiming} from '../../scripts/video-data';
import {counterEasing, linearProgress} from '../lib/timeline';
import {formatEuro} from '../lib/format';
import {COLORS, FONT_FAMILY, TABULAR} from '../theme';

/** Valeur courante d'un compteur (accélération exponentielle), réutilisable hors composant. */
export const useCounter = (from: number, to: number, timing: AnimationTiming) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = linearProgress(frame, timing, fps);
  const progress = counterEasing(t);
  return {value: interpolate(progress, [0, 1], [from, to]), progress, t};
};

type Props = {
  from: number;
  to: number;
  timing: AnimationTiming;
  fontSize?: number;
  color?: string;
  glowColor?: string;
  format?: (v: number) => string;
  style?: React.CSSProperties;
};

/**
 * Compteur d'euros (0 € → 482 500 €) avec Easing.exp.
 * La largeur est réservée avec la valeur finale (invisible) et les chiffres sont
 * tabulaires : aucun tremblement horizontal pendant l'incrémentation.
 */
export const AnimatedCounter: React.FC<Props> = ({
  from,
  to,
  timing,
  fontSize = 150,
  color = COLORS.text,
  glowColor,
  format = formatEuro,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {value, t} = useCounter(from, to, timing);

  // Petit « punch » d'échelle à l'arrivée sur la valeur finale.
  const endFrame = (timing.delay + timing.duration) * fps;
  const punch = interpolate(frame - endFrame, [0, 5, 22], [1, 1.07, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const done = t >= 1;

  const textStyle: React.CSSProperties = {
    gridArea: '1 / 1',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        display: 'inline-grid',
        fontFamily: FONT_FAMILY,
        fontWeight: 900,
        fontSize,
        letterSpacing: '-0.035em',
        lineHeight: 1,
        color,
        transform: `scale(${punch})`,
        textShadow: glowColor
          ? `0 0 ${done ? 60 : 30}px ${glowColor}${done ? 'AA' : '66'}, 0 0 12px ${glowColor}55`
          : undefined,
        ...TABULAR,
        ...style,
      }}
    >
      <span style={{...textStyle, visibility: 'hidden'}} aria-hidden>
        {format(to)}
      </span>
      <span style={textStyle}>{format(value)}</span>
    </div>
  );
};
