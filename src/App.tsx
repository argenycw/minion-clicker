import { useEffect, useState } from 'react';
import { App as AdventureApp } from './games/adventure/App';
import { App as ClickerApp } from './games/clicker-rts/App';
import { HomePage } from './HomePage';
import { preloadSpriteSheets } from './shared/sprites';

const CLICKER_PATH = '/clicker';
const ADVENTURE_PATH = '/adventure';

export function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    preloadSpriteSheets();

    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToGame = (nextPath: string) => {
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  };

  if (path === CLICKER_PATH) return <ClickerApp />;
  if (path === ADVENTURE_PATH) return <AdventureApp />;

  return <HomePage onNavigate={navigateToGame} />;
}
