import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {AnimationTiming, SplitSide} from '../../scripts/video-data';
import {useCounter} from './AnimatedCounter';
import {formatEuro} from '../lib/format';
import {COLORS, FONT_FAMILY, TABULAR} from '../theme';

type Props = {
  left: SplitSide;
  right: SplitSide;
  timing: AnimationTiming;
  gapLabel: string;
  gapValue: number;
  barHeight?: number;
};

const Column: React.FC<{side: SplitSide; timing: AnimationTiming; maxValue: number; barHeight: number}> = ({
  side,
  timing,
  maxValue,
  barHeight,
}) => {
  const {value} = useCounter(side.from, side.to, timing);
  const winner = side.style === 'winner';
  const h = Math.max(10, (value / maxValue) * barHeight);
  const color = winner ? COLORS.emeraldNeon : COLORS.muted;
  const text: React.CSSProperties = {fontFamily: FONT_FAMILY, ...TABULAR, textAlign: 'center'};

  return (
    <div style={{width: 430, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{...text, fontSize: 60, fontWeight: 900, color: winner ? COLORS.text : COLORS.textDim, letterSpacing: '-0.03em'}}>
        {side.title}
      </div>
      <div style={{...text, fontSize: 28, fontWeight: 700, color: COLORS.textFaint, marginTop: 6}}>{side.detail}</div>
      <div
        style={{
          ...text,
          marginTop: 26,
          fontSize: 66,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          color: winner ? COLORS.text : COLORS.textDim,
          textShadow: winner ? `0 0 28px ${COLORS.emerald}88` : undefined,
          whiteSpace: 'nowrap',
        }}
      >
        {formatEuro(value)}
      </div>
      {/* Barre verticale */}
      <div
        style={{
          marginTop: 22,
          width: 190,
          height: barHeight,
          borderRadius: 30,
          background: 'rgba(255,255,255,0.035)',
          border: `2px solid ${COLORS.cardBorder}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: h,
            borderRadius: 28,
            background: winner
              ? `linear-gradient(180deg, ${COLORS.emeraldNeon} 0%, ${COLORS.emerald} 45%, #065F46 100%)`
              : `linear-gradient(180deg, #9CA3AF 0%, ${COLORS.muted} 40%, ${COLORS.mutedDark} 100%)`,
            boxShadow: winner ? `0 0 50px ${COLORS.emerald}AA, inset 0 3px 0 rgba(255,255,255,0.5)` : 'inset 0 3px 0 rgba(255,255,255,0.25)',
          }}
        />
      </div>
      <div style={{...text, marginTop: 20, fontSize: 30, fontWeight: 700, color: COLORS.textFaint}}>
        Versé : <span style={{color: winner ? COLORS.textDim : COLORS.textFaint}}>{formatEuro(side.invested)}</span>
      </div>
      <div style={{width: 60, height: 6, borderRadius: 3, background: color, marginTop: 16, opacity: winner ? 1 : 0.5}} />
    </div>
  );
};

/** Écran divisé : deux profils, barres verticales synchronisées sur la même accélération. */
export const SplitComparison: React.FC<Props> = ({left, right, timing, gapLabel, gapValue, barHeight = 470}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const maxValue = Math.max(left.to, right.to);
  const endFrame = Math.round((timing.delay + timing.duration) * fps);
  const badge = spring({frame: frame - endFrame, fps, config: {damping: 11, stiffness: 180}});
  const vsIn = spring({frame: frame - 6, fps, config: {damping: 14}});

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{display: 'flex', alignItems: 'flex-start', gap: 40, position: 'relative'}}>
        <Column side={left} timing={timing} maxValue={maxValue} barHeight={barHeight} />
        {/* Séparateur central */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 40,
            bottom: 40,
            width: 2,
            transform: 'translateX(-50%)',
            background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.14), transparent)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 330,
            transform: `translate(-50%, -50%) scale(${vsIn})`,
            width: 84,
            height: 84,
            borderRadius: 42,
            background: COLORS.bg,
            border: `2px solid ${COLORS.cardBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_FAMILY,
            fontWeight: 900,
            fontSize: 30,
            color: COLORS.textDim,
          }}
        >
          VS
        </div>
        <Column side={right} timing={timing} maxValue={maxValue} barHeight={barHeight} />
      </div>
      {/* Badge d'écart */}
      <div
        style={{
          marginTop: 30,
          transform: `scale(${interpolate(badge, [0, 1], [0.4, 1])})`,
          opacity: Math.min(1, badge * 1.5),
          padding: '16px 40px',
          borderRadius: 999,
          background: 'rgba(245,158,11,0.14)',
          border: `2px solid ${COLORS.gold}`,
          boxShadow: `0 0 40px ${COLORS.gold}55`,
          fontFamily: FONT_FAMILY,
          ...TABULAR,
          fontSize: 40,
          fontWeight: 900,
          color: COLORS.text,
          whiteSpace: 'nowrap',
        }}
      >
        {gapLabel} : <span style={{color: COLORS.gold}}>+{formatEuro(gapValue)}</span>
      </div>
    </div>
  );
};
