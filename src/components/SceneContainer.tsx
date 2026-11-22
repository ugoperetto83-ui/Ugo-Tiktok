import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

/** Entrée (spring + flou) et sortie rapides de chaque scène, calées sur le « whoosh ». */
export const SceneContainer: React.FC<{durationInFrames: number; children: React.ReactNode}> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 140, mass: 0.7}});
  const exitStart = durationInFrames - Math.round(fps * 0.18);
  const exit = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
