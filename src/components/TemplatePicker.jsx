import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { TEMPLATES, TEMPLATE_ORDER, loadAllTemplateFonts } from '../lib/themes.js';

export default function TemplatePicker({ value, onChange }) {
  useEffect(() => { loadAllTemplateFonts(); }, []);
  return (
    <div className="tpl-grid" role="radiogroup" aria-label="תבנית עיצוב">
      {TEMPLATE_ORDER.map((k) => {
        const t = TEMPLATES[k];
        const on = value === k;
        return (
          <button type="button" key={k} role="radio" aria-checked={on} className={`tpl ${on ? 'on' : ''}`} onClick={() => onChange(k)}>
            <span className="tpl-swatch" style={{ background: t.colors.paper }}>
              <span className="tpl-head" style={{ color: t.colors.primary, fontFamily: `'${t.fonts.display}'`, fontWeight: t.displayWeight }}>הניוזלטר</span>
              <span className="tpl-rule" style={{ background: t.colors.ink }} />
              <span className="tpl-cards">
                <i style={{ background: t.colors.card, borderTopColor: t.colors.primary }} />
                <i style={{ background: t.colors.card, borderTopColor: t.colors.accent }} />
              </span>
            </span>
            <span className="tpl-name">{on && <Check size={14} />} {t.name}</span>
            <span className="tpl-desc">{t.desc}</span>
          </button>
        );
      })}
    </div>
  );
}
