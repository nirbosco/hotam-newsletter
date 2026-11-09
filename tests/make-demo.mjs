// ניוזלטר הדגמה לצילום סרטון ההסבר
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const KEY = readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/VITE_SUPABASE_KEY=(.+)/)[1].trim();
const URL_ = 'https://ndrhiikczkbosentclnh.supabase.co';
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });
const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, args); if (error) throw new Error(fn + ': ' + error.message); return data; };
const ai = async (body) => { const r = await fetch(`${URL_}/functions/v1/nl-ai`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json(); if (!r.ok) throw new Error(JSON.stringify(d)); return d; };
const { buildCrossword } = await import('../src/lib/crossword.js');

const { code: C, admin_key: A } = await rpc('nl_create_workspace', { p_name: 'קול שכבה ח׳', p_subtitle: 'מגזין שיתופי', p_template: 'hotam' });
console.log('workspace', C);

const [img1, img2] = await Promise.all([
  ai({ code: C, action: 'image', prompt: 'תלמידי חטיבת ביניים שותלים עגבניות ונענע בגינה של בית הספר, אור בוקר רך', style: 'illustration' }),
  ai({ code: C, action: 'image', prompt: 'מחשב נייד עייף עם עיניים חצי סגורות מסרב לקום בבוקר, ותלמיד מנסה להעיר אותו', style: 'cartoon' }),
]);
const cwWords = (await ai({ code: C, action: 'crossword', topic: 'החיים בבית הספר', count: 8 })).words;
const cwFull = buildCrossword(cwWords);
const placed = new Set([...cwFull.clues.across, ...cwFull.clues.down].map((x) => x.answer));
const crossword = buildCrossword(cwWords.filter((w) => placed.has(w.word)).slice(0, 9));
delete crossword.unplaced;

const posts = [
  { type: 'crossword', title: 'תשבץ החיים בבית הספר', author: 'צוות החידות', crossword },
  { type: 'video', title: 'מטוס הנייר של ח׳1', subtitle: 'סרטון קצר שיצרנו עם ה-AI', author: 'ח׳1 (עומר ושירה)', content: 'https://ndrhiikczkbosentclnh.supabase.co/storage/v1/object/public/nl-media/ai/ee47d65f-e16b-4463-8243-3c3d93b59774/xM0RHZkc3a2RVUDItanRvQTg.mp4' },
  { type: 'image', title: 'המחשב שלא רצה לקום בבוקר', author: 'שולחן 5 (גל ויובל)', image: img2.url, content: '<p>קריקטורה על כל בוקר של שיעור מחשבים.</p>' },
  { type: 'letters', title: 'מכתבים למערכת', author: 'קוראים', items: [{ name: 'רוני', text: 'אפשר בבקשה מקרר מים גם בקומה השנייה? בקיץ זה ממש חסר.' }, { name: 'תמר', text: 'תודה לצוות הספרייה על פינת הקריאה החדשה. זה המקום הכי שקט בבית הספר.' }] },
  { type: 'interview', title: 'חמש שאלות לאב הבית', subtitle: 'יוסי עובד בבית הספר כבר 18 שנה', author: 'צוות הראיונות', content: '<p><strong>מה הדבר הראשון שאתה עושה בבוקר?</strong></p><p>פותח את השערים ובודק שהמזגנים עובדים. בשש וחצי אני כבר כאן.</p><p><strong>מה הכי מצחיק שמצאת בבית הספר?</strong></p><p>פעם מצאתי תרנגולת בחדר המורים. עד היום אף אחד לא הודה.</p>' },
  { type: 'opinion', title: 'צריך להאריך את ההפסקה הגדולה', author: 'שולחן 3 (דני ורוני)', content: '<p>עשרים דקות זה לא מספיק כדי לאכול, לשחק ולנשום. כשההפסקה קצרה, חוזרים לשיעור עייפים ועצבניים. אנחנו מציעים להוסיף עשר דקות ולסיים את היום רבע שעה אחר כך.</p>' },
  { type: 'article', title: 'הגינה החדשה פתוחה', subtitle: 'תלמידי ח׳2 שתלו עגבניות, נענע ובזיליקום מאחורי אולם הספורט', author: 'ח׳2 (נועה, איתי ומאיה)', image: img1.url, content: '<p>אחרי חודשיים של עבודה, הגינה מאחורי אולם הספורט מוכנה. כל כיתה קיבלה ערוגה, ובהפסקות אפשר להשקות ולקטוף.</p><p>המורה למדעים מבטיחה שבחנוכה נכין סלט מהירקות שגידלנו.</p>' },
];
const ids = [];
for (const p of posts) { const r = await rpc('nl_create_post', { p_code: C, p_post: p }); ids.push(r.id); await new Promise((res) => setTimeout(res, 400)); }
// לייקים ותגובות
for (const [i, n] of [[6, 14], [5, 9], [2, 11], [1, 6]]) for (let k = 0; k < n; k++) await rpc('nl_like', { p_code: C, p_id: ids[i], p_delta: 1 });
await rpc('nl_add_comment', { p_code: C, p_id: ids[6], p_author: 'שולחן 3', p_body: 'נראה מדהים! מתי אפשר לבוא להשקות?' });
await rpc('nl_add_comment', { p_code: C, p_id: ids[6], p_author: 'מאיה', p_body: 'כל יום בהפסקה הגדולה' });
await rpc('nl_admin_update_workspace', { p_code: C, p_key: A, p_patch: { settings: { video_enabled: true } } });
writeFileSync(new URL('../.demo.json', import.meta.url), JSON.stringify({ code: C, admin_key: A }));
console.log('done', C);
process.exit(0);
