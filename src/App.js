import React, { useCallback, useEffect, useState } from 'react';
import SleepScreen from './SleepScreen';
import Game from './Game';

const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

/* כפתור אייקון: כניסה ויציאה ממצב מסך מלא */
function FullscreenButton() {
  const [full, setFull] = useState(Boolean(fsElement()));

  useEffect(() => {
    const sync = () => setFull(Boolean(fsElement()));
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toggle = () => {
    try {
      if (fsElement()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        const el = document.documentElement;
        (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      }
    } catch (e) {
      /* הדפדפן לא תומך במסך מלא */
    }
  };

  return (
    <button
      className="fs-btn"
      onClick={toggle}
      aria-label={full ? 'יציאה ממסך מלא' : 'מסך מלא'}
    >
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {full ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
    </button>
  );
}

export default function App() {
  const [screen, setScreen] = useState('sleep'); // sleep | game

  const goGame = useCallback(() => setScreen('game'), []);
  const goSleep = useCallback(() => setScreen('sleep'), []);

  return (
    <>
      {screen === 'sleep' ? <SleepScreen onStart={goGame} /> : <Game onExit={goSleep} />}
      <FullscreenButton />
    </>
  );
}