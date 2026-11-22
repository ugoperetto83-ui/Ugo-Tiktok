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
import * as Pop from './pop/PopScenes';
import {POP, POP_FONT} from './pop/theme';

loadFonts();

const POP_STYLE = VIDEO_CONFIG.style === 'pop';

const renderPopScene = (scene: ResolvedScene) => {
  switch (scene.visual) {
    case 'order':
      return <Pop.OrderSceneView scene={scene} />;
    case 'notify':
      return <Pop.NotifySceneView scene={scene} />;
    case 'checklist':
      return <Pop.ChecklistSceneView scene={scene} />;
    case 'counter':
      return <Pop.CounterSceneView scene={scene} />;
    case 'split':
      return <Pop.SplitSceneView scene={scene} />;
    case 'chart':
      return <Pop.ChartSceneView scene={scene} />;
    case 'statement':
      return <Pop.StatementSceneView scene={scene} />;
  }
};

const renderScene = (scene: ResolvedScene) => {
  if (POP_STYLE) return renderPopScene(scene);
  switch (scene.visual) {
    case 'order':
    case 'notify':
      // Pas de vue dédiée en style sombre : compteur classique.
      return <CounterSceneView scene={{...scene, visual: 'counter'}} />;
    case 'checklist':
      return <StatementSceneView scene={{...scene, visual: 'statement', lines: [{text: scene.title}], caption: scene.savedLabel}} />;
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
    <AbsoluteFill style={{backgroundColor: POP_STYLE ? POP.bg : '#0A0A0C'}}>
      {POP_STYLE ? <Pop.PopBackground /> : <Background />}
      {slots.map((slot) => (
        <Sequence key={slot.scene.id} from={slot.from} durationInFrames={slot.durationInFrames} name={slot.scene.id}>
          <SceneContainer durationInFrames={slot.durationInFrames} variant={POP_STYLE ? 'pop' : 'dark'}>{renderScene(slot.scene)}</SceneContainer>
          {/* Voix off de la scène (la durée de la scène est calée dessus) */}
          {slot.scene.voice && staticFiles.includes(slot.scene.voice.file) && (
            <Sequence from={toFrames(slot.scene.voice.offset, fps)} name={`voix · ${slot.scene.id}`}>
              <Audio src={staticFile(slot.scene.voice.file)} />
            </Sequence>
          )}
        </Sequence>
      ))}
      {POP_STYLE ? (
        <Subtitles words={words} fontFamily={POP_FONT} fontWeight={700} fontSize={90} keywordColor={POP.yellow} glow={false} shadow={`0 9px 0 ${POP.ink}`} strokeRatio={0.13} />
      ) : (
        <Subtitles words={words} />
      )}
      {hasSoundtrack && <Audio src={staticFile(VIDEO_CONFIG.soundtrack)} volume={VIDEO_CONFIG.sfxVolume} />}
    </AbsoluteFill>
  );
};
