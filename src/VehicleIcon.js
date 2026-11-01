import React from 'react';

/* איורים מצוירים לפי סוג המשתתף במשפט (השדה who ב-data.js).
   ציור לכל סוג: נהגים, נוסעים, הולכי רגל, אופניים וקורקינטים. */

const INK = '#2A1B14';
const SKIN = '#F2C9A5';

function Car({ passenger }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="60" cy="97" rx="48" ry="5" fill="rgba(0,0,0,.2)" />
      <path
        d="M12 86 L12 70 Q12 63 21 61 L38 57 L48 43 Q50 40 55 40 L80 40 Q85 40 88 44 L96 57 L105 61 Q110 63 110 70 L110 86 Z"
        fill="#FF5A3C"
        stroke={INK}
        strokeWidth="3.5"
      />
      <polygon points="47,57 54,45 64,45 64,57" fill="#FFF1E0" stroke={INK} strokeWidth="3" />
      <polygon points="69,45 80,45 88,57 69,57" fill="#FFF1E0" stroke={INK} strokeWidth="3" />
      {passenger && (
        <g>
          <circle cx="77" cy="51" r="5" fill={SKIN} stroke={INK} strokeWidth="2.5" />
          <path d="M71 57 L82 47" stroke={INK} strokeWidth="3" />
        </g>
      )}
      <circle cx="106" cy="71" r="4" fill="#FFD23F" stroke={INK} strokeWidth="2" />
      <circle cx="35" cy="87" r="11" fill={INK} />
      <circle cx="35" cy="87" r="4.5" fill="#FFF1E0" />
      <circle cx="88" cy="87" r="11" fill={INK} />
      <circle cx="88" cy="87" r="4.5" fill="#FFF1E0" />
    </g>
  );
}

function Pedestrian() {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="60" cy="108" rx="26" ry="4" fill="rgba(0,0,0,.2)" />
      <line x1="55" y1="72" x2="46" y2="103" stroke={INK} strokeWidth="9" />
      <line x1="65" y1="72" x2="77" y2="101" stroke={INK} strokeWidth="9" />
      <ellipse cx="44" cy="105" rx="8" ry="4" fill="#FF5A3C" stroke={INK} strokeWidth="2" />
      <ellipse cx="80" cy="103" rx="8" ry="4" fill="#FF5A3C" stroke={INK} strokeWidth="2" />
      <line x1="50" y1="45" x2="38" y2="64" stroke="#B7F34D" strokeWidth="8" />
      <line x1="70" y1="45" x2="84" y2="60" stroke="#B7F34D" strokeWidth="8" />
      <rect x="47" y="37" width="26" height="38" rx="11" fill="#B7F34D" stroke={INK} strokeWidth="3.5" />
      <rect x="47" y="52" width="26" height="5" fill="#FFF8DC" />
      <circle cx="60" cy="24" r="11" fill={SKIN} stroke={INK} strokeWidth="3.5" />
    </g>
  );
}

const JEANS = '#34476B';
const SHIRT = '#B7F34D';

function Spokes({ cx, cy, r }) {
  return (
    <g stroke="#9AA0A8" strokeWidth="1.1">
      {[0, 30, 60, 90, 120, 150].map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <line
            key={a}
            x1={cx - Math.cos(rad) * r}
            y1={cy - Math.sin(rad) * r}
            x2={cx + Math.cos(rad) * r}
            y2={cy + Math.sin(rad) * r}
          />
        );
      })}
    </g>
  );
}

function Helmet({ x, y }) {
  return (
    <g>
      <circle cx={x} cy={y} r="8" fill={SKIN} stroke={INK} strokeWidth="2.2" />
      <path
        d={`M${x - 9.5} ${y - 1} Q${x - 9} ${y - 12} ${x} ${y - 11.5} Q${x + 9.5} ${y - 11} ${x + 9.5} ${y - 1} Z`}
        fill="#FFD23F"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx={x + 3.2} cy={y + 0.5} r="1.1" fill={INK} stroke="none" />
    </g>
  );
}

/* אופניים: גלגלים עם חישורים, שלדה, רוכב עם קסדה שדוושת */
function Bike() {
  return (
    <g strokeLinejoin="round" strokeLinecap="round" fill="none">
      <ellipse cx="60" cy="108" rx="46" ry="3.5" fill="rgba(0,0,0,.2)" stroke="none" />
      <circle cx="27" cy="86" r="20" stroke={INK} strokeWidth="4.5" />
      <circle cx="27" cy="86" r="17" stroke="#C9CED6" strokeWidth="1.6" />
      <Spokes cx={27} cy={86} r={17} />
      <circle cx="93" cy="86" r="20" stroke={INK} strokeWidth="4.5" />
      <circle cx="93" cy="86" r="17" stroke="#C9CED6" strokeWidth="1.6" />
      <Spokes cx={93} cy={86} r={17} />
      {/* שלדה */}
      <path d="M27 86 L50 86 L44 58 L27 86 M44 58 L82 58 L50 86 M82 58 L93 86" stroke="#FF5A3C" strokeWidth="4" />
      <path d="M82 58 L80 47" stroke={INK} strokeWidth="3.5" />
      <path d="M72 46 Q81 43 90 47" stroke={INK} strokeWidth="3.5" />
      <path d="M36 54 L50 54" stroke={INK} strokeWidth="5.5" />
      <circle cx="50" cy="86" r="4" fill="#C9CED6" stroke={INK} strokeWidth="2" />
      {/* רגל: ירך, שוק ונעל */}
      <path d="M44 55 L60 70 L55 90" stroke={JEANS} strokeWidth="8" />
      <path d="M50 94 L61 94" stroke={INK} strokeWidth="4.5" />
      {/* גוף וזרוע */}
      <path d="M44 54 L60 32" stroke={SHIRT} strokeWidth="12" />
      <path d="M58 36 L81 46" stroke={SHIRT} strokeWidth="6" />
      <circle cx="83" cy="47" r="3.2" fill={SKIN} stroke="none" />
      <Helmet x={66} y={21} />
    </g>
  );
}

/* קורקינט חשמלי: מרכב עם סוללה, רוכב עומד על המשטח */
function Scooter() {
  return (
    <g strokeLinejoin="round" strokeLinecap="round" fill="none">
      <ellipse cx="60" cy="108" rx="44" ry="3.5" fill="rgba(0,0,0,.2)" stroke="none" />
      <circle cx="24" cy="98" r="10" fill="#2A2F38" stroke={INK} strokeWidth="3" />
      <circle cx="24" cy="98" r="3.5" fill="#C9CED6" stroke="none" />
      <circle cx="96" cy="98" r="10" fill="#2A2F38" stroke={INK} strokeWidth="3" />
      <circle cx="96" cy="98" r="3.5" fill="#C9CED6" stroke="none" />
      <path d="M24 90 L88 90" stroke="#3B4150" strokeWidth="8" />
      <path d="M30 90 L66 90" stroke="#FF5A3C" strokeWidth="3" />
      <path d="M92 94 L88 42" stroke="#3B4150" strokeWidth="5" />
      <path d="M80 40 L98 40" stroke={INK} strokeWidth="5" />
      <circle cx="99" cy="40" r="2.6" fill="#FFD23F" stroke="none" />
      {/* רגליים */}
      <path d="M52 86 L55 62" stroke={JEANS} strokeWidth="8.5" />
      <path d="M68 86 L63 62" stroke={JEANS} strokeWidth="8.5" />
      <path d="M47 87 L58 87 M62 87 L74 87" stroke={INK} strokeWidth="5" />
      {/* גוף וזרוע */}
      <path d="M59 62 L62 34" stroke={SHIRT} strokeWidth="13" />
      <path d="M64 38 L84 41" stroke={SHIRT} strokeWidth="6" />
      <circle cx="86" cy="41" r="3.2" fill={SKIN} stroke="none" />
      <Helmet x={63} y={23} />
    </g>
  );
}

export default function VehicleIcon({ who, text = '' }) {
  let art;
  if (who === 'נהגים') art = <Car />;
  else if (who === 'נוסעים') art = <Car passenger />;
  else if (who === 'הולכי רגל') art = <Pedestrian />;
  else art = text.includes('קורקינט חשמלי') ? <Scooter /> : <Bike />;

  return (
    <div className="vehicle" role="img" aria-label={who}>
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        {art}
      </svg>
    </div>
  );
}
