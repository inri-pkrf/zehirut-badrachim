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

function Bike() {
  return (
    <g strokeLinejoin="round" strokeLinecap="round" fill="none">
      <ellipse cx="60" cy="108" rx="46" ry="4" fill="rgba(0,0,0,.2)" stroke="none" />
      <circle cx="28" cy="88" r="19" stroke={INK} strokeWidth="4.5" />
      <circle cx="94" cy="88" r="19" stroke={INK} strokeWidth="4.5" />
      <path d="M28 88 L48 62 L80 62 L94 88 M48 62 L58 88 L28 88 M58 88 L80 62" stroke="#FF5A3C" strokeWidth="4.5" />
      <path d="M44 57 L56 57" stroke={INK} strokeWidth="5" />
      <path d="M80 62 L77 48 L88 46" stroke={INK} strokeWidth="4.5" />
      {/* רוכב עם קסדה */}
      <line x1="52" y1="56" x2="62" y2="36" stroke="#B7F34D" strokeWidth="9" />
      <line x1="62" y1="40" x2="82" y2="48" stroke="#B7F34D" strokeWidth="6" />
      <line x1="52" y1="56" x2="64" y2="78" stroke={INK} strokeWidth="7" />
      <circle cx="65" cy="27" r="8.5" fill={SKIN} stroke={INK} strokeWidth="3" />
      <path d="M56.5 26 Q57 15 66 15.5 Q74 17 73.5 26 Z" fill="#FFD23F" stroke={INK} strokeWidth="3" />
    </g>
  );
}

export default function VehicleIcon({ who }) {
  let art;
  if (who === 'נהגים') art = <Car />;
  else if (who === 'נוסעים') art = <Car passenger />;
  else if (who === 'הולכי רגל') art = <Pedestrian />;
  else art = <Bike />;

  return (
    <div className="vehicle" role="img" aria-label={who}>
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        {art}
      </svg>
    </div>
  );
}
