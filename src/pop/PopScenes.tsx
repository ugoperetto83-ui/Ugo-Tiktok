import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ChartScene, ChecklistScene, CounterScene, EndCardScene, JarsScene, NotifyScene, OrderScene, SplitScene, SplitSide, StatementScene, SubItem} from '../../scripts/video-data';
import {useCounter} from '../components/AnimatedCounter';
import {CompoundChart, type ChartPalette} from '../components/CompoundChart';
import {formatEuro, formatEuroCents} from '../lib/format';
import {COIN_FALL, JAR_COINS, animationEndFrame, toFrames} from '../lib/timeline';
import {TABULAR} from '../theme';
import {Character, Cup} from './Character';
import {BG, LeoBust, Rays} from '../Brand';
import {BRAND} from '../../scripts/brand';
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
        {winner || side.to > 0 ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: h,
              background: winner
                ? `repeating-linear-gradient(-45deg, ${POP.mint} 0 22px, #1DB58A 22px 44px)`
                : `repeating-linear-gradient(-45deg, ${POP.grey} 0 22px, #A39C90 22px 44px)`,
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
          width: 660,
          fontFamily: POP_FONT,
          fontWeight: 700,
          fontSize: 50,
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
        <BigNumber value={formatEuro(value)} fontSize={Math.min(230, 1500 / formatEuro(scene.to).length)} bg={progress >= 1 ? accent : POP.white} endFrame={endFrame} rotate={-2.5} />
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

// ---------------------------------------------------------------------------
// Abonnements : icônes, notifications, liste à barrer
// ---------------------------------------------------------------------------

const ICON_BG: Record<SubItem['icon'], string> = {play: POP.coral, music: POP.mint, gym: POP.yellow, star: POP.violet, euro: POP.mint};

const SubIcon: React.FC<{icon: SubItem['icon']; size?: number}> = ({icon, size = 64}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{flexShrink: 0}}>
    <rect x={3} y={3} width={58} height={58} rx={16} fill={ICON_BG[icon]} stroke={POP.ink} strokeWidth={5} />
    {icon === 'play' && <path d="M25,19 L45,32 L25,45 Z" fill={POP.white} stroke={POP.ink} strokeWidth={4} strokeLinejoin="round" />}
    {icon === 'music' && (
      <g fill={POP.white} stroke={POP.ink} strokeWidth={4} strokeLinejoin="round">
        <path d="M27,42 L27,18 L44,14 L44,38" fill="none" strokeLinecap="round" />
        <circle cx={23} cy={43} r={6} />
        <circle cx={40} cy={39} r={6} />
      </g>
    )}
    {icon === 'gym' && (
      <g fill={POP.white} stroke={POP.ink} strokeWidth={4} strokeLinejoin="round">
        <line x1={20} y1={32} x2={44} y2={32} strokeLinecap="round" />
        <rect x={12} y={22} width={9} height={20} rx={3} />
        <rect x={43} y={22} width={9} height={20} rx={3} />
      </g>
    )}
    {icon === 'euro' && (
      <text x={32} y={45} textAnchor="middle" fontFamily="Fredoka" fontWeight={700} fontSize={38} fill={POP.white} stroke={POP.ink} strokeWidth={3} paintOrder="stroke">
        €
      </text>
    )}
    {icon === 'star' && (
      <path
        d="M32,15 L37,27 L50,27 L40,35 L44,48 L32,40 L20,48 L24,35 L14,27 L27,27 Z"
        fill={POP.yellow}
        stroke={POP.ink}
        strokeWidth={4}
        strokeLinejoin="round"
      />
    )}
  </svg>
);

const PHONE = {x: 370, y: 330, w: 520};
/** Hauteur du téléphone selon le nombre de notifications. */
const phoneHeight = (n: number) => Math.max(400, 200 + n * 104 + 40);

export const NotifySceneView: React.FC<{scene: NotifyScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {value, progress} = useCounter(scene.from, scene.to, scene.animation);
  const endFrame = animationEndFrame(scene.animation, fps);
  const startFrame = toFrames(scene.animation.delay, fps);
  const shake = useShake(endFrame, 1.4);
  const totalIn = spring({frame: frame - startFrame + 4, fps, config: {damping: 10, stiffness: 190, mass: 0.7}});
  const accent = popAccent(scene.accent);

  return (
    <AbsoluteFill style={{transform: `translate(${shake}px, ${shake * 0.4}px)`}}>
      <Sunburst x={PHONE.x + PHONE.w / 2} y={980} size={1000} color={POP.yellow} intensity={progress} />
      <Abs y={250}>
        <Pill text={scene.eyebrow} />
      </Abs>
      {/* Téléphone */}
      <div
        style={{
          position: 'absolute',
          left: PHONE.x,
          top: PHONE.y,
          width: PHONE.w,
          height: phoneHeight(scene.items.length),
          ...sticker(POP.ink, 14, 64),
          padding: 16,
          transform: 'rotate(2deg)',
        }}
      >
        <div style={{width: '100%', height: '100%', borderRadius: 46, background: POP.violetLight, position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: '50%', top: 14, width: 110, height: 26, marginLeft: -55, borderRadius: 13, background: POP.ink}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 58, textAlign: 'center', fontFamily: POP_FONT, fontWeight: 700, fontSize: 64, color: POP.ink, opacity: 0.85, ...TABULAR}}>
            09:41
          </div>
          {scene.items.map((item, i) => {
            const at = toFrames(scene.itemsAt + i * scene.itemGap, fps);
            const s = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 210, mass: 0.6}});
            return (
              <div
                key={item.label}
                style={{
                  position: 'absolute',
                  left: 14,
                  right: 14,
                  top: 160 + i * 104,
                  height: 92,
                  ...sticker(POP.white, 5, 22),
                  borderWidth: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0 14px',
                  transform: `translateY(${(1 - s) * -80}px) scale(${interpolate(s, [0, 1], [0.8, 1])})`,
                  opacity: Math.min(1, s * 2.5),
                  fontFamily: POP_FONT,
                  ...TABULAR,
                }}
              >
                <SubIcon icon={item.icon} size={52} />
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontSize: 18, fontWeight: 600, color: POP.textDim, textTransform: 'uppercase', letterSpacing: '0.06em'}}>{scene.notifLabel}</div>
                  <div style={{fontSize: 25, fontWeight: 700, color: POP.ink, whiteSpace: 'nowrap'}}>{item.label}</div>
                </div>
                <div style={{fontSize: 26, fontWeight: 700, color: item.incoming ? '#12A47C' : POP.coral, whiteSpace: 'nowrap'}}>
                  {item.incoming ? `+${formatEuroCents(item.amount)}` : formatEuroCents(-item.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Total qui tombe sur le téléphone */}
      <div
        style={{
          position: 'absolute',
          left: PHONE.x + PHONE.w / 2,
          top: Math.min(1000, PHONE.y + phoneHeight(scene.items.length) - 30),
          transform: `translateX(-50%) scale(${interpolate(totalIn, [0, 1], [0.3, 1])})`,
          opacity: Math.min(1, totalIn * 2),
        }}
      >
        <BigNumber
          value={`${formatEuro(value)}${scene.suffix ?? ''}`}
          fontSize={120}
          bg={progress >= 1 ? accent : POP.white}
          endFrame={endFrame}
          rotate={-3}
        />
      </div>
      {scene.character && (
        <div style={{position: 'absolute', left: 40, top: 1220 - 382}}>
          <Character cue={scene.character} switchAt={endFrame} width={260} enterAt={0} />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const ChecklistSceneView: React.FC<{scene: ChecklistScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lastFrame = toFrames(scene.strikeAt + scene.strikeGap * (scene.items.length - 1), fps);
  const saved = spring({frame: frame - lastFrame - 8, fps, config: {damping: 9, stiffness: 190, mass: 0.7}});
  const rowH = 128;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 80, top: 262, fontFamily: POP_FONT, fontWeight: 700, fontSize: 64, color: POP.ink}}>{scene.title}</div>
      <div style={{position: 'absolute', left: 80, top: 380, width: 840, ...sticker(POP.white, 14, 40), padding: '10px 0'}}>
        {scene.items.map((item, i) => {
          const at = toFrames(scene.strikeAt + i * scene.strikeGap, fps);
          const strike = interpolate(frame, [at - 6, at + 2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const stamp = spring({frame: frame - at, fps, config: {damping: 9, stiffness: 260, mass: 0.6}});
          return (
            <div
              key={item.label}
              style={{
                position: 'relative',
                height: rowH,
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                padding: '0 34px',
                borderTop: i ? `4px dashed ${POP.greyLight}` : undefined,
                fontFamily: POP_FONT,
                ...TABULAR,
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: 22, flex: 1, opacity: 1 - 0.55 * strike}}>
                <SubIcon icon={item.icon} size={72} />
                <div style={{flex: 1, fontSize: 40, fontWeight: 700, color: POP.ink, whiteSpace: 'nowrap'}}>{item.label}</div>
                <div style={{fontSize: 34, fontWeight: 600, color: POP.textDim, whiteSpace: 'nowrap'}}>
                  {formatEuroCents(item.amount)}
                  {scene.amountSuffix}
                </div>
              </div>
              {/* Rature */}
              <div
                style={{
                  position: 'absolute',
                  left: 24,
                  top: rowH / 2 - 6,
                  height: 12,
                  width: `calc((100% - 48px) * ${strike})`,
                  borderRadius: 6,
                  background: POP.coral,
                  border: `3px solid ${POP.ink}`,
                }}
              />
              {/* Tampon */}
              <div
                style={{
                  position: 'absolute',
                  right: 40,
                  top: rowH / 2 - 32,
                  padding: '4px 20px',
                  border: `6px solid ${POP.coral}`,
                  borderRadius: 14,
                  background: POP.white,
                  color: POP.coral,
                  fontFamily: POP_FONT,
                  fontWeight: 700,
                  fontSize: 34,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  transform: `rotate(-12deg) scale(${interpolate(stamp, [0, 1], [2.4, 1])})`,
                  opacity: frame >= at ? Math.min(1, stamp * 2) : 0,
                }}
              >
                {scene.stamp}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 330,
          top: 1010,
          ...sticker(POP.mint, 10, 999),
          padding: '18px 40px',
          fontFamily: POP_FONT,
          fontWeight: 700,
          fontSize: 44,
          color: POP.ink,
          whiteSpace: 'nowrap',
          transform: `rotate(-3deg) scale(${interpolate(saved, [0, 1], [0.3, 1])})`,
          opacity: Math.min(1, saved * 2),
          ...TABULAR,
        }}
      >
        {scene.savedLabel}
      </div>
      {scene.character && (
        <div style={{position: 'absolute', left: 70, top: 1220 - 323}}>
          <Character cue={scene.character} switchAt={lastFrame + 8} width={220} enterAt={6} />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Répartition en bocaux
// ---------------------------------------------------------------------------

const JAR_COLOR: Record<'violet' | 'coral' | 'mint', string> = {violet: POP.violet, coral: POP.coral, mint: POP.mint};
const JAR = {w: 260, h: 450, gap: 36, top: 500};

/** Pseudo-aléatoire déterministe (rendu identique à chaque frame). */
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const JarsSceneView: React.FC<{scene: JarsScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const n = scene.jars.length;
  const totalW = n * JAR.w + (n - 1) * JAR.gap;
  const left0 = (1080 - totalW) / 2 - 20;
  const maxShare = Math.max(...scene.jars.map((j) => j.share));
  const lastFull = toFrames(scene.fillAt[n - 1] + scene.fillDuration, fps);
  const pillIn = spring({frame: frame - 4, fps, config: {damping: 10, stiffness: 200, mass: 0.6}});
  // Le montant de départ « se vide » à mesure que les bocaux se remplissent.
  const poured = scene.jars.reduce((sum, jar, j) => {
    const p = interpolate(frame / fps, [scene.fillAt[j], scene.fillAt[j] + scene.fillDuration], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return sum + jar.share * p;
  }, 0);

  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 70, top: 262, fontFamily: POP_FONT, fontWeight: 700, fontSize: 64, color: POP.ink}}>{scene.title}</div>
      <div style={{position: 'absolute', left: 70, top: 360, transformOrigin: '0 50%', transform: `scale(${pillIn})`}}>
        <div style={{...sticker(POP.yellow, 8, 999), padding: '10px 32px', fontFamily: POP_FONT, fontWeight: 700, fontSize: 42, color: POP.ink, whiteSpace: 'nowrap', ...TABULAR}}>
          {formatEuro(scene.total * (1 - poured))}
          <span style={{fontSize: 28, color: POP.textDim}}> / {scene.totalLabel}</span>
        </div>
      </div>
      {scene.jars.map((jar, j) => {
        const x = left0 + j * (JAR.w + JAR.gap);
        const t0 = scene.fillAt[j];
        const p = interpolate(frame / fps, [t0 + COIN_FALL, t0 + COIN_FALL + scene.fillDuration], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const eased = 1 - Math.pow(1 - p, 2);
        const fillH = (jar.share / maxShare) * (JAR.h - 70) * eased;
        const fullFrame = toFrames(t0 + COIN_FALL + scene.fillDuration, fps);
        const bump = interpolate(frame - fullFrame, [0, 5, 18], [1, 1.08, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const labelIn = spring({frame: frame - toFrames(t0, fps), fps, config: {damping: 10, stiffness: 200, mass: 0.6}});
        const color = JAR_COLOR[jar.color];
        return (
          <React.Fragment key={jar.label}>
            {/* Pièces qui tombent */}
            {Array.from({length: JAR_COINS}, (_, c) => {
              const start = t0 + (c / JAR_COINS) * scene.fillDuration * 0.8;
              const k = (frame / fps - start) / COIN_FALL;
              if (k < 0 || k > 1) return null;
              const cx = x + JAR.w / 2 + (rand(j * 10 + c) - 0.5) * 120;
              const cy = 400 + k * k * (JAR.top + 40 - 400);
              return (
                <div
                  key={c}
                  style={{
                    position: 'absolute',
                    left: cx - 24,
                    top: cy - 24,
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    background: POP.yellow,
                    border: `5px solid ${POP.ink}`,
                    transform: `rotate(${k * 300 + c * 40}deg) scaleX(${0.55 + 0.45 * Math.abs(Math.cos(k * 6 + c))})`,
                    fontFamily: POP_FONT,
                    fontWeight: 700,
                    fontSize: 24,
                    lineHeight: '38px',
                    textAlign: 'center',
                    color: POP.ink,
                  }}
                >
                  €
                </div>
              );
            })}
            {/* Bocal */}
            <div style={{position: 'absolute', left: x, top: JAR.top, width: JAR.w, transform: `scale(${bump}) rotate(${(j - 1) * 2}deg)`, transformOrigin: '50% 100%'}}>
              <div style={{margin: '0 30px', height: 40, ...sticker(color, 6, 14), borderWidth: OUTLINE}} />
              <div
                style={{
                  marginTop: -6,
                  height: JAR.h - 34,
                  border: `${OUTLINE}px solid ${POP.ink}`,
                  borderRadius: '34px 34px 54px 54px',
                  background: 'rgba(255,255,255,0.75)',
                  boxShadow: `10px 10px 0 ${POP.ink}`,
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
                    height: fillH,
                    background: `repeating-linear-gradient(-45deg, ${color} 0 22px, ${color}CC 22px 44px)`,
                    borderTop: fillH > 2 ? `${OUTLINE}px solid ${POP.ink}` : undefined,
                  }}
                />
                <div style={{position: 'absolute', left: 22, top: 24, width: 16, height: 90, borderRadius: 8, background: POP.white, opacity: 0.9}} />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 120,
                    textAlign: 'center',
                    fontFamily: POP_FONT,
                    fontWeight: 700,
                    fontSize: 64,
                    color: POP.ink,
                    opacity: labelIn,
                    ...TABULAR,
                  }}
                >
                  {Math.round(jar.share * 100)}&nbsp;%
                </div>
              </div>
              <div style={{textAlign: 'center', marginTop: 22, fontFamily: POP_FONT, opacity: labelIn, transform: `translateY(${(1 - labelIn) * 20}px)`, ...TABULAR}}>
                <div style={{fontSize: 48, fontWeight: 700, color: POP.ink}}>{jar.label}</div>
                <div style={{fontSize: 48, fontWeight: 700, color, WebkitTextStroke: `2px ${POP.ink}`}}>{formatEuro(scene.total * jar.share * eased)}</div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
      {scene.character && (
        <div style={{position: 'absolute', left: 760, top: 196, transform: 'scaleX(-1)'}}>
          <Character cue={scene.character} switchAt={lastFull} width={160} enterAt={8} />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Carte de fin (logo du compte + abonnement)
// ---------------------------------------------------------------------------

export const EndCardSceneView: React.FC<{scene: EndCardScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 10, stiffness: 190, mass: 0.7}});
  const avatar = pop(0);
  const name = pop(8);
  const cta = pop(18);
  const btn = pop(28);
  const pulse = 1 + 0.05 * Math.max(0, Math.sin(((frame - 40) / fps) * Math.PI * 2.2)) * (frame > 40 ? 1 : 0);
  const D = 460;
  const c = BG[BRAND.avatar.bg];
  return (
    <AbsoluteFill>
      <Sunburst x={540} y={560} size={1150} color={POP.yellow} intensity={avatar} />
      <div
        style={{
          position: 'absolute',
          left: 540 - D / 2,
          top: 300,
          width: D,
          height: D,
          borderRadius: '50%',
          overflow: 'hidden',
          background: c.fill,
          border: `${OUTLINE * 2}px solid ${POP.ink}`,
          boxShadow: `14px 14px 0 ${POP.ink}`,
          transform: `scale(${avatar}) rotate(${(1 - avatar) * -20}deg)`,
        }}
      >
        <Rays size={D} color={c.ray} />
        <LeoBust size={D} pose={BRAND.avatar.pose} />
      </div>
      <Abs y={810}>
        <div
          style={{
            ...sticker(POP.white, 14, 40),
            padding: '12px 44px 20px',
            fontFamily: POP_FONT,
            fontWeight: 700,
            fontSize: 104,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            transform: `rotate(-3deg) scale(${interpolate(name, [0, 1], [0.3, 1])})`,
            opacity: Math.min(1, name * 2),
          }}
        >
          <span style={{color: POP.violet}}>{BRAND.name[0]}</span> <span style={{color: POP.ink}}>{BRAND.name[1]}</span>
        </div>
        <div style={{marginTop: 26, fontFamily: POP_FONT, fontWeight: 600, fontSize: 44, color: POP.textDim, opacity: name}}>{BRAND.handle}</div>
      </Abs>
      <Abs y={1050}>
        <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
          <div style={{fontFamily: POP_FONT, fontWeight: 700, fontSize: 44, color: POP.ink, opacity: cta, transform: `translateY(${(1 - cta) * 20}px)`}}>
            {scene.cta}
          </div>
          <div
            style={{
              ...sticker(POP.coral, 8, 999),
              padding: '14px 36px',
              fontFamily: POP_FONT,
              fontWeight: 700,
              fontSize: 44,
              color: POP.white,
              whiteSpace: 'nowrap',
              transform: `scale(${interpolate(btn, [0, 1], [0.3, 1]) * pulse})`,
              opacity: Math.min(1, btn * 2),
            }}
          >
            + {scene.button}
          </div>
        </div>
      </Abs>
    </AbsoluteFill>
  );
};
