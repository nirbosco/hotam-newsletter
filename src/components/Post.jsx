import { Play, Quote } from 'lucide-react';
import { TYPES, clean, plain, youtubeId, timeAgo } from '../lib/content.js';
import { CrosswordPlay } from './Crossword.jsx';
import { Modal } from './Common.jsx';

export function TypeTag({ type }) {
  const t = TYPES[type] || TYPES.other;
  const I = t.icon;
  return <span className={`type-tag tone-${t.tone}`}><I size={14} /> {t.label}</span>;
}

export function PostCard({ post, onOpen, fresh }) {
  const yt = post.type === 'video' ? youtubeId(post.content) : null;
  const cover = post.image || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '');
  const excerpt = ['article', 'opinion', 'interview', 'other', 'image'].includes(post.type) ? plain(post.content).slice(0, 220) : '';
  const t = TYPES[post.type] || TYPES.other;
  return (
    <article className={`post-card tone-${t.tone} ${fresh ? 'fresh' : ''} ${post.type === 'opinion' ? 'is-opinion' : ''}`} onClick={() => onOpen(post)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(post)}>
      {cover && (
        <div className="post-cover">
          <img src={cover} alt="" loading="lazy" />
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
          <span>{timeAgo(post.created_at)}</span>
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

export function PostView({ post, onClose }) {
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
      </article>
    </Modal>
  );
}
