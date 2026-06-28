import { ArrowRight, Coins, Home, Map, Shield, Swords, Users } from 'lucide-react';

type HomePageProps = {
  onNavigate: (path: string) => void;
};

const CLICKER_PATH = '/clicker';
const ADVENTURE_PATH = '/adventure';

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <main className="home-page">
      <header className="home-nav" aria-label="Primary navigation">
        <div className="home-nav-left">
          <span className="home-nav-emoji" aria-hidden="true">
            (^-^)
          </span>
          <div className="home-logo-slot" aria-label="Minion Clicker logo image placeholder" />
          <nav className="home-nav-links">
            <a href="/" aria-label="Return to homepage">
              <Home size={16} aria-hidden="true" />
              Home
            </a>
            <a href="#games">
              <Map size={16} aria-hidden="true" />
              Games
            </a>
          </nav>
        </div>
        <div className="home-nav-actions" aria-label="Account status">
          <button type="button">Sign In Not Needed</button>
          <button type="button">Sign Up Not Needed</button>
        </div>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-title-row">
          <span aria-hidden="true" />
          <h1 id="home-title">Choose your next minion run</h1>
          <span aria-hidden="true" />
        </div>
        <div className="home-brand-slot" aria-label="Homepage hero image placeholder">
          <span>Minion Clicker image placeholder</span>
        </div>
        <p>
          Build an unstoppable kaomoji workforce in the RTS clicker, or step into a direct-control
          adventure built for weapons, loot, and dangerous little expeditions.
        </p>
      </section>

      <section className="home-games" id="games" aria-label="Available games">
        <article className="home-game-panel home-game-panel-clicker">
          <div className="home-game-image" aria-label="Minion Clicker background image placeholder">
            <Coins size={34} aria-hidden="true" />
          </div>
          <div className="home-game-copy">
            <p className="home-game-label">RTS Clicker</p>
            <h2>Minion Clicker</h2>
            <p>
              Gather coins, hire minions, expand your squad, and command the field against enemy
              keeps.
            </p>
          </div>
          <ul className="home-game-tags" aria-label="Minion Clicker feature glimpse">
            <li>
              <Users size={16} aria-hidden="true" />
              Crew growth
            </li>
            <li>
              <Shield size={16} aria-hidden="true" />
              Base defense
            </li>
          </ul>
          <button type="button" className="home-game-button" onClick={() => onNavigate(CLICKER_PATH)}>
            <span>Enter Clicker</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </article>

        <article className="home-game-panel home-game-panel-adventure">
          <div className="home-game-image" aria-label="Adventure Mode background image placeholder">
            <Map size={34} aria-hidden="true" />
          </div>
          <div className="home-game-copy">
            <p className="home-game-label">Action RPG</p>
            <h2>Adventure Mode</h2>
            <p>
              Control one brave minion, test weapons in both hands, and explore a roguelike sandbox.
            </p>
          </div>
          <ul className="home-game-tags" aria-label="Adventure Mode feature glimpse">
            <li>
              <Swords size={16} aria-hidden="true" />
              Dual weapons
            </li>
            <li>
              <Map size={16} aria-hidden="true" />
              Field testing
            </li>
          </ul>
          <button
            type="button"
            className="home-game-button"
            onClick={() => onNavigate(ADVENTURE_PATH)}
          >
            <span>Enter Adventure</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </article>
      </section>
    </main>
  );
}
