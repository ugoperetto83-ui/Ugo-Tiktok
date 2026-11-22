import React from 'react';
import {Composition} from 'remotion';
import {VIDEO_CONFIG} from '../scripts/video-data';
import {FinanceVideo} from './FinanceVideo';
import {Avatar, Wordmark, type AvatarProps, type WordmarkProps} from './Brand';
import {BRAND} from '../scripts/brand';
import {totalFrames} from './lib/timeline';
import {resolveScenes} from './lib/resolve';

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id={VIDEO_CONFIG.id}
    component={FinanceVideo}
    durationInFrames={totalFrames(resolveScenes(), VIDEO_CONFIG.fps)}
    fps={VIDEO_CONFIG.fps}
    width={VIDEO_CONFIG.width}
    height={VIDEO_CONFIG.height}
  />
  <Composition
    id="Avatar"
    component={Avatar}
    durationInFrames={90}
    fps={60}
    width={1080}
    height={1080}
    defaultProps={{...BRAND.avatar, ring: false} as AvatarProps}
  />
  <Composition
    id="Wordmark"
    component={Wordmark}
    durationInFrames={90}
    fps={60}
    width={1800}
    height={700}
    defaultProps={{name: BRAND.name, handle: BRAND.handle, ...BRAND.avatar} as WordmarkProps}
  />
  </>
);
