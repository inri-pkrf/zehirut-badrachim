import React, { useCallback, useState } from 'react';
import SleepScreen from './SleepScreen';
import Game from './Game';

export default function App() {
  const [screen, setScreen] = useState('sleep'); // sleep | game

  const goGame = useCallback(() => setScreen('game'), []);
  const goSleep = useCallback(() => setScreen('sleep'), []);

  return screen === 'sleep' ? (
    <SleepScreen onStart={goGame} />
  ) : (
    <Game onExit={goSleep} />
  );
}
