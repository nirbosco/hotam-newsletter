import DOMPurify from 'dompurify';
import { MessageSquare, FileText, Mic, Mail, Image as ImageIcon, Video, Headphones, Grid3x3, MoreHorizontal } from 'lucide-react';

export const TYPES = {
  article:   { label: 'כתבה',          icon: FileText,      tone: 'blue' },
  opinion:   { label: 'טור דעה',       icon: MessageSquare, tone: 'purple' },
  interview: { label: 'ראיון',         icon: Mic,           tone: 'sky' },
  letters:   { label: 'מכתבים למערכת', icon: Mail,          tone: 'teal' },
  image:     { label: 'תמונה וקריקטורה', icon: ImageIcon,   tone: 'coral' },
  video:     { label: 'סרטון',         icon: Video,         tone: 'red' },
  podcast:   { label: 'פודקאסט',       icon: Headphones,    tone: 'violet' },
  crossword: { label: 'תשבץ',          icon: Grid3x3,       tone: 'ink' },
  other:     { label: 'אחר',           icon: MoreHorizontal, tone: 'orange' },
};
export const TYPE_ORDER = ['article', 'opinion', 'interview', 'letters', 'image', 'video', 'podcast', 'crossword', 'other'];

export const clean = (html) =>
  DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'img', 'a', 'figure', 'figcaption', 'hr'],
    ALLOWED_ATTR: ['src', 'alt', 'href', 'target', 'rel', 'style', 'dir'],
    ALLOWED_URI_REGEXP: /^(https?:|data:image\/)/i,
  });

export const plain = (html) => {
  const d = document.createElement('div');
  d.innerHTML = clean(html);
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
};

export function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export function timeAgo(iso) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'עכשיו';
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? 'לפני דקה' : `לפני ${m} דקות`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? 'לפני שעה' : h === 2 ? 'לפני שעתיים' : `לפני ${h} שעות`;
  return new Date(iso).toLocaleDateString('he-IL');
}

export function orderPosts(posts, order) {
  if (!order?.length) return posts;
  const idx = new Map(order.map((id, i) => [id, i]));
  // כתבות חדשות שלא סודרו עולות לראש, אחריהן הסדר של המנחה
  const unsorted = posts.filter((p) => !idx.has(p.id));
  const sorted = posts.filter((p) => idx.has(p.id)).sort((a, b) => idx.get(a.id) - idx.get(b.id));
  return [...unsorted, ...sorted];
}
