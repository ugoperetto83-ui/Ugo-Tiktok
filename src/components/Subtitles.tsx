import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {SubtitleWord} from '../lib/timeline';
import {COLORS, FONT_FAMILY, SAFE} from '../theme';

type Props = {words: SubtitleWord[]; fontSize?: number};

/**
 * Sous-titres mot par mot, style TikTok : blanc ultra-bold, contour noir épais,
 * mots-clés financiers en vert émeraude. Affichés par groupes de 1 à 3 mots.
 */
export const Subtitles: React.FC<Props> = ({words, fontSize = 86}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const chunks = useMemo(() => {
    const map = new Map<number, SubtitleWord[]>();
    for (const w of words) {
      if (!map.has(w.chunk)) map.set(w.chunk, []);
      map.get(w.chunk)!.push(w);
    }
    return [...map.values()];
  }, [words]);

  const current = chunks.find((c, i) => {
    const next = chunks[i + 1];
    const start = c[0].start;
    const end = next && next[0].start - c[c.length - 1].end < fps ? next[0].start : c[c.length - 1].end + 8;
    return frame >= start && frame < end;
  });
  if (!current) return null;

  const enter = spring({frame: frame - current[0].start, fps, config: {damping: 14, stiffness: 220, mass: 0.6}});

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: SAFE.side,
          right: SAFE.side,
          top: SAFE.subtitleY,
          transform: `translateY(-50%) translateY(${(1 - enter) * 24}px) scale(${interpolate(enter, [0, 1], [0.82, 1])})`,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          columnGap: fontSize * 0.34,
          rowGap: 6,
          fontFamily: FONT_FAMILY,
          fontWeight: 900,
          fontSize,
          lineHeight: 1.08,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        {current.map((w, i) => {
          const active = frame >= w.start && frame < w.end;
          const spoken = frame >= w.start;
          const pop = spring({frame: frame - w.start, fps, config: {damping: 10, stiffness: 260, mass: 0.5}});
          const scale = active ? interpolate(pop, [0, 1], [0.92, 1.06]) : 1;
          const color = w.keyword ? COLORS.emerald : COLORS.text;
          return (
            <span
              key={`${w.start}-${i}`}
              style={{
                position: 'relative',
                display: 'inline-block',
                margin: `0 ${fontSize * 0.05}px`,
                transform: `scale(${scale})`,
                opacity: spoken ? 1 : 0.42,
                whiteSpace: 'nowrap',
              }}
            >
              {/* Couche contour (derrière) : contour noir épais + ombre portée */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  color: '#000',
                  WebkitTextStroke: `${Math.round(fontSize * 0.2)}px #000`,
                  textShadow: '0 8px 18px rgba(0,0,0,0.85)',
                }}
              >
                {w.text}
              </span>
              <span
                style={{
                  position: 'relative',
                  color,
                  textShadow: w.keyword && spoken ? `0 0 26px ${COLORS.emerald}AA` : undefined,
                }}
              >
                {w.text}
              </span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
