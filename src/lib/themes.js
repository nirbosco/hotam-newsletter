// תבניות עיצוב: אחת בשפת חותם ושלוש ניטרליות
export const FONTS = ['Rubik', 'Heebo', 'Assistant', 'Frank Ruhl Libre', 'Secular One', 'Suez One', 'Varela Round', 'Alef', 'Noto Sans Hebrew', 'David Libre', 'Miriam Libre', 'Amatic SC'];

export const TEMPLATES = {
  hotam: {
    name: 'חותם',
    desc: 'כחול חותם, נקי ובוגר',
    brand: true,
    colors: { primary: '#0046ff', accent: '#23d7cd', accent2: '#0fb4f5', accent3: '#6437eb', ink: '#0a1330', paper: '#f0f0f0', card: '#ffffff' },
    fonts: { display: 'Rubik', body: 'Rubik' },
    displayWeight: 800,
  },
  classic: {
    name: 'עיתון קלאסי',
    desc: 'שחור על נייר, אות סריף',
    colors: { primary: '#1a1a1a', accent: '#b3261e', accent2: '#5c5c5c', accent3: '#1a1a1a', ink: '#1a1a1a', paper: '#f4efe4', card: '#fbf8f1' },
    fonts: { display: 'Frank Ruhl Libre', body: 'David Libre' },
    displayWeight: 900,
  },
  pop: {
    name: 'צבעוני',
    desc: 'שמח ונועז, למפגשים עם אנרגיה',
    colors: { primary: '#e8396b', accent: '#ffb627', accent2: '#2ec4b6', accent3: '#5b4de0', ink: '#22223b', paper: '#fff6e9', card: '#ffffff' },
    fonts: { display: 'Secular One', body: 'Varela Round' },
    displayWeight: 400,
  },
  minimal: {
    name: 'מינימלי',
    desc: 'לבן, שקט ומודרני',
    colors: { primary: '#111827', accent: '#10b981', accent2: '#6b7280', accent3: '#111827', ink: '#111827', paper: '#ffffff', card: '#ffffff' },
    fonts: { display: 'Assistant', body: 'Assistant' },
    displayWeight: 800,
  },
};
export const TEMPLATE_ORDER = ['hotam', 'classic', 'pop', 'minimal'];

export function resolveTheme(ws) {
  const key = TEMPLATES[ws?.template] ? ws.template : 'hotam';
  const t = TEMPLATES[key];
  const custom = ws?.theme || {};
  return {
    ...t,
    key,
    colors: { ...t.colors, ...(custom.colors || {}) },
    fonts: { ...t.fonts, ...(custom.fonts || {}) },
    showLogo: custom.showLogo ?? !!t.brand,
  };
}

export function themeStyle(theme) {
  const c = theme.colors;
  return {
    '--nl-primary': c.primary, '--nl-accent': c.accent, '--nl-accent2': c.accent2, '--nl-accent3': c.accent3,
    '--nl-ink': c.ink, '--nl-paper': c.paper, '--nl-card': c.card,
    '--nl-display': `'${theme.fonts.display}', 'Rubik', sans-serif`,
    '--nl-body': `'${theme.fonts.body}', 'Rubik', sans-serif`,
    '--nl-display-weight': theme.displayWeight || 800,
  };
}

const loaded = new Set();
export function loadFonts(theme) {
  for (const f of new Set([theme.fonts.display, theme.fonts.body])) {
    if (!f || loaded.has(f) || f === 'Rubik') continue;
    loaded.add(f);
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@400;700;900&display=swap`;
    document.head.appendChild(l);
  }
}

export function loadAllTemplateFonts() {
  TEMPLATE_ORDER.forEach((k) => loadFonts(TEMPLATES[k]));
}
