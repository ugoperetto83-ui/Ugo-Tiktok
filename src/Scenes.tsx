import React from 'react';
import {AbsoluteFill, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ChartScene, CounterScene, SplitScene, StatementScene} from '../scripts/video-data';
import {AnimatedCounter, useCounter} from './components/AnimatedCounter';
import {CompoundChart} from './components/CompoundChart';
import {Halo} from './components/Halo';
import {SplitComparison} from './components/SplitComparison';
import {counterEasing, toFrames} from './lib/timeline';
import {COLORS, FONT_FAMILY, SAFE, accentColor} from './theme';

const VisualZone: React.FC<{children: React.ReactNode; justify?: React.CSSProperties['justifyContent']}> = ({
  children,
  justify = 'center',
}) => (
  <div
    style={{
      position: 'absolute',
      top: SAFE.visualTop,
      bottom: 1920 - SAFE.visualBottom,
      left: SAFE.side,
      right: SAFE.side,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: justify,
    }}
  >
    {children}
  </div>
);

const Eyebrow: React.FC<{text: string; color: string}> = ({text, color}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: 34,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: COLORS.textDim,
    }}
  >
    <span style={{width: 14, height: 14, borderRadius: 7, background: color, boxShadow: `0 0 18px ${color}`}} />
    {text}
  </div>
);

/** Petite courbe exponentielle sous le compteur, synchronisée avec lui. */
const MiniCurve: React.FC<{progress: number; color: string; down?: boolean}> = ({progress, color, down}) => {
  const W = 620;
  const H = 150;
  const N = 60;
  const pts = Array.from({length: N + 1}, (_, i) => {
    const t = i / N;
    const y = counterEasing(t) * (H - 8);
    return [t * W, down ? y + 4 : H - y - 4];
  });
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return (
    <svg width={W} height={H} style={{overflow: 'visible'}}>
      <line x1={0} x2={W} y1={H} y2={H} stroke="#fff" strokeOpacity={0.15} strokeWidth={2} />
      <path d={d} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - progress)} style={{filter: `drop-shadow(0 0 10px ${color})`}} />
    </svg>
  );
};

export const CounterSceneView: React.FC<{scene: CounterScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const color = accentColor(scene.accent);
  const {progress, t} = useCounter(scene.from, scene.to, scene.animation);
  const endFrame = toFrames(scene.animation.delay + scene.animation.duration, fps);
  const flash = interpolate(frame - endFrame, [0, 3, 20], [0, 0.09, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const shake = frame >= endFrame && frame < endFrame + 12 ? Math.sin(frame * 2.7) * (12 - (frame - endFrame)) * 1.2 : 0;
  const numberColor = interpolateColors(t, [0, 0.85, 1], [COLORS.text, COLORS.text, color]);
  const captionIn = spring({frame: frame - endFrame + 4, fps, config: {damping: 16}});

  return (
    <AbsoluteFill style={{transform: `translate(${shake}px, ${shake * 0.4}px)`}}>
      <Halo color={color} x={540} y={700} size={1000} intensity={progress} />
      <VisualZone>
        <Eyebrow text={scene.eyebrow} color={color} />
        <div style={{height: 46}} />
        <AnimatedCounter
          from={scene.from}
          to={scene.to}
          timing={scene.animation}
          fontSize={168}
          color={numberColor}
          glowColor={color}
        />
        <div style={{height: 50}} />
        <MiniCurve progress={progress} color={color} down={scene.trend === 'down'} />
        {scene.caption && (
          <div
            style={{
              marginTop: 44,
              fontFamily: FONT_FAMILY,
              fontWeight: 700,
              fontSize: 36,
              color: COLORS.textDim,
              opacity: captionIn,
              transform: `translateY(${(1 - captionIn) * 20}px)`,
            }}
          >
            {scene.caption}
          </div>
        )}
      </VisualZone>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 40%, ${color} 0%, ${color}00 65%)`, opacity: flash * 2.5, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};

export const SplitSceneView: React.FC<{scene: SplitScene}> = ({scene}) => {
  const {progress} = useCounter(0, 1, scene.animation);
  return (
    <AbsoluteFill>
      <Halo color={accentColor(scene.accent)} x={310} y={820} size={760} intensity={progress} />
      <VisualZone>
        <SplitComparison
          left={scene.left}
          right={scene.right}
          timing={scene.animation}
          gapLabel={scene.gapLabel}
          gapValue={scene.gapValue}
        />
      </VisualZone>
    </AbsoluteFill>
  );
};

export const ChartSceneView: React.FC<{scene: ChartScene}> = ({scene}) => (
  <AbsoluteFill>
    <Halo color={accentColor(scene.accent)} x={820} y={520} size={900} intensity={0.8} />
    <VisualZone>
      <div
        style={{
          alignSelf: 'flex-start',
          fontFamily: FONT_FAMILY,
          fontWeight: 900,
          fontSize: 50,
          letterSpacing: '-0.03em',
          color: COLORS.text,
          marginBottom: 22,
          paddingLeft: 8,
        }}
      >
        {scene.title}
      </div>
      <CompoundChart
        xValues={scene.xValues}
        xTicks={scene.xTicks}
        xLabelSuffix={scene.xLabelSuffix}
        series={scene.series}
        timing={scene.animation}
        height={680}
      />
    </VisualZone>
  </AbsoluteFill>
);

export const StatementSceneView: React.FC<{scene: StatementScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const color = accentColor(scene.accent);
  const impact = toFrames(scene.impactAt ?? 0.3, fps);
  const shake = frame >= impact && frame < impact + 14 ? Math.sin(frame * 3.1) * (14 - (frame - impact)) : 0;
  const captionIn = spring({frame: frame - impact - 14, fps, config: {damping: 15}});
  const flash = interpolate(frame - impact, [0, 3, 20], [0, 0.08, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{transform: `translate(${shake}px, 0)`}}>
      <Halo color={color} x={540} y={720} size={1050} intensity={interpolate(frame, [impact, impact + 20], [0.3, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
      <VisualZone>
        {scene.lines.map((line, i) => {
          // Chaque ligne « tombe » et claque sur l'impact (la dernière ligne pile dessus).
          const at = impact - (scene.lines.length - 1 - i) * 8 - 8;
          const s = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 200, mass: 0.8}});
          return (
            <div
              key={line.text}
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: 900,
                fontSize: 132,
                lineHeight: 1.02,
                letterSpacing: '-0.045em',
                textTransform: 'uppercase',
                color: line.highlight ? color : COLORS.text,
                textShadow: line.highlight ? `0 0 50px ${color}99` : undefined,
                transform: `scale(${interpolate(s, [0, 1], [1.8, 1])})`,
                opacity: Math.min(1, s * 2),
                whiteSpace: 'nowrap',
              }}
            >
              {line.text}
            </div>
          );
        })}
        {scene.caption && (
          <div
            style={{
              marginTop: 40,
              fontFamily: FONT_FAMILY,
              fontWeight: 800,
              fontSize: 48,
              color: COLORS.textDim,
              opacity: captionIn,
              transform: `translateY(${(1 - captionIn) * 24}px)`,
            }}
          >
            {scene.caption}
          </div>
        )}
        {scene.disclaimer && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: FONT_FAMILY,
              fontWeight: 500,
              fontSize: 22,
              color: COLORS.textFaint,
              opacity: captionIn,
            }}
          >
            {scene.disclaimer}
          </div>
        )}
      </VisualZone>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 40%, ${color} 0%, ${color}00 65%)`, opacity: flash * 2.5, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};
