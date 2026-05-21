import React from 'react';
import { Composition } from 'remotion';
import { DictionnaireDemo } from './demos/DictionnaireDemo';
import { TraducteurDemo } from './demos/TraducteurDemo';
import { ClasseDemo } from './demos/ClasseDemo';
import { FitilaTemIADemo } from './demos/FitilaTemIADemo';
import { ApprendreDemo } from './demos/ApprendreDemo';

const W = 1080;
const H = 1920;
const FPS = 30;
const DUR = 450; // 15s

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="dictionnaire" component={DictionnaireDemo} durationInFrames={DUR} fps={FPS} width={W} height={H} />
    <Composition id="traducteur" component={TraducteurDemo} durationInFrames={DUR} fps={FPS} width={W} height={H} />
    <Composition id="classe" component={ClasseDemo} durationInFrames={DUR} fps={FPS} width={W} height={H} />
    <Composition id="fitila-tem-ia" component={FitilaTemIADemo} durationInFrames={DUR} fps={FPS} width={W} height={H} />
    <Composition id="apprendre" component={ApprendreDemo} durationInFrames={DUR} fps={FPS} width={W} height={H} />
  </>
);