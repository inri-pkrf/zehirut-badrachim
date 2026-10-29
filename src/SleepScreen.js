import React, { useEffect, useMemo, useState } from 'react';
import { STATEMENTS, THEMES, BASE_WEIGHT } from './data';
import VehicleIcon from './VehicleIcon';

// המשפט מתחלף רק אחרי שעונים. כמה זמן מציגים את התוצאה לפני המשפט הבא:
const RESULT_MS = 6000;

// תמונת הרקע (בתיקייה public). אפשר להחליף שם קובץ או סיומת כאן.
const ROAD_IMAGE = 'road-1.jpg';
const roadUrl = (name) => `url(${process.env.PUBLIC_URL || ''}/${name})`;
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

  // עוברים למשפט הבא (וערכת צבעים אחרת) רק אחרי שענו, ואחרי שהתוצאה הוצגה
  useEffect(() => {
    if (!vote) return undefined;
    const id = setTimeout(() => {
      setStep((s) => s + 1);
      setVote(null);
    }, RESULT_MS);
    return () => clearTimeout(id);
  }, [vote]);

  const counts = votes[statement.id] || { yes: 0, no: 0 };
  const yesPct = Math.round(
    (100 * ((statement.base / 100) * BASE_WEIGHT + counts.yes)) /
      (BASE_WEIGHT + counts.yes + counts.no)
  );
  const pct = vote === 'no' ? 100 - yesPct : yesPct;

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
    '--ink': '#FFF4E4', // טקסט בהיר קבוע, כי הרקע הוא תמונת כביש כהה
    '--yes': theme.yes,
    '--yesInk': theme.yesInk,
    '--no': theme.no,
    '--noInk': theme.noInk,
    '--accent': theme.accent,
    '--accentInk': theme.accentInk,
  };

  return (
    <div className="sleep" style={cssVars}>
      {/* רקע גיבוי (אם התמונות חסרות) */}
      <div className="bg" style={{ background: gradient(theme) }} />

      {/* תמונת כביש קבועה, עם תנועה איטית ועדינה מאוד */}
      <div className="road" aria-hidden="true">
        <i className="road-a" style={{ backgroundImage: roadUrl(ROAD_IMAGE) }} />
        <b className="road-shade" />
      </div>

      <div className="vehicle-wrap" key={'v' + step}>
        <VehicleIcon who={statement.who} />
      </div>

      <div className="sleep-content" key={'c' + step}>
        <h1 className="kicker">קרה לך?</h1>
        <p className="statement">{statement.text}</p>

        <div className="vote-row">
          <button
            className={'vbtn yes' + (vote === 'yes' ? ' chosen' : '')}
            disabled={Boolean(vote)}
            onClick={() => cast('yes')}
          >
            קרה לי
          </button>
          <button
            className={'vbtn no' + (vote === 'no' ? ' chosen' : '')}
            disabled={Boolean(vote)}
            onClick={() => cast('no')}
          >
            לא קרה לי
          </button>
        </div>

        {vote && (
          <div className="result" aria-live="polite">
            <div className="result-top">
              <span className="pct">{pct}%</span>
              <span className="result-label">מהאנשים בחרו כמוך</span>
            </div>
          </div>
        )}
      </div>

      <button className="start-btn" onClick={onStart}>
        התחלה
      </button>
    </div>
  );
}
