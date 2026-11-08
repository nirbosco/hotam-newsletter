import { useState } from 'react';
import { ArrowLeft, Loader2, Sparkles, Users, Monitor, PenLine } from 'lucide-react';
import { api, errText } from '../lib/api.js';
import { local } from '../lib/local.js';
import { go } from '../App.jsx';

export default function Home() {
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');
  const recent = local.recent();

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr('תנו שם לניוזלטר'); return; }
    setBusy('create'); setErr('');
    try {
      const r = await api.createWorkspace(name.trim(), subtitle.trim(), 'hotam');
      local.setAdminKey(r.code, r.admin_key);
      local.addRecent(r.code, name.trim(), true);
      go(`/n/${r.code}/admin?welcome=1`);
    } catch (e2) { setErr(errText(e2)); setBusy(null); }
  };

  const join = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 4) { setErr('הקלידו את הקוד שקיבלתם מהמנחה'); return; }
    setBusy('join'); setErr('');
    try {
      const r = await api.get(c);
      if (!r) { setErr('לא מצאנו ניוזלטר עם הקוד הזה'); setBusy(null); return; }
      go(`/n/${c}`);
    } catch (e2) { setErr(errText(e2)); setBusy(null); }
  };

  return (
    <div className="home">
      <header className="home-top">
        <img src="./hotam-logo.png" alt="חותם" className="home-logo" />
      </header>

      <section className="home-hero">
        <span className="pill-tag"><Sparkles size={14} /> כלי למפגשים חיים</span>
        <h1>ניוזלטר שכותבים יחד</h1>
        <p>פותחים ניוזלטר, משתפים קישור, וכל המשתתפים כותבים מהטלפון. הכתבות עולות למסך ההקרנה ברגע שהן מתפרסמות.</p>
      </section>

      <div className="home-grid">
        <form className="card home-card" onSubmit={create}>
          <h2>פתיחת ניוזלטר חדש</h2>
          <label className="field">
            <span>שם הניוזלטר</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: קול המחזור" maxLength={120} />
          </label>
          <label className="field">
            <span>כותרת משנה <em>(לא חובה)</em></span>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="מגזין שיתופי" maxLength={200} />
          </label>
          <button className="btn btn-primary btn-lg" disabled={!!busy}>
            {busy === 'create' ? <Loader2 className="spin" size={20} /> : null}
            יצירת הניוזלטר <ArrowLeft size={18} />
          </button>
        </form>

        <form className="card home-card" onSubmit={join}>
          <h2>הצטרפות לניוזלטר</h2>
          <label className="field">
            <span>קוד הניוזלטר</span>
            <input className="code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={8} autoCapitalize="characters" autoComplete="off" dir="ltr" />
          </label>
          <button className="btn btn-outline btn-lg" disabled={!!busy}>
            {busy === 'join' ? <Loader2 className="spin" size={20} /> : null}
            כניסה <ArrowLeft size={18} />
          </button>
          {recent.length > 0 && (
            <div className="recent">
              <span className="muted small">נכנסתם לאחרונה</span>
              {recent.map((r) => (
                <a key={r.code} className="recent-row" href={r.admin ? `#/n/${r.code}/admin` : `#/n/${r.code}`}>
                  <b>{r.name}</b> <span className="mono">{r.code}</span> {r.admin && <span className="chip">מנחה</span>}
                </a>
              ))}
            </div>
          )}
        </form>
      </div>
      {err && <div className="toast-err" role="alert">{err}</div>}

      <section className="home-steps">
        <div><PenLine size={22} /><b>פותחים</b><span>נותנים שם ומקבלים קוד וקישור לשיתוף</span></div>
        <div><Users size={22} /><b>כותבים</b><span>כל קבוצה כותבת כתבה, ראיון, תשבץ או פודקאסט</span></div>
        <div><Monitor size={22} /><b>מקרינים</b><span>הניוזלטר נבנה על המסך מול כולם</span></div>
      </section>
      <footer className="home-foot">פיתוח מקצועי · חותם</footer>
    </div>
  );
}
