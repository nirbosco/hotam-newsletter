// בדיקות גל ב: לייקים, תגובות, הרשאות ומכסת סרטונים
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const KEY = readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/VITE_SUPABASE_KEY=(.+)/)[1].trim();
const URL_ = 'https://ndrhiikczkbosentclnh.supabase.co';
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });
const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, args); if (error) throw new Error(error.message); return data; };
const fails = async (p, msg) => { try { await p; } catch (e) { assert.match(e.message, msg); return; } throw new Error('expected failure: ' + msg); };
const ai = async (body) => { const r = await fetch(`${URL_}/functions/v1/nl-ai`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, ...(await r.json()) }; };
const ok = (m) => console.log('✓ ' + m);

const { code: C, admin_key: A } = await rpc('nl_create_workspace', { p_name: 'בדיקת גל ב', p_subtitle: 'נא למחוק', p_template: 'classic' });
let g = await rpc('nl_get', { p_code: C });
assert.equal(g.workspace.template, 'classic'); assert.equal(g.workspace.settings.likes_enabled, true); ok('template saved, new defaults');

const { id: P } = await rpc('nl_create_post', { p_code: C, p_post: { type: 'article', title: 'כתבה', author: 'א' } });
assert.equal(await rpc('nl_like', { p_code: C, p_id: P, p_delta: 1 }), 1);
assert.equal(await rpc('nl_like', { p_code: C, p_id: P, p_delta: 1 }), 2);
assert.equal(await rpc('nl_like', { p_code: C, p_id: P, p_delta: -1 }), 1);
await Promise.all(Array.from({ length: 20 }, () => rpc('nl_like', { p_code: C, p_id: P, p_delta: 1 })));
g = await rpc('nl_get', { p_code: C }); assert.equal(g.posts[0].likes, 21); ok('likes, including 20 at once');

const { id: CM } = await rpc('nl_add_comment', { p_code: C, p_id: P, p_author: 'נועה', p_body: 'כתבה מעולה' });
await fails(rpc('nl_add_comment', { p_code: C, p_id: P, p_author: '', p_body: '   ' }), /empty_comment/);
g = await rpc('nl_get', { p_code: C }); assert.equal(g.posts[0].comments.length, 1); assert.equal(g.posts[0].comments[0].author, 'נועה'); ok('comment added and returned');

await fails(rpc('nl_admin_delete_comment', { p_code: C, p_key: 'nope', p_comment: CM }), /forbidden/); ok('writer cannot delete comment');
await rpc('nl_admin_delete_comment', { p_code: C, p_key: A, p_comment: CM });
g = await rpc('nl_get', { p_code: C }); assert.equal(g.posts[0].comments.length, 0); ok('admin deletes comment');

await rpc('nl_admin_update_workspace', { p_code: C, p_key: A, p_patch: { settings: { likes_enabled: false, comments_enabled: false } } });
await fails(rpc('nl_like', { p_code: C, p_id: P, p_delta: 1 }), /disabled/);
await fails(rpc('nl_add_comment', { p_code: C, p_id: P, p_author: '', p_body: 'x' }), /disabled/); ok('likes and comments can be turned off');

await rpc('nl_admin_post_action', { p_code: C, p_key: A, p_id: P, p_action: 'hide' });
await rpc('nl_admin_update_workspace', { p_code: C, p_key: A, p_patch: { settings: { likes_enabled: true } } });
await fails(rpc('nl_like', { p_code: C, p_id: P, p_delta: 1 }), /not_found/); ok('cannot like a hidden post');

let r = await ai({ code: C, action: 'video_start', prompt: 'בדיקה' });
assert.equal(r.error, 'video_disabled'); ok('video blocked until facilitator enables it');
await rpc('nl_admin_update_workspace', { p_code: C, p_key: A, p_patch: { settings: { video_enabled: true, video_quota: 1 } } });
r = await ai({ code: C, action: 'video_start', prompt: 'מטוס נייר עף מעל חצר בית ספר', style: 'illustration' });
assert.ok(r.id, JSON.stringify(r)); ok('video started');
const r2 = await ai({ code: C, action: 'video_start', prompt: 'עוד אחד' });
assert.equal(r2.error, 'video_quota'); ok('second video blocked by quota of 1');

const t0 = Date.now(); let done = null;
while (Date.now() - t0 < 240000) {
  await new Promise((res) => setTimeout(res, 5000));
  const c = await ai({ code: C, action: 'video_check', id: r.id });
  if (c.status === 'done') { done = c; break; }
  if (c.error) throw new Error('video failed: ' + JSON.stringify(c));
}
assert.ok(done?.url?.endsWith('.mp4'));
const head = await fetch(done.url, { method: 'HEAD' });
assert.equal(head.headers.get('content-type'), 'video/mp4');
ok(`video ready in ${Math.round((Date.now() - t0) / 1000)}s, ${Math.round(Number(head.headers.get('content-length')) / 1024)}KB → ${done.url}`);

const adm = await rpc('nl_admin_get', { p_code: C, p_key: A }); assert.equal(Number(adm.videos_used), 1); ok('admin sees videos used');

// ניקוי
await sb.rpc('nl_admin_post_action', { p_code: C, p_key: A, p_id: P, p_action: 'delete' });
console.log(`\nALL PASSED · workspace ${C} (delete via SQL)`);
process.exit(0);
