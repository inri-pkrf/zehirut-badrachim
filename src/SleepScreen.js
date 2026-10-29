import React, { useEffect, useMemo, useState } from 'react';
import { STATEMENTS, THEMES, BASE_WEIGHT } from './data';

const INTERVAL_MS = 20000; // כל כמה זמן מתחלף המשפט
const STORAGE_KEY = 'rs_votes_v1';

function loadVotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveVotes(votes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  } catch (e) {
    /* אין localStorage - ממשיכים בלי לשמור */
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const gradient = (t) => `linear-gradient(155deg, ${t.bg1} 0%, ${t.bg2} 100%)`;

export default function SleepScreen({ onStart }) {
  const order = useMemo(() => shuffle(STATEMENTS.map((_, i) => i)), []);
  const [step, setStep] = useState(0);
  const [vote, setVote] = useState(null); // null | 'yes' | 'no'
  const [votes, setVotes] = useState(loadVotes);

  const statement = STATEMENTS[order[step % order.length]];
  const theme = THEMES[step % THEMES.length];
  const prevTheme = THEMES[(((step - 1) % THEMES.length) + THEMES.length) % THEMES.length];

  // מחליפים משפט + ערכת צבעים כל 20 שניות
  useEffect(() => {
    const id = setTimeout(() => {
      setStep((s) => s + 1);
      setVote(null);
    }, INTERVAL_MS);
    return () => clearTimeout(id);
  }, [step]);

  const counts = votes[statement.id] || { yes: 0, no: 0 };
  const pct = Math.round(
    (100 * ((statement.base / 100) * BASE_WEIGHT + counts.yes)) /
      (BASE_WEIGHT + counts.yes + counts.no)
  );

  const cast = (answer) => {
    if (vote) return;
    setVote(answer);
    const next = {
      ...votes,
      [statement.id]: {
        yes: counts.yes + (answer === 'yes' ? 1 : 0),
        no: counts.no + (answer === 'no' ? 1 : 0),
      },
    };
    setVotes(next);
    saveVotes(next);
  };

  const cssVars = {
    '--bg1': theme.bg1,
    '--bg2': theme.bg2,
    '--ink': theme.ink,
    '--yes': theme.yes,
    '--yesInk': theme.yesInk,
    '--no': theme.no,
    '--noInk': theme.noInk,
    '--accent': theme.accent,
    '--accentInk': theme.accentInk,
  };

  const note =
    vote === 'yes'
      ? 'אתם לא לבד. וזה בדיוק הסיבה לשים לב.'
      : vote === 'no'
      ? 'יופי. אבל מי שאמר "קרה לי" לא תכנן שזה יקרה.'
      : '';

  return (
    <div className={'sleep' + (vote ? ' voted' : '')} style={cssVars}>
      <div className="bg" style={{ background: gradient(prevTheme) }} />
      <div className="bg bg-cur" key={'bg' + step} style={{ background: gradient(theme) }} />

      <div className="timer" aria-hidden="true">
        <i key={'t' + step} />
      </div>

      <div className="sleep-content" key={'c' + step}>
        <span className="chip">{statement.who}</span>
        <h1 className="kicker">קרה לך?</h1>
        <p className="statement">{statement.text}</p>

        <div className="vote-row">
          <button
            className={'vbtn yes' + (vote === 'yes' ? ' chosen' : vote ? ' dim' : '')}
            onClick={() => cast('yes')}
          >
            קרה לי
          </button>
          <button
            className={'vbtn no' + (vote === 'no' ? ' chosen' : vote ? ' dim' : '')}
            onClick={() => cast('no')}
          >
            לא קרה לי
          </button>
        </div>

        <div className={'result' + (vote ? ' show' : '')} aria-live="polite">
          <div className="result-top">
            <span className="pct">{pct}%</span>
            <span className="result-label">מהמשיבים אמרו שקרה להם</span>
          </div>
          <div className="bar">
            <i style={{ width: vote ? pct + '%' : '0%' }} />
          </div>
          <p className="result-note">{note}</p>
        </div>
      </div>

      <div className="dash-strip" aria-hidden="true" />
      <button className="start-btn" onClick={onStart}>
        התחלה
      </button>
    </div>
  );
}
