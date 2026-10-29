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

export default function RoadScene({ pos, dObs, crashed }) {
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
        fill="#FFD23F"
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
          <rect x="-5" y="-110" width="10" height="110" fill="#F4D9B6" />
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
          <stop offset="0" stopColor="#3E1647" />
          <stop offset="0.55" stopColor="#E5586B" />
          <stop offset="1" stopColor="#FFC27A" />
        </linearGradient>
        <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A463E" />
          <stop offset="1" stopColor="#221B18" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="400" height={HZ} fill="url(#sky)" />
      <circle cx="292" cy={HZ - 6} r="40" fill="#FFE6A3" opacity="0.95" />
      <path
        d={`M0 ${HZ} L0 ${HZ - 26} Q70 ${HZ - 54} 140 ${HZ - 30} T290 ${HZ - 34} T400 ${HZ - 24} L400 ${HZ} Z`}
        fill="#3B1A34"
      />
      <rect x="0" y={HZ} width="400" height={600 - HZ} fill="#3A1F2E" />
      <polygon points={`${rl},${ry} ${rr},${ry} ${fr},${fy} ${fl},${fy}`} fill="url(#roadGrad)" />
      {edges}
      {dashes}
      {posts}

      {showObstacle && (
        <g transform={`translate(${ox},${oy}) scale(${op2 * 1.5})`}>
          <ellipse cx="0" cy="2" rx="38" ry="7" fill="rgba(0,0,0,.35)" />
          <rect x="-14" y="-72" width="11" height="72" rx="4" fill="#2A1F33" />
          <rect x="3" y="-72" width="11" height="72" rx="4" fill="#2A1F33" />
          <rect x="-36" y="-136" width="13" height="58" rx="6" fill="#B7F34D" transform="rotate(14 -30 -136)" />
          <rect x="23" y="-136" width="13" height="58" rx="6" fill="#B7F34D" transform="rotate(-14 30 -136)" />
          <rect x="-22" y="-142" width="44" height="76" rx="14" fill="#B7F34D" />
          <rect x="-22" y="-112" width="44" height="7" fill="#FFF8DC" />
          <rect x="-22" y="-96" width="44" height="7" fill="#FFF8DC" />
          <circle cx="0" cy="-160" r="17" fill="#F2C9A5" />
          <g className="warn">
            <polygon points="0,-222 24,-182 -24,-182" fill="#FF3B30" stroke="#FFF1E0" strokeWidth="4" strokeLinejoin="round" />
            <text x="0" y="-188" textAnchor="middle" fontSize="28" fontWeight="800" fill="#FFF1E0">!</text>
          </g>
        </g>
      )}

      {/* מכסה המנוע */}
      <path d="M0 600 L0 548 Q200 506 400 548 L400 600 Z" fill="#1A1412" />
      <path d="M0 548 Q200 506 400 548" fill="none" stroke="#4A3A34" strokeWidth="3" />
    </svg>
  );
}
