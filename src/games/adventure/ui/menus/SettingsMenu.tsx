import { Settings, X } from 'lucide-react';
import { GraphicsSettingsPanel, useGraphicsSettings } from '../../../../shared/graphicsSettings';

export function SettingsMenu({ graphics, onGraphicsChange, onClose }: {
  graphics: ReturnType<typeof useGraphicsSettings>[0];
  onGraphicsChange: ReturnType<typeof useGraphicsSettings>[1];
  onClose: () => void;
}) {
  return (
    <aside className="adventure-settings-panel" aria-label="Adventure settings">
      <div className="inventory-heading">
        <div className="standalone-panel-title"><Settings size={18} /> Settings</div>
        <button type="button" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
      </div>
      <GraphicsSettingsPanel settings={graphics} onChange={onGraphicsChange} />
    </aside>
  );
}
