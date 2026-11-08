import { useRef, useState } from 'react';
import { useEffect } from 'react';
import { Plus, Trash2, Upload, Loader2, Music, Sparkles, Link2 } from 'lucide-react';
import { upload, errText, ai } from '../lib/api.js';
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

const VSTYLES = [['illustration', 'איור'], ['realistic', 'צילום'], ['cartoon', 'אנימציה'], ['3d', 'תלת ממד']];

export function VideoField({ value, onChange, code, videoEnabled, onError }) {
  const isAi = /\/nl-media\//.test(value || '');
  const [tab, setTab] = useState(videoEnabled && !youtubeId(value) ? 'ai' : 'link');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('illustration');
  const [job, setJob] = useState(null); // { id, started }
  const [secs, setSecs] = useState(0);
  const id = youtubeId(value);

  useEffect(() => {
    if (!job) return;
    let stop = false;
    const tick = setInterval(() => setSecs(Math.round((Date.now() - job.started) / 1000)), 1000);
    const poll = async () => {
      while (!stop) {
        await new Promise((r) => setTimeout(r, 5000));
        if (stop) return;
        try {
          const r = await ai(code, 'video_check', { id: job.id });
          if (r.status === 'done') { onChange(r.url); setJob(null); return; }
        } catch (e) { onError?.(errText(e)); setJob(null); return; }
        if (Date.now() - job.started > 5 * 60 * 1000) { onError?.('הסרטון לוקח יותר מדי זמן. נסו שוב'); setJob(null); return; }
      }
    };
    poll();
    return () => { stop = true; clearInterval(tick); };
  }, [job]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    if (prompt.trim().length < 5) { onError?.('תארו במשפט מה קורה בסרטון'); return; }
    try {
      const r = await ai(code, 'video_start', { prompt: prompt.trim(), style });
      setSecs(0); setJob({ id: r.id, started: Date.now() });
    } catch (e) { onError?.(errText(e)); }
  };

  return (
    <div className="panel">
      <div className="imgfield-head">
        <span className="field-label">הסרטון</span>
        {!value && !job && videoEnabled && (
          <div className="seg" role="tablist">
            <button type="button" role="tab" className={tab === 'ai' ? 'on' : ''} onClick={() => setTab('ai')}><Sparkles size={15} /> יצירה ב-AI</button>
            <button type="button" role="tab" className={tab === 'link' ? 'on' : ''} onClick={() => setTab('link')}><Link2 size={15} /> קישור ליוטיוב</button>
          </div>
        )}
      </div>

      {value && isAi ? (
        <div>
          <video src={value} controls playsInline className="pv-video" />
          <div className="imgfield-actions"><button type="button" className="btn btn-soft danger" onClick={() => onChange('')}><Trash2 size={16} /> הסרה</button></div>
        </div>
      ) : job ? (
        <div className="video-job">
          <Loader2 className="spin" size={28} />
          <b>יוצרים את הסרטון…</b>
          <span className="muted">זה לוקח בערך חצי דקה עד דקה. אפשר בינתיים למלא כותרת. ({secs} שניות)</span>
          <div className="progress"><i style={{ width: `${Math.min(95, secs * 1.6)}%` }} /></div>
        </div>
      ) : tab === 'ai' && videoEnabled ? (
        <div className="imgfield-ai">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder="מה קורה בסרטון? למשל: מטוס נייר עף מעל חצר בית הספר ונוחת על הדשא" maxLength={600} />
          <div className="chips-row">{VSTYLES.map(([k, l]) => <button type="button" key={k} className={`chip-btn ${style === k ? 'on' : ''}`} onClick={() => setStyle(k)}>{l}</button>)}</div>
          <button type="button" className="btn btn-accent" onClick={start}><Sparkles size={18} /> צרו סרטון של 6 שניות</button>
          <p className="muted small">מספר הסרטונים בכל ניוזלטר מוגבל.</p>
        </div>
      ) : (
        <>
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://youtube.com/…" dir="ltr" aria-label="קישור לסרטון ביוטיוב" />
          {value && !id && <span className="chip warn">זה לא נראה כמו קישור ליוטיוב</span>}
          {id && <div className="video-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title="תצוגה מקדימה" allowFullScreen /></div>}
        </>
      )}
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
