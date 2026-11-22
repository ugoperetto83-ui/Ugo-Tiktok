import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, getStaticFiles, staticFile, useVideoConfig} from 'remotion';
import {KEYWORDS, VIDEO_CONFIG} from '../scripts/video-data';
import {Background} from './components/Background';
import {SceneContainer} from './components/SceneContainer';
import {Subtitles} from './components/Subtitles';
import {buildSubtitles, layoutScenes, toFrames, type ResolvedScene} from './lib/timeline';
import {resolveScenes} from './lib/resolve';
import {loadFonts} from './lib/fonts';
import {ChartSceneView, CounterSceneView, SplitSceneView, StatementSceneView} from './Scenes';

loadFonts();

const renderScene = (scene: ResolvedScene) => {
  switch (scene.visual) {
    case 'counter':
      return <CounterSceneView scene={scene} />;
    case 'split':
      return <SplitSceneView scene={scene} />;
    case 'chart':
      return <ChartSceneView scene={scene} />;
    case 'statement':
      return <StatementSceneView scene={scene} />;
  }
};

export const FinanceVideo: React.FC = () => {
  const {fps} = useVideoConfig();
  const scenes = useMemo(() => resolveScenes(), []);
  const slots = useMemo(() => layoutScenes(scenes, fps), [scenes, fps]);
  const words = useMemo(() => buildSubtitles(scenes, fps, KEYWORDS), [scenes, fps]);
  const staticFiles = getStaticFiles().map((f) => f.name);
  const hasSoundtrack = staticFiles.includes(VIDEO_CONFIG.soundtrack);

  return (
    <AbsoluteFill style={{backgroundColor: '#0A0A0C'}}>
      <Background />
      {slots.map((slot) => (
        <Sequence key={slot.scene.id} from={slot.from} durationInFrames={slot.durationInFrames} name={slot.scene.id}>
          <SceneContainer durationInFrames={slot.durationInFrames}>{renderScene(slot.scene)}</SceneContainer>
          {/* Voix off de la scène (la durée de la scène est calée dessus) */}
          {slot.scene.voice && staticFiles.includes(slot.scene.voice.file) && (
            <Sequence from={toFrames(slot.scene.voice.offset, fps)} name={`voix · ${slot.scene.id}`}>
              <Audio src={staticFile(slot.scene.voice.file)} />
            </Sequence>
          )}
        </Sequence>
      ))}
      <Subtitles words={words} />
      {hasSoundtrack && <Audio src={staticFile(VIDEO_CONFIG.soundtrack)} volume={VIDEO_CONFIG.sfxVolume} />}
    </AbsoluteFill>
  );
};
