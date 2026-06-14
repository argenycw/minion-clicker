export type TerrainVisualKind = 'tree' | 'bush' | 'rock' | 'flower' | 'flowerbed' | 'mushroom' | 'stump' | 'dead-tree' | 'ruin-wall' | 'ruin-pillar' | 'barrel' | 'crate' | 'rubble';

export type TerrainVisual = {
  id: string;
  kind: TerrainVisualKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  blocking: boolean;
  destructible?: boolean;
  hitAt?: number;
};

export function drawTerrainGround(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = '#acd27d';
  ctx.fillRect(0, 0, width, height);
  const tile = 180;
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const value = pseudo(`ground-${x}-${y}`, 0);
      ctx.fillStyle = value > 0.55 ? 'rgba(132, 181, 83, 0.055)' : 'rgba(224, 235, 151, 0.04)';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  for (let index = 0; index < 220; index += 1) {
    const x = pseudo('ground-detail-x', index) * width;
    const y = pseudo('ground-detail-y', index) * height;
    const color = index % 4 === 0 ? '#e8d668' : index % 4 === 1 ? '#e9dce0' : '#709b45';
    ctx.fillStyle = color;
    for (let dot = 0; dot < 3; dot += 1) {
      const angle = pseudo(`ground-angle-${index}`, dot) * Math.PI * 2;
      const distance = 5 + pseudo(`ground-distance-${index}`, dot) * 10;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 1.5 + dot * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawTerrainVisual(ctx: CanvasRenderingContext2D, visual: TerrainVisual, now = 0) {
  const shake = visual.hitAt === undefined ? 0 : Math.max(0, 1 - (now - visual.hitAt) / 220);
  const shakeX = shake > 0 ? Math.sin((now - visual.hitAt!) * 0.075) * 4 * shake : 0;
  const shakeY = shake > 0 ? Math.cos((now - visual.hitAt!) * 0.09) * 1.5 * shake : 0;
  ctx.save();
  ctx.translate(visual.x + shakeX, visual.y + shakeY);
  const canRotate = visual.kind === 'rock' || visual.kind === 'ruin-wall' || visual.kind === 'barrel' || visual.kind === 'crate' || visual.kind === 'rubble';
  ctx.rotate((canRotate ? visual.rotation : 0) + Math.sin((now - (visual.hitAt ?? now)) * 0.055) * 0.025 * shake);
  drawShadow(ctx, visual);

  if (visual.kind === 'tree') drawTree(ctx, visual);
  else if (visual.kind === 'bush') drawBush(ctx, visual);
  else if (visual.kind === 'rock') drawRock(ctx, visual);
  else if (visual.kind === 'flower') drawFlower(ctx, visual);
  else if (visual.kind === 'flowerbed') drawFlowerbed(ctx, visual);
  else if (visual.kind === 'mushroom') drawMushroom(ctx, visual);
  else if (visual.kind === 'stump') drawStump(ctx, visual);
  else if (visual.kind === 'dead-tree') drawDeadTree(ctx, visual);
  else if (visual.kind === 'ruin-wall') drawRuinWall(ctx, visual);
  else if (visual.kind === 'ruin-pillar') drawRuinPillar(ctx, visual);
  else if (visual.kind === 'barrel') drawBarrel(ctx, visual);
  else if (visual.kind === 'crate') drawCrate(ctx, visual);
  else drawRubble(ctx, visual);
  ctx.restore();
}

export function drawAmbientTerrainEffects(ctx: CanvasRenderingContext2D, width: number, height: number, now: number) {
  for (let index = 0; index < 90; index += 1) {
    const cycle = 7000 + pseudo('leaf-cycle', index) * 5000;
    const progress = ((now + pseudo('leaf-phase', index) * cycle) % cycle) / cycle;
    if (progress > 0.48) continue;
    const x = pseudo('leaf-x', index) * width + Math.sin(progress * Math.PI * 5 + index) * 34;
    const y = (pseudo('leaf-y', index) * height + progress * 190) % height;
    const alpha = Math.sin((progress / 0.48) * Math.PI) * 0.48;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(progress * Math.PI * 8 + index);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = index % 3 === 0 ? '#d39a32' : index % 3 === 1 ? '#7da545' : '#b96f32';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawShadow(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  if (visual.kind === 'flower' || visual.kind === 'flowerbed' || visual.kind === 'mushroom') return;
  ctx.save();
  ctx.translate(4, Math.max(4, visual.height * 0.22));
  ctx.fillStyle = 'rgba(35, 57, 31, 0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 0, visual.width * 0.48, visual.height * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTree(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  const sx = visual.width / 42;
  const sy = visual.height / 38;
  ctx.scale(sx, sy);
  ctx.fillStyle = '#74502d';
  ctx.beginPath();
  ctx.roundRect(-5, 3, 10, 17, 4);
  ctx.fill();
  const variant = pseudo(visual.id, 41);
  if (variant > 0.78) {
    drawPine(ctx, visual);
    return;
  }
  ctx.fillStyle = variant > 0.62 ? '#c8792f' : visual.blocking ? '#446f2f' : '#86ad61';
  traceCanopy(ctx);
  ctx.fill();
  ctx.strokeStyle = visual.blocking ? '#315626' : '#71964f';
  ctx.lineWidth = 1.8 / Math.max(sx, sy);
  ctx.stroke();
  ctx.fillStyle = variant > 0.62 ? '#e29336' : '#5f9139';
  ctx.beginPath();
  ctx.arc(-8, -9, 10, 0, Math.PI * 2);
  ctx.arc(6, -14, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(194, 224, 111, 0.52)';
  ctx.beginPath();
  ctx.arc(-8, -15, 5, 0, Math.PI * 2);
  ctx.arc(5, -20, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPine(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  ctx.fillStyle = '#72502d';
  ctx.fillRect(-4, -2, 8, 22);
  const colors = pseudo(visual.id, 53) > 0.5 ? ['#214f42', '#2d6b55', '#3b8261'] : ['#345f28', '#477d2e', '#5c9635'];
  for (let level = 0; level < 3; level += 1) {
    const y = -22 + level * 10;
    const half = 13 + level * 5;
    ctx.fillStyle = colors[level];
    ctx.beginPath();
    ctx.moveTo(0, y - 15);
    ctx.lineTo(-half, y + 10);
    ctx.lineTo(half, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#234a29';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
}

function drawBush(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  const sx = visual.width / 38;
  const sy = visual.height / 30;
  ctx.scale(sx, sy);
  traceBush(ctx);
  ctx.fillStyle = visual.blocking ? '#4f7e32' : '#91b86e';
  ctx.fill();
  ctx.strokeStyle = visual.destructible ? '#25451f' : '#3c672b';
  ctx.lineWidth = (visual.destructible ? 3 : 1.5) / Math.max(sx, sy);
  ctx.stroke();
  ctx.fillStyle = '#6fa441';
  ctx.beginPath();
  ctx.arc(-8, -5, 8, 0, Math.PI * 2);
  ctx.arc(8, -8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(205, 232, 124, 0.55)';
  ctx.beginPath();
  ctx.arc(-8, -10, 3.6, 0, Math.PI * 2);
  ctx.arc(7, -13, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  const sx = visual.width / 32;
  const sy = visual.height / 24;
  ctx.scale(sx, sy);
  ctx.beginPath();
  ctx.moveTo(-16, 3);
  ctx.lineTo(-10, -9);
  ctx.lineTo(3, -13);
  ctx.lineTo(14, -5);
  ctx.lineTo(16, 6);
  ctx.lineTo(7, 12);
  ctx.lineTo(-9, 10);
  ctx.closePath();
  ctx.fillStyle = visual.blocking ? '#747d80' : '#adb5b2';
  ctx.fill();
  ctx.strokeStyle = visual.blocking ? '#555e61' : '#929b98';
  ctx.lineWidth = 1.6 / Math.max(sx, sy);
  ctx.stroke();
  ctx.fillStyle = 'rgba(225, 235, 223, 0.55)';
  ctx.beginPath();
  ctx.moveTo(-9, -7);
  ctx.lineTo(2, -10);
  ctx.lineTo(8, -5);
  ctx.lineTo(-3, -2);
  ctx.closePath();
  ctx.fill();
}

function drawFlower(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  const scale = visual.width / 18;
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#5f8c3e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = '#f1b2c9';
  for (let index = 0; index < 5; index += 1) {
    ctx.beginPath();
    ctx.arc(Math.cos(index * 1.256) * 4.5, Math.sin(index * 1.256) * 4.5 - 2, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f2d95f';
  ctx.beginPath();
  ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlowerbed(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  ctx.fillStyle = '#5f9139';
  ctx.beginPath();
  ctx.ellipse(0, 5, visual.width * 0.48, visual.height * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  const colors = ['#f0a9c2', '#f5e6df', '#f0cf4f'];
  for (let index = 0; index < 11; index += 1) {
    const angle = pseudo(visual.id, index) * Math.PI * 2;
    const distance = pseudo(visual.id, index + 19) * visual.width * 0.35;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance * 0.45 - 3;
    ctx.fillStyle = colors[index % colors.length];
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4d95b';
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMushroom(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  const scale = visual.width / 18;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#eee6d2';
  ctx.beginPath();
  ctx.roundRect(-3, -1, 6, 11, 3);
  ctx.fill();
  ctx.fillStyle = '#c76664';
  ctx.strokeStyle = '#974948';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -2, 9, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f3d8bc';
  ctx.beginPath();
  ctx.arc(-3, -6, 1.2, 0, Math.PI * 2);
  ctx.arc(3, -4, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawStump(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  ctx.scale(visual.width / 26, visual.height / 22);
  ctx.fillStyle = visual.blocking ? '#79522f' : '#b28b64';
  ctx.strokeStyle = '#593b25';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.ellipse(0, 2, 13, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ba8a55';
  ctx.beginPath();
  ctx.ellipse(0, -2, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#825d38';
  ctx.beginPath();
  ctx.arc(0, -2, 5, 0, Math.PI * 1.7);
  ctx.stroke();
}

function drawDeadTree(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  ctx.strokeStyle = '#64462d';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.lineTo(-1, -17);
  ctx.moveTo(-1, -7);
  ctx.lineTo(-15, -22);
  ctx.moveTo(-11, -18);
  ctx.lineTo(-10, -29);
  ctx.moveTo(0, -13);
  ctx.lineTo(15, -27);
  ctx.moveTo(10, -23);
  ctx.lineTo(18, -16);
  ctx.stroke();
  ctx.strokeStyle = '#9a7147';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(3, 20);
  ctx.lineTo(2, -15);
  ctx.stroke();
}

function drawRuinWall(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  const count = Math.max(2, Math.round(visual.width / 29));
  const stoneWidth = visual.width / count;
  for (let index = 0; index < count; index += 1) {
    const jitter = pseudo(visual.id, index) - 0.5;
    const width = stoneWidth - 2;
    const height = visual.height * (0.82 + pseudo(visual.id, index + 31) * 0.18);
    const x = -visual.width / 2 + stoneWidth * (index + 0.5);
    const y = jitter * 3;
    ctx.fillStyle = index % 3 === 0 ? '#777d70' : index % 3 === 1 ? '#858b7b' : '#6d7469';
    ctx.strokeStyle = '#545b52';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - height / 2, width, height, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(226, 231, 201, 0.32)';
    ctx.beginPath();
    ctx.roundRect(x - width / 2 + 3, y - height / 2 + 3, width - 6, 4, 2);
    ctx.fill();
    if (pseudo(visual.id, index + 73) > 0.67) {
      ctx.fillStyle = 'rgba(91, 123, 55, 0.5)';
      ctx.beginPath();
      ctx.arc(x + width * 0.18, y + height * 0.2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRuinPillar(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  const width = visual.width;
  const height = visual.height;
  ctx.fillStyle = '#747a70';
  ctx.strokeStyle = '#51584f';
  ctx.lineWidth = 2;
  ctx.fillRect(-width * 0.32, -height * 0.4, width * 0.64, height * 0.8);
  ctx.strokeRect(-width * 0.32, -height * 0.4, width * 0.64, height * 0.8);
  for (const y of [-height * 0.45, height * 0.34]) {
    ctx.fillStyle = '#858b7b';
    ctx.beginPath();
    ctx.roundRect(-width * 0.46, y, width * 0.92, height * 0.16, 3);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(213, 222, 184, 0.35)';
  ctx.fillRect(-width * 0.22, -height * 0.34, width * 0.12, height * 0.55);
}

function drawBarrel(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  const width = visual.width;
  const height = visual.height;
  ctx.fillStyle = '#9b6031';
  ctx.strokeStyle = visual.destructible ? '#3d291d' : '#654127';
  ctx.lineWidth = visual.destructible ? 4 : 2;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -height / 2, width, height, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(232, 161, 82, 0.35)';
  ctx.fillRect(-width / 2 + 5, -height / 2 + 4, 5, height - 8);
  ctx.strokeStyle = '#553722';
  ctx.lineWidth = 2;
  for (const y of [-height * 0.28, height * 0.28]) {
    ctx.beginPath();
    ctx.moveTo(-width / 2, y);
    ctx.lineTo(width / 2, y);
    ctx.stroke();
  }
}

function drawCrate(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  const width = visual.width;
  const height = visual.height;
  ctx.fillStyle = '#9a642f';
  ctx.strokeStyle = visual.destructible ? '#402a1b' : '#654127';
  ctx.lineWidth = visual.destructible ? 4 : 2;
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.strokeRect(-width / 2, -height / 2, width, height);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-width * 0.38, -height * 0.38);
  ctx.lineTo(width * 0.38, height * 0.38);
  ctx.moveTo(width * 0.38, -height * 0.38);
  ctx.lineTo(-width * 0.38, height * 0.38);
  ctx.stroke();
  ctx.fillStyle = 'rgba(238, 171, 84, 0.3)';
  ctx.fillRect(-width / 2 + 5, -height / 2 + 5, 5, height - 10);
}

function drawRubble(ctx: CanvasRenderingContext2D, visual: TerrainVisual) {
  const pieces = 4;
  for (let index = 0; index < pieces; index += 1) {
    const angle = pseudo(visual.id, index) * Math.PI * 2;
    const distance = pseudo(visual.id, index + 9) * visual.width * 0.3;
    const radius = 3 + pseudo(visual.id, index + 17) * 4;
    ctx.fillStyle = index % 2 ? '#a8aa9e' : '#c1c1b2';
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function traceCanopy(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-21, 3);
  ctx.bezierCurveTo(-24, -9, -15, -19, -5, -19);
  ctx.bezierCurveTo(1, -29, 16, -25, 19, -14);
  ctx.bezierCurveTo(29, -9, 27, 5, 18, 11);
  ctx.bezierCurveTo(7, 18, -10, 16, -18, 10);
  ctx.closePath();
}

function traceBush(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-19, 5);
  ctx.bezierCurveTo(-22, -5, -14, -13, -6, -12);
  ctx.bezierCurveTo(-1, -20, 12, -20, 16, -11);
  ctx.bezierCurveTo(25, -8, 27, 5, 20, 11);
  ctx.bezierCurveTo(13, 17, 2, 15, -4, 14);
  ctx.bezierCurveTo(-12, 18, -21, 13, -19, 5);
  ctx.closePath();
}

function pseudo(id: string, salt: number) {
  let seed = salt * 97;
  for (let index = 0; index < id.length; index += 1) seed = (seed * 31 + id.charCodeAt(index)) | 0;
  const value = Math.sin(seed * 0.001) * 10000;
  return value - Math.floor(value);
}
