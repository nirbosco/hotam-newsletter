import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Minimize, PenLine, QrCode, Pencil, FileDown } from 'lucide-react';
import { useNewsletter } from '../lib/useNewsletter.js';
import { local } from '../lib/local.js';
import { orderPosts } from '../lib/content.js';
import { resolveTheme, themeStyle, loadFonts } from '../lib/themes.js';
import { Spinner, NotFound, QR, baseUrl } from '../components/Common.jsx';
import { PostCard, PostView, useLikes } from '../components/Post.jsx';

export default function Screen({ code }) {
  const adminKey = local.adminKey(code);
  const { data, error, loading, reload } = useNewsletter(code);
  const likes = useLikes(code);
  const [open, setOpen] = useState(null);
  const [full, setFull] = useState(false);
  const [showJoin, setShowJoin] = useState(true);
  const seen = useRef(null);
  const [fresh, setFresh] = useState(new Set());

  const ws = data?.workspace;
  const theme = useMemo(() => resolveTheme(ws), [ws]);
  useEffect(() => { loadFonts(theme); }, [theme]);
  useEffect(() => { if (ws) document.title = ws.name; }, [ws]);

  const posts = useMemo(() => orderPosts(data?.posts || [], ws?.post_order), [data, ws]);

  // הדגשת כתבות שזה עתה הגיעו
  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.posts.map((p) => p.id));
    if (seen.current) {
      const n = [...ids].filter((id) => !seen.current.has(id));
      if (n.length) {
        setFresh(new Set(n));
        const t = setTimeout(() => setFresh(new Set()), 6000);
        seen.current = ids;
        return () => clearTimeout(t);
      }
    }
    seen.current = ids;
  }, [data]);

  // אם הכתבה הפתוחה התעדכנה או הוסתרה
  useEffect(() => {
    if (open && data) {
      const p = data.posts.find((x) => x.id === open.id);
      if (!p) setOpen(null); else if (p.updated_at !== open.updated_at || p.likes !== open.likes || p.comments?.length !== open.comments?.length) setOpen(p);
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  if (loading && !data) return <Spinner />;
  if (error === 'not_found') return <NotFound code={code} />;
  if (!ws) return <div className="center-fill"><p>{error}</p></div>;

  const mine = local.myPosts(code);
  const joinUrl = `${baseUrl()}#/n/${code}`;
  const groups = new Set(posts.map((p) => p.author.split(' (')[0])).size;
  const year = new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  return (
    <div className="screen" data-template={theme.key} style={themeStyle(theme)}>
      <div className="screen-bar">
        <div className="row">
          <a className="btn btn-soft btn-sm" href={adminKey ? `#/n/${code}/admin` : `#/n/${code}`}><PenLine size={15} /> {adminKey ? 'ניהול' : 'כתיבה'}</a>
          <button className="btn btn-soft btn-sm" onClick={() => setShowJoin(!showJoin)}><QrCode size={15} /> {showJoin ? 'הסתרת הקוד' : 'הצגת הקוד'}</button>
          <a className="btn btn-soft btn-sm" href={`#/n/${code}/print`}><FileDown size={15} /> PDF</a>
        </div>
        <button className="btn btn-soft btn-sm" onClick={() => (full ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}>
          {full ? <Minimize size={15} /> : <Maximize size={15} />} {full ? 'יציאה ממסך מלא' : 'מסך מלא'}
        </button>
      </div>

      <header className="masthead">
        {theme.showLogo && <img src="./hotam-logo.png" alt="חותם" className="mast-logo" />}
        <h1>{ws.name}</h1>
        <div className="mast-line">
          <span>{ws.subtitle}</span>
          <span className="dot">·</span>
          <span>{year}</span>
          <span className="dot">·</span>
          <span>{posts.length === 1 ? 'כתבה אחת' : `${posts.length} כתבות`}{groups > 1 ? ` מ-${groups} קבוצות` : ''}</span>
        </div>
      </header>

      {showJoin && (
        <aside className="join-strip">
          <QR text={joinUrl} size={92} />
          <div>
            <span className="muted">מצטרפים לכתיבה</span>
            <b className="join-url">{joinUrl.replace(/^https?:\/\//, '').split('#')[0].replace(/\/$/, '')}</b>
            <span>קוד: <b className="mono big">{code}</b></span>
          </div>
        </aside>
      )}

      {posts.length === 0 ? (
        <div className="empty-state">
          <h2>הניוזלטר מחכה לכתבה הראשונה</h2>
          <p className="muted">סרקו את הקוד והתחילו לכתוב. כל כתבה שתתפרסם תופיע כאן מיד.</p>
        </div>
      ) : (
        <main className="masonry">
          {posts.map((p) => (
            <div key={p.id} className="masonry-item">
              <PostCard post={p} onOpen={setOpen} fresh={fresh.has(p.id)} likes={likes} settings={ws.settings} />
              {mine[p.id] && <a className="mine-edit" href={`#/n/${code}?edit=${p.id}`}><Pencil size={13} /> תיקון הכתבה שלי</a>}
            </div>
          ))}
        </main>
      )}

      {open && <PostView post={open} onClose={() => setOpen(null)} code={code} likes={likes} settings={ws.settings} adminKey={adminKey} onChanged={reload} />}
    </div>
  );
}
