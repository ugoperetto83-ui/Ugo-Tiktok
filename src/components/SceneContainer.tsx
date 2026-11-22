import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

/** Entrée (spring + flou) et sortie rapides de chaque scène, calées sur le « whoosh ». */
export const SceneContainer: React.FC<{durationInFrames: number; children: React.ReactNode; variant?: 'dark' | 'pop'}> = ({
  durationInFrames,
  children,
  variant = 'dark',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 140, mass: 0.7}});
  const exitStart = durationInFrames - Math.round(fps * 0.18);
  const exit = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (variant === 'pop') {
    // Entrée rebondissante façon sticker (pas de flou), sortie qui glisse vers la gauche.
    const pop = spring({frame, fps, config: {damping: 10, stiffness: 170, mass: 0.7}});
    return (
      <AbsoluteFill
        style={{
          opacity: Math.min(1, pop * 3) * (1 - exit),
          transform: `translateX(${-exit * 160}px) scale(${interpolate(pop, [0, 1], [0.7, 1])}) rotate(${(1 - pop) * -5 + exit * -4}deg)`,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  const scale = interpolate(enter, [0, 1], [0.92, 1]) * (1 + 0.06 * exit);
  const opacity = Math.min(enter * 1.4, 1) * (1 - exit);
  const blur = (1 - enter) * 14 + exit * 16;
  const y = (1 - enter) * 50 - exit * 30;

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
