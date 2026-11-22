import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme';

const CELL = 90;

/** Fond noir mat + grille financière très subtile (opacité 0.06) qui dérive lentement. */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const drift = ((frame / fps) * 6) % CELL; // 6 px/s, imperceptible mais vivant

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0, opacity: 0.06}}>
        <defs>
          <pattern id="grid-minor" width={CELL / 3} height={CELL / 3} patternUnits="userSpaceOnUse">
            <path d={`M ${CELL / 3} 0 L 0 0 0 ${CELL / 3}`} fill="none" stroke={COLORS.grid} strokeWidth={0.6} opacity={0.5} />
          </pattern>
          <pattern
            id="grid-major"
            width={CELL}
            height={CELL}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(0 ${-drift})`}
          >
            <rect width={CELL} height={CELL} fill="url(#grid-minor)" />
            <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke={COLORS.grid} strokeWidth={1.4} />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid-major)" />
      </svg>
      {/* Vignette pour concentrer le regard au centre */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 75% 60% at 50% 42%, rgba(10,10,12,0) 0%, rgba(10,10,12,0.55) 70%, rgba(10,10,12,0.95) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
