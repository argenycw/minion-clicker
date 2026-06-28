import { useEffect, useState, type ReactNode } from 'react';

export type GraphicsSettings = {
  fps: 30 | 60;
  resolutionScale: 0.75 | 1 | 1.5;
  ambientEffects: boolean;
  mapSprites: boolean;
  showFps: boolean;
};

const STORAGE_KEY = 'minion-clicker-graphics-v1';
const CHANGE_EVENT = 'minion-graphics-change';

export const defaultGraphicsSettings: GraphicsSettings = {
  fps: 60,
  resolutionScale: 1,
  ambientEffects: true,
  mapSprites: true,
  showFps: true,
};

function loadGraphicsSettings(): GraphicsSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<GraphicsSettings>;
    return {
      fps: saved.fps === 30 ? 30 : 60,
      resolutionScale: saved.resolutionScale === 0.75 || saved.resolutionScale === 1.5 ? saved.resolutionScale : 1,
      ambientEffects: saved.ambientEffects ?? true,
      mapSprites: saved.mapSprites ?? true,
      showFps: saved.showFps ?? true,
    };
  } catch {
    return defaultGraphicsSettings;
  }
}

export function useGraphicsSettings() {
  const [settings, setSettings] = useState(loadGraphicsSettings);

  useEffect(() => {
    const sync = () => setSettings(loadGraphicsSettings());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const update = (changes: Partial<GraphicsSettings>) => {
    const next = { ...settings, ...changes };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSettings(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return [settings, update] as const;
}

export function GraphicsSettingsPanel({ settings, onChange }: { settings: GraphicsSettings; onChange: (changes: Partial<GraphicsSettings>) => void }) {
  return (
    <div className="graphics-settings">
      <SettingRow title="Frame rate" description="30 saves power. 60 gives smoother movement.">
        <div className="segmented-setting">
          <button className={settings.fps === 30 ? 'selected' : ''} type="button" onClick={() => onChange({ fps: 30 })}>30 FPS</button>
          <button className={settings.fps === 60 ? 'selected' : ''} type="button" onClick={() => onChange({ fps: 60 })}>60 FPS</button>
        </div>
      </SettingRow>
      <SettingRow title="Render quality" description="Controls canvas resolution, not UI size.">
        <div className="segmented-setting three-options">
          <button className={settings.resolutionScale === 0.75 ? 'selected' : ''} type="button" onClick={() => onChange({ resolutionScale: 0.75 })}>Low</button>
          <button className={settings.resolutionScale === 1 ? 'selected' : ''} type="button" onClick={() => onChange({ resolutionScale: 1 })}>Medium</button>
          <button className={settings.resolutionScale === 1.5 ? 'selected' : ''} type="button" onClick={() => onChange({ resolutionScale: 1.5 })}>High</button>
        </div>
      </SettingRow>
      <ToggleSetting title="Ambient effects" description="Falling leaves, dust, and similar map effects." checked={settings.ambientEffects} onChange={(ambientEffects) => onChange({ ambientEffects })} />
      <ToggleSetting title="Map sprites" description="Draw opted-in terrain props from cached sprite sheets." checked={settings.mapSprites} onChange={(mapSprites) => onChange({ mapSprites })} />
      <ToggleSetting title="FPS counter" description="Show measured rendering FPS above the controls." checked={settings.showFps} onChange={(showFps) => onChange({ showFps })} />
    </div>
  );
}

function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="graphics-setting-row"><div><strong>{title}</strong><small>{description}</small></div>{children}</div>;
}

function ToggleSetting({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="graphics-setting-row toggle-setting"><div><strong>{title}</strong><small>{description}</small></div><input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} /><span /></label>;
}
