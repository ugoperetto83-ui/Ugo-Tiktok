import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ChartScene, CounterScene, OrderScene, SplitScene, SplitSide, StatementScene} from '../../scripts/video-data';
import {useCounter} from '../components/AnimatedCounter';
import {CompoundChart, type ChartPalette} from '../components/CompoundChart';
import {formatEuro} from '../lib/format';
import {animationEndFrame, toFrames} from '../lib/timeline';
import {TABULAR} from '../theme';
import {Character, Cup} from './Character';
import {OUTLINE, POP, POP_FONT, popAccent, sticker} from './theme';

// ---------------------------------------------------------------------------
// Briques communes
// ---------------------------------------------------------------------------

const Abs: React.FC<{x?: number; y: number; w?: number; center?: boolean; children: React.ReactNode; style?: React.CSSProperties}> = ({
  x = 0,
  y,
  w = 1080,
  center = true,
  children,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      display: 'flex',
      flexDirection: 'column',
      alignItems: center ? 'center' : 'flex-start',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Pastille « sticker » qui rebondit à l'apparition. */
const Pill: React.FC<{text: string; bg?: string; at?: number; size?: number; rotate?: number}> = ({
  text,
  bg = POP.yellow,
  at = 0,
  size = 34,
  rotate = -2,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - at, fps, config: {damping: 10, stiffness: 200, mass: 0.6}});
  return (
    <div
      style={{
        ...sticker(bg, 7, 999),
        padding: `${size * 0.32}px ${size * 0.9}px`,
        fontFamily: POP_FONT,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: POP.ink,
        whiteSpace: 'nowrap',
        transform: `rotate(${rotate}deg) scale(${interpolate(s, [0, 1], [0.3, 1])})`,
        opacity: Math.min(1, s * 2),
        ...TABULAR,
      }}
    >
      {text}
    </div>
  );
};

/** Rayons de soleil qui tournent derrière un chiffre clé. */
const Sunburst: React.FC<{x: number; y: number; size: number; color: string; intensity: number}> = ({x, y, size, color, intensity}) => {
  const frame = useCurrentFrame();
  const rays = 18;
  const r = size / 2;
  return (
    <svg
      width={size}
      height={size}
      style={{position: 'absolute', left: x - r, top: y - r, opacity: 0.55 * intensity, transform: `rotate(${frame * 0.35}deg) scale(${0.8 + 0.2 * intensity})`}}
    >
      <defs>
        <radialGradient id="sun-fade">
          <stop offset="0%" stopColor="#fff" stopOpacity={1} />
          <stop offset="70%" stopColor="#fff" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <mask id="sun-mask">
          <rect width={size} height={size} fill="url(#sun-fade)" />
        </mask>
      </defs>
      <g mask="url(#sun-mask)">
        {Array.from({length: rays}, (_, i) => {
          const a0 = (i / rays) * Math.PI * 2;
          const a1 = a0 + Math.PI / rays;
          return (
            <path
              key={i}
              d={`M${r},${r} L${r + Math.cos(a0) * r},${r + Math.sin(a0) * r} L${r + Math.cos(a1) * r},${r + Math.sin(a1) * r} Z`}
              fill={color}
            />
          );
        })}
      </g>
    </svg>
  );
};

/** Gros chiffre dans une carte sticker : la carte grandit avec le nombre, « punch » à l'arrivée. */
const BigNumber: React.FC<{value: string; fontSize: number; bg: string; endFrame: number; rotate?: number}> = ({
  value,
  fontSize,
  bg,
  endFrame,
  rotate = -1.5,
}) => {
  const frame = useCurrentFrame();
  const punch = interpolate(frame - endFrame, [0, 5, 22], [1, 1.12, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        ...sticker(bg, 14, 40),
        padding: `${fontSize * 0.08}px ${fontSize * 0.28}px ${fontSize * 0.04}px`,
        fontFamily: POP_FONT,
        fontWeight: 700,
        fontSize,
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        color: POP.ink,
        whiteSpace: 'nowrap',
        transform: `rotate(${rotate}deg) scale(${punch})`,
        ...TABULAR,
      }}
    >
      {value}
    </div>
  );
};

const useShake = (endFrame: number, strength = 1.2) => {
  const frame = useCurrentFrame();
  return frame >= endFrame && frame < endFrame + 12 ? Math.sin(frame * 2.7) * (12 - (frame - endFrame)) * strength : 0;
};

// ---------------------------------------------------------------------------
// Fond
// ---------------------------------------------------------------------------

export const PopBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const drift = (t * 14) % 44;
  return (
    <AbsoluteFill style={{backgroundColor: POP.bg, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: POP.yellow,
          opacity: 0.45,
          left: 560 + Math.sin(t * 0.5) * 30,
          top: -380 + Math.cos(t * 0.4) * 24,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 760,
          height: 760,
          borderRadius: '50%',
          background: POP.violetLight,
          opacity: 0.7,
          left: -420 + Math.cos(t * 0.45) * 26,
          top: 1180 + Math.sin(t * 0.5) * 30,
        }}
      />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.09}}>
        <defs>
          <pattern id="dots" width={44} height={44} patternUnits="userSpaceOnUse" patternTransform={`translate(${drift} ${drift})`}>
            <circle cx={22} cy={22} r={3.2} fill={POP.ink} />
          </pattern>
        </defs>
        <rect width={1080} height={1920} fill="url(#dots)" />
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 1. Commande au comptoir (accroche)
// ---------------------------------------------------------------------------

const COUNTER_TOP = 1020;

const Bubble: React.FC<{text: string; visible: number}> = ({text, visible}) => (
  <div
    style={{
      position: 'absolute',
      left: 470,
      top: 690,
      transformOrigin: '0% 100%',
      transform: `scale(${visible}) rotate(${(1 - visible) * -10 + 2}deg)`,
      opacity: Math.min(1, visible * 2),
    }}
  >
    <div style={{...sticker(POP.white, 8, 34), padding: '18px 34px', fontFamily: POP_FONT, fontWeight: 700, fontSize: 50, color: POP.ink, whiteSpace: 'nowrap'}}>
      {text}
    </div>
    {/* Queue de la bulle */}
    <svg width={70} height={56} style={{position: 'absolute', left: 24, top: '100%', marginTop: -OUTLINE - 2, overflow: 'visible'}}>
      <path d="M8,0 L4,48 L46,0" fill={POP.white} stroke={POP.ink} strokeWidth={OUTLINE} strokeLinejoin="round" />
      <rect x={10} y={-4} width={34} height={8} fill={POP.white} />
    </svg>
  </div>
);

const EspressoMachine: React.FC = () => (
  <svg width={210} height={230} style={{position: 'absolute', left: 720, top: COUNTER_TOP - 222, overflow: 'visible'}}>
    <rect x={10} y={20} width={190} height={200} rx={26} fill={POP.coral} stroke={POP.ink} strokeWidth={OUTLINE} />
    <rect x={30} y={44} width={150} height={44} rx={14} fill={POP.white} stroke={POP.ink} strokeWidth={OUTLINE} />
    <circle cx={70} cy={66} r={9} fill={POP.mint} stroke={POP.ink} strokeWidth={4} />
    <circle cx={105} cy={66} r={9} fill={POP.yellow} stroke={POP.ink} strokeWidth={4} />
    <rect x={80} y={100} width={50} height={36} rx={8} fill={POP.ink} />
    <rect x={40} y={196} width={130} height={18} rx={6} fill={POP.greyLight} stroke={POP.ink} strokeWidth={4} />
  </svg>
);

export const OrderSceneView: React.FC<{scene: OrderScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {value, progress} = useCounter(scene.from, scene.to, scene.animation);
  const endFrame = animationEndFrame(scene.animation, fps);
  const revealFrame = toFrames(scene.animation.delay, fps);
  const cupFrame = toFrames(scene.cupAt, fps);
  const shake = useShake(endFrame, 1.4);

  const bubbleIn = spring({frame: frame - 8, fps, config: {damping: 10, stiffness: 200, mass: 0.6}});
  const bubbleOut = interpolate(frame, [revealFrame - 6, revealFrame + 4], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cupIn = spring({frame: frame - cupFrame + 10, fps, config: {damping: 13, stiffness: 160}});
  const cupX = interpolate(cupIn, [0, 1], [1200, 560]);
  const tag = spring({frame: frame - cupFrame - 4, fps, config: {damping: 9, stiffness: 220, mass: 0.6}});

  return (
    <AbsoluteFill style={{transform: `translate(${shake}px, ${shake * 0.4}px)`}}>
      <Sunburst x={540} y={450} size={1100} color={POP.yellow} intensity={progress} />
      <Abs y={250}>
        <Pill text={scene.eyebrow} />
      </Abs>
      <Abs y={350}>
        <BigNumber value={formatEuro(value)} fontSize={150} bg={progress >= 1 ? POP.yellow : POP.white} endFrame={endFrame} />
      </Abs>
      {scene.caption && (
        <Abs y={570}>
          <Pill text={scene.caption} bg={POP.white} at={endFrame + 6} size={30} rotate={1.5} />
        </Abs>
      )}

      {/* Le comptoir du café */}
      <EspressoMachine />
      <div style={{position: 'absolute', left: 150, top: COUNTER_TOP - 488 + 80}}>
        <Character
          cue={scene.character ?? {pose: 'order', then: 'shock'}}
          switchAt={endFrame}
          width={332}
          talking={frame > 8 && frame < revealFrame - 10}
          hideLegs
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 30,
          right: 30,
          top: COUNTER_TOP,
          height: 190,
          ...sticker(POP.coffeeLight, 12, 30),
          background: `repeating-linear-gradient(90deg, ${POP.coffeeLight} 0 120px, #BE8155 120px 124px)`,
        }}
      >
        <div style={{height: 34, background: POP.coffee, borderBottom: `${OUTLINE}px solid ${POP.ink}`, borderRadius: '24px 24px 0 0'}} />
      </div>
      <svg width={1080} height={300} style={{position: 'absolute', left: 0, top: COUNTER_TOP - 150, overflow: 'visible'}}>
        <Cup x={cupX} y={96} scale={1.35} steam={(frame / fps) * 0.6} />
        <g transform={`translate(${cupX + 70} 40) rotate(14) scale(${tag})`} opacity={Math.min(1, tag * 2)}>
          <circle r={52} fill={POP.coral} stroke={POP.ink} strokeWidth={OUTLINE} />
          <text y={15} textAnchor="middle" fontFamily="Fredoka" fontWeight={700} fontSize={42} fill={POP.white}>
            {scene.priceLabel}
          </text>
        </g>
      </svg>
      <Bubble text={scene.bubble} visible={bubbleIn * bubbleOut} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 2. Comparaison
// ---------------------------------------------------------------------------

const SplitCard: React.FC<{side: SplitSide; timing: SplitScene['animation']; maxValue: number; tilt: number}> = ({side, timing, maxValue, tilt}) => {
  const {value} = useCounter(side.from, side.to, timing);
  const winner = side.style === 'winner';
  const barH = 300;
  const h = maxValue > 0 ? (value / maxValue) * (barH - 12) : 0;
  return (
    <div
      style={{
        ...sticker(winner ? POP.white : POP.greyLight, 12, 40),
        width: 400,
        padding: '30px 0 26px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `rotate(${tilt}deg)`,
        fontFamily: POP_FONT,
        ...TABULAR,
      }}
    >
      <div style={{fontSize: 70, fontWeight: 700, color: POP.ink, lineHeight: 1}}>{side.title}</div>
      <div style={{fontSize: 30, fontWeight: 600, color: POP.textDim, marginTop: 8}}>{side.detail}</div>
      <div style={{fontSize: 72, fontWeight: 700, color: winner ? POP.ink : POP.coral, marginTop: 18, whiteSpace: 'nowrap', letterSpacing: '-0.02em'}}>
        {formatEuro(value)}
      </div>
      <div
        style={{
          marginTop: 18,
          width: 170,
          height: barH,
          borderRadius: 30,
          border: `${OUTLINE}px solid ${POP.ink}`,
          background: POP.white,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {winner ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: h,
              background: `repeating-linear-gradient(-45deg, ${POP.mint} 0 22px, #1DB58A 22px 44px)`,
              borderTop: h > 2 ? `${OUTLINE}px solid ${POP.ink}` : undefined,
            }}
          />
        ) : (
          <svg width={158} height={barH - 12} style={{position: 'absolute', left: 0, top: 0}}>
            <g transform={`translate(79 ${barH - 80}) rotate(-28)`}>
              <Cup x={0} y={0} scale={0.9} />
            </g>
          </svg>
        )}
      </div>
      <div style={{fontSize: 30, fontWeight: 600, color: POP.textDim, marginTop: 16}}>
        {side.investedLabel ?? 'Versé'} : <span style={{color: POP.ink, fontWeight: 700}}>{formatEuro(side.invested)}</span>
      </div>
    </div>
  );
};

export const SplitSceneView: React.FC<{scene: SplitScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const endFrame = animationEndFrame(scene.animation, fps);
  const maxValue = Math.max(scene.left.to, scene.right.to);
  const vs = spring({frame: frame - 8, fps, config: {damping: 9, stiffness: 200}});
  const badge = spring({frame: frame - endFrame, fps, config: {damping: 9, stiffness: 190, mass: 0.7}});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 112, top: 250, display: 'flex', gap: 36}}>
        <SplitCard side={scene.left} timing={scene.animation} maxValue={maxValue} tilt={-2} />
        <SplitCard side={scene.right} timing={scene.animation} maxValue={maxValue} tilt={2} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 540 - 56,
          top: 560,
          width: 112,
          height: 112,
          ...sticker(POP.yellow, 7, 56),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: POP_FONT,
          fontWeight: 700,
          fontSize: 44,
          color: POP.ink,
          transform: `scale(${vs}) rotate(${(1 - vs) * 90 - 8}deg)`,
        }}
      >
        VS
      </div>
      <div
        style={{
          position: 'absolute',
          left: 330,
          top: 1060,
          ...sticker(POP.yellow, 10, 999),
          padding: '18px 40px',
          fontFamily: POP_FONT,
          fontWeight: 700,
          fontSize: 44,
          color: POP.ink,
          whiteSpace: 'nowrap',
          transform: `rotate(-3deg) scale(${interpolate(badge, [0, 1], [0.3, 1])})`,
          opacity: Math.min(1, badge * 2),
          ...TABULAR,
        }}
      >
        {scene.gapLabel} : {scene.gapValue < 0 ? '−' : '+'}
        {formatEuro(Math.abs(scene.gapValue))}
      </div>
      {scene.character && (
        <div style={{position: 'absolute', left: 70, top: 1220 - 323}}>
          <Character cue={scene.character} switchAt={endFrame} width={220} enterAt={6} />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 3. Graphique
// ---------------------------------------------------------------------------

const POP_CHART: ChartPalette = {
  font: POP_FONT,
  axis: POP.ink,
  gridOpacity: 0.18,
  label: POP.textDim,
  labelActive: POP.ink,
  legend: POP.ink,
  legendDim: POP.textDim,
  neon: POP.violet,
  neonGlow: null,
  area: POP.violet,
  muted: POP.grey,
  outline: 4,
  outlineColor: POP.ink,
  tagNeonFill: POP.yellow,
  tagNeonStroke: POP.ink,
  tagMutedFill: POP.white,
  tagMutedStroke: POP.ink,
  tagText: POP.ink,
  tagTextDim: POP.textDim,
};

export const ChartSceneView: React.FC<{scene: ChartScene}> = ({scene}) => {
  const {fps} = useVideoConfig();
  const endFrame = animationEndFrame(scene.animation, fps);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 70,
          top: 262,
          width: 640,
          fontFamily: POP_FONT,
          fontWeight: 700,
          fontSize: 58,
          lineHeight: 1.05,
          color: POP.ink,
        }}
      >
        {scene.title}
      </div>
      <div style={{position: 'absolute', left: 60, top: 440, ...sticker(POP.white, 14, 40), padding: '26px 10px 6px 0'}}>
        <CompoundChart
          xValues={scene.xValues}
          xTicks={scene.xTicks}
          xLabelSuffix={scene.xLabelSuffix}
          series={scene.series}
          timing={scene.animation}
          width={930}
          height={600}
          palette={POP_CHART}
        />
      </div>
      {scene.character && (
        <div style={{position: 'absolute', left: 730, top: 196, transform: 'scaleX(-1)'}}>
          <Character cue={scene.character} switchAt={endFrame} width={170} enterAt={8} />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 4. Compteur
// ---------------------------------------------------------------------------

export const CounterSceneView: React.FC<{scene: CounterScene}> = ({scene}) => {
  const {fps} = useVideoConfig();
  const {value, progress} = useCounter(scene.from, scene.to, scene.animation);
  const endFrame = animationEndFrame(scene.animation, fps);
  const shake = useShake(endFrame);
  const accent = popAccent(scene.accent);
  return (
    <AbsoluteFill style={{transform: `translate(${shake}px, ${shake * 0.4}px)`}}>
      <Sunburst x={540} y={500} size={1150} color={POP.yellow} intensity={progress} />
      <Abs y={250}>
        <Pill text={scene.eyebrow} />
      </Abs>
      <Abs y={360}>
        <BigNumber value={formatEuro(value)} fontSize={230} bg={progress >= 1 ? accent : POP.white} endFrame={endFrame} rotate={-2.5} />
      </Abs>
      {scene.caption && (
        <Abs y={680}>
          <Pill text={scene.caption} bg={POP.white} at={endFrame + 6} size={32} rotate={1.5} />
        </Abs>
      )}
      {scene.character && (
        <div style={{position: 'absolute', left: 540 - 150, top: 1220 - 440}}>
          <Character cue={scene.character} switchAt={endFrame} width={300} enterAt={4} />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 5. Appel à l'action
// ---------------------------------------------------------------------------

export const StatementSceneView: React.FC<{scene: StatementScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const impact = toFrames(scene.impactAt ?? 0.3, fps);
  const shake = useShake(impact, 1);
  const captionIn = spring({frame: frame - impact - 14, fps, config: {damping: 14}});
  return (
    <AbsoluteFill style={{transform: `translate(${shake}px, 0)`}}>
      <Abs y={290}>
        {scene.lines.map((line, i) => {
          const at = impact - (scene.lines.length - 1 - i) * 8 - 8;
          const s = spring({frame: frame - at, fps, config: {damping: 10, stiffness: 210, mass: 0.7}});
          return (
            <div
              key={line.text}
              style={{
                marginTop: i ? 26 : 0,
                fontFamily: POP_FONT,
                fontWeight: 700,
                fontSize: 108,
                lineHeight: 1.05,
                color: line.highlight ? POP.white : POP.ink,
                whiteSpace: 'nowrap',
                padding: line.highlight ? '6px 40px 12px' : 0,
                ...(line.highlight ? sticker(POP.violet, 12, 30) : {}),
                transform: `rotate(${line.highlight ? -3 : 0}deg) scale(${interpolate(s, [0, 1], [1.8, 1])})`,
                opacity: Math.min(1, s * 2),
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
              fontFamily: POP_FONT,
              fontWeight: 600,
              fontSize: 42,
              color: POP.textDim,
              opacity: captionIn,
              transform: `translateY(${(1 - captionIn) * 20}px)`,
            }}
          >
            {scene.caption}
          </div>
        )}
      </Abs>
      {scene.character && (
        <div style={{position: 'absolute', left: 540 - 135, top: 1190 - 396}}>
          <Character cue={scene.character} switchAt={impact + 6} width={270} enterAt={impact} />
        </div>
      )}
      {scene.disclaimer && (
        <Abs y={1196}>
          <div style={{fontFamily: POP_FONT, fontWeight: 500, fontSize: 22, color: POP.textDim, opacity: captionIn, textAlign: 'center', maxWidth: 860}}>
            {scene.disclaimer}
          </div>
        </Abs>
      )}
    </AbsoluteFill>
  );
};
