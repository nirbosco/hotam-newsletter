import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://ndrhiikczkbosentclnh.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const ERRORS = {
  not_found: 'לא מצאנו ניוזלטר עם הקוד הזה',
  forbidden: 'אין הרשאה לפעולה הזאת',
  title_required: 'חסרה כותרת',
  too_many_posts: 'הניוזלטר הגיע למספר הכתבות המרבי',
  invalid_name: 'צריך לתת שם לניוזלטר',
  quota: 'הגעתם למכסת ה-AI היומית של הניוזלטר',
  disabled: 'המנחה כיבה את כלי ה-AI בניוזלטר הזה',
  blocked: 'ה-AI סירב לבקשה הזאת. נסו לנסח אחרת',
  not_configured: 'כלי ה-AI עוד לא הופעלו בשרת',
  ai_unavailable: 'כלי ה-AI לא זמינים כרגע. אפשר להמשיך לכתוב ולהעלות תמונה מהמכשיר',
  ai_failed: 'ה-AI לא הצליח הפעם. נסו שוב',
  not_enough_words: 'לא הצלחנו ליצור מספיק מילים. נסו נושא אחר',
  video_disabled: 'המנחה לא הפעיל יצירת סרטונים בניוזלטר הזה',
  video_quota: 'נגמרה מכסת הסרטונים של הניוזלטר',
  empty_comment: 'התגובה ריקה',
  too_many_comments: 'יש כבר יותר מדי תגובות לכתבה הזאת',
};

export function errText(e) {
  const m = String(e?.message || e || '');
  for (const k of Object.keys(ERRORS)) if (m.includes(k)) return ERRORS[k];
  if (/fetch|network|Failed/i.test(m)) return 'בעיית חיבור לאינטרנט. נסו שוב';
  return 'משהו השתבש. נסו שוב';
}

async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export const api = {
  createWorkspace: (name, subtitle, template) => rpc('nl_create_workspace', { p_name: name, p_subtitle: subtitle, p_template: template }),
  get: (code) => rpc('nl_get', { p_code: code }),
  createPost: (code, post) => rpc('nl_create_post', { p_code: code, p_post: post }),
  updatePost: (code, id, key, post) => rpc('nl_update_post', { p_code: code, p_id: id, p_key: key, p_post: post }),
  getPostForEdit: (code, id, key) => rpc('nl_get_post_for_edit', { p_code: code, p_id: id, p_key: key }),
  adminCheck: (code, key) => rpc('nl_admin_check', { p_code: code, p_key: key }),
  adminGet: (code, key) => rpc('nl_admin_get', { p_code: code, p_key: key }),
  adminUpdate: (code, key, patch) => rpc('nl_admin_update_workspace', { p_code: code, p_key: key, p_patch: patch }),
  adminPost: (code, key, id, action) => rpc('nl_admin_post_action', { p_code: code, p_key: key, p_id: id, p_action: action }),
  like: (code, id, delta) => rpc('nl_like', { p_code: code, p_id: id, p_delta: delta }),
  comment: (code, id, author, body) => rpc('nl_add_comment', { p_code: code, p_id: id, p_author: author, p_body: body }),
  adminDeleteComment: (code, key, id) => rpc('nl_admin_delete_comment', { p_code: code, p_key: key, p_comment: id }),
};

export async function ai(code, action, payload) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/nl-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ code, action, ...payload }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `http_${r.status}`);
  return data;
}

export async function upload(file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  const path = `u/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('nl-media').upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(error.message);
  return sb.storage.from('nl-media').getPublicUrl(path).data.publicUrl;
}

// זמן אמת: שידור מהשרת לערוץ של הניוזלטר, ועוד סקר גיבוי כל 20 שניות
export function watch(code, onChange) {
  const ch = sb.channel(`nl-${code}`).on('broadcast', { event: 'changed' }, () => onChange()).subscribe();
  const t = setInterval(onChange, 20000);
  const vis = () => document.visibilityState === 'visible' && onChange();
  document.addEventListener('visibilitychange', vis);
  return () => { sb.removeChannel(ch); clearInterval(t); document.removeEventListener('visibilitychange', vis); };
}
