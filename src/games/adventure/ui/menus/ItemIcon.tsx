import { spriteSheets, type SpriteRef } from '../../../../shared/sprites';

export function ItemIcon({ icon, sprite }: { icon: string; sprite?: SpriteRef }) {
  if (!sprite) return <>{icon}</>;
  const sheet = spriteSheets[sprite.sheetId];
  const sourceWidth = (sprite.cellsWide ?? 1) * sheet.cellSize;
  const sourceHeight = (sprite.cellsHigh ?? 1) * sheet.cellSize;
  const scale = 34 / Math.max(sourceWidth, sourceHeight);
  return (
    <span
      className="item-sprite-icon"
      style={{
        backgroundImage: `url(${sheet.src})`,
        backgroundPosition: `-${sprite.x * sheet.cellSize * scale}px -${sprite.y * sheet.cellSize * scale}px`,
        backgroundSize: `${sheet.columns * sheet.cellSize * scale}px ${sheet.rows * sheet.cellSize * scale}px`,
        width: sourceWidth * scale,
        height: sourceHeight * scale,
        aspectRatio: `${sourceWidth} / ${sourceHeight}`,
      }}
      aria-hidden="true"
    />
  );
}
