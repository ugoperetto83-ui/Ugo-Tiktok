import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {AnimationTiming, ChartSeries} from '../../scripts/video-data';
import {chartEasing, linearProgress, toFrames} from '../lib/timeline';
import {formatCompactEuro, formatEuro} from '../lib/format';
import {COLORS, FONT_FAMILY, TABULAR} from '../theme';

export type ChartPalette = {
  font: string;
  axis: string;
  gridOpacity: number;
  label: string;
  labelActive: string;
  legend: string;
  legendDim: string;
  neon: string;
  /** Couleur du halo flou sous la courbe néon (null = pas de halo). */
  neonGlow: string | null;
  area: string;
  muted: string;
  /** Contour noir sous les courbes (style sticker), 0 = aucun. */
  outline: number;
  outlineColor: string;
  tagNeonFill: string;
  tagNeonStroke: string;
  tagMutedFill: string;
  tagMutedStroke: string;
  tagText: string;
  tagTextDim: string;
};

export const DARK_CHART: ChartPalette = {
  font: FONT_FAMILY,
  axis: '#FFFFFF',
  gridOpacity: 0.08,
  label: COLORS.textFaint,
  labelActive: COLORS.textDim,
  legend: COLORS.text,
  legendDim: COLORS.textDim,
  neon: COLORS.emeraldNeon,
  neonGlow: COLORS.emerald,
  area: COLORS.emerald,
  muted: COLORS.muted,
  outline: 0,
  outlineColor: '#000',
  tagNeonFill: 'rgba(16,185,129,0.16)',
  tagNeonStroke: COLORS.emerald,
  tagMutedFill: 'rgba(255,255,255,0.06)',
  tagMutedStroke: 'rgba(255,255,255,0.15)',
  tagText: COLORS.text,
  tagTextDim: COLORS.textDim,
};

type Props = {
  xValues: number[];
  xTicks: number[];
  xLabelSuffix: string;
  series: ChartSeries[];
  timing: AnimationTiming;
  width?: number;
  height?: number;
  palette?: ChartPalette;
};

type Pt = {x: number; y: number};

const niceStep = (raw: number) => {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
};

/** Longueurs cumulées d'une polyligne (pour piloter strokeDashoffset). */
const cumulative = (pts: Pt[]) => {
  const out = [0];
  for (let i = 1; i < pts.length; i++) {
    out.push(out[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return out;
};

/**
 * Graphique SVG pur qui se dessine en temps réel via strokeDashoffset.
 * Les deux courbes avancent sur le même axe X (même année au même instant).
 */
export const CompoundChart: React.FC<Props> = ({
  xValues,
  xTicks,
  xLabelSuffix,
  series,
  timing,
  width = 960,
  height = 760,
  palette: P = DARK_CHART,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = chartEasing(linearProgress(frame, timing, fps));

  const n = xValues.length;
  const maxV = Math.max(...series.flatMap((s) => s.values));
  const step = niceStep(maxV / 5);
  const yMax = Math.ceil((maxV * 1.08) / step) * step;
  // Marge gauche adaptée à la plus longue étiquette de l'axe Y (ex : « 1 250 k€ »).
  const pad = {l: Math.max(118, 34 + formatCompactEuro(yMax).length * 17), r: 36, t: 70, b: 74};
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const sx = (i: number) => pad.l + (i / (n - 1)) * plotW;
  const sy = (v: number) => pad.t + (1 - v / yMax) * plotH;
  const baseY = sy(0);

  const xFloat = p * (n - 1);
  const i0 = Math.min(n - 2, Math.floor(xFloat));
  const frac = xFloat - i0;
  const headX = pad.l + p * plotW;

  const endFrame = toFrames(timing.delay + timing.duration, fps);
  const endReveal = interpolate(frame, [endFrame - 6, endFrame + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const axesIn = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: 'clamp'});

  const yTicks: number[] = [];
  for (let v = step; v <= yMax; v += step) yTicks.push(v);

  const drawn = series.map((s) => {
    const pts = s.values.map((v, i) => ({x: sx(i), y: sy(v)}));
    const cum = cumulative(pts);
    const total = cum[cum.length - 1];
    const len = cum[i0] + frac * (cum[i0 + 1] - cum[i0]);
    const head: Pt = {
      x: pts[i0].x + frac * (pts[i0 + 1].x - pts[i0].x),
      y: pts[i0].y + frac * (pts[i0 + 1].y - pts[i0].y),
    };
    const value = s.values[i0] + frac * (s.values[i0 + 1] - s.values[i0]);
    const d = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(' ');
    return {s, pts, d, total, len, head, value};
  });

  const textBase: React.CSSProperties = {fontFamily: P.font, ...TABULAR};

  return (
    <div style={{width, position: 'relative'}}>
      {/* Légende */}
      <div style={{display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 10, paddingLeft: 8}}>
        {series.map((s) => {
          const neon = s.style === 'neon';
          return (
            <div key={s.label} style={{display: 'flex', alignItems: 'center', gap: 18, opacity: axesIn}}>
              <div
                style={{
                  width: 54,
                  height: 8,
                  borderRadius: 4,
                  background: neon ? P.neon : P.muted,
                  boxShadow: neon && P.neonGlow ? `0 0 16px ${P.neonGlow}` : undefined,
                  border: P.outline ? `3px solid ${P.outlineColor}` : undefined,
                }}
              />
              <span
                style={{
                  ...textBase,
                  fontSize: 34,
                  fontWeight: 800,
                  color: neon ? P.legend : P.legendDim,
                  letterSpacing: '-0.01em',
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <svg width={width} height={height} style={{overflow: 'visible'}}>
        <defs>
          <linearGradient id="neon-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={P.area} stopOpacity={0.45} />
            <stop offset="60%" stopColor={P.area} stopOpacity={0.1} />
            <stop offset="100%" stopColor={P.area} stopOpacity={0} />
          </linearGradient>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <clipPath id="reveal">
            <rect x={0} y={0} width={Math.max(0, headX)} height={height} />
          </clipPath>
        </defs>

        {/* Grille horizontale + axe Y */}
        <g opacity={axesIn}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={width - pad.r} y1={sy(v)} y2={sy(v)} stroke={P.axis} strokeOpacity={P.gridOpacity} strokeDasharray="4 10" />
              <text x={pad.l - 20} y={sy(v) + 10} textAnchor="end" fill={P.label} fontSize={28} fontWeight={700} style={textBase}>
                {formatCompactEuro(v)}
              </text>
            </g>
          ))}
          <line x1={pad.l} x2={width - pad.r} y1={baseY} y2={baseY} stroke={P.axis} strokeOpacity={P.outline ? 1 : 0.25} strokeWidth={P.outline ? 4 : 2} />
          {xTicks.map((xv) => {
            const i = xValues.indexOf(xv);
            if (i < 0) return null;
            const passed = xFloat >= i - 0.01;
            return (
              <g key={xv}>
                <line x1={sx(i)} x2={sx(i)} y1={baseY} y2={baseY + 12} stroke={P.axis} strokeOpacity={P.outline ? 1 : 0.35} strokeWidth={P.outline ? 4 : 2} />
                <text
                  x={sx(i)}
                  y={baseY + 52}
                  textAnchor="middle"
                  fill={passed ? P.labelActive : P.label}
                  fontSize={30}
                  fontWeight={800}
                  style={textBase}
                >
                  {xv}
                  {xLabelSuffix}
                </text>
              </g>
            );
          })}
        </g>

        {/* Aire dégradée sous la courbe néon, révélée avec la tête de lecture */}
        {drawn
          .filter((c) => c.s.style === 'neon')
          .map((c) => (
            <path
              key={`area-${c.s.label}`}
              d={`${c.d} L${c.pts[n - 1].x},${baseY} L${c.pts[0].x},${baseY} Z`}
              fill="url(#neon-area)"
              clipPath="url(#reveal)"
            />
          ))}

        {/* Courbes : strokeDasharray = longueur totale, strokeDashoffset = reste à dessiner */}
        {drawn.map((c) => {
          const neon = c.s.style === 'neon';
          const dash = {strokeDasharray: c.total, strokeDashoffset: c.total - c.len};
          return (
            <g key={c.s.label}>
              {P.outline > 0 && (
                <path d={c.d} fill="none" stroke={P.outlineColor} strokeWidth={(neon ? 7 : 5) + P.outline * 2} strokeLinecap="round" strokeLinejoin="round" {...dash} />
              )}
              {neon && P.neonGlow && (
                <path d={c.d} fill="none" stroke={P.neonGlow} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} filter="url(#neon-glow)" {...dash} />
              )}
              <path
                d={c.d}
                fill="none"
                stroke={neon ? P.neon : P.muted}
                strokeWidth={neon ? 7 : 5}
                strokeOpacity={neon || P.outline ? 1 : 0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                {...dash}
              />
            </g>
          );
        })}

        {/* Têtes de lecture + étiquettes de valeur qui suivent les courbes */}
        {p > 0.001 &&
          drawn.map((c) => {
            const neon = c.s.style === 'neon';
            const color = neon ? P.neon : P.muted;
            const tagW = neon ? 250 : 200;
            const tagH = neon ? 62 : 50;
            const tagX = Math.min(width - pad.r - tagW / 2 + 10, Math.max(pad.l + tagW / 2, c.head.x));
            // Pastille « muted » sous la tête, sauf si elle mordrait sur les graduations X (courbe au plancher).
            const mutedBelow = c.head.y + 40 + tagH / 2;
            const mutedY = mutedBelow + tagH / 2 > height - pad.b ? c.head.y - 34 - tagH / 2 : mutedBelow;
            const tagY = neon ? c.head.y - 58 - tagH / 2 : mutedY;
            const scale = 1 + 0.12 * endReveal * (neon ? 1 : 0);
            return (
              <g key={`head-${c.s.label}`}>
                <circle cx={c.head.x} cy={c.head.y} r={neon ? 22 : 14} fill={color} opacity={0.25} />
                <circle cx={c.head.x} cy={c.head.y} r={neon ? 10 : 7} fill={color} stroke={P.outline ? P.outlineColor : undefined} strokeWidth={P.outline ? 4 : 0} />
                <g transform={`translate(${tagX} ${tagY}) scale(${scale})`}>
                  <rect
                    x={-tagW / 2}
                    y={-tagH / 2}
                    width={tagW}
                    height={tagH}
                    rx={tagH / 2}
                    fill={neon ? P.tagNeonFill : P.tagMutedFill}
                    stroke={neon ? P.tagNeonStroke : P.tagMutedStroke}
                    strokeWidth={P.outline ? 4 : 2}
                  />
                  <text
                    x={0}
                    y={neon ? 12 : 10}
                    textAnchor="middle"
                    fill={neon ? P.tagText : P.tagTextDim}
                    fontSize={neon ? 36 : 29}
                    fontWeight={900}
                    style={textBase}
                  >
                    {formatEuro(c.value)}
                  </text>
                </g>
              </g>
            );
          })}
      </svg>
    </div>
  );
};
