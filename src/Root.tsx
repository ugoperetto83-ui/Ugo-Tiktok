import React from 'react';
import {Composition} from 'remotion';
import {VIDEO_CONFIG} from '../scripts/video-data';
import {FinanceVideo} from './FinanceVideo';
import {totalFrames} from './lib/timeline';
import {resolveScenes} from './lib/resolve';

export const RemotionRoot: React.FC = () => (
  <Composition
    id={VIDEO_CONFIG.id}
    component={FinanceVideo}
    durationInFrames={totalFrames(resolveScenes(), VIDEO_CONFIG.fps)}
    fps={VIDEO_CONFIG.fps}
    width={VIDEO_CONFIG.width}
    height={VIDEO_CONFIG.height}
  />
);
