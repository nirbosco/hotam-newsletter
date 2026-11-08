import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Eye, EyeOff, Trash2, ArrowUp, ArrowDown, Pencil, Monitor, Share2, LayoutList, Settings, Loader2, KeyRound, ShieldCheck, Download } from 'lucide-react';
import { useNewsletter } from '../lib/useNewsletter.js';
import { api, errText } from '../lib/api.js';
import { local } from '../lib/local.js';
import { orderPosts, timeAgo } from '../lib/content.js';
import { resolveTheme } from '../lib/themes.js';
import DesignEditor, { designFromTheme, designToTheme } from '../components/DesignEditor.jsx';
import { Spinner, NotFound, QR, useToast, copy, baseUrl } from '../components/Common.jsx';
import { TypeTag } from '../components/Post.jsx';
import QRCode from 'qrcode';
import { go } from '../App.jsx';

export default function Admin({ code, params }) {
  const [key, setKey] = useState(() => params.get('k') || local.adminKey(code));

  // קישור ניהול עם מפתח: שומרים במכשיר ומנקים מהכתובת
  useEffect(() => {
    const k = params.get('k');
    if (k) { local.setAdminKey(code, k); go(`/n/${code}/admin`); }
  }, [params, code]);

  if (!key) return <AdminLogin code={code} onKey={(k) => { local.setAdminKey(code, k); setKey(k); }} />;
  return <AdminPanel code={code} adminKey={key} params={params} welcome={params.get('welcome') === '1'} onLogout={() => { local.setAdminKey(code, null); setKey(null); }} />;
}

function AdminLogin({ code, onKey }) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const m = v.match(/[?&]k=([^&\s]+)/);
    const k = (m ? decodeURIComponent(m[1]) : v).trim();
    if (!k) return;
    setBusy(true); setErr('');
    try {
      if (await api.adminCheck(code, k)) onKey(k);
      else setErr('הקישור או המפתח לא מתאימים לניוזלטר הזה');
    } catch (e2) { setErr(errText(e2)); }
    setBusy(false);
  };
  return (
    <div className="admin-login">
      <form className="card" onSubmit={submit}>
        <KeyRound size={28} className="accent-ico" />
        <h2>כניסת מנחה</h2>
        <p className="muted">הדביקו את קישור הניהול שקיבלתם כשפתחתם את הניוזלטר.</p>
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder="קישור הניהול" dir="ltr" autoFocus />
        {err && <div className="toast-err">{err}</div>}
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy && <Loader2 className="spin" size={18} />} כניסה</button>
        <a className="muted small" href={`#/n/${code}`}>לא מנחים? לכניסת כותבים</a>
      </form>
    </div>
  );
}

function AdminPanel({ code, adminKey, welcome, onLogout, params }) {
  const { data, error, loading, reload, setData } = useNewsletter(code, adminKey);
  const [tab, setTab] = useState(params?.get('tab') || (welcome ? 'share' : 'posts'));
  const [toast, say] = useToast();
  const ws = data?.workspace;
  useEffect(() => { if (ws) { document.title = `${ws.name} · ניהול`; local.addRecent(code, ws.name, true); } }, [ws, code]);

  if (loading && !data) return <Spinner />;
  if (error === 'forbidden') return <div className="center-fill"><h2>קישור הניהול לא תקף</h2><button className="btn btn-primary" onClick={onLogout}>כניסה מחדש</button></div>;
  if (error === 'not_found' || (!ws && !loading)) return <NotFound code={code} />;

  const posts = orderPosts(data.posts, ws.post_order);
  const hidden = posts.filter((p) => p.hidden).length;

  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-title">
          <img src="./hotam-logo.png" alt="חותם" />
          <b>{ws.name}</b>
          <span className="mono muted">{code}</span>
        </div>
        <nav>
          <button className={tab === 'share' ? 'on' : ''} onClick={() => setTab('share')}><Share2 size={18} /> שיתוף</button>
          <button className={tab === 'posts' ? 'on' : ''} onClick={() => setTab('posts')}><LayoutList size={18} /> כתבות <span className="count">{posts.length}</span></button>
          <button className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}><Settings size={18} /> עיצוב והגדרות</button>
        </nav>
        <div className="side-ctas">
          <a className="btn btn-primary" href={`#/n/${code}/screen`}><Monitor size={18} /> מסך ההקרנה</a>
          <a className="btn btn-soft" href={`#/n/${code}/print`}><Download size={16} /> הורדה כ-PDF</a>
        </div>
      </aside>

      <main className="admin-main">
        {welcome && <div className="welcome"><ShieldCheck size={22} /><div><b>הניוזלטר מוכן.</b> שמרו את קישור הניהול (בלשונית "שיתוף"). הוא הדרך היחידה לחזור לניהול ממכשיר אחר.</div></div>}
        {tab === 'share' && <SharePanel code={code} adminKey={adminKey} welcome={welcome} say={say} />}
        {tab === 'posts' && <PostsPanel code={code} adminKey={adminKey} ws={ws} posts={posts} hidden={hidden} reload={reload} setData={setData} say={say} />}
        {tab === 'settings' && <SettingsPanel code={code} adminKey={adminKey} ws={ws} aiToday={data.ai_today} videosUsed={data.videos_used} reload={reload} say={say} />}
      </main>
      {toast}
    </div>
  );
}

function SharePanel({ code, adminKey, welcome, say }) {
  const base = baseUrl();
  const writer = `${base}#/n/${code}`;
  const screen = `${base}#/n/${code}/screen`;
  const admin = `${base}#/n/${code}/admin?k=${encodeURIComponent(adminKey)}`;
  const c = (t, m) => { copy(t); say(m); };
  const downloadQR = async () => {
    const url = await QRCode.toDataURL(writer, { margin: 2, width: 1200, color: { dark: '#0a1330', light: '#ffffff' } });
    const a = document.createElement('a'); a.href = url; a.download = `newsletter-${code}-qr.png`; a.click();
  };
  return (
    <div className="admin-section">
      <h2>שיתוף</h2>
      <div className="share-grid">
        <div className="card share-qr">
          <QR text={writer} size={200} />
          <div className="code-big mono">{code}</div>
          <button className="btn btn-soft btn-sm" onClick={downloadQR}><Download size={15} /> הורדת QR</button>
        </div>
        <div className="share-links">
          <LinkRow title="קישור לכותבים" hint="שלחו לקבוצה או הציגו את ה-QR" url={writer} onCopy={() => c(writer, 'הקישור לכותבים הועתק')} />
          <LinkRow title="מסך ההקרנה" hint="פתחו במחשב שמחובר למקרן" url={screen} onCopy={() => c(screen, 'הקישור למסך הועתק')} open />
          <LinkRow title="קישור הניהול" hint="אישי. מי שמחזיק בו יכול למחוק ולערוך" url={admin} onCopy={() => c(admin, 'קישור הניהול הועתק. שמרו אותו במקום בטוח')} secret />
        </div>
      </div>
    </div>
  );
}

function LinkRow({ title, hint, url, onCopy, open, secret }) {
  return (
    <div className={`card link-row ${secret ? 'secret' : ''}`}>
      <div><b>{title}</b><span className="muted small">{hint}</span></div>
      <code dir="ltr">{secret ? url.replace(/k=.*/, 'k=••••••••') : url.replace(/^https?:\/\//, '')}</code>
      <div className="row">
        <button className="btn btn-soft btn-sm" onClick={onCopy}><Copy size={15} /> העתקה</button>
        {open && <a className="btn btn-soft btn-sm" href={url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> פתיחה</a>}
      </div>
    </div>
  );
}

function PostsPanel({ code, adminKey, ws, posts, hidden, reload, setData, say }) {
  const [busy, setBusy] = useState(null);
  const act = async (id, action) => {
    if (action === 'delete' && !window.confirm('למחוק את הכתבה? אי אפשר לשחזר אותה.')) return;
    setBusy(id);
    try { await api.adminPost(code, adminKey, id, action); await reload(); say(action === 'delete' ? 'הכתבה נמחקה' : action === 'hide' ? 'הכתבה הוסתרה מהמסך' : 'הכתבה חזרה למסך'); }
    catch (e) { say(errText(e), 'err'); }
    setBusy(null);
  };
  const move = async (i, d) => {
    const ids = posts.map((p) => p.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setData((old) => ({ ...old, workspace: { ...old.workspace, post_order: ids } }));
    try { await api.adminUpdate(code, adminKey, { post_order: ids }); } catch (e) { say(errText(e), 'err'); reload(); }
  };
  const rename = async (p, title) => {
    if (!title.trim() || title === p.title) return;
    try { await api.updatePost(code, p.id, adminKey, { ...p, title: title.trim() }); reload(); say('הכותרת עודכנה'); } catch (e) { say(errText(e), 'err'); }
  };
  return (
    <div className="admin-section">
      <div className="row between">
        <h2>כתבות</h2>
        <span className="muted">{posts.length} כתבות{hidden ? ` · ${hidden} מוסתרות` : ''}</span>
      </div>
      {posts.length > 0 && (
        <div className="groups-row">
          <span className="muted small">מי כבר פרסם:</span>
          {Object.entries(posts.reduce((m, p) => { const g = p.author.split(' (')[0] || 'בלי שם'; m[g] = (m[g] || 0) + 1; return m; }, {}))
            .sort((a, b) => b[1] - a[1]).map(([g, n]) => <span className="chip" key={g}>{g} · {n}</span>)}
        </div>
      )}
      {posts.length === 0 ? (
        <div className="card empty-admin">עוד אין כתבות. שתפו את הקישור לכותבים, והכתבות יופיעו כאן.</div>
      ) : (
        <div className="card table-wrap">
          <table className="ptable">
            <thead><tr><th>סדר</th><th>סוג</th><th>כותרת</th><th className="hide-sm">כותבים</th><th className="hide-sm">פורסם</th><th>פעולות</th></tr></thead>
            <tbody>
              {posts.map((p, i) => (
                <tr key={p.id} className={p.hidden ? 'is-hidden' : ''}>
                  <td className="order-cell">
                    <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="למעלה"><ArrowUp size={15} /></button>
                    <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === posts.length - 1} aria-label="למטה"><ArrowDown size={15} /></button>
                  </td>
                  <td><TypeTag type={p.type} /></td>
                  <td><input className="inline-edit" defaultValue={p.title} onBlur={(e) => rename(p, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} aria-label="כותרת" />{p.hidden && <span className="chip">מוסתרת</span>}{(p.likes > 0 || p.comments?.length > 0) && <span className="muted small nowrap"> ♥ {p.likes} · 💬 {p.comments?.length || 0}</span>}</td>
                  <td className="hide-sm muted">{p.author}</td>
                  <td className="hide-sm muted nowrap">{timeAgo(p.created_at)}</td>
                  <td className="actions-cell">
                    {busy === p.id ? <Loader2 className="spin" size={16} /> : <>
                      <button className="icon-btn" onClick={() => act(p.id, p.hidden ? 'unhide' : 'hide')} title={p.hidden ? 'החזרה למסך' : 'הסתרה מהמסך'} aria-label={p.hidden ? 'החזרה למסך' : 'הסתרה מהמסך'}>{p.hidden ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                      <a className="icon-btn" href={`#/n/${code}?edit=${p.id}`} title="עריכה" aria-label="עריכה"><Pencil size={16} /></a>
                      <button className="icon-btn danger" onClick={() => act(p.id, 'delete')} title="מחיקה" aria-label="מחיקה"><Trash2 size={16} /></button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">כתבה מוסתרת נעלמת מהמסך מיד, ואפשר להחזיר אותה בכל רגע. כתבות חדשות מופיעות בראש הרשימה.</p>
    </div>
  );
}

function SettingsPanel({ code, adminKey, ws, aiToday, videosUsed, reload, say }) {
  const theme = useMemo(() => resolveTheme(ws), [ws]);
  const [f, setF] = useState(() => ({
    name: ws.name, subtitle: ws.subtitle, ...designFromTheme(theme),
    ai: ws.settings?.ai_enabled !== false,
    video: !!ws.settings?.video_enabled, videoQuota: ws.settings?.video_quota ?? 3,
    likes: ws.settings?.likes_enabled !== false, comments: ws.settings?.comments_enabled !== false,
  }));
  const [busy, setBusy] = useState(false);
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const save = async () => {
    setBusy(true);
    try {
      await api.adminUpdate(code, adminKey, {
        name: f.name, subtitle: f.subtitle, template: f.template,
        theme: designToTheme(f),
        settings: { ai_enabled: f.ai, video_enabled: f.video, video_quota: f.videoQuota, likes_enabled: f.likes, comments_enabled: f.comments },
      });
      await reload(); say('ההגדרות נשמרו');
    } catch (e) { say(errText(e), 'err'); }
    setBusy(false);
  };
  return (
    <div className="admin-section">
      <h2>עיצוב והגדרות</h2>
      <div className="settings-grid">
        <div className="card">
          <h3>פרטי הניוזלטר</h3>
          <label className="field"><span>שם</span><input value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} /></label>
          <label className="field"><span>כותרת משנה</span><input value={f.subtitle} onChange={(e) => set({ subtitle: e.target.value })} maxLength={200} /></label>
        </div>
        <div className="card">
          <h3>עיצוב</h3>
          <DesignEditor d={f} set={set} name={f.name} subtitle={f.subtitle} onError={(m) => say(m, 'err')} />
        </div>
        <div className="card">
          <h3>כלי AI</h3>
          <label className="check"><input type="checkbox" checked={f.ai} onChange={(e) => set({ ai: e.target.checked })} /> הכותבים יכולים להשתמש ב-AI (כותרות, ניסוח, תמונות ותשבץ)</label>
          <label className="check"><input type="checkbox" checked={f.video} disabled={!f.ai} onChange={(e) => set({ video: e.target.checked })} /> יצירת סרטונים ב-AI</label>
          {f.video && f.ai && (
            <label className="field inline-num"><span>מכסת סרטונים לניוזלטר</span>
              <select value={f.videoQuota} onChange={(e) => set({ videoQuota: Number(e.target.value) })}>{[1, 2, 3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </label>
          )}
          <p className="muted small">שימוש היום: {aiToday?.text || 0} פעולות טקסט · {aiToday?.image || 0} תמונות · נוצרו {videosUsed || 0} סרטונים מתוך {f.videoQuota}</p>
          <p className="muted small">כל סרטון נוצר בכחצי דקה ועולה כסף בחשבון ה-AI, ולכן יש מכסה.</p>
        </div>
        <div className="card">
          <h3>תגובות ולייקים</h3>
          <label className="check"><input type="checkbox" checked={f.likes} onChange={(e) => set({ likes: e.target.checked })} /> לייקים לכתבות</label>
          <label className="check"><input type="checkbox" checked={f.comments} onChange={(e) => set({ comments: e.target.checked })} /> תגובות לכתבות</label>
          <p className="muted small">אפשר למחוק תגובה מתוך הכתבה במסך ההקרנה, כשאתם מחוברים כמנחים.</p>
        </div>
      </div>
      <div className="publish-bar"><button className="btn btn-primary btn-lg" onClick={save} disabled={busy}>{busy && <Loader2 className="spin" size={18} />} שמירת ההגדרות</button></div>
    </div>
  );
}
