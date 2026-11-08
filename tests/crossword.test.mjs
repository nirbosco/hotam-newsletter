// בדיקת מחולל התשבץ: אין מילים מקריות, הכול קריא, מספור נכון
import { buildCrossword, normalizeWord } from '../src/lib/crossword.js';
import assert from 'node:assert/strict';

const lists = [
  ['שמש','ירח','כוכב','שביל','חלב','גלקסיה','מאדים','שבתאי','צדק','נוגה'],
  ['מורה','תלמיד','כיתה','לוח','מחברת','עפרון','ספר','הפסקה','צלצול','מבחן'],
  ['ירושלים','חיפה','אילת','צפת','עכו','טבריה','נתניה','רחובות'],
  ['אהבה','חברות','אמון','כבוד','סבלנות','נדיבות'],
  ['תפוח','בננה','ענבים','אגס','שזיף','מנגו','אבטיח','מלון','רימון'],
  ['מחשב','מקלדת','עכבר','מסך','רשת','קוד','אתר','שרת'],
  ['ים','חול','גל','שחייה','מגבת','שמשייה','צדף'],
  ['קיץ','חורף','סתיו','אביב','גשם','שלג','רוח','ענן','ברק','רעם'],
  ['חותם','חינוך','שוויון','אחריות','מנהיגות','קהילה','שינוי','הוראה'],
  ['כדורגל','כדורסל','טניס','ריצה','שחייה','אופניים','יוגה','שחמט'],
  ['לחם','חלה','פיתה','בורקס','פלאפל','חומוס','טחינה','שקשוקה'],
  ['אריה','נמר','פיל','ג׳ירפה','זברה','קוף','נחש','צב','דוב','זאב'],
  ['גיטרה','פסנתר','תוף','כינור','חליל','שיר','מנגינה','זמר'],
  ['רופא','אחות','מורה','נהג','טבח','שוטר','חייל','צייר'],
  ['אדום','כחול','ירוק','צהוב','סגול','כתום','ורוד','חום','שחור','לבן'],
  ['ספרייה','מדף','קורא','סיפור','שיר','רומן','דף','כריכה'],
  ['מטוס','רכבת','אוטובוס','אונייה','מכונית','אופנוע','משאית'],
  ['שבת','חג','פסח','סוכות','חנוכה','פורים','שבועות','ראש'],
  ['עץ','פרח','עלה','שורש','גזע','ענף','זרע','פרי','דשא'],
  ['מים','אש','אדמה','אוויר','אבן','ברזל','זהב','כסף'],
];

let totalPlaced = 0, totalWords = 0;
for (const [li, words] of lists.entries()) {
  const input = words.map((w) => ({ word: w, clue: 'הגדרה ל' + w }));
  const cw = buildCrossword(input);
  assert.ok(cw, 'built');
  const g = cw.cells;
  // כל רצף אופקי או אנכי של 2+ אותיות חייב להיות מילה ממוקמת
  const answers = new Set([...cw.clues.across, ...cw.clues.down].map((c) => `${c.row},${c.col},${c.length}`));
  const acrossKeys = new Set(cw.clues.across.map((c) => `${c.row},${c.col},${c.length}`));
  const downKeys = new Set(cw.clues.down.map((c) => `${c.row},${c.col},${c.length}`));
  for (let r = 0; r < cw.rows; r++) {
    let c = 0;
    while (c < cw.cols) {
      if (g[r][c]) { let s = c; while (c < cw.cols && g[r][c]) c++; if (c - s >= 2) assert.ok(acrossKeys.has(`${r},${s},${c - s}`), `list ${li}: stray across run at ${r},${s}`); }
      else c++;
    }
  }
  for (let c = 0; c < cw.cols; c++) {
    let r = 0;
    while (r < cw.rows) {
      if (g[r][c]) { let s = r; while (r < cw.rows && g[r][c]) r++; if (r - s >= 2) assert.ok(downKeys.has(`${s},${c},${r - s}`), `list ${li}: stray down run at ${s},${c}`); }
      else r++;
    }
  }
  // האותיות בתאים תואמות לתשובות
  for (const c of cw.clues.across) { const w = normalizeWord(c.answer); for (let i = 0; i < w.length; i++) assert.equal(g[c.row][c.col + i].letter, w[i]); }
  for (const c of cw.clues.down) { const w = normalizeWord(c.answer); for (let i = 0; i < w.length; i++) assert.equal(g[c.row + i][c.col].letter, w[i]); }
  const placed = cw.clues.across.length + cw.clues.down.length;
  assert.equal(placed + cw.unplaced.length, new Set(words.map(normalizeWord)).size);
  totalPlaced += placed; totalWords += placed + cw.unplaced.length;
  console.log(`list ${String(li).padStart(2)}: ${placed}/${placed + cw.unplaced.length} placed, grid ${cw.rows}x${cw.cols}${cw.unplaced.length ? '  unplaced: ' + cw.unplaced.join(',') : ''}`);
}
console.log(`\nTOTAL ${totalPlaced}/${totalWords} (${Math.round((100 * totalPlaced) / totalWords)}%) · no stray words · all answers match`);
