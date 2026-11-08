import { useRef, useState } from 'react';
import { Sparkles, Upload, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { ai, upload, errText } from '../lib/api.js';

const STYLES = [
  ['illustration', 'איור'],
  ['realistic', 'צילום'],
  ['cartoon', 'קריקטורה'],
  ['watercolor', 'צבעי מים'],
  ['3d', 'תלת ממד'],
];

export default function ImageField({ code, value, onChange, label = 'תמונה ראשית', defaultStyle = 'illustration', aiEnabled = true, onError }) {
  const [tab, setTab] = useState(aiEnabled ? 'ai' : 'upload');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState(defaultStyle);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const generate = async () => {
    if (prompt.trim().length < 3) { onError?.('תארו במילים מה תרצו לראות בתמונה'); return; }
    setBusy(true);
    try {
      const r = await ai(code, 'image', { prompt: prompt.trim(), style });
      onChange(r.url);
    } catch (e) { onError?.(errText(e)); }
    setBusy(false);
  };

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { onError?.('אפשר להעלות כאן רק תמונה'); return; }
    if (f.size > 20 * 1024 * 1024) { onError?.('התמונה גדולה מדי (עד 20MB)'); return; }
    setBusy(true);
    try { onChange(await upload(f)); } catch (err) { onError?.(errText(err)); }
    setBusy(false);
  };

  return (
    <div className="imgfield">
      <div className="imgfield-head">
        <span className="field-label">{label}</span>
        {!value && (
          <div className="seg" role="tablist">
            {aiEnabled && <button type="button" role="tab" className={tab === 'ai' ? 'on' : ''} onClick={() => setTab('ai')}><Sparkles size={15} /> יצירה ב-AI</button>}
            <button type="button" role="tab" className={tab === 'upload' ? 'on' : ''} onClick={() => setTab('upload')}><Upload size={15} /> העלאה</button>
          </div>
        )}
      </div>

      {value ? (
        <div className="imgfield-preview">
          <img src={value} alt="" />
          <div className="imgfield-actions">
            {tab === 'ai' && aiEnabled && prompt && <button type="button" className="btn btn-soft" onClick={generate} disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />} תמונה אחרת</button>}
            <button type="button" className="btn btn-soft danger" onClick={() => onChange('')}><Trash2 size={16} /> הסרה</button>
          </div>
        </div>
      ) : tab === 'ai' ? (
        <div className="imgfield-ai">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder="מה רואים בתמונה? למשל: תלמידים שותלים עץ בחצר בית הספר, בשקיעה" maxLength={800} />
          <div className="chips-row">
            {STYLES.map(([k, l]) => (
              <button type="button" key={k} className={`chip-btn ${style === k ? 'on' : ''}`} onClick={() => setStyle(k)}>{l}</button>
            ))}
          </div>
          <button type="button" className="btn btn-accent" onClick={generate} disabled={busy}>
            {busy ? <><Loader2 className="spin" size={18} /> יוצרים תמונה, זה לוקח כמה שניות…</> : <><Sparkles size={18} /> צרו תמונה</>}
          </button>
        </div>
      ) : (
        <button type="button" className="dropzone" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="spin" size={26} /> : <Upload size={26} />}
          <span>{busy ? 'מעלים…' : 'בחרו תמונה מהמכשיר'}</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  );
}
