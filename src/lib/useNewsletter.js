import { useCallback, useEffect, useRef, useState } from 'react';
import { api, watch, errText } from './api.js';

// טעינת ניוזלטר + האזנה לשינויים. admin=key טוען גם כתבות מוסתרות
export function useNewsletter(code, adminKey = null) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const inflight = useRef(false);
  const again = useRef(false);

  const load = useCallback(async () => {
    if (inflight.current) { again.current = true; return; }
    inflight.current = true;
    try {
      const r = adminKey ? await api.adminGet(code, adminKey) : await api.get(code);
      if (!r) setError('not_found');
      else { setData(r); setError(''); }
    } catch (e) {
      setError(String(e.message || e).includes('forbidden') ? 'forbidden' : errText(e));
    } finally {
      inflight.current = false;
      setLoading(false);
      if (again.current) { again.current = false; load(); }
    }
  }, [code, adminKey]);

  useEffect(() => {
    load();
    return watch(code, load);
  }, [code, load]);

  return { data, error, loading, reload: load, setData };
}
