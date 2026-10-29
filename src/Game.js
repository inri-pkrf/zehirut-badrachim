import React, { useCallback, useEffect, useRef, useState } from 'react';
import RoadScene from './RoadScene';
import Keyboard from './Keyboard';
import { unlockAudio, playNotify, startRing, stopRing, stopAllSounds, playScreech } from './sounds';
import {
  ROUNDS,
  THREADS,
  CALLERS,
  DECEL,
  TIPS,
  scoreRound,
  SPEED_MIN,
  SPEED_MAX,
  SPEED_STEP,
  SPEED_DEFAULT,
} from './data';

/* מרחק התחלתי של המכשול: מרחק בלימה + שנייה של תגובה + 30 מטר מרווח.
   נהג קשוב עוצר בביטחון, נהג מוסח כבר לא. */
const calcGap = (kmh) => {
  const v = kmh / 3.6;
  return Math.round((v * v) / (2 * DECEL) + v * 1.0 + 30);
};

const m = (x) => Math.max(0, Math.round(x));

// כמה שניות בין הודעה להודעה כשהטלפון פתוח
const MSG_GAP = 1.0;

/* מצמוץ איטי (שניות מתחילת הסיבוב): העיניים נסגרות, נשארות עצומות, ונפתחות */
const BLINK = { START: 1.5, CLOSE: 2.2, HOLD: 1.3, OPEN: 0.8, SPAWN: 3.9, SEE: 5.3 };
const ease = (x) => x * x * (3 - 2 * x);
function darkAt(t) {
  const { START, CLOSE, HOLD, OPEN } = BLINK;
  if (t < START) return 0;
  if (t < START + CLOSE) return ease((t - START) / CLOSE);
  if (t < START + CLOSE + HOLD) return 1;
  if (t < START + CLOSE + HOLD + OPEN) return 1 - ease((t - START - CLOSE - HOLD) / OPEN);
  return 0;
}

/* היכל התהילה נשמר ב-localStorage של המכשיר */
const HOF_KEY = 'rs_hof_v1';
function loadHof() {
  try {
    return JSON.parse(localStorage.getItem(HOF_KEY) || '[]');
  } catch (e) {
    return [];
  }
}
function saveHof(list) {
  try {
    localStorage.setItem(HOF_KEY, JSON.stringify(list));
  } catch (e) {
    /* אין localStorage - ממשיכים בלי לשמור */
  }
}

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
    chatIdx: 0,
    chatPending: false,
    chatAt: 0,
    sent: [],
    callMode: null, // null | 'talk' | 'hang'
    glanceUntil: null,
    blindPos: null,
    blindDone: false,
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
    if (cfg.blink) {
      spawn = S.t >= BLINK.SPAWN;
    } else if (!cfg.distracted) {
      spawn = S.t >= 2.5;
    } else {
      if (S.bannerAt == null && S.t >= 1.5) S.bannerAt = S.t;
      if (S.phoneOpenT != null) spawn = S.t >= S.phoneOpenT + 0.8;
      else if (S.bannerAt != null) spawn = S.t >= S.bannerAt + 3.5;
    }
    if (spawn) {
      S.obstacleAbs = S.pos + cfg.gap;
      S.appearPos = S.pos;
      if (!S.phoneOpen && !cfg.blink) {
        S.seeT = S.t;
        S.seePos = S.pos;
      }
    }
  }

  // עיניים עצומות: מתחילים למדוד כשהמסך כבר חשוך, ורואים שוב כשהעיניים נפתחות
  if (cfg.blink) {
    if (S.blindPos == null && S.t >= BLINK.START + BLINK.CLOSE * 0.5) S.blindPos = S.pos;
    if (!S.blindDone && S.t >= BLINK.SEE) {
      S.blindDone = true;
      S.travel = S.pos - S.blindPos;
      if (S.obstacleAbs != null && S.seeT == null) {
        S.seeT = S.t;
        S.seePos = S.pos;
      }
    }
  }

  // ניתוק שיחה = מבט קצר בטלפון
  if (S.glanceUntil != null && S.phoneOpen && S.t >= S.glanceUntil) closePhone(S);

  // כשהטלפון פתוח, ההודעות מגיעות אחת אחרי השנייה (כל שנייה)
  if (S.phoneOpen && cfg.kind === 'msg') {
    const total = THREADS[cfg.thread].length;
    S.chatIdx = Math.min(total - 1, Math.floor((S.t - S.phoneOpenT) / MSG_GAP));
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
    canBrake:
      S.obstacleAbs != null && !S.phoneOpen && !S.ended && !S.braking && (!S.cfg.blink || S.blindDone),
    chatIdx: S.chatIdx,
    sent: S.sent.slice(),
    chatPending: S.chatPending,
    callMode: S.callMode,
    callSec: S.phoneOpenT != null ? S.t - S.phoneOpenT : 0,
    dark: S.cfg.blink ? darkAt(S.t) : 0,
    blindTrav: S.cfg.blink && S.blindPos != null && !S.blindDone ? S.pos - S.blindPos : null,
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
  const thread = cfg.kind === 'msg' ? THREADS[cfg.thread] : null;
  const caller = cfg.kind === 'call' ? CALLERS[cfg.caller] : null;
  const first = thread ? thread[0] : null;
  const current = thread ? thread[Math.min(view.chatIdx, thread.length - 1)] : null;

  // צלילים: צלצול הודעה, או צלצול טלפון שנמשך עד שעונים / מנתקים / מתעלמים
  useEffect(() => {
    if (!view.banner) return undefined;
    if (cfg.kind === 'call') {
      startRing();
      return () => stopRing();
    }
    playNotify();
    return undefined;
  }, [view.banner, cfg.kind]);

  useEffect(() => () => stopAllSounds(), []);

  // צלצול הודעה על כל הודעה שמגיעה בתוך הטלפון (חוץ מהראשונה)
  useEffect(() => {
    if (thread && view.phoneOpen && view.chatIdx > 0) playNotify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.chatIdx]);

  const openPhone = () => {
    if (S.ended || S.phoneOpen || S.obstacleAbs != null) return;
    S.phoneOpen = true;
    S.phoneOpenT = S.t;
    S.phoneOpenPos = S.pos;
  };

  const answerCall = () => {
    if (S.ended || S.phoneOpen || S.obstacleAbs != null) return;
    S.callMode = 'talk';
    openPhone();
  };

  // ניתוק = מבט קצר בטלפון (שנייה וקצת)
  const hangUp = () => {
    if (S.ended || S.phoneOpen || S.obstacleAbs != null) return;
    S.callMode = 'hang';
    S.glanceUntil = S.t + 1.2;
    openPhone();
  };

  const endCall = () => {
    if (!S.phoneOpen || S.callMode !== 'talk') return;
    closePhone(S);
  };

  // אפשר לענות רק אחרי שכל ההודעות הגיעו. שליחת תשובה סוגרת את הטלפון.
  const reply = (text) => {
    if (!S.phoneOpen || !thread || S.chatIdx < thread.length - 1 || S.sent.length) return;
    S.sent.push(text);
    closePhone(S);
  };

  const brake = () => {
    if (S.ended || S.phoneOpen || S.braking || S.obstacleAbs == null) return;
    if (S.cfg.blink && !S.blindDone) return;
    S.braking = true;
    S.brakeT = S.t;
    S.brakePos = S.pos;
    S.reaction = S.t - S.seeT;
    playScreech(Math.min(2.2, S.v / DECEL));
  };

  const mmss = '0:' + String(Math.floor(view.callSec)).padStart(2, '0');

  return (
    <div className={'round' + (view.ended && !view.stopped ? ' hit' : '')}>
      <RoadScene pos={view.pos} dObs={view.phoneOpen ? null : view.dObs} crashed={view.ended && !view.stopped} />

      <div className="hud">
        <span className="hud-num">{Math.round(view.kmh)}</span>
        <span className="hud-unit">קמ"ש</span>
      </div>

      {view.banner && first && (
        <button className="notif" onClick={openPhone}>
          <span className="avatar">{first.initial}</span>
          <span className="notif-text">
            <b>{first.from}</b>
            <span>{first.text}</span>
          </span>
          <span className="notif-open">פתח</span>
        </button>
      )}

      {view.banner && caller && (
        <div className="notif call">
          <span className="avatar ring-icon">{caller.initial}</span>
          <span className="notif-text">
            <b>{caller.name}</b>
            <span>שיחה נכנסת...</span>
          </span>
          <div className="call-btns">
            <button className="call-btn answer" onClick={answerCall}>
              ענה
            </button>
            <button className="call-btn hang" onClick={hangUp}>
              נתק
            </button>
          </div>
        </div>
      )}

      {view.phoneOpen && thread && (
        <div className="phone">
          <div className={'phone-screen' + (thread.length > 1 ? ' compact' : '')}>
            <div className="meter">
              נסעתם <b>{m(view.trav)} מ'</b> בלי להסתכל על הכביש
            </div>
            <div className="chat-head">
              <span className="avatar">{current.initial}</span>
              <b>{current.from}</b>
            </div>
            <div className="thread">
              {thread.slice(0, view.chatIdx + 1).map((st, i) => (
                <React.Fragment key={i}>
                  <div className="bubble">{st.text}</div>
                </React.Fragment>
              ))}
              {view.sent[0] != null && <div className="bubble mine">{view.sent[0]}</div>}
            </div>
            {view.chatIdx === thread.length - 1 && view.sent.length === 0 && (
              <div className="replies">
                {current.replies.map((r) => (
                  <button key={r} className="reply" onClick={() => reply(r)}>
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {view.phoneOpen && caller && (
        <div className="phone">
          <div className="phone-screen incall">
            <div className="meter">
              נסעתם <b>{m(view.trav)} מ'</b> בלי להסתכל על הכביש
            </div>
            <span className="avatar big-avatar">{caller.initial}</span>
            <div className="incall-name">{caller.name}</div>
            {view.callMode === 'talk' ? (
              <>
                <div className="incall-time">{mmss}</div>
                <div className="bubble">{caller.line}</div>
                <button className="call-btn hang" onClick={endCall}>
                  סיום שיחה
                </button>
              </>
            ) : (
              <div className="incall-time">מנתקים...</div>
            )}
          </div>
        </div>
      )}

      {view.canBrake && (
        <button className="brake" onPointerDown={brake}>
          בלמו!
        </button>
      )}

      {cfg.blink && view.dark > 0 && (
        <>
          <div className="lid top" style={{ height: view.dark * 50 + '%' }} />
          <div className="lid bot" style={{ height: view.dark * 50 + '%' }} />
          <div className="dim" style={{ opacity: view.dark * 0.6 }} />
        </>
      )}

      {view.blindTrav != null && (
        <div className="blind-meter">
          <div className="meter">
            נסעתם <b>{m(view.blindTrav)} מ'</b> בעיניים עצומות
          </div>
        </div>
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

const KIND_LABEL = {
  base: 'בלי הסחות',
  msg: 'עם הודעות',
  call: 'שיחה נכנסת',
  blink: 'עיניים נעצמות',
};

function Intro({ onGo, onBack }) {
  useIdle(60000, onBack);
  return (
    <div className="panel">
      <span className="eyebrow">משחק</span>
      <h1 className="big">שניות של חוסר תשומת לב</h1>
      <p className="lead">
        כמה רחוק מגיעים בלי להסתכל על הכביש? חמש רמות קצרות, ותראו את זה במו עיניכם.
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

const NAME_MAX = 12;

function NameEntry({ onGo, onBack }) {
  useIdle(60000, onBack);
  const [name, setName] = useState('');
  const [kb, setKb] = useState(false);
  const ready = name.trim().length > 0;

  return (
    <div className="panel name-panel">
      <span className="eyebrow">לפני שמתחילים</span>
      <h1 className="big">איך קוראים לכם?</h1>

      <div
        className={'name-box' + (kb ? ' focus' : '')}
        role="textbox"
        tabIndex={0}
        aria-label="שם"
        onClick={() => setKb(true)}
        onFocus={() => setKb(true)}
      >
        {name ? <span>{name}</span> : !kb && <span className="ph">לחצו כאן כדי להקליד</span>}
        {kb && <i className="caret" />}
      </div>

      <button className="btn" disabled={!ready} onClick={() => onGo(name.trim())}>
        יאללה
      </button>

      {kb && (
        <Keyboard
          onKey={(ch) => setName((n) => (n.length < NAME_MAX ? n + ch : n))}
          onBackspace={() => setName((n) => n.slice(0, -1))}
          onDone={() => setKb(false)}
        />
      )}
    </div>
  );
}

function SpeedPick({ value, onChange, onGo, onBack }) {
  useIdle(60000, onBack);
  const clamp = (v) => Math.max(SPEED_MIN, Math.min(SPEED_MAX, v));
  return (
    <div className="panel speed-panel">
      <span className="eyebrow">לפני שמתחילים</span>
      <h1 className="big">באיזו מהירות נוסעים?</h1>
      <div className="speed-num">
        <b>{value}</b>
        <span>קמ"ש</span>
      </div>
      <div className="facts">
        <span>{(value / 3.6).toFixed(0)} מטר בשנייה</span>
      </div>
      <div className="speed-row">
        <button className="speed-step" onClick={() => onChange(clamp(value + SPEED_STEP))} aria-label="יותר מהר">
          +
        </button>
        <input
          className="speed-range"
          type="range"
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={SPEED_STEP}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="מהירות"
        />
        <button className="speed-step" onClick={() => onChange(clamp(value - SPEED_STEP))} aria-label="פחות מהר">
          −
        </button>
      </div>
      <div className="speed-ends">
        <span>{SPEED_MIN}</span>
        <span>{SPEED_MAX}</span>
      </div>
      <button className="btn" onClick={onGo}>
        יאללה
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
        <span>{KIND_LABEL[round.kind]}</span>
      </div>
      <p className="lead">{round.brief.replace('{speed}', round.speed)}</p>
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
      ? 'התעלמתם מהטלפון. זו בדיוק הבחירה הנכונה.'
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
        {isLast ? 'לסיכום' : 'לרמה הבאה'}
      </button>
    </div>
  );
}

/* סיכום מתומצת: כותרת, שורה אחת, תוצאה לכל רמה, ניקוד וטיפ אחד */
function Final({ results, total, onNext, onExit }) {
  useIdle(45000, onExit);
  const withDist = results.filter((r) => r.distraction != null);
  const longest = withDist.reduce(
    (a, r) => (r.distraction > (a ? a.distraction : -1) ? r : a),
    null
  );
  const crashes = results.filter((r) => !r.stopped).length;

  return (
    <div className="panel final">
      <span className="eyebrow">סיכום</span>
      <h1 className="big">
        {longest
          ? `נסעתם ${m(longest.distraction)} מטר בלי לראות את הכביש`
          : 'התעלמתם מכל ההסחות. זו המשמעות כולה'}
      </h1>
      <p className="lead">
        {crashes === 0
          ? 'עצרתם בכל הרמות. בדרך אמיתית, הכביש פחות סלחני.'
          : `${crashes} מתוך ${results.length} רמות הסתיימו בפגיעה.`}
      </p>

      <ul className="rounds">
        {results.map((r) => (
          <li key={r.round.id} className={r.stopped ? 'ok' : 'no'}>
            <span>{r.round.tag + ' · ' + r.round.title}</span>
            <b>{r.stopped ? 'עצרתם' : `פגיעה ב-${r.impactKmh} קמ"ש`}</b>
          </li>
        ))}
      </ul>

      <div className="score-line">
        הניקוד שלכם <b>{total}</b>
      </div>
      <p className="one-tip">{TIPS[2]}</p>

      <button className="btn" onClick={onNext}>
        להיכל התהילה
      </button>
    </div>
  );
}

/* היכל התהילה: כל השחקנים, מהניקוד הגבוה לנמוך */
function Hall({ list, myId, onAgain, onExit }) {
  useIdle(45000, onExit);
  const sorted = [...list].sort((a, b) => b.score - a.score);
  const meRef = useRef(null);

  useEffect(() => {
    if (meRef.current) meRef.current.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <div className="panel hall">
      <span className="eyebrow">היכל התהילה</span>
      <h1 className="big">השחקנים והניקוד</h1>
      <ul className="hall-list">
        {sorted.map((e, i) => (
          <li key={e.id} className={e.id === myId ? 'me' : ''} ref={e.id === myId ? meRef : null}>
            <span className="rank">{i + 1}</span>
            <span className="nm">{e.name}</span>
            {e.speed && <span className="sp">{e.speed} קמ"ש</span>}
            <span className="sc">{e.score}</span>
          </li>
        ))}
      </ul>
      <div className="btn-row">
        <button className="btn" onClick={onAgain}>
          משחק חדש
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
  // intro | name | speed | brief | run | result | final | hall
  const [phase, setPhase] = useState('intro');
  const [ri, setRi] = useState(0);
  const [results, setResults] = useState([]);
  const [last, setLast] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [player, setPlayer] = useState('');
  const [speed, setSpeed] = useState(SPEED_DEFAULT);
  const [hof, setHof] = useState([]);
  const [myId, setMyId] = useState(null);

  const total = results.reduce((a, r) => a + scoreRound(r), 0);

  // משחק חדש: קודם הזנת שם
  const start = useCallback(() => {
    unlockAudio();
    setRi(0);
    setResults([]);
    setAttempt((a) => a + 1);
    setPhase('name');
  }, []);

  const begin = (name) => {
    unlockAudio();
    setPlayer(name);
    setPhase('speed');
  };

  const handleDone = useCallback((r) => {
    setLast(r);
    setResults((list) => [...list, r]);
    setPhase('result');
  }, []);

  const finishGame = () => {
    const id = Date.now();
    const list = [...loadHof(), { id, name: player, score: total, speed }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 200);
    saveHof(list);
    setHof(list);
    setMyId(id);
    setPhase('final');
  };

  const next = () => {
    if (ri + 1 >= ROUNDS.length) {
      finishGame();
    } else {
      setRi(ri + 1);
      setPhase('brief');
    }
  };

  return (
    <div className="game">
      <div className="stage">
        {phase === 'intro' && <Intro onGo={start} onBack={onExit} />}
        {phase === 'name' && <NameEntry onGo={begin} onBack={onExit} />}
        {phase === 'speed' && (
          <SpeedPick
            value={speed}
            onChange={setSpeed}
            onGo={() => {
              unlockAudio();
              setPhase('brief');
            }}
            onBack={onExit}
          />
        )}
        {phase === 'brief' && (
          <Brief
            round={{ ...ROUNDS[ri], speed }}
            onGo={() => {
              unlockAudio();
              setPhase('run');
            }}
          />
        )}
        {phase === 'run' && (
          <Round key={attempt + '-' + ri} round={{ ...ROUNDS[ri], speed }} onDone={handleDone} />
        )}
        {phase === 'result' && last && (
          <Result r={last} isLast={ri + 1 >= ROUNDS.length} onNext={next} />
        )}
        {phase === 'final' && (
          <Final results={results} total={total} onNext={() => setPhase('hall')} onExit={onExit} />
        )}
        {phase === 'hall' && <Hall list={hof} myId={myId} onAgain={start} onExit={onExit} />}
      </div>
    </div>
  );
}
