type HomePageProps = {
  onNavigate: (path: string) => void;
};

const CLICKER_PATH = '/clicker';
const ADVENTURE_PATH = '/adventure';
const LOGO_IMAGE = '/assets/home/minion-clicker-logo.png';
const CLICKER_LOGO_IMAGE = '/assets/home/minion-clicker-logo.png';
const ADVENTURE_LOGO_IMAGE = '/assets/home/adventure-mode-logo-transparent.png';
const CLICKER_PANEL_IMAGE = '/assets/home/clicker-panel-v2.png';
const ADVENTURE_PANEL_IMAGE = '/assets/home/adventure-panel-v2.png';

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <main className="home-page">
      <header className="home-nav" aria-label="Primary navigation">
        <div className="home-nav-left">
          <span className="home-nav-emoji" aria-hidden="true">
            (^-^)
          </span>
          <img className="home-logo-slot" src={LOGO_IMAGE} alt="Minion Clicker" />
          <nav className="home-nav-links">
            <a className="active" href="/" aria-label="Return to homepage">
              Home
            </a>
            <a href="#games">Games</a>
            <a href="#games">Features</a>
            <a href="#games">Community</a>
            <a href="#games">News</a>
            <a href="#games">Support</a>
          </nav>
        </div>
        <div className="home-nav-actions" aria-label="Account status">
          <button className="home-login-button" type="button">
            Log in Not Needed
          </button>
          <button className="home-signup-button" type="button">
            Sign Up Not Needed
          </button>
        </div>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-brand-slot">
          <img src={LOGO_IMAGE} alt="Minion Clicker" />
        </div>
        <div className="home-title-row">
          <span aria-hidden="true" />
          <h1 id="home-title">Choose your next minion run</h1>
          <span aria-hidden="true" />
        </div>
        <p>
          Build an unstoppable kaomoji workforce in the RTS clicker, or step into a direct-control
          adventure built for weapons, loot, and dangerous little expeditions.
        </p>
      </section>

      <section className="home-games" id="games" aria-label="Available games">
        <article className="home-game-card">
          <button
            type="button"
            className="home-game-panel home-game-panel-clicker"
            style={{ backgroundImage: `url(${CLICKER_PANEL_IMAGE})` }}
            aria-labelledby="home-clicker-title"
            onClick={() => onNavigate(CLICKER_PATH)}
          >
            <img className="home-game-logo-overlay" src={CLICKER_LOGO_IMAGE} alt="" aria-hidden="true" />
            <div className="home-game-reader-copy">
              <h2 id="home-clicker-title">Minion Clicker</h2>
              <p>Click the coins, build an army, and push your forces across enemy castles.</p>
            </div>
          </button>
          <p className="home-game-description">
            Click the coins, build an army, and push your forces across enemy castles.
          </p>
        </article>

        <article className="home-game-card">
          <button
            type="button"
            className="home-game-panel home-game-panel-adventure"
            style={{ backgroundImage: `url(${ADVENTURE_PANEL_IMAGE})` }}
            aria-labelledby="home-adventure-title"
            onClick={() => onNavigate(ADVENTURE_PATH)}
          >
            <img className="home-game-logo-overlay" src={ADVENTURE_LOGO_IMAGE} alt="" aria-hidden="true" />
            <div className="home-game-reader-copy">
              <h2 id="home-adventure-title">Adventure Mode</h2>
              <p>
                Play as a minion, build your attacking style, explore, learn skills, play multiplayer, and customize your outfits.
              </p>
            </div>
          </button>
          <p className="home-game-description">
            Play as a minion, build your attacking style, explore, learn skills, play multiplayer, and customize your outfits.
          </p>
        </article>
      </section>
    </main>
  );
}
