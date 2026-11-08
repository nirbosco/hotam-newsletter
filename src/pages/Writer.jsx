import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, Loader2, LogOut, Send, Sparkles, Wand2, Check, PenLine, Pencil } from 'lucide-react';
import { useNewsletter } from '../lib/useNewsletter.js';
import { api, ai, errText } from '../lib/api.js';
import { local } from '../lib/local.js';
import { TYPES, TYPE_ORDER, plain } from '../lib/content.js';
import { resolveTheme, themeStyle, loadFonts } from '../lib/themes.js';
import { Spinner, NotFound, useToast } from '../components/Common.jsx';
import RichEditor from '../components/RichEditor.jsx';
import ImageField from '../components/ImageField.jsx';
import { CrosswordEditor, crosswordReady } from '../components/Crossword.jsx';
import { LettersEditor, VideoField, AudioField } from '../components/Fields.jsx';
import { go } from '../App.jsx';
import { ParticipantGuide, HelpButton } from '../components/Guides.jsx';

const EMPTY = { type: null, title: '', subtitle: '', content: '', image: '', items: [], words: [] };

export default function Writer({ code, params }) {
  const { data, error, loading } = useNewsletter(code);
  const [identity, setIdentity] = useState(() => local.identity(code));
  const [toast, say] = useToast();

  const ws = data?.workspace;
  const theme = useMemo(() => resolveTheme(ws), [ws]);
  useEffect(() => { loadFonts(theme); }, [theme]);
  useEffect(() => { if (ws) { document.title = `${ws.name} · כתיבה`; local.addRecent(code, ws.name, !!local.adminKey(code)); } }, [ws, code]);

  if (loading && !data) return <Spinner />;
  if (error === 'not_found') return <NotFound code={code} />;
  if (!ws) return <div className="center-fill"><p>{error}</p></div>;

  const aiEnabled = ws.settings?.ai_enabled !== false;
  const editId = params.get('edit');

  return (
    <div className="writer" style={themeStyle(theme)}>
      <header className="w-top">
        <div className="w-brand">
          {theme.logoSrc && <img src={theme.logoSrc} alt="" className="w-logo" />}
          <b>{ws.name}</b>
        </div>
        <div className="w-actions">
          {identity && <span className="id-chip" title={identity.members}>{identity.group}<button onClick={() => { local.setIdentity(code, null); setIdentity(null); }} aria-label="החלפת קבוצה" title="החלפת קבוצה"><LogOut size={14} /></button></span>}
          <HelpButton who="participant" />
          <a className="btn btn-outline btn-sm" href={`#/n/${code}/screen`}><Eye size={16} /> לניוזלטר</a>
        </div>
      </header>

      {!identity ? (
        <Entry ws={ws} onDone={(v) => { local.setIdentity(code, v); setIdentity(v); }} />
      ) : (
        <Composer key={editId || 'new'} code={code} ws={ws} identity={identity} aiEnabled={aiEnabled} editId={editId} say={say} />
      )}
      {toast}
    </div>
  );
}

function Entry({ ws, onDone }) {
  const [group, setGroup] = useState('');
  const [members, setMembers] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!group.trim()) return;
    onDone({ group: group.trim(), members: members.trim() });
  };
  return (
    <form className="entry card" onSubmit={submit}>
      <h1>{ws.name}</h1>
      {ws.subtitle && <p className="muted">{ws.subtitle}</p>}
      <label className="field">
        <span>שם הקבוצה</span>
        <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="למשל: שולחן 4, צוות המדע" maxLength={80} autoFocus />
      </label>
      <label className="field">
        <span>מי בקבוצה? <em>(לא חובה)</em></span>
        <input value={members} onChange={(e) => setMembers(e.target.value)} placeholder="למשל: דנה, יוסי ומאיה" maxLength={120} />
      </label>
      <button className="btn btn-primary btn-lg" disabled={!group.trim()}>מתחילים לכתוב <ArrowLeft size={18} /></button>
      <details className="entry-guide">
        <summary>איך זה עובד?</summary>
        <ParticipantGuide compact />
      </details>
    </form>
  );
}

function authorOf(identity) {
  return identity.members ? `${identity.group} (${identity.members})` : identity.group;
}

function Composer({ code, ws, identity, aiEnabled, editId, say }) {
  const draftKey = editId ? null : code;
  const [form, setForm] = useState(() => (editId ? EMPTY : local.draft(code) || EMPTY));
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [busy, setBusy] = useState(null);
  const [titles, setTitles] = useState([]);
  const [done, setDone] = useState(null);
  const titleRef = useRef(null);
  const formRef = useRef(form);
  const set = (patch) => { const n = { ...formRef.current, ...patch }; formRef.current = n; setForm(n); };
  formRef.current = form;
  const err = (m) => say(m, 'err');

  // טעינת כתבה לעריכה
  useEffect(() => {
    if (!editId) return;
    const key = local.myPosts(code)[editId] || local.adminKey(code);
    api.getPostForEdit(code, editId, key).then((p) => {
      if (p) setForm({ type: p.type, title: p.title, subtitle: p.subtitle, content: p.content, image: p.image, items: p.items || [], words: p.crossword ? [...p.crossword.clues.across, ...p.crossword.clues.down].map((c) => ({ word: c.answer, clue: c.clue })) : [] });
    }).catch((e) => err(errText(e))).finally(() => setLoadingEdit(false));
  }, [editId, code]); // eslint-disable-line react-hooks/exhaustive-deps

  // שמירת טיוטה אוטומטית
  useEffect(() => { if (draftKey && form.type) local.setDraft(draftKey, form); }, [form, draftKey]);

  if (loadingEdit) return <Spinner />;

  if (done) {
    return (
      <div className="done card">
        <div className="done-icon"><Check size={34} /></div>
        <h2>{done.edited ? 'הכתבה עודכנה' : 'הכתבה פורסמה!'}</h2>
        <p className="muted">היא כבר מופיעה על מסך הניוזלטר.</p>
        <div className="done-actions">
          <button className="btn btn-primary btn-lg" onClick={() => { setDone(null); setForm(EMPTY); go(`/n/${code}`); }}><PenLine size={18} /> כתבה נוספת</button>
          <a className="btn btn-outline btn-lg" href={`#/n/${code}/screen`}><Eye size={18} /> צפייה בניוזלטר</a>
          <a className="btn btn-soft" href={`#/n/${code}?edit=${done.id}`}><Pencil size={16} /> תיקון הכתבה</a>
        </div>
      </div>
    );
  }

  if (!form.type) {
    return (
      <div className="picker">
        <h2>מה כותבים היום?</h2>
        <div className="type-grid">
          {TYPE_ORDER.map((t) => {
            const T = TYPES[t];
            const I = T.icon;
            return (
              <button key={t} className={`type-btn tone-${T.tone}`} onClick={() => set({ type: t })}>
                <span className="type-ico"><I size={28} /></span>
                <b>{T.label}</b>
              </button>
            );
          })}
        </div>
        <MyPosts code={code} />
      </div>
    );
  }

  const type = form.type;
  const hasText = ['article', 'opinion', 'interview', 'other', 'image'].includes(type);
  const hasImage = !['video', 'crossword'].includes(type);

  const suggestTitles = async () => {
    const text = [form.subtitle, plain(form.content), form.items.map((i) => i.text).join(' ')].join(' ').trim();
    if (text.length < 20) { err('כתבו קודם כמה משפטים, ואז נציע כותרת'); return; }
    setBusy('title');
    try { const r = await ai(code, 'headline', { text }); setTitles(r.titles); } catch (e) { err(errText(e)); }
    setBusy(null);
  };

  const improve = async () => {
    if (plain(form.content).length < 20) { err('צריך קצת יותר טקסט כדי לשפר ניסוח'); return; }
    setBusy('improve');
    try {
      const r = await ai(code, 'improve', { html: form.content });
      set({ content: r.html });
      say('הניסוח שופר. לא אהבתם? לחצו על ביטול בסרגל.');
    } catch (e) { err(errText(e)); }
    setBusy(null);
  };

  const publish = async () => {
    // רגע קצר כדי שהעורך יסיים לעבד את ההקלדה האחרונה (מקלדות בטלפון מחזיקות את המילה האחרונה עד שיוצאים מהשדה)
    document.activeElement?.blur?.();
    await new Promise((r) => setTimeout(r, 120));
    const form = formRef.current; // תמיד הגרסה העדכנית, גם בלחיצה מהירה אחרי הקלדה
    if (!form.title.trim()) { err('חסרה כותרת'); titleRef.current?.focus(); return; }
    let crossword = null;
    if (type === 'crossword') {
      crossword = crosswordReady(form.words);
      if (!crossword) { err('צריך לפחות שתי מילים שמשתלבות בתשבץ'); return; }
      delete crossword.unplaced;
    }
    if (type === 'letters' && !form.items.length) { err('הוסיפו לפחות מכתב אחד'); return; }
    if (type === 'podcast' && !form.content) { err('העלו קובץ שמע'); return; }
    if (type === 'video' && !form.content) { err('הוסיפו סרטון: קישור ליוטיוב או סרטון שיצרתם'); return; }
    if (type === 'image' && !form.image) { err('צרו או העלו תמונה'); return; }

    const post = { type, title: form.title.trim(), subtitle: form.subtitle.trim(), author: authorOf(identity), content: form.content, image: hasImage ? form.image : '', items: type === 'letters' ? form.items : [], crossword };
    setBusy('publish');
    try {
      if (editId) {
        const key = local.myPosts(code)[editId] || local.adminKey(code);
        await api.updatePost(code, editId, key, post);
        setDone({ id: editId, edited: true });
      } else {
        const r = await api.createPost(code, post);
        local.addMyPost(code, r.id, r.edit_key);
        local.setDraft(code, null);
        setDone({ id: r.id });
      }
    } catch (e) { err(errText(e)); }
    setBusy(null);
  };

  const T = TYPES[type];
  return (
    <div className="composer">
      <div className="composer-head">
        <button className="btn btn-soft" onClick={() => { if (!editId) { set({ type: null }); local.setDraft(code, null); } else go(`/n/${code}`); }}><ArrowRight size={16} /> {editId ? 'ביטול' : 'סוג אחר'}</button>
        <span className={`type-tag big tone-${T.tone}`}><T.icon size={16} /> {T.label}</span>
      </div>

      <div className="card composer-card">
        <label className="field">
          <span>כותרת</span>
          <div className="row">
            <input ref={titleRef} className="title-input" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="הכותרת של הכתבה" maxLength={200} />
            {aiEnabled && type !== 'crossword' && (
              <button type="button" className="btn btn-soft ai" onClick={suggestTitles} disabled={busy === 'title'} title="הצעת כותרת ב-AI">
                {busy === 'title' ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />} <span className="hide-sm">הצעה</span>
              </button>
            )}
          </div>
        </label>
        {titles.length > 0 && (
          <div className="title-sugg">
            {titles.map((t) => <button key={t} type="button" className="chip-btn" onClick={() => { set({ title: t }); setTitles([]); }}>{t}</button>)}
          </div>
        )}

        {!['letters', 'crossword'].includes(type) && (
          <label className="field">
            <span>כותרת משנה <em>(לא חובה)</em></span>
            <input value={form.subtitle} onChange={(e) => set({ subtitle: e.target.value })} placeholder="משפט אחד שמסביר במה מדובר" maxLength={400} />
          </label>
        )}

        {hasImage && (
          <ImageField code={code} value={form.image} onChange={(image) => set({ image })} aiEnabled={aiEnabled} onError={err}
            label={type === 'image' ? 'התמונה' : type === 'podcast' ? 'תמונת עטיפה (לא חובה)' : 'תמונה ראשית (לא חובה)'}
            defaultStyle={type === 'image' ? 'cartoon' : 'illustration'} />
        )}

        {hasText && (
          <div className="field">
            <div className="row between">
              <span className="field-label">{type === 'image' ? 'כיתוב לתמונה (לא חובה)' : type === 'interview' ? 'הראיון' : 'הטקסט'}</span>
              {aiEnabled && (
                <button type="button" className="btn btn-soft ai btn-sm" onClick={improve} disabled={busy === 'improve' || !form.content}>
                  {busy === 'improve' ? <Loader2 className="spin" size={15} /> : <Wand2 size={15} />} שיפור ניסוח
                </button>
              )}
            </div>
            <RichEditor value={form.content} onChange={(content) => set({ content })} onError={err}
              placeholder={type === 'interview' ? 'שאלה מודגשת, ואחריה התשובה…' : type === 'opinion' ? 'מה דעתכם? כתבו בגוף ראשון…' : 'כתבו כאן…'} />
          </div>
        )}

        {type === 'letters' && <LettersEditor items={form.items} setItems={(items) => set({ items })} onError={err} />}
        {type === 'video' && <VideoField value={form.content} onChange={(content) => set({ content })} code={code} videoEnabled={aiEnabled && !!ws.settings?.video_enabled} onError={err} />}
        {type === 'podcast' && <AudioField value={form.content} onChange={(content) => set({ content })} onError={err} />}
        {type === 'crossword' && <CrosswordEditor code={code} words={form.words} setWords={(words) => set({ words })} aiEnabled={aiEnabled} onError={err} />}
      </div>

      <div className="publish-bar">
        <span className="muted small hide-sm">{editId ? 'עריכת כתבה קיימת' : 'הטיוטה נשמרת במכשיר'}</span>
        <button className="btn btn-primary btn-lg" onClick={publish} disabled={busy === 'publish'}>
          {busy === 'publish' ? <Loader2 className="spin" size={20} /> : <Send size={18} />} {editId ? 'שמירת השינויים' : 'פרסום בניוזלטר'}
        </button>
      </div>
    </div>
  );
}

function MyPosts({ code }) {
  const ids = Object.keys(local.myPosts(code));
  if (!ids.length) return null;
  return <p className="muted small center">פרסמתם {ids.length === 1 ? 'כתבה אחת' : `${ids.length} כתבות`}. אפשר לתקן אותן מהניוזלטר.</p>;
}
