/* ============================================================
   סאונדים (מיוצרים בקוד עם WebAudio, בלי קבצי שמע).
   הדפדפן מפעיל שמע רק אחרי נגיעה במסך, ולכן קוראים ל-unlockAudio
   בלחיצות של המשחק.
   ============================================================ */

/* קבצי שמע אישיים: שימי בתיקייה public/sounds קבצים בשם brake (בלימה) ו-ring (צלצול טלפון),
   בסיומת mp3 / wav / ogg / m4a. אם אין קובץ, משתמשים בצליל שנוצר בקוד. */
const SOUND_DIR = (process.env.PUBLIC_URL || '') + '/sounds/';
const EXTS = ['mp3', 'wav', 'ogg', 'm4a'];

function tryFile(name, loop, i = 0, generation = soundGeneration) {
  if (generation !== soundGeneration) return Promise.reject(new Error('sound stopped'));
  if (i >= EXTS.length) return Promise.reject(new Error('no file'));
  let audio = null;
  try {
    audio = new Audio(SOUND_DIR + name + '.' + EXTS[i]);
    activeAudio.add(audio);
    audio.addEventListener('ended', () => activeAudio.delete(audio), { once: true });
    audio.loop = loop;
    const p = audio.play();
    if (!p || !p.then) {
      stopAudio(audio);
      return Promise.reject(new Error('no promise'));
    }
    return p.then(() => {
      if (generation !== soundGeneration) {
        stopAudio(audio);
        throw new Error('sound stopped');
      }
      return audio;
    }).catch((err) => {
      activeAudio.delete(audio);
      // חסימת נגינה אוטומטית של הדפדפן: לא ממשיכים לסיומות אחרות
      if (generation !== soundGeneration || (err && err.name === 'NotAllowedError')) throw err;
      return tryFile(name, loop, i + 1, generation);
    });
  } catch (e) {
    if (audio) stopAudio(audio);
    return tryFile(name, loop, i + 1, generation);
  }
}

let ctx = null;
let ringWanted = false;
let ringAudio = null;
let ringTimer = null;
let ringMaster = null;
let soundGeneration = 0;
const activeAudio = new Set();
const activeSources = new Set();

function trackSource(source) {
  activeSources.add(source);
  source.onended = () => {
    activeSources.delete(source);
    try {
      source.disconnect();
    } catch (e) {
      /* כבר נותק */
    }
  };
}

function stopAudio(audio) {
  audio.pause();
  audio.currentTime = 0;
  activeAudio.delete(audio);
}

function ac() {
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) {
    return null;
  }
}

export function unlockAudio() {
  ac();
}

function tone(c, dest, freq, start, dur, type, vol) {
  const o = c.createOscillator();
  const g = c.createGain();
  trackSource(o);
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(dest);
  o.start(start);
  o.stop(start + dur + 0.05);
}

/* צלצול הודעה: שני צלילים קצרים */
export function playNotify() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  tone(c, c.destination, 1175, t, 0.35, 'sine', 0.3);
  tone(c, c.destination, 1568, t + 0.16, 0.45, 'sine', 0.3);
}

/* צלצול טלפון: פרצי צלילים מתחלפים, חוזר עד שעוצרים */
export function startRing() {
  stopRing();
  ringWanted = true;
  tryFile('ring', true)
    .then((a) => {
      if (ringWanted) ringAudio = a;
      else stopAudio(a);
    })
    .catch(() => {
      if (ringWanted) startSynthRing();
    });
}

function startSynthRing() {
  const c = ac();
  if (!c) return;
  ringMaster = c.createGain();
  ringMaster.gain.value = 1;
  ringMaster.connect(c.destination);
  const master = ringMaster;

  const burst = () => {
    const t = c.currentTime;
    for (let i = 0; i < 10; i++) {
      tone(c, master, i % 2 ? 1046 : 784, t + i * 0.1, 0.09, 'triangle', 0.22);
    }
  };
  burst();
  ringTimer = setInterval(burst, 2400);
}

export function stopRing() {
  ringWanted = false;
  if (ringAudio) {
    stopAudio(ringAudio);
    ringAudio = null;
  }
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
  if (ringMaster) {
    try {
      ringMaster.gain.setValueAtTime(0, ringMaster.context.currentTime);
      ringMaster.disconnect();
    } catch (e) {
      /* כבר נותק */
    }
    ringMaster = null;
  }
}

export function stopAllSounds() {
  soundGeneration += 1;
  stopRing();
  activeAudio.forEach(stopAudio);
  activeSources.forEach((source) => {
    try {
      source.stop();
    } catch (e) {
      /* כבר הופסק */
    }
    try {
      source.disconnect();
    } catch (e) {
      /* כבר נותק */
    }
  });
  activeSources.clear();
}

/* חריקת בלמים: רעש מסונן שיורד בתדר + צווחה דקה. dur בשניות */
export function playScreech(dur = 1.6) {
  const generation = soundGeneration;
  tryFile('brake', false)
    .then((audio) => {
      if (generation !== soundGeneration) stopAudio(audio);
    })
    .catch(() => {
      if (generation === soundGeneration) synthScreech(dur);
    });
}

function synthScreech(dur) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const len = Math.max(0.4, dur);

  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  trackSource(noise);
  noise.buffer = buf;
  noise.loop = true;

  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 7;
  band.frequency.setValueAtTime(3300, t);
  band.frequency.exponentialRampToValueAtTime(1500, t + len);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.06);
  g.gain.setValueAtTime(0.5, t + len * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);

  noise.connect(band);
  band.connect(g);
  g.connect(c.destination);
  noise.start(t);
  noise.stop(t + len + 0.05);

  // צווחה דקה מעל הרעש
  [[2300, 1500], [2900, 1900]].forEach(([from, to]) => {
    const o = c.createOscillator();
    const og = c.createGain();
    trackSource(o);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + len);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.05, t + 0.08);
    og.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(og);
    og.connect(c.destination);
    o.start(t);
    o.stop(t + len + 0.05);
  });
}
