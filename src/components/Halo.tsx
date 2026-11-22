import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

type Props = {
  color: string;
  /** Centre du halo (px). */
  x: number;
  y: number;
  size?: number;
  /** 0 → 1 : intensité (ex : progression du compteur). */
  intensity?: number;
};

/** Halo lumineux doux derrière les chiffres clés, avec une respiration lente. */
export const Halo: React.FC<Props> = ({color, x, y, size = 900, intensity = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const breathe = 1 + 0.04 * Math.sin((frame / fps) * Math.PI * 0.9);
  const s = size * breathe;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - s / 2,
        top: y - s / 2,
        width: s,
        height: s,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, ${color}00 68%)`,
        opacity: 0.16 + 0.22 * intensity,
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }}
    />
  );
};
