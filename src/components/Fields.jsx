import { useRef, useState } from 'react';
import { Plus, Trash2, Upload, Loader2, Music } from 'lucide-react';
import { upload, errText } from '../lib/api.js';
import { youtubeId } from '../lib/content.js';

export function LettersEditor({ items, setItems, onError }) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) { onError?.('כתבו את המכתב'); return; }
    setItems([...items, { name: name.trim(), text: text.trim() }]);
    setName(''); setText('');
  };
  return (
    <div className="panel">
      <span className="field-label">מכתבים ({items.length})</span>
      {items.map((l, i) => (
        <div className="letter-row" key={i}>
          <div><b>{l.name || 'אנונימי'}</b><p>{l.text}</p></div>
          <button type="button" className="icon-btn" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="מחיקת מכתב"><Trash2 size={16} /></button>
        </div>
      ))}
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם הכותב (אפשר להשאיר ריק)" maxLength={80} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="המכתב למערכת…" maxLength={3000} />
      <button type="button" className="btn btn-soft" onClick={add}><Plus size={16} /> הוספת המכתב</button>
    </div>
  );
}

export function VideoField({ value, onChange }) {
  const id = youtubeId(value);
  return (
    <div className="panel">
      <label className="field">
        <span>קישור לסרטון ביוטיוב</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://youtube.com/…" dir="ltr" />
      </label>
      {value && !id && <span className="chip warn">זה לא נראה כמו קישור ליוטיוב</span>}
      {id && <div className="video-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title="תצוגה מקדימה" allowFullScreen /></div>}
      <p className="muted small">סרטונים שה-AI יוצר יגיעו בגרסה הבאה.</p>
    </div>
  );
}

export function AudioField({ value, onChange, onError }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('audio/') && !/\.(mp3|m4a|wav|ogg|webm)$/i.test(f.name)) { onError?.('אפשר להעלות כאן רק קובץ שמע'); return; }
    if (f.size > 25 * 1024 * 1024) { onError?.('הקובץ גדול מדי (עד 25MB)'); return; }
    setBusy(true);
    try { onChange(await upload(f)); } catch (err) { onError?.(errText(err)); }
    setBusy(false);
  };
  return (
    <div className="panel">
      <span className="field-label">קובץ השמע</span>
      {value ? (
        <div className="row">
          <audio controls src={value} style={{ flex: 1 }} />
          <button type="button" className="btn btn-soft danger" onClick={() => onChange('')}><Trash2 size={16} /> הסרה</button>
        </div>
      ) : (
        <button type="button" className="dropzone" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="spin" size={26} /> : <Music size={26} />}
          <span>{busy ? 'מעלים…' : 'בחרו קובץ שמע (MP3, M4A, WAV)'}</span>
        </button>
      )}
      <input ref={ref} type="file" accept="audio/*,.mp3,.m4a,.wav" hidden onChange={pick} />
      <p className="muted small"><Upload size={12} /> אפשר להקליט בטלפון באפליקציית ההקלטות ולהעלות את הקובץ.</p>
    </div>
  );
}
