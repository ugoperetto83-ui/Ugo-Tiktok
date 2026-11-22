/**
 * IDENTITÉ DU COMPTE — nom, pseudo, couleurs de l'avatar.
 * Rendu : compositions Remotion « Avatar » (photo de profil 1080×1080) et « Wordmark » (logo + nom).
 *   npx remotion still src/index.ts Avatar out/brand/avatar.png --frame=60
 *   npx remotion still src/index.ts Wordmark out/brand/wordmark.png --frame=60
 */
import type {CharacterPose} from './video-data';

export type AvatarBg = 'yellow' | 'violet' | 'mint' | 'coral';

export const BRAND = {
  /** Nom affiché (en deux parties : la 1re en violet, la 2e en noir). */
  name: ['Léo', '& la Thune'] as [string, string],
  handle: '@leoetlathune',
  avatar: {bg: 'yellow' as AvatarBg, pose: 'happy' as CharacterPose},
};
