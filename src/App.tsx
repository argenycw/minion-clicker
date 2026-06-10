import { useEffect, useState } from 'react';
import { App as AdventureApp } from './games/adventure/App';
import { App as ClickerApp } from './games/clicker-rts/App';

const CLICKER_PATH = '/clicker';
const ADVENTURE_PATH = '/adventure';

export function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', CLICKER_PATH);
      setPath(CLICKER_PATH);
    }

    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (path === ADVENTURE_PATH) return <AdventureApp />;

  return <ClickerApp />;
}
