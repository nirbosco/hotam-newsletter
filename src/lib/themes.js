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
  custom: {
    name: 'עיצוב משלכם',
    desc: 'הלוגו והצבעים שלכם',
    custom: true,
    colors: { primary: '#2b4acb', accent: '#f2a541', accent2: '#5c6b8a', accent3: '#2b4acb', ink: '#1b1f2a', paper: '#f4f5f7', card: '#ffffff' },
    fonts: { display: 'Heebo', body: 'Heebo' },
    displayWeight: 900,
  },
};
export const TEMPLATE_ORDER = ['hotam', 'classic', 'pop', 'minimal', 'custom'];

export function resolveTheme(ws) {
  const key = TEMPLATES[ws?.template] ? ws.template : 'hotam';
  const t = TEMPLATES[key];
  const custom = ws?.theme || {};
  const showLogo = custom.showLogo ?? (!!t.brand || !!custom.logoUrl);
  const logoUrl = custom.logoUrl || '';
  return {
    ...t,
    key,
    colors: { ...t.colors, ...(custom.colors || {}) },
    fonts: { ...t.fonts, ...(custom.fonts || {}) },
    showLogo,
    logoUrl,
    // לוגו שהועלה גובר על הלוגו של חותם
    logoSrc: showLogo ? (logoUrl || './hotam-logo.png') : '',
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

// הצעת צבעים מתוך לוגו: הצבעים הבולטים, בלי לבן, שחור ושקיפות
export function paletteFromImage(img, max = 5) {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const r = Math.min(size / img.width, size / img.height);
  ctx.drawImage(img, 0, 0, img.width * r, img.height * r);
  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const [R, G, B, A] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (A < 200) continue;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    if (mx > 240 && mn > 225) continue; // לבן
    if (mx < 28) continue; // שחור
    const k = `${R >> 4},${G >> 4},${B >> 4}`;
    const b = buckets.get(k) || { n: 0, r: 0, g: 0, b: 0, sat: (mx - mn) / (mx || 1) };
    b.n++; b.r += R; b.g += G; b.b += B;
    buckets.set(k, b);
  }
  const cands = [...buckets.values()].map((b) => ({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n, score: b.n * (0.4 + b.sat) }))
    .sort((a, z) => z.score - a.score);
  const out = [];
  for (const c2 of cands) {
    if (out.every((o) => Math.hypot(o.r - c2.r, o.g - c2.g, o.b - c2.b) > 70)) out.push(c2);
    if (out.length >= max) break;
  }
  return out.map((o) => '#' + [o.r, o.g, o.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''));
}

// צבע כהה מספיק לכותרות על רקע בהיר
export function isTooLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) > 200;
}
