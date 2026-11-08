import { useRef, useState } from 'react';
import { Upload, Loader2, Trash2, Wand2 } from 'lucide-react';
import { upload, errText } from '../lib/api.js';
import { FONTS, TEMPLATES, paletteFromImage, isTooLight, resolveTheme, themeStyle, loadFonts } from '../lib/themes.js';
import TemplatePicker from './TemplatePicker.jsx';

// עורך העיצוב: תבנית, לוגו, צבעים וגופנים, עם תצוגה מקדימה חיה
export function designFromTheme(theme) {
  return {
    template: theme.key,
    primary: theme.colors.primary, accent: theme.colors.accent,
    ink: theme.colors.ink, paper: theme.colors.paper, card: theme.colors.card,
    display: theme.fonts.display, body: theme.fonts.body,
    showLogo: theme.showLogo, logoUrl: theme.logoUrl || '',
  };
}

export function designToTheme(d) {
  const colors = { primary: d.primary, accent: d.accent };
  if (d.template === 'custom') Object.assign(colors, { ink: d.ink, paper: d.paper, card: d.card, accent3: d.primary });
  return { colors, fonts: { display: d.display, body: d.body }, showLogo: d.showLogo, logoUrl: d.logoUrl || '' };
}

export default function DesignEditor({ d, set, name, subtitle, onError }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [palette, setPalette] = useState([]);
  const isCustom = d.template === 'custom';

  const pickTemplate = (k) => {
    const t = TEMPLATES[k];
    set({ template: k, primary: t.colors.primary, accent: t.colors.accent, ink: t.colors.ink, paper: t.colors.paper, card: t.colors.card,
      display: t.fonts.display, body: t.fonts.body, showLogo: !!t.brand || !!d.logoUrl });
  };

  const onLogo = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) { onError?.('אפשר להעלות לוגו בפורמט PNG, JPG או WebP'); return; }
    if (f.size > 5 * 1024 * 1024) { onError?.('הלוגו גדול מדי (עד 5MB)'); return; }
    setBusy(true);
    try {
      // הצעת צבעים מהקובץ עצמו, לפני ההעלאה
      const url = URL.createObjectURL(f);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const pal = paletteFromImage(img);
      URL.revokeObjectURL(url);
      setPalette(pal);
      const logoUrl = await upload(f);
      const patch = { logoUrl, showLogo: true };
      // בעיצוב משלכם: הצבעים מהלוגו נכנסים מיד, ואפשר לשנות
      if (pal.length) {
        const dark = pal.filter((c) => !isTooLight(c));
        if (d.template !== 'custom') Object.assign(patch, { template: 'custom', ink: TEMPLATES.custom.colors.ink, paper: TEMPLATES.custom.colors.paper, card: '#ffffff', display: d.display, body: d.body });
        patch.primary = dark[0] || pal[0];
        patch.accent = pal.find((c) => c !== patch.primary) || d.accent;
      }
      set(patch);
    } catch (err) { onError?.(errText(err)); }
    setBusy(false);
  };

  const preview = resolveTheme({ template: d.template, theme: designToTheme(d) });
  loadFonts(preview);

  return (
    <div className="design-editor">
      <TemplatePicker value={d.template} onChange={pickTemplate} />

      <div className="logo-row">
        <div className="logo-box">
          {d.logoUrl ? <img src={d.logoUrl} alt="הלוגו שהועלה" /> : <span className="muted small">אין לוגו</span>}
        </div>
        <div className="logo-actions">
          <span className="field-label">לוגו</span>
          <div className="row">
            <button type="button" className="btn btn-soft btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? <Loader2 className="spin" size={15} /> : <Upload size={15} />} {d.logoUrl ? 'החלפת לוגו' : 'העלאת לוגו'}</button>
            {d.logoUrl && <button type="button" className="btn btn-soft btn-sm danger" onClick={() => set({ logoUrl: '', showLogo: d.template === 'hotam' })}><Trash2 size={15} /> הסרה</button>}
          </div>
          <span className="muted small">PNG שקוף עובד הכי טוב. כשמעלים לוגו, הצבעים שלו נכנסים לעיצוב, ואפשר לשנות אותם.</span>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onLogo} />
      </div>

      {palette.length > 0 && (
        <div className="palette-row">
          <span className="muted small"><Wand2 size={13} /> צבעים מהלוגו (לחיצה קובעת צבע ראשי, לחיצה עם Shift קובעת צבע משני):</span>
          <div className="row">
            {palette.map((c) => <button type="button" key={c} className="swatch" style={{ background: c }} title={c} aria-label={`צבע ${c}`}
              onClick={(e) => set(e.shiftKey ? { accent: c } : { primary: c })} />)}
          </div>
        </div>
      )}

      <div className="colors-grid">
        <Color label="צבע ראשי" v={d.primary} on={(primary) => set({ primary })} />
        <Color label="צבע משני" v={d.accent} on={(accent) => set({ accent })} />
        {isCustom && <>
          <Color label="טקסט" v={d.ink} on={(ink) => set({ ink })} />
          <Color label="רקע" v={d.paper} on={(paper) => set({ paper })} />
          <Color label="כרטיסים" v={d.card} on={(card) => set({ card })} />
        </>}
      </div>
      {isTooLight(d.primary) && <span className="chip warn">הצבע הראשי בהיר מדי לכותרות. כדאי לבחור גוון כהה יותר</span>}

      <div className="row">
        <label className="field"><span>גופן כותרות</span><select value={d.display} onChange={(e) => set({ display: e.target.value })}>{FONTS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="field"><span>גופן טקסט</span><select value={d.body} onChange={(e) => set({ body: e.target.value })}>{FONTS.map((x) => <option key={x}>{x}</option>)}</select></label>
      </div>
      <label className="check"><input type="checkbox" checked={d.showLogo} onChange={(e) => set({ showLogo: e.target.checked })} /> {d.logoUrl ? 'הצגת הלוגו בניוזלטר' : 'הצגת הלוגו של חותם'}</label>

      <div className="design-preview" style={themeStyle(preview)} data-template={preview.key} aria-label="תצוגה מקדימה">
        {preview.logoSrc && <img src={preview.logoSrc} alt="" />}
        <b>{name || 'שם הניוזלטר'}</b>
        <span>{subtitle || 'מגזין שיתופי'}</span>
        <div className="dp-cards"><i /><i /><i /></div>
      </div>
    </div>
  );
}

function Color({ label, v, on }) {
  return (
    <label className="field color">
      <span>{label}</span>
      <span className="color-in"><input type="color" value={v} onChange={(e) => on(e.target.value)} /><code dir="ltr">{v}</code></span>
    </label>
  );
}
