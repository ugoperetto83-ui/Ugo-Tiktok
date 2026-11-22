import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {AvatarBg} from '../scripts/brand';
import type {CharacterPose} from '../scripts/video-data';
import {loadFonts} from './lib/fonts';
import {Character} from './pop/Character';
import {OUTLINE, POP, POP_FONT, sticker} from './pop/theme';

loadFonts();

const BG: Record<AvatarBg, {fill: string; ray: string}> = {
  yellow: {fill: POP.yellow, ray: '#FFE27A'},
  violet: {fill: POP.violetLight, ray: '#E8E2FF'},
  mint: {fill: '#7FE3C3', ray: '#A6EED6'},
  coral: {fill: '#FF9B8C', ray: '#FFB8AD'},
};

/** Rayons fixes derrière la tête (même ADN que les vidéos). */
const Rays: React.FC<{size: number; color: string}> = ({size, color}) => {
  const r = size / 2;
  const n = 16;
  return (
    <svg width={size} height={size} style={{position: 'absolute', inset: 0}}>
      {Array.from({length: n}, (_, i) => {
        const a0 = (i / n) * Math.PI * 2;
        const a1 = a0 + Math.PI / n;
        return <path key={i} d={`M${r},${r} L${r + Math.cos(a0) * r * 1.5},${r + Math.sin(a0) * r * 1.5} L${r + Math.cos(a1) * r * 1.5},${r + Math.sin(a1) * r * 1.5} Z`} fill={color} />;
      })}
    </svg>
  );
};

/** Buste de Léo cadré pour un avatar rond (tête dans le cercle central). */
const LeoBust: React.FC<{size: number; pose: CharacterPose}> = ({size, pose}) => {
  const k = size / 1080;
  const w = 1100 * k;
  return (
    <div style={{position: 'absolute', left: -10 * k, top: -10 * k}}>
      <Character cue={{pose}} width={w} />
    </div>
  );
};

export type AvatarProps = {bg: AvatarBg; pose: CharacterPose; ring: boolean};

/** Photo de profil 1080×1080 (TikTok la recadre en cercle). */
export const Avatar: React.FC<AvatarProps> = ({bg, pose, ring}) => {
  useCurrentFrame();
  const c = BG[bg];
  return (
    <AbsoluteFill style={{background: c.fill, overflow: 'hidden', borderRadius: ring ? '50%' : 0}}>
      <Rays size={1080} color={c.ray} />
      <LeoBust size={1080} pose={pose} />
      {ring && <AbsoluteFill style={{borderRadius: '50%', border: `${OUTLINE * 4}px solid ${POP.ink}`}} />}
    </AbsoluteFill>
  );
};

export type WordmarkProps = {name: [string, string]; handle: string; bg: AvatarBg; pose: CharacterPose};

/** Logo complet : avatar rond + nom en sticker + pseudo. */
export const Wordmark: React.FC<WordmarkProps> = ({name, handle, bg, pose}) => {
  const c = BG[bg];
  const D = 440;
  return (
    <AbsoluteFill style={{background: POP.bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 50}}>
      <div style={{width: D, height: D, borderRadius: '50%', overflow: 'hidden', position: 'relative', background: c.fill, border: `${OUTLINE * 2}px solid ${POP.ink}`, boxShadow: `14px 14px 0 ${POP.ink}`}}>
        <Rays size={D} color={c.ray} />
        <LeoBust size={D} pose={pose} />
      </div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
        <div style={{...sticker(POP.white, 14, 40), padding: '14px 44px 22px', transform: 'rotate(-3deg)', fontFamily: POP_FONT, fontWeight: 700, fontSize: 128, lineHeight: 1, whiteSpace: 'nowrap'}}>
          <span style={{color: POP.violet}}>{name[0]}</span> <span style={{color: POP.ink}}>{name[1]}</span>
        </div>
        <div style={{marginTop: 34, marginLeft: 30, fontFamily: POP_FONT, fontWeight: 600, fontSize: 52, color: POP.textDim}}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
