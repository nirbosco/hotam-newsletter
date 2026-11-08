// מחולל תשבץ עברי · נכתב מחדש
// רשת: grid[r][c], עמודה 0 היא הימנית ביותר (מאוזן נקרא מימין לשמאל, כלומר c עולה)

const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
export const normalizeLetter = (ch) => FINALS[ch] || ch;
export const normalizeWord = (w) =>
  String(w || '')
    .replace(/[֑-ׇ]/g, '') // ניקוד וטעמים
    .replace(/["'׳״\s-]/g, '')
    .split('')
    .map(normalizeLetter)
    .join('');

export const isValidWord = (w) => /^[א-ת]{2,14}$/.test(normalizeWord(w));

function tryBuild(words, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placed = [];
  const inB = (r, c) => r >= 0 && c >= 0 && r < size && c < size;
  const get = (r, c) => (inB(r, c) ? grid[r][c] : null);

  const canPlace = (w, r, c, dir) => {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    const er = r + dr * (w.length - 1);
    const ec = c + dc * (w.length - 1);
    if (!inB(r, c) || !inB(er, ec)) return -1;
    // התא לפני ההתחלה ואחרי הסוף חייבים להיות ריקים
    if (get(r - dr, c - dc) || get(er + dr, ec + dc)) return -1;
    let crossings = 0;
    for (let i = 0; i < w.length; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      const cur = grid[rr][cc];
      if (cur) {
        if (cur !== w[i]) return -1;
        crossings++;
      } else {
        // תא חדש: השכנים בניצב חייבים להיות ריקים, אחרת נוצרת מילה מקרית
        if (dir === 'across') {
          if (get(rr - 1, cc) || get(rr + 1, cc)) return -1;
        } else if (get(rr, cc - 1) || get(rr, cc + 1)) return -1;
      }
    }
    if (crossings === w.length) return -1; // כולה חופפת למילה קיימת
    return crossings;
  };

  const put = (item, r, c, dir) => {
    const w = item.norm;
    for (let i = 0; i < w.length; i++) {
      const rr = r + (dir === 'down' ? i : 0), cc = c + (dir === 'across' ? i : 0);
      grid[rr][cc] = w[i];
    }
    placed.push({ ...item, row: r, col: c, dir });
  };

  let unplaced = [];
  const placeOne = (item) => {
    const w = item.norm;
    let best = null;
    for (const p of placed) {
      for (let i = 0; i < p.norm.length; i++) {
        const pr = p.row + (p.dir === 'down' ? i : 0);
        const pc = p.col + (p.dir === 'across' ? i : 0);
        for (let j = 0; j < w.length; j++) {
          if (w[j] !== p.norm[i]) continue;
          const dir = p.dir === 'across' ? 'down' : 'across';
          const r = dir === 'down' ? pr - j : pr;
          const c = dir === 'across' ? pc - j : pc;
          const x = canPlace(w, r, c, dir);
          if (x > 0) {
            // ציון: יותר הצלבות, וקרוב למרכז
            const mid = size / 2;
            const score = x * 10 - (Math.abs(r - mid) + Math.abs(c - mid)) * 0.1;
            if (!best || score > best.score) best = { r, c, dir, score };
          }
        }
      }
    }
    if (best) { put(item, best.r, best.c, best.dir); return true; }
    return false;
  };
  words.forEach((item, idx) => {
    if (idx === 0) { const w = item.norm; put(item, Math.floor(size / 2), Math.floor((size - w.length) / 2), 'across'); return; }
    if (!placeOne(item)) unplaced.push(item);
  });
  // מילים שלא נכנסו מקבלות עוד סבבים, כי מילים שנוספו אחריהן פותחות הצלבות חדשות
  let progress = true;
  while (progress && unplaced.length) {
    progress = false;
    unplaced = unplaced.filter((item) => { const ok = placeOne(item); if (ok) progress = true; return !ok; });
  }
  return { grid, placed, unplaced };
}

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// קלט: [{word, clue}] · פלט: { rows, cols, cells, clues: {across, down}, unplaced }
export function buildCrossword(input, { tries = 200, seed = 7 } = {}) {
  const seen = new Set();
  const words = input
    .map((w) => ({ word: String(w.word || '').trim(), clue: String(w.clue || '').trim(), norm: normalizeWord(w.word) }))
    .filter((w) => isValidWord(w.word) && w.clue && !seen.has(w.norm) && seen.add(w.norm));
  if (!words.length) return null;
  const size = Math.max(15, Math.max(...words.map((w) => w.norm.length)) + 4);
  const rnd = mulberry(seed);
  let best = null;
  for (let t = 0; t < tries; t++) {
    // ניסיון ראשון: מהארוכה לקצרה, אחר כך סדרים אקראיים עם עדיפות לארוכות
    const order = t === 0 ? [...words].sort((a, b) => b.norm.length - a.norm.length)
      : words.map((w) => ({ w, k: w.norm.length + rnd() * 4 })).sort((a, b) => b.k - a.k).map((x) => x.w);
    const res = tryBuild(order, size);
    const area = bounds(res.placed);
    const score = res.placed.length * 1000 - area.h * area.w;
    if (!best || score > best.score) best = { ...res, score };
    if (best.unplaced.length === 0 && t > 30) break;
  }
  return compact(best);
}

function bounds(placed) {
  let r0 = Infinity, r1 = -1, c0 = Infinity, c1 = -1;
  for (const p of placed) {
    const er = p.row + (p.dir === 'down' ? p.norm.length - 1 : 0);
    const ec = p.col + (p.dir === 'across' ? p.norm.length - 1 : 0);
    r0 = Math.min(r0, p.row); r1 = Math.max(r1, er);
    c0 = Math.min(c0, p.col); c1 = Math.max(c1, ec);
  }
  return { r0, c0, h: r1 - r0 + 1, w: c1 - c0 + 1 };
}

function compact({ placed, unplaced }) {
  const b = bounds(placed);
  const rows = b.h, cols = b.w;
  const cells = Array.from({ length: rows }, () => Array(cols).fill(null));
  const startNums = {};
  const starts = placed
    .map((p) => ({ ...p, row: p.row - b.r0, col: p.col - b.c0 }))
    .sort((a, z) => a.row - z.row || a.col - z.col);
  let n = 0;
  for (const p of starts) {
    const k = `${p.row},${p.col}`;
    if (!startNums[k]) startNums[k] = ++n;
    p.number = startNums[k];
    for (let i = 0; i < p.norm.length; i++) {
      const r = p.row + (p.dir === 'down' ? i : 0), c = p.col + (p.dir === 'across' ? i : 0);
      cells[r][c] = { letter: p.norm[i], number: null };
    }
  }
  for (const [k, num] of Object.entries(startNums)) {
    const [r, c] = k.split(',').map(Number);
    cells[r][c].number = num;
  }
  const clue = (p) => ({ number: p.number, clue: p.clue, answer: p.word, row: p.row, col: p.col, length: p.norm.length });
  return {
    rows, cols, cells,
    clues: {
      across: starts.filter((p) => p.dir === 'across').map(clue).sort((a, z) => a.number - z.number),
      down: starts.filter((p) => p.dir === 'down').map(clue).sort((a, z) => a.number - z.number),
    },
    unplaced: unplaced.map((u) => u.word),
  };
}
