import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CharacterCue, CharacterPose} from '../../scripts/video-data';
import {POP} from './theme';

/**
 * Petit personnage « sticker » dessiné en SVG pur (aucun asset) : bonnet, sweat à capuche,
 * contours noirs épais. Animé en continu (respiration, clignements) et changeant de pose
 * (ressort + petit saut) à `switchAt`.
 */

type Eyes = 'normal' | 'wide' | 'happy' | 'up' | 'down';
type Mouth = 'smile' | 'open' | 'o' | 'grin' | 'flat';
type Brows = 'neutral' | 'up' | 'focus';

type PoseDef = {
  /** Angles absolus (°) : 0 = bras vers le bas, 90 = horizontal vers l'extérieur, 180 = vers le haut. */
  left: [number, number];
  right: [number, number];
  eyes: Eyes;
  mouth: Mouth;
  brows: Brows;
  wave?: boolean;
  finger?: boolean;
};

const POSES: Record<CharacterPose, PoseDef> = {
  idle: {left: [12, 6], right: [14, 8], eyes: 'normal', mouth: 'smile', brows: 'neutral'},
  order: {left: [12, 6], right: [150, 172], eyes: 'normal', mouth: 'open', brows: 'up', wave: true},
  shock: {left: [140, 160], right: [140, 160], eyes: 'wide', mouth: 'o', brows: 'up'},
  think: {left: [12, 6], right: [15, 222], eyes: 'up', mouth: 'flat', brows: 'focus'},
  happy: {left: [128, 150], right: [138, 162], eyes: 'happy', mouth: 'grin', brows: 'up'},
  point: {left: [12, 6], right: [88, 92], eyes: 'normal', mouth: 'smile', brows: 'up', finger: true},
  phone: {left: [12, 6], right: [28, 165], eyes: 'down', mouth: 'flat', brows: 'neutral'},
};

const SHOULDER_L = {x: 104, y: 228};
const SHOULDER_R = {x: 196, y: 228};
const UPPER = 60;
const LOWER = 56;
const STROKE = 6;

const rad = (deg: number) => (deg * Math.PI) / 180;
const limb = (origin: {x: number; y: number}, side: -1 | 1, a1: number, a2: number) => {
  const elbow = {x: origin.x + side * Math.sin(rad(a1)) * UPPER, y: origin.y + Math.cos(rad(a1)) * UPPER};
  const hand = {x: elbow.x + side * Math.sin(rad(a2)) * LOWER, y: elbow.y + Math.cos(rad(a2)) * LOWER};
  return {elbow, hand};
};

const Arm: React.FC<{origin: {x: number; y: number}; side: -1 | 1; a1: number; a2: number; finger?: boolean}> = ({
  origin,
  side,
  a1,
  a2,
  finger,
}) => {
  const {elbow, hand} = limb(origin, side, a1, a2);
  const d = `M${origin.x},${origin.y} L${elbow.x},${elbow.y} L${hand.x},${hand.y}`;
  const fx = side * Math.sin(rad(a2));
  const fy = Math.cos(rad(a2));
  return (
    <g>
      <path d={d} fill="none" stroke={POP.ink} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={POP.violet} strokeWidth={34 - STROKE * 2} strokeLinecap="round" strokeLinejoin="round" />
      {finger && (
        <line
          x1={hand.x}
          y1={hand.y}
          x2={hand.x + fx * 30}
          y2={hand.y + fy * 30}
          stroke={POP.ink}
          strokeWidth={18}
          strokeLinecap="round"
        />
      )}
      {finger && (
        <line x1={hand.x} y1={hand.y} x2={hand.x + fx * 30} y2={hand.y + fy * 30} stroke={POP.skin} strokeWidth={7} strokeLinecap="round" />
      )}
      <circle cx={hand.x} cy={hand.y} r={17} fill={POP.skin} stroke={POP.ink} strokeWidth={STROKE} />
    </g>
  );
};

/** Gobelet à emporter (centré sur la main). */
export const Cup: React.FC<{x: number; y: number; scale?: number; steam?: number; label?: string}> = ({
  x,
  y,
  scale = 1,
  steam = 0,
  label,
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {/* Vapeur */}
    {[-12, 0, 12].map((dx, i) => {
      const t = (steam + i * 0.33) % 1;
      return (
        <path
          key={dx}
          d={`M${dx},-62 q8,-10 0,-20 q-8,-10 0,-20`}
          fill="none"
          stroke={POP.ink}
          strokeWidth={5}
          strokeLinecap="round"
          opacity={Math.sin(t * Math.PI) * 0.55}
          transform={`translate(0 ${-t * 16})`}
        />
      );
    })}
    <path d="M-30,-38 L30,-38 L24,44 Q23,50 17,50 L-17,50 Q-23,50 -24,44 Z" fill={POP.white} stroke={POP.ink} strokeWidth={STROKE} strokeLinejoin="round" />
    <path d="M-28,-6 L28,-6 L26,24 L-26,24 Z" fill={POP.coffeeLight} stroke={POP.ink} strokeWidth={STROKE} strokeLinejoin="round" />
    <rect x={-36} y={-54} width={72} height={18} rx={8} fill={POP.coffee} stroke={POP.ink} strokeWidth={STROKE} />
    {label && (
      <text x={0} y={16} textAnchor="middle" fontFamily="Fredoka" fontWeight={700} fontSize={20} fill={POP.ink}>
        {label}
      </text>
    )}
  </g>
);

const EyesView: React.FC<{kind: Eyes; blink: number}> = ({kind, blink}) => (
  <g>
    {[124, 176].map((cx) => {
      const cy = 140;
      if (kind === 'happy') {
        return <path key={cx} d={`M${cx - 13},${cy + 5} Q${cx},${cy - 12} ${cx + 13},${cy + 5}`} fill="none" stroke={POP.ink} strokeWidth={7} strokeLinecap="round" />;
      }
      if (kind === 'wide') {
        return (
          <g key={cx}>
            <circle cx={cx} cy={cy} r={18} fill={POP.white} stroke={POP.ink} strokeWidth={5} />
            <circle cx={cx} cy={cy + 1} r={7} fill={POP.ink} />
          </g>
        );
      }
      const dy = kind === 'up' ? -5 : kind === 'down' ? 6 : 0;
      const dx = kind === 'up' ? 4 : kind === 'down' ? 3 : 0;
      return <ellipse key={cx} cx={cx + dx} cy={cy + dy} rx={9} ry={Math.max(1.5, 12 * blink)} fill={POP.ink} />;
    })}
  </g>
);

const MouthView: React.FC<{kind: Mouth; flap: number}> = ({kind, flap}) => {
  const x = 150;
  const y = 180;
  switch (kind) {
    case 'smile':
      return <path d={`M${x - 18},${y - 2} Q${x},${y + 16} ${x + 18},${y - 2}`} fill="none" stroke={POP.ink} strokeWidth={7} strokeLinecap="round" />;
    case 'flat':
      return <path d={`M${x - 12},${y + 4} L${x + 12},${y + 1}`} fill="none" stroke={POP.ink} strokeWidth={7} strokeLinecap="round" />;
    case 'o':
      return <ellipse cx={x} cy={y + 6} rx={12} ry={15} fill="#6B1F1F" stroke={POP.ink} strokeWidth={STROKE} />;
    case 'open':
      return <ellipse cx={x} cy={y + 4} rx={15} ry={4 + 10 * flap} fill="#6B1F1F" stroke={POP.ink} strokeWidth={STROKE} />;
    case 'grin':
      return (
        <g>
          <path d={`M${x - 26},${y - 4} Q${x},${y + 34} ${x + 26},${y - 4} Z`} fill="#6B1F1F" stroke={POP.ink} strokeWidth={STROKE} strokeLinejoin="round" />
          <path d={`M${x - 10},${y + 14} Q${x},${y + 6} ${x + 10},${y + 14}`} fill={POP.coral} />
        </g>
      );
  }
};

const BrowsView: React.FC<{kind: Brows}> = ({kind}) => {
  const lift = kind === 'up' ? -10 : 0;
  const tilt = kind === 'focus' ? 5 : 0;
  return (
    <g stroke={POP.ink} strokeWidth={7} strokeLinecap="round">
      <line x1={110} y1={116 + lift + tilt} x2={136} y2={114 + lift - tilt} />
      <line x1={164} y1={114 + lift - tilt} x2={190} y2={116 + lift + tilt} />
    </g>
  );
};

type Props = {
  cue: CharacterCue;
  /** Frame (relative à la scène) du changement de pose vers `cue.then`. */
  switchAt?: number;
  /** Largeur rendue (px). */
  width?: number;
  /** Bouche qui parle (pose « order »). */
  talking?: boolean;
  /** Frame d'apparition. */
  enterAt?: number;
  /** Cache les jambes (personnage derrière un comptoir). */
  hideLegs?: boolean;
  style?: React.CSSProperties;
};

export const Character: React.FC<Props> = ({cue, switchAt, width = 300, talking, enterAt = 0, hideLegs, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = frame / fps;

  const from = POSES[cue.pose];
  const to = POSES[cue.then ?? cue.pose];
  const k = switchAt === undefined || !cue.then ? 0 : spring({frame: frame - switchAt, fps, config: {damping: 11, stiffness: 170, mass: 0.7}});
  const discrete = k > 0.4 ? to : from;
  const lerp = (a: number, b: number) => a + (b - a) * k;

  // Petit saut au changement de pose.
  const jump = switchAt !== undefined && cue.then ? Math.max(0, Math.sin(Math.min(1, Math.max(0, (frame - switchAt) / 14)) * Math.PI)) * 26 : 0;
  const bob = Math.sin(sec * Math.PI * 1.6) * 4;
  const breathe = 1 + Math.sin(sec * Math.PI * 1.6) * 0.012;
  const enter = spring({frame: frame - enterAt, fps, config: {damping: 12, stiffness: 160, mass: 0.8}});

  // Clignement toutes les ~2.7 s.
  const blinkPhase = (frame + 37) % Math.round(fps * 2.7);
  const blink = blinkPhase < 7 ? Math.abs(blinkPhase - 3.5) / 3.5 : 1;
  const flap = talking ? 0.5 + 0.5 * Math.sin(sec * Math.PI * 9) : 0.2;
  const wave = discrete.wave ? Math.sin(sec * Math.PI * 5) * 16 : 0;

  const rA1 = lerp(from.right[0], to.right[0]);
  const rA2 = lerp(from.right[1], to.right[1]) + wave;
  const lA1 = lerp(from.left[0], to.left[0]);
  const lA2 = lerp(from.left[1], to.left[1]);
  const right = limb(SHOULDER_R, 1, rA1, rA2);

  const height = width * (440 / 300);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 300 440"
      style={{
        overflow: 'visible',
        transform: `translateY(${(1 - enter) * 120}px) scale(${interpolate(enter, [0, 1], [0.6, 1])})`,
        transformOrigin: '50% 100%',
        opacity: Math.min(1, enter * 2),
        ...style,
      }}
    >
      <g transform={`translate(0 ${bob - jump})`}>
        {/* Ombre au sol */}
        {!hideLegs && <ellipse cx={150} cy={428 + jump - bob} rx={88 - jump} ry={10} fill={POP.ink} opacity={0.14} />}
        {/* Jambes + baskets */}
        {!hideLegs && (
          <g>
            <rect x={114} y={320} width={30} height={84} rx={12} fill="#2F3A66" stroke={POP.ink} strokeWidth={STROKE} />
            <rect x={156} y={320} width={30} height={84} rx={12} fill="#2F3A66" stroke={POP.ink} strokeWidth={STROKE} />
            <path d="M100,404 Q100,390 116,390 L146,390 L150,420 L100,420 Z" fill={POP.white} stroke={POP.ink} strokeWidth={STROKE} strokeLinejoin="round" />
            <path d="M200,404 Q200,390 184,390 L154,390 L150,420 L200,420 Z" fill={POP.white} stroke={POP.ink} strokeWidth={STROKE} strokeLinejoin="round" />
          </g>
        )}
        {/* Corps (sweat) */}
        <g transform={`translate(150 345) scale(${breathe}) translate(-150 -345)`}>
          <rect x={92} y={198} width={116} height={148} rx={44} fill={POP.violet} stroke={POP.ink} strokeWidth={STROKE} />
          <path d="M122,296 L178,296 L172,330 L128,330 Z" fill="#6A4BEF" stroke={POP.ink} strokeWidth={5} strokeLinejoin="round" />
          <line x1={140} y1={214} x2={138} y2={250} stroke={POP.ink} strokeWidth={5} strokeLinecap="round" />
          <line x1={160} y1={214} x2={162} y2={250} stroke={POP.ink} strokeWidth={5} strokeLinecap="round" />
        </g>
        {/* Tête */}
        <g>
          <circle cx={78} cy={140} r={15} fill={POP.skin} stroke={POP.ink} strokeWidth={STROKE} />
          <circle cx={222} cy={140} r={15} fill={POP.skin} stroke={POP.ink} strokeWidth={STROKE} />
          <circle cx={150} cy={136} r={72} fill={POP.skin} stroke={POP.ink} strokeWidth={STROKE} />
          {/* Bonnet */}
          <path d="M80,112 Q80,46 150,44 Q220,46 220,112 Z" fill={POP.coral} stroke={POP.ink} strokeWidth={STROKE} strokeLinejoin="round" />
          <rect x={72} y={98} width={156} height={28} rx={14} fill={POP.coral} stroke={POP.ink} strokeWidth={STROKE} />
          {[96, 120, 144, 168, 192].map((x) => (
            <line key={x} x1={x + 8} y1={104} x2={x + 8} y2={120} stroke={POP.ink} strokeWidth={4} strokeLinecap="round" opacity={0.35} />
          ))}
          <circle cx={150} cy={40} r={16} fill={POP.yellow} stroke={POP.ink} strokeWidth={STROKE} />
          {/* Visage */}
          <circle cx={106} cy={166} r={11} fill={POP.coral} opacity={0.45} />
          <circle cx={194} cy={166} r={11} fill={POP.coral} opacity={0.45} />
          <BrowsView kind={discrete.brows} />
          <EyesView kind={discrete.eyes} blink={blink} />
          <MouthView kind={discrete.mouth} flap={flap} />
        </g>
        {/* Bras (devant le corps) */}
        <Arm origin={SHOULDER_L} side={-1} a1={lA1} a2={lA2} />
        <Arm origin={SHOULDER_R} side={1} a1={rA1} a2={rA2} finger={discrete.finger && !cue.holdsCup} />
        {cue.holdsPhone && (
          <g transform={`translate(${right.hand.x - 6} ${right.hand.y - 34}) rotate(-12)`}>
            <rect x={-22} y={-38} width={44} height={74} rx={10} fill={POP.ink} />
            <rect x={-16} y={-31} width={32} height={58} rx={6} fill={POP.violetLight} />
            <circle cx={0} cy={-24} r={2.5} fill={POP.ink} />
          </g>
        )}
        {cue.holdsPhone && <circle cx={right.hand.x} cy={right.hand.y} r={17} fill={POP.skin} stroke={POP.ink} strokeWidth={STROKE} />}
        {cue.holdsCup && <Cup x={right.hand.x + 4} y={right.hand.y - 18} scale={0.78} steam={(sec * 0.6) % 1} />}
      </g>
    </svg>
  );
};
