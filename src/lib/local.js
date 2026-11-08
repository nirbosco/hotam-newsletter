// אחסון מקומי בטוח: כל גישה עטופה, והאפליקציה עובדת גם בלעדיו
const get = (k, d = null) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } };

export const local = {
  adminKey: (code) => get(`nl:admin:${code}`),
  setAdminKey: (code, key) => set(`nl:admin:${code}`, key),
  identity: (code) => get(`nl:id:${code}`),
  setIdentity: (code, v) => set(`nl:id:${code}`, v),
  myPosts: (code) => get(`nl:mine:${code}`, {}),
  addMyPost: (code, id, key) => set(`nl:mine:${code}`, { ...get(`nl:mine:${code}`, {}), [id]: key }),
  draft: (code) => get(`nl:draft:${code}`),
  setDraft: (code, d) => set(`nl:draft:${code}`, d),
  liked: (code) => get(`nl:liked:${code}`, []),
  setLiked: (code, ids) => set(`nl:liked:${code}`, ids),
  recent: () => get('nl:recent', []),
  addRecent: (code, name, admin) => {
    const list = get('nl:recent', []).filter((r) => r.code !== code);
    set('nl:recent', [{ code, name, admin: !!admin, at: Date.now() }, ...list].slice(0, 8));
  },
};
