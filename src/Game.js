import React, { useCallback, useEffect, useRef, useState } from 'react';
import RoadScene from './RoadScene';
import { ROUNDS, MESSAGES, DECEL, TIPS } from './data';

/* מרחק התחלתי של המכשול: מרחק בלימה + שנייה של תגובה + 30 מטר מרווח.
   נהג קשוב עוצר בביטחון, נהג מוסח כבר לא. */
const calcGap = (kmh) => {
  const v = kmh / 3.6;
  return Math.round((v * v) / (2 * DECEL) + v * 1.0 + 30);
};

const m = (x) => Math.max(0, Math.round(x));

function useIdle(ms, cb) {
  useEffect(() => {
    let id = setTimeout(cb, ms);
    const reset = () => {
      clearTimeout(id);
      id = setTimeout(cb, ms);
    };
    window.addEventListener('pointerdown', reset);
    return () => {
      clearTimeout(id);
      window.removeEventListener('pointerdown', reset);
    };
  }, [ms, cb]);
}

/* ---------------- סימולציה של סיבוב אחד ---------------- */

function createSim(round) {
  return {
    cfg: { ...round, gap: calcGap(round.speed) },
    t: 0,
    pos: 0,
    v: round.speed / 3.6,
    braking: false,
    ended: false,
    stopped: false,
    obstacleAbs: null,
    appearPos: null,
    seeT: null,
    seePos: null,
    bannerAt: null,
    phoneOpen: false,
    phoneOpenT: null,
    phoneOpenPos: null,
    travel: null,
    brakeT: null,
    brakePos: null,
    reaction: null,
    impact: 0,
    endPos: null,
  };
}

function closePhone(S) {
  if (!S.phoneOpen) return;
  S.phoneOpen = false;
  S.travel = S.pos - S.phoneOpenPos;
  if (S.obstacleAbs != null && S.seeT == null) {
    S.seeT = S.t;
    S.seePos = S.pos;
  }
}

function finish(S, stopped) {
  S.ended = true;
  S.stopped = stopped;
  S.endPos = S.pos;
  S.impact = stopped ? 0 : S.v * 3.6;
  closePhone(S);
}

function step(S, dt) {
  const cfg = S.cfg;
  S.t += dt;

  if (S.obstacleAbs == null) {
    let spawn = false;
    if (!cfg.distracted) {
      spawn = S.t >= 2.5;
    } else {
      if (S.bannerAt == null && S.t >= 1.5) S.bannerAt = S.t;
      if (S.phoneOpenT != null) spawn = S.t >= S.phoneOpenT + 0.8;
      else if (S.bannerAt != null) spawn = S.t >= S.bannerAt + 3.5;
    }
    if (spawn) {
      S.obstacleAbs = S.pos + cfg.gap;
      S.appearPos = S.pos;
      if (!S.phoneOpen) {
        S.seeT = S.t;
        S.seePos = S.pos;
      }
    }
  }

  if (S.braking) S.v = Math.max(0, S.v - DECEL * dt);
  S.pos += S.v * dt;

  if (S.obstacleAbs != null) {
    if (S.pos >= S.obstacleAbs - 0.6) {
      S.pos = S.obstacleAbs - 0.6;
      finish(S, false);
    } else if (S.braking && S.v <= 0) {
      finish(S, true);
    }
  }
}

function snapshot(S) {
  return {
    pos: S.pos,
    kmh: S.v * 3.6,
    dObs: S.obstacleAbs != null ? S.obstacleAbs - S.pos : null,
    phoneOpen: S.phoneOpen,
    trav: S.phoneOpen ? S.pos - S.phoneOpenPos : S.travel || 0,
    banner: S.bannerAt != null && S.phoneOpenT == null && S.obstacleAbs == null,
    canBrake: S.obstacleAbs != null && !S.phoneOpen && !S.ended && !S.braking,
    ended: S.ended,
    stopped: S.stopped,
    impact: S.impact,
  };
}

function buildResult(S) {
  const seePos = S.seePos != null ? S.seePos : S.endPos;
  const lost = Math.max(0, seePos - S.appearPos);
  let react = 0;
  let brake = 0;
  if (S.brakePos != null) {
    react = S.brakePos - seePos;
    brake = S.endPos - S.brakePos;
  } else {
    react = S.endPos - seePos;
  }
  const total = lost + react + brake;
  return {
    round: S.cfg,
    gap: S.cfg.gap,
    stopped: S.stopped,
    impactKmh: Math.round(S.impact),
    lost,
    react,
    brake,
    leftover: S.stopped ? Math.max(0, S.cfg.gap - total) : 0,
    reactionSec: S.reaction,
    braked: S.brakePos != null,
    distraction: S.travel,
    ignoredPhone: S.cfg.distracted && S.phoneOpenT == null,
  };
}

/* ---------------- סיבוב ---------------- */

function Round({ round, onDone }) {
  const sim = useRef(null);
  if (!sim.current) sim.current = createSim(round);
  const [view, setView] = useState(() => snapshot(sim.current));

  useEffect(() => {
    let raf;
    let last = performance.now();
    let doneTimer = null;
    const loop = (now) => {
      const S = sim.current;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!S.ended) step(S, dt);
      setView(snapshot(S));
      if (S.ended) {
        if (!doneTimer) doneTimer = setTimeout(() => onDone(buildResult(S)), 1500);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const S = sim.current;
  const cfg = S.cfg;
  const message = cfg.distracted ? MESSAGES[cfg.msg] : null;

  const openPhone = () => {
    if (S.ended || S.phoneOpen || S.obstacleAbs != null) return;
    S.phoneOpen = true;
    S.phoneOpenT = S.t;
    S.phoneOpenPos = S.pos;
  };

  const reply = () => {
    if (!S.phoneOpen) return;
    closePhone(S);
  };

  const brake = () => {
    if (S.ended || S.phoneOpen || S.braking || S.obstacleAbs == null) return;
    S.braking = true;
    S.brakeT = S.t;
    S.brakePos = S.pos;
    S.reaction = S.t - S.seeT;
  };

  return (
    <div className={'round' + (view.ended && !view.stopped ? ' hit' : '')}>
      <RoadScene pos={view.pos} dObs={view.phoneOpen ? null : view.dObs} crashed={view.ended && !view.stopped} />

      <div className="hud">
        <span className="hud-num">{Math.round(view.kmh)}</span>
        <span className="hud-unit">קמ"ש</span>
      </div>

      {view.banner && message && (
        <button className="notif" onClick={openPhone}>
          <span className="avatar">{message.initial}</span>
          <span className="notif-text">
            <b>{message.from}</b>
            <span>{message.text}</span>
          </span>
          <span className="notif-open">פתח</span>
        </button>
      )}

      {view.phoneOpen && message && (
        <div className="phone">
          <div className="phone-screen">
            <div className="meter">
              נסעתם <b>{m(view.trav)} מ'</b> בלי להסתכל על הכביש
            </div>
            <div className="chat-head">
              <span className="avatar">{message.initial}</span>
              <b>{message.from}</b>
            </div>
            <div className="bubble">{message.text}</div>
            <div className="replies">
              {message.replies.map((r) => (
                <button key={r} className="reply" onClick={reply}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {view.canBrake && (
        <button className="brake" onPointerDown={brake}>
          בלמו!
        </button>
      )}

      {view.ended && (
        <div className={'flash ' + (view.stopped ? 'ok' : 'bad')}>
          {view.stopped ? 'עצרתם' : 'פגיעה!'}
        </div>
      )}
    </div>
  );
}

/* ---------------- מסכים ---------------- */

function Intro({ onGo, onBack }) {
  useIdle(60000, onBack);
  return (
    <div className="panel">
      <span className="eyebrow">משחק</span>
      <h1 className="big">שניות של חוסר תשומת לב</h1>
      <p className="lead">
        כמה רחוק מגיעים בלי להסתכל על הכביש? שלושה סיבובים קצרים, ותראו את זה במו עיניכם.
      </p>
      <div className="facts">
        <span>90 קמ"ש = 25 מטר בשנייה</span>
        <span>3 שניות = 75 מטר</span>
      </div>
      <button className="btn" onClick={onGo}>
        יוצאים לדרך
      </button>
      <button className="btn ghost" onClick={onBack}>
        חזרה
      </button>
    </div>
  );
}

function Brief({ round, onGo }) {
  return (
    <div className="panel">
      <span className="eyebrow">{round.tag}</span>
      <h1 className="big">{round.title}</h1>
      <div className="facts">
        <span>{round.speed} קמ"ש</span>
        <span>{round.distracted ? 'עם הודעה' : 'בלי הסחות'}</span>
      </div>
      <p className="lead">{round.brief}</p>
      <button className="btn" onClick={onGo}>
        יאללה
      </button>
    </div>
  );
}

const SEGS = [
  { key: 'lost', label: 'נסעתם בלי לראות', color: '#FF5A3C' },
  { key: 'react', label: 'זמן תגובה', color: '#FFC93C' },
  { key: 'brake', label: 'בלימה', color: '#A66BFF' },
  { key: 'leftover', label: 'נשארו עד הולך הרגל', color: '#B7F34D' },
];

function Result({ r, isLast, onNext }) {
  let head;
  let sub;
  if (r.stopped) {
    head = 'עצרתם בזמן';
    sub = r.ignoredPhone
      ? 'התעלמתם מההודעה. זו בדיוק הבחירה הנכונה.'
      : `נשארו ${m(r.leftover)} מטר עד הולך הרגל.`;
  } else {
    head = 'פגיעה';
    sub = `פגעתם בהולך הרגל במהירות של ${r.impactKmh} קמ"ש.`;
  }
  const rows = SEGS.filter((s) => r[s.key] >= 0.5);

  return (
    <div className="panel">
      <span className="eyebrow">{r.round.tag + ' · ' + r.round.title}</span>
      <h1 className={'big ' + (r.stopped ? 'good' : 'bad')}>{head}</h1>
      <p className="lead">{sub}</p>

      <div className="seg-wrap">
        <div className="seg-ends">
          <span>אתם</span>
          <span>הולך הרגל · {r.gap} מ'</span>
        </div>
        <div className="seg-bar">
          {SEGS.map((s) => (
            <i
              key={s.key}
              style={{ width: (r[s.key] / r.gap) * 100 + '%', background: s.color }}
            />
          ))}
        </div>
        <ul className="seg-legend">
          {rows.map((s) => (
            <li key={s.key}>
              <i style={{ background: s.color }} />
              <span>
                {s.key === 'react' && !r.braked ? 'המשכתם בלי לבלום' : s.label}
                {s.key === 'react' && r.reactionSec != null
                  ? ` (${r.reactionSec.toFixed(1)} שנ')`
                  : ''}
              </span>
              <b>{m(r[s.key])} מ'</b>
            </li>
          ))}
        </ul>
      </div>

      <button className="btn" onClick={onNext}>
        {isLast ? 'לסיכום' : 'לסיבוב הבא'}
      </button>
    </div>
  );
}

function Final({ results, onAgain, onExit }) {
  useIdle(45000, onExit);
  const phoneRounds = results.filter((r) => r.distraction != null);
  const longest = phoneRounds.reduce((a, r) => (r.distraction > (a ? a.distraction : -1) ? r : a), null);
  const crashes = results.filter((r) => !r.stopped).length;

  return (
    <div className="panel">
      <span className="eyebrow">סיכום</span>
      <h1 className="big">
        {longest
          ? `נסעתם ${m(longest.distraction)} מטר בלי לראות את הכביש`
          : 'התעלמתם מההודעות. זו המשמעות כולה'}
      </h1>
      <p className="lead">
        {crashes === 0
          ? 'עצרתם בכל הסיבובים. בדרך אמיתית, הכביש פחות סלחני.'
          : `${crashes} מתוך ${results.length} סיבובים הסתיימו בפגיעה.`}
      </p>

      <ul className="rounds">
        {results.map((r) => (
          <li key={r.round.id} className={r.stopped ? 'ok' : 'no'}>
            <span>{r.round.tag + ' · ' + r.round.title}</span>
            <b>{r.stopped ? 'עצרתם' : `פגיעה ב-${r.impactKmh} קמ"ש`}</b>
          </li>
        ))}
      </ul>

      <ul className="tips">
        {TIPS.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <p className="foot">
        סימולציה פשוטה: כביש יבש והאטה של {DECEL} מ'/שנ². בחיים האמיתיים המרחקים גדולים יותר בגשם ובעייפות.
      </p>

      <div className="btn-row">
        <button className="btn" onClick={onAgain}>
          עוד סיבוב
        </button>
        <button className="btn ghost" onClick={onExit}>
          סיום
        </button>
      </div>
    </div>
  );
}

/* ---------------- המשחק ---------------- */

export default function Game({ onExit }) {
  const [phase, setPhase] = useState('intro'); // intro | brief | run | result | final
  const [ri, setRi] = useState(0);
  const [results, setResults] = useState([]);
  const [last, setLast] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const start = useCallback(() => {
    setRi(0);
    setResults([]);
    setAttempt((a) => a + 1);
    setPhase('brief');
  }, []);

  const handleDone = useCallback((r) => {
    setLast(r);
    setResults((list) => [...list, r]);
    setPhase('result');
  }, []);

  const next = () => {
    if (ri + 1 >= ROUNDS.length) {
      setPhase('final');
    } else {
      setRi(ri + 1);
      setPhase('brief');
    }
  };

  return (
    <div className="game">
      <div className="stage">
        {phase === 'intro' && <Intro onGo={start} onBack={onExit} />}
        {phase === 'brief' && <Brief round={ROUNDS[ri]} onGo={() => setPhase('run')} />}
        {phase === 'run' && (
          <Round key={attempt + '-' + ri} round={ROUNDS[ri]} onDone={handleDone} />
        )}
        {phase === 'result' && last && (
          <Result r={last} isLast={ri + 1 >= ROUNDS.length} onNext={next} />
        )}
        {phase === 'final' && <Final results={results} onAgain={start} onExit={onExit} />}
      </div>
    </div>
  );
}
