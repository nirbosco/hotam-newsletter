import { useEffect, useState } from 'react';
import Home from './pages/Home.jsx';
import Writer from './pages/Writer.jsx';
import Screen from './pages/Screen.jsx';
import Admin from './pages/Admin.jsx';

function parse() {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  return { parts, params: new URLSearchParams(query) };
}

export function go(path) {
  window.location.hash = path;
}

export default function App() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // תמיכה בקישור בסגנון ?code=XXXXXX
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('code');
    if (c && !window.location.hash) go(`/n/${c.toUpperCase()}`);
  }, []);

  const { parts, params } = route;
  if (parts[0] === 'n' && parts[1]) {
    const code = parts[1].toUpperCase();
    if (parts[2] === 'screen') return <Screen code={code} />;
    if (parts[2] === 'admin') return <Admin code={code} params={params} />;
    return <Writer code={code} params={params} />;
  }
  return <Home />;
}
