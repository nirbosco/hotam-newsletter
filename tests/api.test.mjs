// בדיקת השרת מול hotamnemi עם המפתח הציבורי בלבד, כמו שהאתר קורא לו
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const KEY = readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/VITE_SUPABASE_KEY=(.+)/)[1].trim();
const sb = createClient('https://ndrhiikczkbosentclnh.supabase.co', KEY, { auth: { persistSession: false } });
const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, args); if (error) throw new Error(error.message); return data; };
const fails = async (p, msg) => { try { await p; } catch (e) { assert.match(e.message, msg); return; } throw new Error('expected failure: ' + msg); };
const ok = (m) => console.log('✓ ' + m);

const ws = await rpc('nl_create_workspace', { p_name: 'בדיקה אוטומטית', p_subtitle: 'נא למחוק', p_template: 'hotam' });
assert.match(ws.code, /^[A-Z2-9]{6}$/); ok(`workspace created ${ws.code}`);
const C = ws.code, A = ws.admin_key;

// זמן אמת: נרשמים לערוץ לפני הכתיבה
let got = 0;
const ch = sb.channel(`nl-${C}`).on('broadcast', { event: 'changed' }, () => got++);
await new Promise((res) => ch.subscribe((s) => s === 'SUBSCRIBED' && res()));

const p = await rpc('nl_create_post', { p_code: C.toLowerCase(), p_post: { type: 'article', title: 'כתבה ראשונה', author: 'שולחן 1', content: '<p>שלום</p>' } });
assert.ok(p.id && p.edit_key); ok('post created (lowercase code accepted)');

let g = await rpc('nl_get', { p_code: C });
assert.equal(g.workspace.name, 'בדיקה אוטומטית'); assert.equal(g.posts.length, 1);
assert.equal(g.workspace.admin_key, undefined); ok('public read, no secrets exposed');

await fails(rpc('nl_create_post', { p_code: C, p_post: { type: 'article', title: '  ' } }), /title_required/); ok('empty title rejected');
await fails(rpc('nl_create_post', { p_code: C, p_post: { type: 'hack', title: 'x' } }), /check|violates/); ok('bad type rejected');
await fails(rpc('nl_create_post', { p_code: 'ZZZZZZ', p_post: { type: 'article', title: 'x' } }), /not_found/); ok('unknown code rejected');

await fails(rpc('nl_update_post', { p_code: C, p_id: p.id, p_key: 'wrong', p_post: { type: 'article', title: 'פריצה' } }), /forbidden/); ok('edit with wrong key rejected');
await rpc('nl_update_post', { p_code: C, p_id: p.id, p_key: p.edit_key, p_post: { type: 'article', title: 'כותרת מתוקנת', author: 'שולחן 1' } }); ok('author edits own post');
await rpc('nl_update_post', { p_code: C, p_id: p.id, p_key: A, p_post: { type: 'article', title: 'מנחה תיקן', author: 'שולחן 1' } }); ok('admin edits any post');

await fails(rpc('nl_admin_post_action', { p_code: C, p_key: p.edit_key, p_id: p.id, p_action: 'delete' }), /forbidden/); ok('writer cannot delete');
await fails(rpc('nl_admin_get', { p_code: C, p_key: 'admin123' }), /forbidden/); ok('admin123 does not work');
assert.equal(await rpc('nl_admin_check', { p_code: C, p_key: A }), true); ok('admin key check');

await rpc('nl_admin_post_action', { p_code: C, p_key: A, p_id: p.id, p_action: 'hide' });
g = await rpc('nl_get', { p_code: C }); assert.equal(g.posts.length, 0);
const ag = await rpc('nl_admin_get', { p_code: C, p_key: A }); assert.equal(ag.posts.length, 1); assert.equal(ag.posts[0].hidden, true);
ok('hidden post gone from screen, visible to admin');
await rpc('nl_admin_post_action', { p_code: C, p_key: A, p_id: p.id, p_action: 'unhide' });

await rpc('nl_admin_update_workspace', { p_code: C, p_key: A, p_patch: { name: 'שם חדש', settings: { ai_enabled: false }, theme: { colors: { primary: '#ff0000' } } } });
g = await rpc('nl_get', { p_code: C });
assert.equal(g.workspace.name, 'שם חדש'); assert.equal(g.workspace.settings.ai_enabled, false); assert.equal(g.workspace.settings.video_quota, 3);
ok('workspace settings merge');

// ישיר לטבלאות: חייב להיחסם
const direct = await sb.from('nl_posts').select('*').limit(1);
assert.ok(direct.error || direct.data.length === 0); ok('direct table read blocked');
const sec = await sb.from('nl_secrets').select('*').limit(1);
assert.ok(sec.error || sec.data.length === 0); ok('secrets table blocked');
await fails(rpc('nl_ai_consume', { p_code: C, p_kind: 'text' }), /permission|not find|denied/); ok('AI quota fn not callable by public');

// העלאת קובץ
const up = await sb.storage.from('nl-media').upload(`u/test/${Date.now()}.png`, new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }), { contentType: 'image/png' });
assert.ok(!up.error, up.error?.message); ok('upload to u/ allowed');
const bad = await sb.storage.from('nl-media').upload(`ai/x/${Date.now()}.png`, new Blob([new Uint8Array([1])], { type: 'image/png' }));
assert.ok(bad.error); ok('upload outside u/ blocked');

// עומס: 30 כותבים בבת אחת
const t0 = Date.now();
const res = await Promise.allSettled(Array.from({ length: 30 }, (_, i) => rpc('nl_create_post', { p_code: C, p_post: { type: 'opinion', title: `כתבה ${i + 1}`, author: `שולחן ${i + 1}`, content: '<p>' + 'מילה '.repeat(200) + '</p>' } })));
const okN = res.filter((r) => r.status === 'fulfilled').length;
g = await rpc('nl_get', { p_code: C });
assert.equal(okN, 30); assert.equal(g.posts.length, 31);
ok(`30 parallel posts in ${Date.now() - t0}ms, all 31 visible`);

await new Promise((r) => setTimeout(r, 1500));
console.log(`  realtime broadcasts received: ${got}`);
assert.ok(got > 0, 'no realtime broadcast received'); ok('realtime broadcast works');

// ניקוי: מחיקת הכתבות (הניוזלטר נשאר מסומן כבדיקה)
for (const post of (await rpc('nl_admin_get', { p_code: C, p_key: A })).posts) await rpc('nl_admin_post_action', { p_code: C, p_key: A, p_id: post.id, p_action: 'delete' });
ok('cleanup'); console.log(`\nALL PASSED · test workspace ${C}`);
await sb.removeChannel(ch); process.exit(0);
