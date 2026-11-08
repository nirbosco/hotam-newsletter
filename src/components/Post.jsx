import { useState } from 'react';
import { Play, Quote, Heart, MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import { api, errText } from '../lib/api.js';
import { local } from '../lib/local.js';
import { TYPES, clean, plain, youtubeId, timeAgo } from '../lib/content.js';
import { CrosswordPlay } from './Crossword.jsx';
import { Modal } from './Common.jsx';

export function TypeTag({ type }) {
  const t = TYPES[type] || TYPES.other;
  const I = t.icon;
  return <span className={`type-tag tone-${t.tone}`}><I size={14} /> {t.label}</span>;
}

export function useLikes(code) {
  const [liked, setLiked] = useState(() => new Set(local.liked(code)));
  const [delta, setDelta] = useState({});
  const toggle = async (post) => {
    const on = !liked.has(post.id);
    const next = new Set(liked); on ? next.add(post.id) : next.delete(post.id);
    setLiked(next); local.setLiked(code, [...next]);
    setDelta((d) => ({ ...d, [post.id]: (d[post.id] || 0) + (on ? 1 : -1) }));
    try { await api.like(code, post.id, on ? 1 : -1); } catch { /* הסקר הבא יתקן */ }
    setTimeout(() => setDelta((d) => ({ ...d, [post.id]: 0 })), 4000);
  };
  return { liked, toggle, count: (p) => Math.max(0, (p.likes || 0) + (delta[p.id] || 0)) };
}

const isMp4 = (u) => /\.(mp4|webm)(\?|$)/i.test(u || '');

export function PostCard({ post, onOpen, fresh, likes, settings }) {
  const yt = post.type === 'video' ? youtubeId(post.content) : null;
  const mp4 = post.type === 'video' && isMp4(post.content);
  const cover = post.image || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '');
  const excerpt = ['article', 'opinion', 'interview', 'other', 'image'].includes(post.type) ? plain(post.content).slice(0, 220) : '';
  const t = TYPES[post.type] || TYPES.other;
  return (
    <article className={`post-card tone-${t.tone} ${fresh ? 'fresh' : ''} ${post.type === 'opinion' ? 'is-opinion' : ''}`} onClick={() => onOpen(post)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(post)}>
      {(cover || mp4) && (
        <div className="post-cover">
          {cover ? <img src={cover} alt="" loading="lazy" /> : <video src={`${post.content}#t=0.5`} muted playsInline preload="metadata" />}
          {post.type === 'video' && <span className="play-badge"><Play size={26} fill="currentColor" /></span>}
        </div>
      )}
      <div className="post-body">
        <TypeTag type={post.type} />
        <h3 className="post-title">{post.type === 'opinion' && <Quote size={20} className="q-mark" />}{post.title}</h3>
        {post.subtitle && <p className="post-sub">{post.subtitle}</p>}
        {excerpt && <p className="post-excerpt">{excerpt}{excerpt.length >= 220 ? '…' : ''}</p>}
        {post.type === 'letters' && post.items?.length > 0 && (
          <p className="post-excerpt">״{post.items[0].text?.slice(0, 140)}״ <span className="muted">· {post.items.length} מכתבים</span></p>
        )}
        {post.type === 'crossword' && post.crossword && <MiniGrid data={post.crossword} />}
        <footer className="post-meta">
          <span className="post-author">{post.author}</span>
          <span className="meta-right">
            {settings?.comments_enabled !== false && post.comments?.length > 0 && <span className="meta-ico"><MessageCircle size={14} /> {post.comments.length}</span>}
            {likes && settings?.likes_enabled !== false && (
              <button className={`like-btn ${likes.liked.has(post.id) ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); likes.toggle(post); }} aria-label="לייק" aria-pressed={likes.liked.has(post.id)}>
                <Heart size={15} fill={likes.liked.has(post.id) ? 'currentColor' : 'none'} /> {likes.count(post) || ''}
              </button>
            )}
            <span>{timeAgo(post.created_at)}</span>
          </span>
        </footer>
      </div>
    </article>
  );
}

function MiniGrid({ data }) {
  return (
    <div className="cw-grid mini" style={{ gridTemplateColumns: `repeat(${data.cols}, 1fr)` }} dir="rtl" aria-hidden>
      {data.cells.flatMap((row, r) => row.map((cell, c) => <div key={`${r}-${c}`} className={cell ? 'cw-cell' : 'cw-cell empty'} />))}
    </div>
  );
}

export function PostView({ post, onClose, code, likes, settings, adminKey, onChanged }) {
  const yt = post.type === 'video' ? youtubeId(post.content) : null;
  return (
    <Modal onClose={onClose} wide label={post.title}>
      <article className="post-view">
        <TypeTag type={post.type} />
        <h1>{post.title}</h1>
        {post.subtitle && <p className="pv-sub">{post.subtitle}</p>}
        <p className="pv-author">{post.author}</p>

        {post.type === 'video' && (yt ? (
          <div className="video-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title={post.title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
        ) : post.content?.match(/\.(mp4|webm)(\?|$)/i) ? (
          <video src={post.content} controls className="pv-video" />
        ) : null)}

        {post.image && post.type !== 'video' && <img className="pv-cover" src={post.image} alt="" />}

        {post.type === 'podcast' && post.content && (
          <audio controls src={post.content} className="pv-audio" preload="metadata">הדפדפן לא תומך בנגן שמע</audio>
        )}

        {['article', 'opinion', 'interview', 'other', 'image'].includes(post.type) && post.content && (
          <div className="rich-content pv-text" dangerouslySetInnerHTML={{ __html: clean(post.content) }} />
        )}

        {post.type === 'letters' && (
          <div className="letters">
            {(post.items || []).map((l, i) => (
              <blockquote key={i} className="letter"><p>{l.text}</p><cite>{l.name || 'אנונימי'}</cite></blockquote>
            ))}
          </div>
        )}

        {post.type === 'crossword' && post.crossword && <CrosswordPlay data={post.crossword} />}

        {code && (settings?.likes_enabled !== false || settings?.comments_enabled !== false) && (
          <Discussion post={post} code={code} likes={likes} settings={settings} adminKey={adminKey} onChanged={onChanged} />
        )}
      </article>
    </Modal>
  );
}

function Discussion({ post, code, likes, settings, adminKey, onChanged }) {
  const me = local.identity(code);
  const [author, setAuthor] = useState(me?.group || '');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true); setErr('');
    try { await api.comment(code, post.id, author.trim(), body.trim()); setBody(''); onChanged?.(); }
    catch (e2) { setErr(errText(e2)); }
    setBusy(false);
  };
  const del = async (id) => {
    if (!window.confirm('למחוק את התגובה?')) return;
    try { await api.adminDeleteComment(code, adminKey, id); onChanged?.(); } catch (e2) { setErr(errText(e2)); }
  };
  return (
    <section className="discussion">
      {likes && settings?.likes_enabled !== false && (
        <button className={`like-big ${likes.liked.has(post.id) ? 'on' : ''}`} onClick={() => likes.toggle(post)} aria-pressed={likes.liked.has(post.id)}>
          <Heart size={20} fill={likes.liked.has(post.id) ? 'currentColor' : 'none'} /> {likes.liked.has(post.id) ? 'אהבתם' : 'אהבתי'} {likes.count(post) > 0 && <b>{likes.count(post)}</b>}
        </button>
      )}
      {settings?.comments_enabled !== false && (
        <>
          <h3>תגובות {post.comments?.length ? `(${post.comments.length})` : ''}</h3>
          <ul className="comments">
            {(post.comments || []).map((c) => (
              <li key={c.id}>
                <div><b>{c.author || 'אנונימי'}</b> <span className="muted small">{timeAgo(c.created_at)}</span></div>
                <p>{c.body}</p>
                {adminKey && <button className="icon-btn danger" onClick={() => del(c.id)} aria-label="מחיקת תגובה" title="מחיקת תגובה"><Trash2 size={15} /></button>}
              </li>
            ))}
          </ul>
          <form className="comment-form" onSubmit={send}>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="שם (לא חובה)" maxLength={80} />
            <div className="row">
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="מה דעתכם?" maxLength={500} />
              <button className="btn btn-primary" disabled={busy || !body.trim()}>{busy ? <Loader2 className="spin" size={16} /> : <Send size={16} />} שליחה</button>
            </div>
            {err && <div className="toast-err">{err}</div>}
          </form>
        </>
      )}
    </section>
  );
}
