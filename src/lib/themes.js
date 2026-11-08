// תבניות עיצוב · בגל א: חותם. בגל ב נוספות תבניות ניטרליות לאותו מבנה
export const FONTS = ['Rubik', 'Heebo', 'Assistant', 'Frank Ruhl Libre', 'Secular One', 'Suez One', 'Varela Round', 'Alef', 'Noto Sans Hebrew', 'David Libre', 'Miriam Libre', 'Amatic SC'];

export const TEMPLATES = {
  hotam: {
    name: 'חותם',
    brand: true,
    colors: { primary: '#0046ff', accent: '#23d7cd', accent2: '#0fb4f5', accent3: '#6437eb', ink: '#0a1330', paper: '#f0f0f0', card: '#ffffff' },
    fonts: { display: 'Rubik', body: 'Rubik' },
    displayWeight: 800,
  },
};

export function resolveTheme(ws) {
  const t = TEMPLATES[ws?.template] || TEMPLATES.hotam;
  const custom = ws?.theme || {};
  return {
    ...t,
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
