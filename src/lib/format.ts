const NBSP = ' ';

/** 482500 → « 482 500 € » (espaces insécables, format français, déterministe). */
export const formatNumber = (value: number): string => {
  const n = Math.round(Math.abs(value));
  const s = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return value < 0 ? `-${s}` : s;
};

export const formatEuro = (value: number): string => `${formatNumber(value)}${NBSP}€`;

/** 413560 → « 414 k€ » pour les axes. */
export const formatCompactEuro = (value: number): string =>
  value >= 1000 ? `${formatNumber(Math.round(value / 1000))}${NBSP}k€` : formatEuro(value);
