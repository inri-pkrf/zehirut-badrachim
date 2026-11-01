import React from 'react';

/* סצנת כביש בפרספקטיבה (SVG). pos = מיקום הרכב במטרים, dObs = מרחק למכשול במטרים */
const HZ = 230; // קו האופק
const CAR_Y = 575;
const K = 14;
const HALF = 230;
const CX = 200;
const P_NEAR = 1.075; // מגיע לתחתית התמונה (y=600)
const P_FAR = 0.016;

const P = (z) => K / (z + K);
const Y = (z) => HZ + (CAR_Y - HZ) * P(z);
const pt = (off, p) => [CX + off * HALF * p, HZ + (CAR_Y - HZ) * p];

export default function RoadScene({ pos, dObs, crashed, glow = 0 }) {
  // פסי אמצע מקווקווים
  const dashes = [];
  const dashPeriod = 14;
  const o = pos % dashPeriod;
  for (let n = 0; n < 24; n++) {
    let z0 = n * dashPeriod - o;
    const z1 = z0 + 6;
    if (z1 <= 0.4) continue;
    z0 = Math.max(z0, 0.4);
    if (z0 > 320) break;
    const p0 = P(z0);
    const p1 = P(z1);
    dashes.push(
      <polygon
        key={n}
        points={`${CX - 9 * p0},${Y(z0)} ${CX + 9 * p0},${Y(z0)} ${CX + 9 * p1},${Y(z1)} ${CX - 9 * p1},${Y(z1)}`}
        fill="#FFFFFF"
      />
    );
  }

  // עמודי צד שנעים לאחור ונותנים תחושת מהירות
  const posts = [];
  const postPeriod = 26;
  const op = pos % postPeriod;
  [-1, 1].forEach((s) => {
    for (let n = 0; n < 12; n++) {
      const z = n * postPeriod - op + 4;
      if (z < 0.8 || z > 300) continue;
      const p = P(z);
      const [x, y] = pt(s * 1.18, p);
      posts.push(
        <g key={s + '_' + n} transform={`translate(${x},${y}) scale(${p})`}>
          <rect x="-5" y="-110" width="10" height="110" fill="#FFFFFF" />
          <rect x="-5" y="-110" width="10" height="18" fill="#FF5A3C" />
        </g>
      );
    }
  });

  // קווי שוליים
  const edges = [-1, 1].map((s) => {
    const [ax, ay] = pt(s * 0.9, P_NEAR);
    const [bx, by] = pt(s * 0.9, P_FAR);
    return (
      <polygon
        key={s}
        points={`${ax - 3.5},${ay} ${ax + 3.5},${ay} ${bx},${by}`}
        fill="#F3E6D3"
      />
    );
  });

  const [rl, ry] = pt(-1, P_NEAR);
  const [rr] = pt(1, P_NEAR);
  const [fl, fy] = pt(-1, P_FAR);
  const [fr] = pt(1, P_FAR);

  const showObstacle = dObs != null && dObs <= 320;
  const d = showObstacle ? Math.max(dObs, 0.3) : 0;
  const op2 = P(d);
  const [ox, oy] = pt(0.12, op2);

  return (
    <svg
      className={'scene' + (crashed ? ' crash' : '')}
      viewBox="0 0 400 600"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="כביש"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6EC1F2" />
          <stop offset="1" stopColor="#CFEDFC" />
        </linearGradient>
        <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7A7F88" />
          <stop offset="1" stopColor="#3B3E45" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="400" height={HZ} fill="url(#sky)" />
      <circle cx="292" cy="92" r="26" fill="#FFF6C9" />
      <circle cx="292" cy="92" r="40" fill="#FFF6C9" opacity="0.35" />
      <g fill="#FFFFFF" opacity="0.92">
        <ellipse cx="86" cy="78" rx="38" ry="12" />
        <ellipse cx="112" cy="68" rx="26" ry="12" />
        <ellipse cx="214" cy="128" rx="34" ry="10" />
        <ellipse cx="236" cy="120" rx="22" ry="10" />
        <ellipse cx="340" cy="150" rx="30" ry="9" />
      </g>
      <path
        d={`M0 ${HZ} L0 ${HZ - 22} Q70 ${HZ - 46} 140 ${HZ - 26} T290 ${HZ - 30} T400 ${HZ - 20} L400 ${HZ} Z`}
        fill="#8DC77A"
      />
      <rect x="0" y={HZ} width="400" height={600 - HZ} fill="#9BD37E" />
      <polygon points={`${rl},${ry} ${rr},${ry} ${fr},${fy} ${fl},${fy}`} fill="url(#roadGrad)" />
      {edges}
      {dashes}
      {posts}

      {showObstacle && (
        <g transform={`translate(${ox},${oy}) scale(${op2 * 1.5})`}>
          <Pedestrian crashed={crashed} />
        </g>
      )}

      {/* פנים הרכב: עמודי חלון, תקרה, מראה, לוח מחוונים והגה */}
      <path d="M0 0 L58 0 Q34 150 0 330 Z" fill="#1E2229" />
      <path d="M400 0 L342 0 Q366 150 400 330 Z" fill="#1E2229" />
      <path d="M58 0 Q34 150 0 330" fill="none" stroke="#3A414D" strokeWidth="3" />
      <path d="M342 0 Q366 150 400 330" fill="none" stroke="#3A414D" strokeWidth="3" />
      <path d="M0 0 H400 V20 Q200 40 0 20 Z" fill="#171A1F" />
      <rect x="168" y="24" width="64" height="22" rx="7" fill="#14171C" />
      <rect x="172" y="28" width="56" height="14" rx="4" fill="#FFF6C8" opacity={glow} />

      <path d="M0 600 L0 530 Q200 492 400 530 L400 600 Z" fill="#23272F" />
      <path d="M0 530 Q200 492 400 530" fill="none" stroke="#3E4552" strokeWidth="3" />
      <path d="M142 560 Q200 506 258 560 Z" fill="#14171C" />
      <circle cx="176" cy="548" r="9" fill="#0C0E11" stroke="#59606B" strokeWidth="2" />
      <circle cx="224" cy="548" r="9" fill="#0C0E11" stroke="#59606B" strokeWidth="2" />
      <ellipse cx="200" cy="626" rx="152" ry="96" fill="none" stroke="#101216" strokeWidth="28" />
      <ellipse cx="200" cy="626" rx="152" ry="96" fill="none" stroke="#2D323B" strokeWidth="5" />
      <path d="M200 618 L84 590 M200 618 L316 590" stroke="#101216" strokeWidth="16" strokeLinecap="round" />
      <ellipse cx="200" cy="606" rx="42" ry="22" fill="#181B20" stroke="#2D323B" strokeWidth="3" />
    </svg>
  );
}

/* פנים הרכב לרקע של מסכי ההוראות: כבישון, לוח מחוונים והגה בתחתית המסך */
export function CabinFrame() {
  return (
    <svg className="cabin" viewBox="0 0 400 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d="M0 140 L0 70 Q200 34 400 70 L400 140 Z" fill="#23272F" />
      <path d="M0 70 Q200 34 400 70" fill="none" stroke="#3E4552" strokeWidth="3" />
      <path d="M142 100 Q200 48 258 100 Z" fill="#14171C" />
      <circle cx="176" cy="90" r="9" fill="#0C0E11" stroke="#59606B" strokeWidth="2" />
      <circle cx="224" cy="90" r="9" fill="#0C0E11" stroke="#59606B" strokeWidth="2" />
      <ellipse cx="200" cy="168" rx="152" ry="96" fill="none" stroke="#101216" strokeWidth="28" />
      <ellipse cx="200" cy="168" rx="152" ry="96" fill="none" stroke="#2D323B" strokeWidth="5" />
      <path d="M200 160 L84 132 M200 160 L316 132" stroke="#101216" strokeWidth="16" strokeLinecap="round" />
      <ellipse cx="200" cy="148" rx="42" ry="22" fill="#181B20" stroke="#2D323B" strokeWidth="3" />
    </svg>
  );
}

/* הולך רגל: דמות בגודל אמיתי עם בגדים, שיער, פנים ויד מורמת. כשיש פגיעה הוא נהדף לאחור. */
function Pedestrian({ crashed }) {
  const SK = '#E8B48C';
  return (
    <g>
      <ellipse cx="0" cy="2" rx="40" ry="7" fill="rgba(0,0,0,.3)" />
      <g className={crashed ? 'ped hit' : 'ped'}>
        {/* רגליים: צעד, ג'ינס ונעליים */}
        <path d="M-17 -96 L-1 -96 L-8 -8 L-24 -8 Z" fill="#2F4066" />
        <path d="M1 -96 L17 -96 L26 -8 L10 -8 Z" fill="#3A4D7A" />
        <path d="M-27 -2 Q-26 -13 -12 -10 L-7 -3 Z" fill="#F4F1EA" stroke="#2A2A2A" strokeWidth="2" />
        <path d="M8 -2 Q9 -13 24 -10 L29 -3 Z" fill="#F4F1EA" stroke="#2A2A2A" strokeWidth="2" />
        {/* זרוע שמאל לאחור */}
        <path d="M-22 -150 L-32 -148 L-37 -104 L-27 -103 Z" fill="#C8453A" />
        <circle cx="-32" cy="-98" r="5.5" fill={SK} />
        {/* גוף: ז'קט */}
        <path d="M-24 -98 L-22 -156 Q0 -166 22 -156 L24 -98 Z" fill="#D9534A" />
        <path d="M0 -158 L0 -98" stroke="#A8352E" strokeWidth="2" />
        <path d="M-24 -98 L24 -98 L24 -92 L-24 -92 Z" fill="#B63F37" />
        {/* זרוע ימין מורמת (נבהל) */}
        <path d="M22 -152 L34 -150 L44 -184 L33 -188 Z" fill="#C8453A" />
        <circle cx="40" cy="-193" r="6" fill={SK} />
        {/* צוואר וראש */}
        <rect x="-5" y="-170" width="10" height="12" fill="#D39F78" />
        <ellipse cx="0" cy="-183" rx="13" ry="15" fill={SK} />
        <path d="M-14 -186 Q-14 -202 0 -201 Q15 -201 14 -186 Q8 -193 0 -192 Q-8 -193 -14 -186 Z" fill="#2B1B14" />
        <ellipse cx="-14" cy="-181" rx="2.6" ry="4" fill="#D39F78" />
        <ellipse cx="14" cy="-181" rx="2.6" ry="4" fill="#D39F78" />
        <circle cx="-5" cy="-183" r="1.9" fill="#1A1210" />
        <circle cx="5" cy="-183" r="1.9" fill="#1A1210" />
        <path d="M-6 -188 L-3 -189.5 M6 -188 L3 -189.5" stroke="#2B1B14" strokeWidth="1.6" strokeLinecap="round" />
        <ellipse cx="0" cy="-174" rx="3" ry="3.6" fill="#7A2E2A" />
      </g>
      <g className="warn" transform="translate(0,-18)">
        <polygon points="0,-222 24,-182 -24,-182" fill="#FF3B30" stroke="#FFF1E0" strokeWidth="4" strokeLinejoin="round" />
        <text x="0" y="-188" textAnchor="middle" fontSize="28" fontWeight="800" fill="#FFF1E0">!</text>
      </g>
    </g>
  );
}
