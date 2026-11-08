import { useEffect, useMemo } from 'react';
import { Printer, ArrowRight } from 'lucide-react';
import { useNewsletter } from '../lib/useNewsletter.js';
import { local } from '../lib/local.js';
import { orderPosts, clean, youtubeId } from '../lib/content.js';
import { resolveTheme, themeStyle, loadFonts } from '../lib/themes.js';
import { Spinner, NotFound, QR } from '../components/Common.jsx';
import { TypeTag } from '../components/Post.jsx';

// גרסה להדפסה: כל הכתבות פתוחות. "שמירה כ-PDF" מתוך חלון ההדפסה של הדפדפן
export default function Print({ code }) {
  const { data, error, loading } = useNewsletter(code);
  const ws = data?.workspace;
  const theme = useMemo(() => resolveTheme(ws), [ws]);
  useEffect(() => { loadFonts(theme); }, [theme]);
  useEffect(() => { if (ws) document.title = `${ws.name} · ${new Date().toLocaleDateString('he-IL')}`; }, [ws]);

  if (loading && !data) return <Spinner />;
  if (error === 'not_found') return <NotFound code={code} />;
  if (!ws) return <div className="center-fill"><p>{error}</p></div>;

  const posts = orderPosts(data.posts, ws.post_order);
  const date = new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  const back = local.adminKey(code) ? `#/n/${code}/admin` : `#/n/${code}/screen`;

  return (
    <div className="print-page" data-template={theme.key} style={themeStyle(theme)}>
      <div className="print-bar no-print">
        <a className="btn btn-soft" href={back}><ArrowRight size={16} /> חזרה</a>
        <div className="row">
          <span className="muted small">בחלון ההדפסה בחרו "שמירה כ-PDF"</span>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> הדפסה או שמירה כ-PDF</button>
        </div>
      </div>

      <header className="print-mast">
        {theme.showLogo && <img src="./hotam-logo.png" alt="חותם" />}
        <h1>{ws.name}</h1>
        <p>{ws.subtitle} · {date} · {posts.length} כתבות</p>
      </header>

      {posts.map((p) => {
        const yt = p.type === 'video' ? youtubeId(p.content) : null;
        return (
          <article className={`print-post ${p.type === 'crossword' ? 'full' : ''}`} key={p.id}>
            <TypeTag type={p.type} />
            <h2>{p.title}</h2>
            {p.subtitle && <p className="pp-sub">{p.subtitle}</p>}
            <p className="pp-author">{p.author}</p>
            {p.image && <img className="pp-img" src={p.image} alt="" />}
            {['article', 'opinion', 'interview', 'other', 'image'].includes(p.type) && p.content && <div className="rich-content" dangerouslySetInnerHTML={{ __html: clean(p.content) }} />}
            {p.type === 'letters' && (p.items || []).map((l, i) => <blockquote key={i} className="letter"><p>{l.text}</p><cite>{l.name || 'אנונימי'}</cite></blockquote>)}
            {p.type === 'video' && (
              <div className="pp-media">
                {yt && <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" />}
                <div><QR text={p.content} size={96} /><span className="muted small">סרקו לצפייה בסרטון</span></div>
              </div>
            )}
            {p.type === 'podcast' && p.content && <div className="pp-media"><div><QR text={p.content} size={96} /><span className="muted small">סרקו להאזנה</span></div></div>}
            {p.type === 'crossword' && p.crossword && <PrintCrossword data={p.crossword} />}
            {p.comments?.length > 0 && ws.settings?.comments_enabled !== false && (
              <div className="pp-comments"><b>תגובות:</b> {p.comments.map((c) => `${c.author || 'אנונימי'}: ${c.body}`).join(' · ')}</div>
            )}
          </article>
        );
      })}
      <footer className="print-foot">נוצר בניוזלטר השיתופי · {code}</footer>
    </div>
  );
}

function PrintCrossword({ data }) {
  return (
    <div className="pp-cw">
      <div className="cw-grid" style={{ gridTemplateColumns: `repeat(${data.cols}, 1fr)`, maxWidth: data.cols * 34 }} dir="rtl">
        {data.cells.flatMap((row, r) => row.map((cell, c) => (
          <div key={`${r}-${c}`} className={cell ? 'cw-cell' : 'cw-cell empty'}>{cell?.number && <span className="cw-num">{cell.number}</span>}</div>
        )))}
      </div>
      <div className="cw-clues">
        {[['across', 'מאוזן'], ['down', 'מאונך']].map(([d, l]) => data.clues[d].length > 0 && (
          <div key={d}><h4>{l}</h4><ol>{data.clues[d].map((cl) => <li key={cl.number}><b>{cl.number}.</b> {cl.clue} ({cl.length})</li>)}</ol></div>
        ))}
      </div>
    </div>
  );
}
