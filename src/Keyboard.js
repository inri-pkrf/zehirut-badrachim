import React, { useState } from 'react';

/* מקלדת על המסך, בסידור של מקלדת טלפון.
   הסדר זהה למקלדת טלפון: האותיות מוצגות משמאל לימין בדיוק לפי הרשימה. */
const HE = [
  ['ק', 'ר', 'א', 'ט', 'ו', 'ן', 'ם', 'פ'],
  ['ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל', 'ך', 'ף'],
  ['ז', 'ס', 'ב', 'ה', 'נ', 'מ', 'צ', 'ת', 'ץ'],
];

const EN = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

export default function Keyboard({ onKey, onBackspace, onDone }) {
  const [lang, setLang] = useState('he');
  const [shift, setShift] = useState(false);
  const rows = lang === 'he' ? HE : EN;

  // pointerdown + preventDefault: תגובה מיידית וללא גלילה או בחירת טקסט
  const press = (fn) => (e) => {
    e.preventDefault();
    fn();
  };

  const letter = (ch) => (lang === 'en' && shift ? ch.toUpperCase() : ch);

  return (
    <div className="kb" dir="ltr">
      {rows.map((row, i) => (
        <div className="kb-row" key={i}>
          {lang === 'en' && i === 2 && (
            <button
              className={'key wide' + (shift ? ' on' : '')}
              onPointerDown={press(() => setShift((s) => !s))}
              aria-label="אותיות גדולות"
            >
              ⇧
            </button>
          )}
          {row.map((ch) => (
            <button
              key={ch}
              className="key"
              onPointerDown={press(() => {
                onKey(letter(ch));
                if (shift) setShift(false);
              })}
            >
              {letter(ch)}
            </button>
          ))}
          {i === 2 && (
            <button className="key wide" onPointerDown={press(onBackspace)} aria-label="מחיקה">
              ⌫
            </button>
          )}
        </div>
      ))}
      <div className="kb-row">
        <button
          className="key wide2"
          onPointerDown={press(() => {
            setLang((l) => (l === 'he' ? 'en' : 'he'));
            setShift(false);
          })}
        >
          {lang === 'he' ? 'EN' : 'עב'}
        </button>
        <button className="key space" onPointerDown={press(() => onKey(' '))}>
          רווח
        </button>
        <button className="key wide2 done" onPointerDown={press(onDone)}>
          אישור
        </button>
      </div>
    </div>
  );
}
