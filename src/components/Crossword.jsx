import { useMemo, useRef, useState } from 'react';
import { Sparkles, Loader2, Plus, Trash2, Check, Eye, RotateCcw } from 'lucide-react';
import { ai, errText } from '../lib/api.js';
import { buildCrossword, isValidWord, normalizeLetter } from '../lib/crossword.js';

// ===== עורך =====
export function CrosswordEditor({ code, words, setWords, aiEnabled = true, onError }) {
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [w, setW] = useState('');
  const [c, setC] = useState('');

  const built = useMemo(() => (words.length >= 2 ? buildCrossword(words) : null), [words]);

  const generate = async () => {
    if (topic.trim().length < 2) { onError?.('כתבו נושא לתשבץ'); return; }
    setBusy(true);
    try {
      const r = await ai(code, 'crossword', { topic: topic.trim(), count: 8 });
      // משאירים רק מילים שנכנסות לרשת, עד 10
      const cw = buildCrossword(r.words);
      const placed = new Set([...cw.clues.across, ...cw.clues.down].map((x) => x.answer));
      setWords(r.words.filter((x) => placed.has(x.word)).slice(0, 10));
    } catch (e) { onError?.(errText(e)); }
    setBusy(false);
  };

  const add = () => {
    const word = w.trim();
    if (!isValidWord(word)) { onError?.('מילה אחת בעברית, בלי רווחים, בלי ספרות ובלי ניקוד'); return; }
    if (!c.trim()) { onError?.('כתבו הגדרה למילה'); return; }
    setWords([...words, { word, clue: c.trim() }]);
    setW(''); setC('');
  };

  return (
    <div className="cw-editor">
      {aiEnabled && (
        <div className="panel">
          <span className="field-label"><Sparkles size={15} /> תשבץ אוטומטי לפי נושא</span>
          <div className="row">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="למשל: מערכת השמש, ערכי הקבוצה שלנו, חגי ישראל" maxLength={200} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), generate())} />
            <button type="button" className="btn btn-accent" onClick={generate} disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />} {busy ? 'יוצרים…' : 'צרו'}</button>
          </div>
        </div>
      )}

      <div className="panel">
        <span className="field-label">המילים בתשבץ ({words.length})</span>
        {words.length > 0 && (
          <ul className="cw-words">
            {words.map((x, i) => {
              const out = built?.unplaced.includes(x.word);
              return (
                <li key={i} className={out ? 'out' : ''}>
                  <b>{x.word}</b>
                  <input value={x.clue} onChange={(e) => setWords(words.map((y, j) => (j === i ? { ...y, clue: e.target.value } : y)))} aria-label={`הגדרה ל${x.word}`} />
                  {out && <span className="chip warn">לא נכנסה לרשת</span>}
                  <button type="button" className="icon-btn" onClick={() => setWords(words.filter((_, j) => j !== i))} aria-label="מחיקה"><Trash2 size={16} /></button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="row cw-add">
          <input value={w} onChange={(e) => setW(e.target.value)} placeholder="מילה" maxLength={14} />
          <input value={c} onChange={(e) => setC(e.target.value)} placeholder="הגדרה" maxLength={120} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
          <button type="button" className="btn btn-soft" onClick={add}><Plus size={16} /> הוספה</button>
        </div>
      </div>

      {built && (
        <div className="panel">
          <span className="field-label">תצוגה מקדימה</span>
          <CrosswordGrid data={built} reveal small />
        </div>
      )}
    </div>
  );
}

export const crosswordReady = (words) => {
  if (words.length < 2) return null;
  const b = buildCrossword(words);
  return b && b.clues.across.length + b.clues.down.length >= 2 ? b : null;
};

// ===== רשת לתצוגה מקדימה =====
function CrosswordGrid({ data, reveal, small }) {
  return (
    <div className={`cw-grid ${small ? 'small' : ''}`} style={{ gridTemplateColumns: `repeat(${data.cols}, 1fr)` }} dir="rtl">
      {data.cells.flatMap((row, r) => row.map((cell, c) => (
        <div key={`${r}-${c}`} className={cell ? 'cw-cell' : 'cw-cell empty'}>
          {cell?.number && <span className="cw-num">{cell.number}</span>}
          {cell && reveal ? cell.letter : ''}
        </div>
      )))}
    </div>
  );
}

// ===== פתרון =====
export function CrosswordPlay({ data }) {
  const { rows, cols, cells, clues } = data;
  const [vals, setVals] = useState(() => cells.map((row) => row.map(() => '')));
  const [dir, setDir] = useState('across');
  const [sel, setSel] = useState(null);
  const [checked, setChecked] = useState(false);
  const refs = useRef({});

  const focus = (r, c) => { setSel([r, c]); refs.current[`${r}-${c}`]?.focus(); };
  const open = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols && cells[r][c];
  const step = (r, c, d, k = 1) => (d === 'across' ? [r, c + k] : [r + k, c]);

  const onInput = (r, c, raw) => {
    const ch = normalizeLetter(raw.replace(/[^א-ת]/g, '').slice(-1));
    // עדכון פונקציונלי: הקלדה מהירה לא דורסת אותיות
    setVals((prev) => { const next = prev.map((row) => [...row]); next[r][c] = ch; return next; });
    setChecked(false);
    if (ch) {
      const [nr, nc] = step(r, c, dir);
      if (open(nr, nc)) focus(nr, nc);
      else {
        // סוף המילה בכיוון הזה: אם יש המשך בכיוון השני, עוברים אליו
        const other = dir === 'across' ? 'down' : 'across';
        const [or, oc] = step(r, c, other);
        if (open(or, oc) && !open(...step(r, c, other, -1))) { setDir(other); focus(or, oc); }
      }
    }
  };

  const onKey = (r, c, e) => {
    if (e.key === 'Backspace' && !vals[r][c]) {
      const [pr, pc] = step(r, c, dir, -1);
      if (open(pr, pc)) { e.preventDefault(); focus(pr, pc); }
    }
    // ברשת מימין לשמאל: חץ שמאלה מתקדם במאוזן
    const moves = { ArrowLeft: [0, 1], ArrowRight: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dr, dc] = moves[e.key];
      setDir(dr ? 'down' : 'across');
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nc >= 0 && nr < rows && nc < cols && !cells[nr][nc]) { nr += dr; nc += dc; }
      if (open(nr, nc)) focus(nr, nc);
    }
  };

  const click = (r, c) => {
    if (sel && sel[0] === r && sel[1] === c) {
      const canAcross = open(r, c - 1) || open(r, c + 1);
      const canDown = open(r - 1, c) || open(r + 1, c);
      if (canAcross && canDown) setDir(dir === 'across' ? 'down' : 'across');
    } else {
      const canAcross = open(r, c - 1) || open(r, c + 1);
      const canDown = open(r - 1, c) || open(r + 1, c);
      if (!canAcross) setDir('down');
      else if (!canDown) setDir('across');
      else if (!open(r - 1, c) && open(r, c - 1)) setDir('down'); // תחילת מילה מאונכת
      else if (!open(r, c - 1) && open(r - 1, c)) setDir('across'); // תחילת מילה מאוזנת
    }
    setSel([r, c]);
  };

  // המילה הפעילה
  const active = new Set();
  if (sel) {
    let [r, c] = sel;
    while (open(...step(r, c, dir, -1))) [r, c] = step(r, c, dir, -1);
    while (open(r, c)) { active.add(`${r}-${c}`); [r, c] = step(r, c, dir); }
  }

  const filled = vals.every((row, r) => row.every((v, c) => !cells[r][c] || v));
  const solved = vals.every((row, r) => row.every((v, c) => !cells[r][c] || v === cells[r][c].letter));

  const jump = (cl, d) => { setDir(d); focus(cl.row, cl.col); };

  return (
    <div className="cw-play">
      <div className="cw-grid play" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: cols * 46 }} dir="rtl">
        {cells.flatMap((row, r) => row.map((cell, c) => {
          if (!cell) return <div key={`${r}-${c}`} className="cw-cell empty" />;
          const k = `${r}-${c}`;
          const wrong = checked && vals[r][c] && vals[r][c] !== cell.letter;
          return (
            <div key={k} className={`cw-cell ${active.has(k) ? 'hl' : ''} ${sel && sel[0] === r && sel[1] === c ? 'cur' : ''} ${wrong ? 'wrong' : ''} ${checked && vals[r][c] === cell.letter ? 'right' : ''}`} onClick={() => click(r, c)}>
              {cell.number && <span className="cw-num">{cell.number}</span>}
              <input ref={(el) => (refs.current[k] = el)} value={vals[r][c]} onChange={(e) => onInput(r, c, e.target.value)} onKeyDown={(e) => onKey(r, c, e)} inputMode="text" maxLength={2} aria-label={`תא ${r + 1},${c + 1}`} autoComplete="off" />
            </div>
          );
        }))}
      </div>

      <div className="cw-actions">
        <button type="button" className="btn btn-soft" onClick={() => setChecked(true)} disabled={!vals.some((row) => row.some(Boolean))}><Check size={16} /> בדיקה</button>
        <button type="button" className="btn btn-soft" onClick={() => { setVals(cells.map((row) => row.map((x) => (x ? x.letter : '')))); setChecked(true); }}><Eye size={16} /> פתרון</button>
        <button type="button" className="btn btn-soft" onClick={() => { setVals(cells.map((row) => row.map(() => ''))); setChecked(false); }}><RotateCcw size={16} /> איפוס</button>
        {filled && solved && <span className="chip ok">כל הכבוד, פתרתם!</span>}
      </div>

      <div className="cw-clues">
        {[['across', 'מאוזן'], ['down', 'מאונך']].map(([d, l]) => clues[d].length > 0 && (
          <div key={d}>
            <h4>{l}</h4>
            <ol>
              {clues[d].map((cl) => (
                <li key={cl.number} onClick={() => jump(cl, d)}><b>{cl.number}.</b> {cl.clue} <span className="muted">({cl.length})</span></li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
