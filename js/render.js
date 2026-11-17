/* ================= FAZENDA 3D — RENDERIZAÇÃO =================
   Terreno detalhado, construções com sombras e detalhes,
   plantações, animais, fantasma e efeitos. */

const COLORS = {
  grassOwned: '#7ec850',
  grassOwnedAlt: '#76c14a',
  grassOwnedDeep: '#6db543',
  grassLocked: '#5da03f',
  grassLockedAlt: '#57993b',
  grassLockedDeep: '#4f8c34',
  dirt: '#c8a061',
  water: '#4fc3f7',
  waterDeep: '#29a3dd',
  stone: '#9e9e9e',
  stoneDark: '#7b7b7b',
  wood: '#8d6e63',
  woodDark: '#6d4c41'
};

function render(ctx, cam, cw, ch, state) {
  ctx.clearRect(0, 0, cw, ch);
  const na = nightAlpha(game.time);
  const nightK = na / 0.45;
  const mix = (c1, c2, k) => [
    Math.round(c1[0] + (c2[0] - c1[0]) * k),
    Math.round(c1[1] + (c2[1] - c1[1]) * k),
    Math.round(c1[2] + (c2[2] - c1[2]) * k)
  ];
  let top = mix([135, 206, 235], [13, 27, 61], nightK);
  let bot = mix([106, 176, 74], [26, 42, 46], nightK);
  if (game.time < 0.05) {
    const dk = (1 - game.time / 0.05) * 0.55;
    top = mix(top, [247, 178, 103], dk);
    bot = mix(bot, [130, 165, 92], dk);
  } else if (game.time >= 0.55 && game.time < 0.65) {
    const dk = (game.time - 0.55) / 0.10 * 0.4;
    top = mix(top, [240, 150, 90], dk);
    bot = mix(bot, [150, 120, 70], dk);
  }
  const sky = ctx.createLinearGradient(0, 0, 0, ch);
  sky.addColorStop(0, 'rgb(' + top[0] + ',' + top[1] + ',' + top[2] + ')');
  sky.addColorStop(1, 'rgb(' + bot[0] + ',' + bot[1] + ',' + bot[2] + ')');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cw, ch);

  const view = visibleGridRange(cam, cw, ch);

  drawTerrain(ctx, cam, cw, ch, view);
  drawBuildings(ctx, cam, cw, ch, state);
  if (state.mode === 'pen') drawPenPreview(ctx, cam, cw, ch, state);
  if (state.ghost) drawGhost(ctx, cam, cw, ch, state);
  if (state.highlightTile) drawTileHighlight(ctx, cam, cw, ch, state.highlightTile);
  if (na > 0.01) {
    ctx.fillStyle = 'rgba(10,15,50,' + na + ')';
    ctx.fillRect(0, 0, cw, ch);
  }
  if (na > 0.12 && game.settings.quality !== 'baixa') drawFireflies(ctx, cam, cw, ch, na);
  drawFloaters(ctx, cam, cw, ch, performance.now());
  drawMindBubbles(ctx, cam, cw, ch);
}

/* Faixa de grid visível (culling simples). */
function visibleGridRange(cam, cw, ch) {
  const corners = [
    screenToWorld(cam, 0, 0, cw, ch),
    screenToWorld(cam, cw, 0, cw, ch),
    screenToWorld(cam, 0, ch, cw, ch),
    screenToWorld(cam, cw, ch, cw, ch)
  ].map(w => screenToGrid(w.x, w.y));
  return {
    x0: Math.max(0, Math.min(...corners.map(c => c.gx)) - 2),
    y0: Math.max(0, Math.min(...corners.map(c => c.gy)) - 2),
    x1: Math.min(GRID_SIZE, Math.max(...corners.map(c => c.gx)) + 3),
    y1: Math.min(GRID_SIZE, Math.max(...corners.map(c => c.gy)) + 3)
  };
}

/* Hash determinístico por tile para detalhes de grama. */
function tileHash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

/* Hash com boa distribuição para as células do ruído. */
function noiseHash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/* Ruído suave (value noise) para variação orgânica da grama. */
function smoothNoise(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const n00 = noiseHash(x0, y0), n10 = noiseHash(x0 + 1, y0);
  const n01 = noiseHash(x0, y0 + 1), n11 = noiseHash(x0 + 1, y0 + 1);
  const top = n00 + (n10 - n00) * sx;
  const bot = n01 + (n11 - n01) * sx;
  return top + (bot - top) * sy;
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

const GRASS_OWNED_RAMP = ['#93d768', '#7ec850', '#72bd48', '#66b23f'].map(hexToRgb);
const GRASS_LOCKED_RAMP = ['#65aa46', '#5da03f', '#549438', '#4a8831'].map(hexToRgb);
const SUN_TINT = [172, 216, 108];
const SHADE_TINT = [82, 152, 54];

function drawTerrain(ctx, cam, cw, ch, view) {
  const a = game.ownedArea;
  const q = game.settings.quality;
  const tNow = performance.now() / 1000;
  for (let x = view.x0; x < view.x1; x++) {
    for (let y = view.y0; y < view.y1; y++) {
      const corners = tileCorners(cam, cw, ch, x, y);
      const owned = inOwnedArea(x, y);
      const h = tileHash(x, y);

      // cor base: rampa de verdes escolhida por ruído suave em 2 oitavas
      const n1 = 0.65 * smoothNoise(x / 7, y / 7) + 0.35 * smoothNoise(x / 2.6 + 31, y / 2.6 + 17);
      const ramp = owned ? GRASS_OWNED_RAMP : GRASS_LOCKED_RAMP;
      let [r, g, b] = ramp[Math.min(3, Math.floor(n1 * 4))];

      // manchas de sol e de sombra sobrepostas ao ruído
      const n2 = smoothNoise(x / 4.5 + 97, y / 4.5 + 53);
      if (n2 > 0.74) {
        const k = Math.min(1, (n2 - 0.74) * 3) * 0.45;
        r += (SUN_TINT[0] - r) * k; g += (SUN_TINT[1] - g) * k; b += (SUN_TINT[2] - b) * k;
      } else if (n2 < 0.2) {
        const k = Math.min(1, (0.2 - n2) * 3) * 0.4;
        r += (SHADE_TINT[0] - r) * k; g += (SHADE_TINT[1] - g) * k; b += (SHADE_TINT[2] - b) * k;
      }
      drawTileDiamond(ctx, corners, 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')', 'rgba(0,0,0,0.04)');

      if (q === 'baixa') continue;

      // textura: pontilhados finos de grama (longe demais fica ruído inútil)
      if (q === 'alta' && cam.zoom > 0.7) {
        for (let i = 0; i < 2; i++) {
          const sx1 = tileHash(x * 5 + i * 9, y * 7 + i);
          const sy1 = tileHash(x * 11 + i, y * 3 + i * 5);
          const pp = projectPoint(x + 0.1 + sx1 * 0.8, y + 0.1 + sy1 * 0.8, 0);
          const pt = worldToScreen(cam, pp.x, pp.y, cw, ch);
          ctx.fillStyle = sx1 > 0.5 ? 'rgba(46,105,28,0.20)' : 'rgba(255,255,255,0.07)';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.1 * cam.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const occupied = !!occupancy[occIndex(x, y)];
      if (owned && !occupied && isTilled(x, y)) {
        drawTilledSoil(ctx, cam, cw, ch, x, y);
      } else if (owned && !occupied) {
        if (h > 0.955) {
          drawDirtPatch(ctx, cam, cw, ch, x, y, h);
        } else if (h > 0.9) {
          drawWildflowers(ctx, cam, cw, ch, x, y, h);
        } else if (h > 0.78) {
          drawGrassTuft(ctx, cam, cw, ch, x, y, h, tNow);
        }
      }

      if (q === 'alta') {
        const top = corners[0], left = corners[3];
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left.x, left.y); ctx.lineTo(top.x, top.y);
        ctx.lineTo(corners[1].x, corners[1].y);
        ctx.stroke();
      }
    }
  }

  // borda da área possuída com marcos de madeira
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  const pA = [
    projectPoint(a.x0, a.y0, 0), projectPoint(a.x1 + 1, a.y0, 0),
    projectPoint(a.x1 + 1, a.y1 + 1, 0), projectPoint(a.x0, a.y1 + 1, 0)
  ].map(pt => worldToScreen(cam, pt.x, pt.y, cw, ch));
  ctx.beginPath();
  ctx.moveTo(pA[0].x, pA[0].y); ctx.lineTo(pA[1].x, pA[1].y);
  ctx.lineTo(pA[2].x, pA[2].y); ctx.lineTo(pA[3].x, pA[3].y);
  ctx.closePath(); ctx.stroke();

  if (q !== 'baixa') {
    const cornerTiles = [[a.x0, a.y0], [a.x1, a.y0], [a.x1, a.y1], [a.x0, a.y1]];
    for (const [cx, cy] of cornerTiles) {
      drawPrism(ctx, cam, cw, ch, cx + 0.4, cy + 0.4, 0.2, 0.2, 0.5, COLORS.woodDark);
      drawSphere(ctx, cam, cw, ch, cx + 0.5, cy + 0.5, 0.55, 0.12, '#e0e0e0');
    }
  }
}

function drawGrassTuft(ctx, cam, cw, ch, x, y, h, tNow) {
  const count = 4 + Math.floor(h * 4);
  const shades = ['#3e8a2a', '#4c9c33', '#59a83b', '#67b545'];
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const hx = tileHash(x * 7 + i, y * 13 + 1);
    const hy = tileHash(x * 3 + 2, y * 5 + i);
    const pp = projectPoint(x + 0.12 + hx * 0.76, y + 0.12 + hy * 0.76, 0);
    const pt = worldToScreen(cam, pp.x, pp.y, cw, ch);
    const sway = Math.sin(tNow * 1.7 + x * 1.9 + y * 2.3 + i * 1.1) * 2.2;
    const lean = (hx - 0.5) * 7 + sway;
    const len = (6 + hy * 8) * cam.zoom;
    ctx.strokeStyle = shades[Math.floor(hx * shades.length)];
    ctx.lineWidth = Math.max(1, 1.3 * cam.zoom);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.quadraticCurveTo(pt.x + lean * 0.35, pt.y - len * 0.55, pt.x + lean, pt.y - len);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawWildflowers(ctx, cam, cw, ch, x, y, h) {
  const palette = ['#ff8a80', '#fff176', '#ce93d8', '#ffab91'];
  for (let i = 0; i < 3; i++) {
    const hx = tileHash(x * 11 + i, y * 17 + 3);
    const hy = tileHash(x * 5 + 4, y * 9 + i);
    const pp = projectPoint(x + 0.15 + hx * 0.7, y + 0.15 + hy * 0.7, 0);
    const pt = worldToScreen(cam, pp.x, pp.y, cw, ch);
    const stemH = (4 + hy * 4) * cam.zoom;
    ctx.strokeStyle = '#4c9c33';
    ctx.lineWidth = Math.max(1, 1.1 * cam.zoom);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + (hx - 0.5) * 2 * cam.zoom, pt.y - stemH);
    ctx.stroke();
    ctx.fillStyle = palette[Math.floor(hx * palette.length)];
    ctx.beginPath();
    ctx.arc(pt.x + (hx - 0.5) * 2 * cam.zoom, pt.y - stemH, 2 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffde7';
    ctx.beginPath();
    ctx.arc(pt.x + (hx - 0.5) * 2 * cam.zoom, pt.y - stemH, 0.8 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- Plantações ---------- */
const CROP_FRUIT_COLORS = {
  wheat: '#e6c465', corn: '#fdd835', carrot: '#ff7043', tomato: '#ef5350',
  pumpkin: '#ff9800', lettuce: '#aed581', potato: '#c8a061', strawberry: '#ec407a',
  grape: '#8e6bc1', sunflower: '#ffd54f'
};

function drawCrop(ctx, cam, cw, ch, b) {
  const def = CROPS[b.type];
  if (!def) return;
  const p = cropProgress(b);
  const z = cam.zoom;
  const corners = tileCorners(cam, cw, ch, b.gx, b.gy);
  const at = (gx, gy, gz) => {
    const pr = projectPoint(gx, gy, gz);
    return worldToScreen(cam, pr.x, pr.y, cw, ch);
  };

  drawTileDiamond(ctx, corners, b.watered ? '#8a5f34' : '#a3743f', 'rgba(0,0,0,0.12)');

  ctx.strokeStyle = 'rgba(60,35,15,0.30)';
  ctx.lineWidth = Math.max(1, 1 * z);
  for (let i = 1; i <= 2; i++) {
    const a = at(b.gx + 0.08, b.gy + i / 3, 0);
    const c = at(b.gx + 0.92, b.gy + i / 3, 0);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
  }

  const spots = [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]];
  const fruit = CROP_FRUIT_COLORS[b.type] || '#ffd54f';
  ctx.lineCap = 'round';
  for (let i = 0; i < spots.length; i++) {
    const base = at(b.gx + spots[i][0], b.gy + spots[i][1], 0);
    const hh = tileHash(b.gx * 3 + i, b.gy * 5 + i);
    if (p < 0.33) {
      const len = (3 + hh * 2.5) * z;
      ctx.strokeStyle = '#66b545';
      ctx.lineWidth = Math.max(1, 1.4 * z);
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(base.x + (hh - 0.5) * 2.5 * z, base.y - len);
      ctx.stroke();
    } else {
      const len = (9 + hh * 4) * z;
      const tipX = base.x + (hh - 0.5) * 4 * z;
      ctx.strokeStyle = '#4c9c33';
      ctx.lineWidth = Math.max(1, 1.6 * z);
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.quadraticCurveTo(base.x + (hh - 0.5) * 3 * z, base.y - len * 0.6, tipX, base.y - len);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(base.x, base.y - len * 0.45);
      ctx.lineTo(base.x - 3.5 * z, base.y - len * 0.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(base.x, base.y - len * 0.5);
      ctx.lineTo(base.x + 3.5 * z, base.y - len * 0.7);
      ctx.stroke();
      if (p >= 1) {
        ctx.fillStyle = fruit;
        ctx.beginPath();
        ctx.arc(tipX, base.y - len - 1.5 * z, 2.6 * z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.lineCap = 'butt';

  const center = at(b.gx + 0.5, b.gy + 0.5, 0);
  if (p >= 1) {
    const pulse = 1 + Math.sin(performance.now() / 280) * 0.07;
    ctx.strokeStyle = 'rgba(255,213,79,0.95)';
    ctx.lineWidth = Math.max(1.5, 2.2 * z);
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.stroke();
    const bounce = Math.abs(Math.sin(performance.now() / 320)) * 5 * z;
    ctx.font = Math.max(13, 17 * z * pulse) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, center.x, center.y - 14 * z - bounce);
    ctx.textBaseline = 'alphabetic';
  } else if (p > 0.04) {
    const w = 22 * z, bh = 3.5 * z;
    const bx = center.x - w / 2, by = center.y - 20 * z;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bx - 1, by - 1, w + 2, bh + 2);
    ctx.fillStyle = p > 0.75 ? '#ffd54f' : '#8bc34a';
    ctx.fillRect(bx, by, w * p, bh);
  }

  if (b.watered && p < 1) {
    const wpt = at(b.gx + 0.85, b.gy + 0.85, 0.1);
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.arc(wpt.x, wpt.y, 2.2 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(wpt.x - 0.7 * z, wpt.y - 0.7 * z, 0.7 * z, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTilledSoil(ctx, cam, cw, ch, x, y) {
  const corners = tileCorners(cam, cw, ch, x, y);
  drawTileDiamond(ctx, corners, '#8a5f34', 'rgba(0,0,0,0.18)');
  ctx.strokeStyle = 'rgba(60,35,15,0.35)';
  ctx.lineWidth = Math.max(1, 1 * cam.zoom);
  for (let i = 1; i <= 2; i++) {
    const a = projectPoint(x + 0.08, y + i / 3, 0);
    const b = projectPoint(x + 0.92, y + i / 3, 0);
    const as = worldToScreen(cam, a.x, a.y, cw, ch);
    const bs = worldToScreen(cam, b.x, b.y, cw, ch);
    ctx.beginPath(); ctx.moveTo(as.x, as.y); ctx.lineTo(bs.x, bs.y); ctx.stroke();
  }
}

function drawDirtPatch(ctx, cam, cw, ch, x, y, h) {
  const corners = tileCorners(cam, cw, ch, x, y);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = 'rgba(160,120,70,0.35)';
  const c = worldToScreen(cam, projectPoint(x + 0.5, y + 0.5, 0).x, projectPoint(x + 0.5, y + 0.5, 0).y, cw, ch);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, 16 * cam.zoom, 9 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,85,45,0.4)';
  for (let i = 0; i < 3; i++) {
    const hx = tileHash(x + i * 31, y * 3 + i);
    const hy = tileHash(x * 2 + i, y + i * 17);
    ctx.beginPath();
    ctx.arc(c.x + (hx - 0.5) * 22 * cam.zoom, c.y + (hy - 0.5) * 10 * cam.zoom, 1.6 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTileHighlight(ctx, cam, cw, ch, tile) {
  const corners = tileCorners(cam, cw, ch, tile.gx, tile.gy);
  drawTileDiamond(ctx, corners, 'rgba(255,235,59,0.35)', 'rgba(255,235,59,0.9)');
}

/* ---------- Sombra elíptica sob objetos ---------- */
function drawShadow(ctx, cam, cw, ch, gx, gy, w, d, strength) {
  const c = projectPoint(gx + w / 2, gy + d / 2, 0);
  const s = worldToScreen(cam, c.x, c.y, cw, ch);
  const k = (strength || 0.18) * (0.35 + 0.65 * dayLight());
  ctx.fillStyle = `rgba(20,40,10,${k.toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + 3 * cam.zoom, w * 22 * cam.zoom, d * 11 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- Desenho das construções ---------- */
function drawBuildings(ctx, cam, cw, ch, state) {
  const items = [];
  for (const b of game.buildings) {
    const f = footprintOf(b.type, b.rot);
    items.push({ key: b.gx + b.gy + f.w + f.d, kind: 'b', ref: b });
  }
  for (const c of game.crops) items.push({ key: c.gx + c.gy + 1, kind: 'c', ref: c });
  for (const an of game.animals) items.push({ key: an.gx + an.gy, kind: 'a', ref: an });
  for (const fm of game.farmers) if (!fm.inside) items.push({ key: fm.gx + fm.gy + 1, kind: 'f', ref: fm });
  for (const dg of game.dogs) items.push({ key: dg.gx + dg.gy, kind: 'd', ref: dg });
  items.sort((x, y) => x.key - y.key);

  let selected = null;
  for (const it of items) {
    const b = it.ref;
    if (it.kind === 'b') {
      if (state.mode === 'move' && state.moveId === b.id) { selected = b; continue; }
      if (state.mode === 'rotate' && state.rotateId === b.id) continue;
      drawBuilding(ctx, cam, cw, ch, b);
    } else if (it.kind === 'c') {
      drawCrop(ctx, cam, cw, ch, b);
    } else if (it.kind === 'f') {
      drawFarmer(ctx, cam, cw, ch, b);
    } else if (it.kind === 'd') {
      drawDog(ctx, cam, cw, ch, b);
    } else {
      drawAnimal(ctx, cam, cw, ch, b);
    }
  }
  if (selected) drawBuilding(ctx, cam, cw, ch, selected, true);
}

function drawBuilding(ctx, cam, cw, ch, b, selected) {
  const def = BUILDINGS[b.type];
  const f = footprintOf(b.type, b.rot);
  const gx = b.gx, gy = b.gy, w = f.w, d = f.d;
  const q = game.settings.quality;

  if (selected) {
    const p = [
      projectPoint(gx, gy, 0), projectPoint(gx + w, gy, 0),
      projectPoint(gx + w, gy + d, 0), projectPoint(gx, gy + d, 0)
    ].map(pt => worldToScreen(cam, pt.x, pt.y, cw, ch));
    ctx.fillStyle = 'rgba(255,235,59,0.35)';
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y);
    ctx.lineTo(p[2].x, p[2].y); ctx.lineTo(p[3].x, p[3].y);
    ctx.closePath(); ctx.fill();
  }

  switch (b.type) {
    case 'house':   drawHouse(ctx, cam, cw, ch, gx, gy, w, d, q); break;
    case 'barn':    drawBarn(ctx, cam, cw, ch, gx, gy, w, d, q); break;
    case 'stable':  drawStable(ctx, cam, cw, ch, gx, gy, w, d, q); break;
    case 'coop':    drawCoop(ctx, cam, cw, ch, gx, gy, w, d, q); break;
    case 'well':    drawWell(ctx, cam, cw, ch, gx, gy, q); break;
    case 'stall':   drawStall(ctx, cam, cw, ch, gx, gy, w, d, q); break;
    case 'fence':   drawFence(ctx, cam, cw, ch, gx, gy, b.rot, q); break;
    case 'tree':    drawTree(ctx, cam, cw, ch, gx, gy, q); break;
    case 'tree_pine':   drawTree(ctx, cam, cw, ch, gx, gy, q, 'pine'); break;
    case 'tree_cherry': drawTree(ctx, cam, cw, ch, gx, gy, q, 'cherry'); break;
    case 'flowers': drawFlowers(ctx, cam, cw, ch, gx, gy); break;
    case 'path':    drawPath(ctx, cam, cw, ch, gx, gy); break;
    case 'lake':    drawLake(ctx, cam, cw, ch, gx, gy, w, d, q); break;
    case 'doghouse': drawDoghouse(ctx, cam, cw, ch, gx, gy, q); break;
    case 'bar':     drawBar(ctx, cam, cw, ch, gx, gy, w, d, q); break;
  }
}

/* --- Casa: paredes, telhado, chaminé com fumaça, janelas acesas, arbustos --- */
function drawHouse(ctx, cam, cw, ch, gx, gy, w, d, q) {
  drawShadow(ctx, cam, cw, ch, gx, gy, w, d, 0.2);
  const wallH = 0.9;
  drawPrism(ctx, cam, cw, ch, gx + 0.15, gy + 0.15, w - 0.3, d - 0.3, wallH, '#f5f0e6');

  // fundação de pedra
  drawPrism(ctx, cam, cw, ch, gx + 0.1, gy + 0.1, w - 0.2, d - 0.2, 0.12, '#a8a8a8');

  drawGableRoof(ctx, cam, cw, ch, gx + 0.05, gy + 0.05, w - 0.1, d - 0.1, wallH, 0.75, '#d84343', 'x');
  drawRoofShingles(ctx, cam, cw, ch, gx + 0.05, gy + 0.05, w - 0.1, d - 0.1, wallH, 0.75);

  // chaminé + fumaça
  drawPrism(ctx, cam, cw, ch, gx + w - 0.55, gy + 0.25, 0.25, 0.25, wallH + 0.95, '#8d6e63');
  drawPrism(ctx, cam, cw, ch, gx + w - 0.6, gy + 0.2, 0.35, 0.35, 0.1, '#5d4037');
  if (q !== 'baixa') drawSmoke(ctx, cam, cw, ch, gx + w - 0.42, gy + 0.37, wallH + 1.05);

  // porta com degrau e maçaneta
  const door = [projectPoint(gx + w - 0.15, gy + d * 0.45, 0.12), projectPoint(gx + w - 0.15, gy + d * 0.45 + 0.5, 0.12),
                projectPoint(gx + w - 0.15, gy + d * 0.45 + 0.5, 0.67), projectPoint(gx + w - 0.15, gy + d * 0.45, 0.67)]
    .map(p => worldToScreen(cam, p.x, p.y, cw, ch));
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath();
  ctx.moveTo(door[0].x, door[0].y); ctx.lineTo(door[1].x, door[1].y);
  ctx.lineTo(door[2].x, door[2].y); ctx.lineTo(door[3].x, door[3].y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5d4037';
  const top = projectPoint(gx + w - 0.15, gy + d * 0.45 + 0.25, 0.67);
  const ts = worldToScreen(cam, top.x, top.y, cw, ch);
  ctx.beginPath(); ctx.arc(ts.x, ts.y, 1.5 * cam.zoom, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,20,0.45)';
  ctx.lineWidth = 1;
  for (const frac of [0.33, 0.66]) {
    const l0 = { x: door[0].x + (door[1].x - door[0].x) * frac, y: door[0].y + (door[1].y - door[0].y) * frac };
    const l1 = { x: door[3].x + (door[2].x - door[3].x) * frac, y: door[3].y + (door[2].y - door[3].y) * frac };
    ctx.beginPath(); ctx.moveTo(l0.x, l0.y); ctx.lineTo(l1.x, l1.y); ctx.stroke();
  }
  drawPrism(ctx, cam, cw, ch, gx + w - 0.2, gy + d * 0.45 + 0.1, 0.18, 0.7, 0.12, '#bcaaa4');

  // janelas com moldura e brilho (acendem a noite)
  const na2 = nightAlpha(game.time);
  const lit = na2 > 0.15;
  if (lit && q !== 'baixa') {
    for (const wy of [0.2, 0.65]) {
      const gp = projectPoint(gx + w * wy + 0.2, gy + d - 0.15, 0.5);
      const gc = worldToScreen(cam, gp.x, gp.y, cw, ch);
      ctx.fillStyle = 'rgba(255,213,79,' + (na2 * 0.5).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(gc.x, gc.y, 16 * cam.zoom, 12 * cam.zoom, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = lit ? '#ffd76b' : '#7ec8e3';
  for (const wy of [0.2, 0.65]) {
    const win = [projectPoint(gx + w * wy, gy + d - 0.15, 0.35), projectPoint(gx + w * wy + 0.4, gy + d - 0.15, 0.35),
                 projectPoint(gx + w * wy + 0.4, gy + d - 0.15, 0.7), projectPoint(gx + w * wy, gy + d - 0.15, 0.7)]
      .map(p => worldToScreen(cam, p.x, p.y, cw, ch));
    ctx.beginPath();
    ctx.moveTo(win[0].x, win[0].y); ctx.lineTo(win[1].x, win[1].y);
    ctx.lineTo(win[2].x, win[2].y); ctx.lineTo(win[3].x, win[3].y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(win[0].x, win[0].y); ctx.lineTo(win[1].x, win[1].y);
    ctx.lineTo(win[2].x, win[2].y); ctx.lineTo(win[3].x, win[3].y);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo((win[0].x + win[1].x) / 2, (win[0].y + win[1].y) / 2);
    ctx.lineTo((win[2].x + win[3].x) / 2, (win[2].y + win[3].y) / 2);
    ctx.stroke();
    if (q !== 'baixa') {
      drawPrism(ctx, cam, cw, ch, gx + w * wy, gy + d - 0.28, 0.42, 0.14, 0.1, '#795548');
      drawSphere(ctx, cam, cw, ch, gx + w * wy + 0.1, gy + d - 0.2, 0.06, 0.08, '#e53935');
      drawSphere(ctx, cam, cw, ch, gx + w * wy + 0.3, gy + d - 0.2, 0.06, 0.08, '#fdd835');
    }
  }

  // arbustos nos cantos
  if (q !== 'baixa') {
    drawSphere(ctx, cam, cw, ch, gx + 0.25, gy + d + 0.1, 0.18, 0.2, '#2e7d32');
    drawSphere(ctx, cam, cw, ch, gx + 0.55, gy + d + 0.12, 0.16, 0.16, '#388e3c');
    drawSphere(ctx, cam, cw, ch, gx + w - 0.25, gy - 0.1, 0.18, 0.2, '#2e7d32');
  }
}

/* Fumaça da chaminé: bolhas que sobem e somem. */
function drawSmoke(ctx, cam, cw, ch, gx, gy, gz) {
  const t = performance.now() / 1000;
  for (let i = 0; i < 3; i++) {
    const age = (t * 0.5 + i / 3) % 1;
    const p = projectPoint(gx + Math.sin(t + i * 2) * 0.08, gy + age * 0.3, gz + age * 0.8);
    const s = worldToScreen(cam, p.x, p.y, cw, ch);
    ctx.fillStyle = `rgba(230,230,230,${0.5 * (1 - age)})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, (3 + age * 6) * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* Linhas de telhas no telhado. */
function drawRoofShingles(ctx, cam, cw, ch, gx, gy, w, d, baseH, ridgeH) {
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  const rows = 3;
  for (let i = 1; i < rows; i++) {
    const z = baseH + ridgeH * (i / rows);
    const a = projectPoint(gx, gy + d / 2 * (1 - i / rows), z);
    const b = projectPoint(gx + w, gy + d / 2 * (1 - i / rows), z);
    const sa = worldToScreen(cam, a.x, a.y, cw, ch);
    const sb = worldToScreen(cam, b.x, b.y, cw, ch);
    ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke();
  }
}

/* --- Celeiro: fardos de feno, catavento, textura --- */
function drawBarn(ctx, cam, cw, ch, gx, gy, w, d, q) {
  drawShadow(ctx, cam, cw, ch, gx, gy, w, d, 0.2);
  drawPrism(ctx, cam, cw, ch, gx + 0.1, gy + 0.1, w - 0.2, d - 0.2, 0.8, '#c62828');
  if (q !== 'baixa') {
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const px = gx + 0.1 + (w - 0.2) * i / 6;
      const pa = projectPoint(px, gy + d - 0.1, 0);
      const pb = projectPoint(px, gy + d - 0.1, 0.8);
      const sa = worldToScreen(cam, pa.x, pa.y, cw, ch);
      const sb = worldToScreen(cam, pb.x, pb.y, cw, ch);
      ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke();
    }
  }
  drawGableRoof(ctx, cam, cw, ch, gx, gy, w, d, 0.8, 0.7, '#8d6e63', 'x');
  drawRoofShingles(ctx, cam, cw, ch, gx, gy, w, d, 0.8, 0.7);

  // portão branco em X
  const door = [projectPoint(gx + w / 2 - 0.35, gy + d - 0.12, 0), projectPoint(gx + w / 2 + 0.35, gy + d - 0.12, 0),
                projectPoint(gx + w / 2 + 0.35, gy + d - 0.12, 0.6), projectPoint(gx + w / 2 - 0.35, gy + d - 0.12, 0.6)]
    .map(p => worldToScreen(cam, p.x, p.y, cw, ch));
  ctx.fillStyle = '#efebe9';
  ctx.beginPath();
  ctx.moveTo(door[0].x, door[0].y); ctx.lineTo(door[1].x, door[1].y);
  ctx.lineTo(door[2].x, door[2].y); ctx.lineTo(door[3].x, door[3].y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c62828'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(door[0].x, door[0].y); ctx.lineTo(door[2].x, door[2].y);
  ctx.moveTo(door[1].x, door[1].y); ctx.lineTo(door[3].x, door[3].y);
  ctx.stroke();

  // fardos de feno ao lado
  if (q !== 'baixa') {
    drawPrism(ctx, cam, cw, ch, gx + w + 0.02, gy + d - 0.55, 0.4, 0.4, 0.3, '#e6c26e');
    ctx.strokeStyle = 'rgba(120,85,30,0.6)'; ctx.lineWidth = 1;
    const bale = projectPoint(gx + w + 0.22, gy + d - 0.35, 0.3);
    const bs = worldToScreen(cam, bale.x, bale.y, cw, ch);
    ctx.beginPath(); ctx.arc(bs.x, bs.y, 5 * cam.zoom, 0, Math.PI * 2); ctx.stroke();

    // catavento no telhado
    drawPrism(ctx, cam, cw, ch, gx + w / 2 - 0.03, gy + d / 2 - 0.03, 0.06, 0.06, 1.7, '#5d4037');
    const vt = projectPoint(gx + w / 2, gy + d / 2, 1.75);
    const vs = worldToScreen(cam, vt.x, vt.y, cw, ch);
    const ang = performance.now() / 400;
    ctx.strokeStyle = '#eceff1'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a2 = ang + i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(vs.x, vs.y);
      ctx.lineTo(vs.x + Math.cos(a2) * 6 * cam.zoom, vs.y + Math.sin(a2) * 3 * cam.zoom);
      ctx.stroke();
    }
  }
}

/* --- Estábulo: curral cercado + feno --- */
function drawStable(ctx, cam, cw, ch, gx, gy, w, d, q) {
  drawShadow(ctx, cam, cw, ch, gx, gy, w, d, 0.2);
  drawPrism(ctx, cam, cw, ch, gx + 0.1, gy + 0.1, w - 0.2, d - 0.2, 0.7, '#a1887f');
  drawGableRoof(ctx, cam, cw, ch, gx, gy, w, d, 0.7, 0.55, '#d84343', 'x');
  drawPrism(ctx, cam, cw, ch, gx + 0.2, gy + d - 0.1, w - 0.4, 0.08, 0.3, '#8d6e63');
  if (q !== 'baixa') {
    drawPrism(ctx, cam, cw, ch, gx + w - 0.5, gy + d - 0.5, 0.35, 0.35, 0.25, '#e6c26e');
    drawSphere(ctx, cam, cw, ch, gx + 0.35, gy + d + 0.15, 0.12, 0.14, '#4caf50');
  }
}

/* --- Galinheiro: rampa, comedouro, telhado --- */
function drawCoop(ctx, cam, cw, ch, gx, gy, w, d, q) {
  drawShadow(ctx, cam, cw, ch, gx, gy, w, d, 0.18);
  drawPrism(ctx, cam, cw, ch, gx + 0.15, gy + 0.15, w - 0.3, d - 0.3, 0.55, '#bcaaa4');
  drawGableRoof(ctx, cam, cw, ch, gx + 0.05, gy + 0.05, w - 0.1, d - 0.1, 0.55, 0.45, '#e57373', 'x');
  drawPrism(ctx, cam, cw, ch, gx + w / 2 - 0.1, gy + d - 0.05, 0.2, 0.3, 0.08, '#8d6e63');
  if (q !== 'baixa') {
    drawPrism(ctx, cam, cw, ch, gx + w + 0.05, gy + d / 2, 0.25, 0.2, 0.1, '#d7a86e');
    drawSphere(ctx, cam, cw, ch, gx + w + 0.17, gy + d / 2 + 0.1, 0.14, 0.05, '#fff8e1');
  }
}

/* --- Poço: pedras, balde na corda, tábua --- */
function drawWell(ctx, cam, cw, ch, gx, gy, q) {
  drawShadow(ctx, cam, cw, ch, gx, gy, 1, 1, 0.18);
  drawPrism(ctx, cam, cw, ch, gx + 0.15, gy + 0.15, 0.7, 0.7, 0.35, '#9e9e9e');
  if (q !== 'baixa') {
    ctx.fillStyle = '#757575';
    for (const [ox, oy] of [[0.25, 0.3], [0.55, 0.25], [0.35, 0.55], [0.65, 0.6]]) {
      const p = projectPoint(gx + ox, gy + oy, 0.35);
      const s = worldToScreen(cam, p.x, p.y, cw, ch);
      ctx.beginPath(); ctx.arc(s.x, s.y, 2 * cam.zoom, 0, Math.PI * 2); ctx.fill();
    }
  }
  const t = performance.now() / 1000;
  const lvl = 0.3 + Math.sin(t * 2) * 0.03;
  const water = [projectPoint(gx + 0.25, gy + 0.25, lvl), projectPoint(gx + 0.75, gy + 0.25, lvl),
                 projectPoint(gx + 0.75, gy + 0.75, lvl), projectPoint(gx + 0.25, gy + 0.75, lvl)]
    .map(p => worldToScreen(cam, p.x, p.y, cw, ch));
  ctx.fillStyle = COLORS.water;
  ctx.beginPath();
  ctx.moveTo(water[0].x, water[0].y); ctx.lineTo(water[1].x, water[1].y);
  ctx.lineTo(water[2].x, water[2].y); ctx.lineTo(water[3].x, water[3].y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc((water[0].x + water[2].x) / 2, (water[0].y + water[2].y) / 2, 2.5 * cam.zoom, 0, Math.PI * 2);
  ctx.fill();

  drawPrism(ctx, cam, cw, ch, gx + 0.2, gy + 0.2, 0.08, 0.08, 0.85, '#6d4c41');
  drawPrism(ctx, cam, cw, ch, gx + 0.72, gy + 0.2, 0.08, 0.08, 0.85, '#6d4c41');
  drawGableRoof(ctx, cam, cw, ch, gx + 0.05, gy + 0.05, 0.9, 0.9, 0.85, 0.3, '#c62828', 'x');

  // corda + balde balançando
  const ropeA = projectPoint(gx + 0.5, gy + 0.35, 0.85);
  const sw = Math.sin(t * 1.5) * 0.04;
  const bucket = projectPoint(gx + 0.5 + sw, gy + 0.35, 0.45);
  const ra = worldToScreen(cam, ropeA.x, ropeA.y, cw, ch);
  const bs = worldToScreen(cam, bucket.x, bucket.y, cw, ch);
  ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(ra.x, ra.y); ctx.lineTo(bs.x, bs.y); ctx.stroke();
  ctx.fillStyle = '#8d6e63';
  ctx.beginPath(); ctx.arc(bs.x, bs.y, 3.5 * cam.zoom, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.water;
  ctx.beginPath(); ctx.arc(bs.x, bs.y, 2 * cam.zoom, 0, Math.PI * 2); ctx.fill();
}

/* --- Barraca: caixas de produtos --- */
function drawStall(ctx, cam, cw, ch, gx, gy, w, d, q) {
  drawShadow(ctx, cam, cw, ch, gx, gy, w, d, 0.18);
  drawPrism(ctx, cam, cw, ch, gx + 0.1, gy + 0.2, w - 0.2, d - 0.35, 0.5, '#d7a86e');
  drawPrism(ctx, cam, cw, ch, gx + 0.15, gy + 0.15, 0.07, 0.07, 1.0, '#8d6e63');
  drawPrism(ctx, cam, cw, ch, gx + w - 0.22, gy + 0.15, 0.07, 0.07, 1.0, '#8d6e63');
  const stripes = 4;
  for (let i = 0; i < stripes; i++) {
    const x0 = gx + 0.05 + (w - 0.1) * (i / stripes);
    const x1 = gx + 0.05 + (w - 0.1) * ((i + 1) / stripes);
    const c = i % 2 === 0 ? '#e53935' : '#ffffff';
    const quad = [projectPoint(x0, gy + 0.05, 1.0), projectPoint(x1, gy + 0.05, 1.0),
                  projectPoint(x1, gy + d - 0.05, 0.85), projectPoint(x0, gy + d - 0.05, 0.85)]
      .map(p => worldToScreen(cam, p.x, p.y, cw, ch));
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(quad[0].x, quad[0].y); ctx.lineTo(quad[1].x, quad[1].y);
    ctx.lineTo(quad[2].x, quad[2].y); ctx.lineTo(quad[3].x, quad[3].y);
    ctx.closePath(); ctx.fill();
  }
  if (q !== 'baixa') {
    drawSphere(ctx, cam, cw, ch, gx + 0.4, gy + 0.45, 0.55, 0.09, '#e53935');
    drawSphere(ctx, cam, cw, ch, gx + 0.6, gy + 0.5, 0.55, 0.09, '#ff8f00');
    drawSphere(ctx, cam, cw, ch, gx + 0.5, gy + 0.55, 0.55, 0.09, '#7cb342');
  }
}

/* --- Cerca: conecta automaticamente com cercas vizinhas --- */
function fenceNeighbor(gx, gy, dx, dy) {
  const x = gx + dx, y = gy + dy;
  if (!inBounds(x, y)) return false;
  const occ = occupancy[occIndex(x, y)];
  return !!(occ && !occ.isCrop && occ.type === 'fence');
}

function drawFence(ctx, cam, cw, ch, gx, gy, rot, q) {
  drawPrism(ctx, cam, cw, ch, gx + 0.42, gy + 0.42, 0.16, 0.16, 0.55, '#a1887f');
  drawSphere(ctx, cam, cw, ch, gx + 0.5, gy + 0.5, 0.6, 0.09, '#8d6e63');

  const railH = [0.12, 0.34];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let connected = false;
  for (const [dx, dy] of dirs) {
    if (!fenceNeighbor(gx, gy, dx, dy)) continue;
    connected = true;
    for (const h of railH) {
      if (dx !== 0) drawPrism(ctx, cam, cw, ch, gx + (dx > 0 ? 0.5 : -0.4), gy + 0.44, 0.9, 0.08, h, '#8d6e63');
      else drawPrism(ctx, cam, cw, ch, gx + 0.44, gy + (dy > 0 ? 0.5 : -0.4), 0.08, 0.9, h, '#8d6e63');
    }
  }
  if (!connected) {
    const horizontal = rot % 2 === 0;
    for (const h of railH) {
      if (horizontal) drawPrism(ctx, cam, cw, ch, gx + 0.05, gy + 0.44, 0.9, 0.08, h, '#8d6e63');
      else drawPrism(ctx, cam, cw, ch, gx + 0.44, gy + 0.05, 0.08, 0.9, h, '#8d6e63');
    }
  }
}

/* --- Árvore: copa em camadas, frutas, sombra --- */
function drawTree(ctx, cam, cw, ch, gx, gy, q, variant) {
  if (variant === 'pine') {
    drawShadow(ctx, cam, cw, ch, gx, gy, 1, 1, 0.22);
    const c = projectPoint(gx + 0.5, gy + 0.5, 0);
    const cs = worldToScreen(cam, c.x, c.y, cw, ch);
    const z = cam.zoom;
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(cs.x - 2 * z, cs.y - 9 * z, 4 * z, 9 * z);
    const tri = (w, h, yBase, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(cs.x, cs.y - (yBase + h) * z);
      ctx.lineTo(cs.x - w * z, cs.y - yBase * z);
      ctx.lineTo(cs.x + w * z, cs.y - yBase * z);
      ctx.closePath();
      ctx.fill();
    };
    tri(14, 13, 6, '#1b5e20');
    tri(11, 12, 14, '#2e7d32');
    tri(8, 11, 22, '#388e3c');
    return;
  }
  const cherry = variant === 'cherry';
  drawShadow(ctx, cam, cw, ch, gx, gy, 1, 1, 0.22);
  drawPrism(ctx, cam, cw, ch, gx + 0.42, gy + 0.42, 0.16, 0.16, 0.5, cherry ? '#4e342e' : '#795548');
  drawPrism(ctx, cam, cw, ch, gx + 0.46, gy + 0.46, 0.08, 0.08, 0.62, '#5d4037');
  drawSphere(ctx, cam, cw, ch, gx + 0.5, gy + 0.5, 0.95, 0.5, cherry ? '#f06292' : '#2e7d32');
  if (q !== 'baixa') {
    drawSphere(ctx, cam, cw, ch, gx + 0.3, gy + 0.45, 0.72, 0.34, cherry ? '#f48fb1' : '#388e3c');
    drawSphere(ctx, cam, cw, ch, gx + 0.68, gy + 0.6, 0.78, 0.3, cherry ? '#f8bbd0' : '#43a047');
    drawSphere(ctx, cam, cw, ch, gx + 0.5, gy + 0.35, 1.15, 0.3, cherry ? '#fce4ec' : '#4caf50');
    const h = tileHash(gx + 3, gy + 7);
    if (cherry) {
      ctx.fillStyle = 'rgba(244, 143, 177, 0.8)';
      for (const [ox, oy] of [[0.2, 0.8], [0.8, 0.3], [0.55, 0.85]]) {
        const p = projectPoint(gx + ox + Math.sin(performance.now() / 900 + ox * 7) * 0.05, gy + oy, 0.05);
        const s = worldToScreen(cam, p.x, p.y, cw, ch);
        ctx.beginPath(); ctx.arc(s.x, s.y, 1.6 * cam.zoom, 0, Math.PI * 2); ctx.fill();
      }
    } else if (h > 0.4) {
      ctx.fillStyle = '#e53935';
      for (const [ox, oy, oz] of [[0.35, 0.5, 0.95], [0.62, 0.42, 1.1], [0.5, 0.68, 0.85]]) {
        const p = projectPoint(gx + ox, gy + oy, oz);
        const s = worldToScreen(cam, p.x, p.y, cw, ch);
        ctx.beginPath(); ctx.arc(s.x, s.y, 2.2 * cam.zoom, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

function drawFlowers(ctx, cam, cw, ch, gx, gy) {
  drawShadow(ctx, cam, cw, ch, gx, gy, 1, 1, 0.12);
  drawPrism(ctx, cam, cw, ch, gx + 0.15, gy + 0.15, 0.7, 0.7, 0.12, '#6d4c41');
  drawPrism(ctx, cam, cw, ch, gx + 0.12, gy + 0.12, 0.76, 0.06, 0.16, '#5d4037');
  const colors = ['#e91e63', '#ffeb3b', '#9c27b0', '#ff5722', '#ff4081', '#ffee58'];
  const t = performance.now() / 600;
  for (let i = 0; i < 6; i++) {
    const fx = gx + 0.28 + (i % 3) * 0.22;
    const fy = gy + 0.28 + Math.floor(i / 3) * 0.4;
    const sway = Math.sin(t + i) * 0.02;
    drawPrism(ctx, cam, cw, ch, fx - 0.015, fy - 0.015, 0.03, 0.03, 0.22, '#4caf50');
    drawSphere(ctx, cam, cw, ch, fx + sway, fy, 0.3, 0.09, colors[i]);
  }
}

function drawPath(ctx, cam, cw, ch, gx, gy) {
  const corners = tileCorners(cam, cw, ch, gx, gy);
  drawTileDiamond(ctx, corners, COLORS.dirt, 'rgba(0,0,0,0.15)');
  const stones = [[0.3, 0.3, 0.24], [0.62, 0.42, 0.2], [0.42, 0.65, 0.22], [0.72, 0.7, 0.16]];
  for (const [ox, oy, r] of stones) {
    const p = projectPoint(gx + ox, gy + oy, 0);
    const s = worldToScreen(cam, p.x, p.y, cw, ch);
    ctx.fillStyle = COLORS.stone;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, r * TILE_W / 2 * cam.zoom * 0.5, r * TILE_H / 2 * cam.zoom * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(s.x - 2 * cam.zoom, s.y - 1.5 * cam.zoom, r * TILE_W / 4 * cam.zoom * 0.5, r * TILE_H / 4 * cam.zoom * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* --- Lago: margem de areia, água animada, pedras, vitórias-régias e taboas --- */
function drawPoly(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

function drawLake(ctx, cam, cw, ch, gx, gy, w, d, q) {
  const t = performance.now() / 1000;

  const shore = [projectPoint(gx + 0.05, gy + 0.18, 0), projectPoint(gx + w - 0.18, gy + 0.02, 0),
                 projectPoint(gx + w - 0.02, gy + d - 0.15, 0), projectPoint(gx + 0.18, gy + d - 0.02, 0)]
    .map(pt => worldToScreen(cam, pt.x, pt.y, cw, ch));
  drawPoly(ctx, shore, '#e8d8a0');

  const wob = Math.sin(t * 1.2) * 0.02;
  const water = [projectPoint(gx + 0.22, gy + 0.35 + wob, 0), projectPoint(gx + w - 0.3, gy + 0.16, 0),
                 projectPoint(gx + w - 0.16, gy + d - 0.3, 0), projectPoint(gx + 0.35, gy + d - 0.16 - wob, 0)]
    .map(pt => worldToScreen(cam, pt.x, pt.y, cw, ch));
  drawPoly(ctx, water, COLORS.water);
  drawPoly(ctx, water, 'rgba(41,163,221,0.35)');

  if (q !== 'baixa') {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.4 + i / 3) % 1;
      const c = projectPoint(gx + w / 2, gy + d / 2, 0);
      const cs = worldToScreen(cam, c.x, c.y, cw, ch);
      ctx.globalAlpha = 0.5 * (1 - ph);
      ctx.beginPath();
      ctx.ellipse(cs.x, cs.y, (6 + ph * 26) * cam.zoom, (3 + ph * 13) * cam.zoom, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#757575';
    const stones = [[0.25, 0.3], [0.7, 0.22], [0.85, 0.6], [0.4, 0.82], [0.15, 0.55]];
    for (const [ox, oy] of stones) {
      const p = projectPoint(gx + ox, gy + oy, 0.04);
      const ps = worldToScreen(cam, p.x, p.y, cw, ch);
      ctx.beginPath();
      ctx.ellipse(ps.x, ps.y, 4 * cam.zoom, 2.5 * cam.zoom, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const pads = [[0.45, 0.45, 0.9], [0.68, 0.62, 0.7], [0.35, 0.68, 0.6]];
    for (const [ox, oy, r] of pads) {
      const p = projectPoint(gx + ox + Math.sin(t + ox * 9) * 0.015, gy + oy, 0.02);
      const ps = worldToScreen(cam, p.x, p.y, cw, ch);
      ctx.fillStyle = '#43a047';
      ctx.beginPath();
      ctx.ellipse(ps.x, ps.y, r * 11 * cam.zoom, r * 6 * cam.zoom, 0, 0.3, Math.PI * 2 - 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.ellipse(ps.x, ps.y + 1 * cam.zoom, r * 7 * cam.zoom, r * 3.5 * cam.zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      if (r > 0.8) {
        ctx.fillStyle = '#f48fb1';
        ctx.beginPath();
        ctx.arc(ps.x + r * 4 * cam.zoom, ps.y - r * 2 * cam.zoom, 2.2 * cam.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const frogs = [[0.5, 0.38, 0], [0.74, 0.72, 1.8], [0.3, 0.6, 3.1]];
    for (const [ox, oy, ph] of frogs) {
      const hop = Math.sin(t * 0.9 + ph);
      const hopK = hop > 0.93 ? (hop - 0.93) / 0.07 : 0;
      const p = projectPoint(gx + ox + hopK * 0.06, gy + oy - hopK * 0.1, 0.03 + hopK * 0.15);
      const ps = worldToScreen(cam, p.x, p.y, cw, ch);
      const fz = cam.zoom;
      ctx.fillStyle = '#66bb6a';
      ctx.beginPath();
      ctx.ellipse(ps.x, ps.y, 4.5 * fz, 3 * fz, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#43a047';
      ctx.beginPath();
      ctx.ellipse(ps.x + 2.5 * fz, ps.y - 2 * fz, 2.6 * fz, 2 * fz, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ps.x + 1.8 * fz, ps.y - 3.6 * fz, 1.1 * fz, 0, Math.PI * 2);
      ctx.arc(ps.x + 3.6 * fz, ps.y - 3.4 * fz, 1.1 * fz, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.arc(ps.x + 1.8 * fz, ps.y - 3.6 * fz, 0.5 * fz, 0, Math.PI * 2);
      ctx.arc(ps.x + 3.6 * fz, ps.y - 3.4 * fz, 0.5 * fz, 0, Math.PI * 2);
      ctx.fill();
      if (hopK > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(ps.x, ps.y + 2.5 * fz, 5.5 * fz, 2.5 * fz, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const reeds = [[0.12, 0.35], [0.2, 0.28], [0.16, 0.45]];
    for (const [ox, oy] of reeds) {
      const sway = Math.sin(t * 1.5 + ox * 7) * 0.02;
      const base = projectPoint(gx + ox, gy + oy, 0);
      const top = projectPoint(gx + ox + sway, gy + oy, 0.55);
      const bs = worldToScreen(cam, base.x, base.y, cw, ch);
      const ts = worldToScreen(cam, top.x, top.y, cw, ch);
      ctx.strokeStyle = '#558b2f';
      ctx.lineWidth = 2 * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(bs.x, bs.y);
      ctx.quadraticCurveTo(bs.x, (bs.y + ts.y) / 2, ts.x, ts.y);
      ctx.stroke();
      ctx.fillStyle = '#6d4c41';
      ctx.beginPath();
      ctx.ellipse(ts.x, ts.y, 2 * cam.zoom, 4.5 * cam.zoom, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* --- Casinha do cachorro: madeira, telhado vermelho, entrada em arco, placa com osso --- */
function drawDoghouse(ctx, cam, cw, ch, gx, gy, q) {
  drawShadow(ctx, cam, cw, ch, gx, gy, 1, 1, 0.16);
  drawPrism(ctx, cam, cw, ch, gx + 0.12, gy + 0.12, 0.76, 0.76, 0.42, '#a1662f');
  drawGableRoof(ctx, cam, cw, ch, gx + 0.04, gy + 0.04, 0.92, 0.92, 0.42, 0.34, '#c62828', 'x');

  const fr = projectPoint(gx + 0.5, gy + 0.85, 0.06);
  const fs = worldToScreen(cam, fr.x, fr.y, cw, ch);
  const fz = cam.zoom;
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.ellipse(fs.x, fs.y, 7 * fz, 8 * fz, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(fs.x + 7 * fz, fs.y + 1 * fz);
  ctx.lineTo(fs.x - 7 * fz, fs.y + 1 * fz);
  ctx.closePath();
  ctx.fill();

  if (q !== 'baixa') {
    ctx.strokeStyle = 'rgba(62,39,35,0.45)';
    ctx.lineWidth = Math.max(1, 1.2 * fz);
    for (let i = 0; i < 3; i++) {
      const a1 = projectPoint(gx + 0.14, gy + 0.2 + i * 0.24, 0.4);
      const a2 = projectPoint(gx + 0.86, gy + 0.2 + i * 0.24, 0.4);
      const s1 = worldToScreen(cam, a1.x, a1.y, cw, ch);
      const s2 = worldToScreen(cam, a2.x, a2.y, cw, ch);
      ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke();
    }
    const sp = projectPoint(gx + 1.02, gy + 0.9, 0);
    const ss = worldToScreen(cam, sp.x, sp.y, cw, ch);
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(ss.x - 1 * fz, ss.y - 12 * fz, 2 * fz, 12 * fz);
    ctx.fillStyle = '#d7a86e';
    ctx.beginPath();
    ctx.roundRect(ss.x - 8 * fz, ss.y - 20 * fz, 16 * fz, 9 * fz, 2 * fz);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ss.x - 5 * fz, ss.y - 17.5 * fz, 1.8 * fz, 0, Math.PI * 2);
    ctx.arc(ss.x - 5 * fz, ss.y - 14.5 * fz, 1.8 * fz, 0, Math.PI * 2);
    ctx.arc(ss.x + 5 * fz, ss.y - 17.5 * fz, 1.8 * fz, 0, Math.PI * 2);
    ctx.arc(ss.x + 5 * fz, ss.y - 14.5 * fz, 1.8 * fz, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(ss.x - 5 * fz, ss.y - 17.5 * fz, 10 * fz, 2.6 * fz);
  }
}

/* --- Bar da fazenda: balcao, banquinhas, barris, pisca-pisca e musica a noite --- */
function drawBar(ctx, cam, cw, ch, gx, gy, w, d, q) {
  drawShadow(ctx, cam, cw, ch, gx, gy, w, d, 0.2);
  drawPrism(ctx, cam, cw, ch, gx + 0.1, gy + 0.1, w - 0.2, d - 0.2, 0.85, '#8d6e63');
  if (q !== 'baixa') {
    ctx.strokeStyle = 'rgba(62,39,35,0.4)';
    ctx.lineWidth = Math.max(1, 1.2 * cam.zoom);
    for (let i = 0; i < 4; i++) {
      const a1 = projectPoint(gx + 0.12, gy + 0.25 + i * 0.42, 0.8);
      const a2 = projectPoint(gx + w - 0.12, gy + 0.25 + i * 0.42, 0.8);
      const s1 = worldToScreen(cam, a1.x, a1.y, cw, ch);
      const s2 = worldToScreen(cam, a2.x, a2.y, cw, ch);
      ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke();
    }
  }
  drawGableRoof(ctx, cam, cw, ch, gx + 0.02, gy + 0.02, w - 0.04, d - 0.04, 0.85, 0.5, '#4e342e', 'x');

  drawPrism(ctx, cam, cw, ch, gx + 0.15, gy + d - 0.5, w - 0.3, 0.35, 0.42, '#a1662f');
  drawPrism(ctx, cam, cw, ch, gx + 0.15, gy + d - 0.5, w - 0.3, 0.08, 0.06, '#d7a86e');

  if (q !== 'baixa') {
    drawSphere(ctx, cam, cw, ch, gx + 0.7, gy + d - 0.75, 0.17, 0.24, '#c62828');
    drawSphere(ctx, cam, cw, ch, gx + 1.5, gy + d - 0.75, 0.17, 0.24, '#c62828');
    drawSphere(ctx, cam, cw, ch, gx + 2.3, gy + d - 0.75, 0.17, 0.24, '#c62828');
    drawPrism(ctx, cam, cw, ch, gx + w + 0.05, gy + 0.35, 0.32, 0.32, 0.4, '#6d4c41');
    drawPrism(ctx, cam, cw, ch, gx + w + 0.05, gy + 0.35, 0.36, 0.36, 0.06, '#4e342e');
    drawPrism(ctx, cam, cw, ch, gx + w + 0.08, gy + 0.95, 0.28, 0.28, 0.34, '#8d6e63');

    const w1 = projectPoint(gx + 0.08, gy + d - 0.32, 0.95);
    const w2 = projectPoint(gx + w - 0.08, gy + d - 0.32, 0.95);
    const p1 = worldToScreen(cam, w1.x, w1.y, cw, ch);
    const p2 = worldToScreen(cam, w2.x, w2.y, cw, ch);
    ctx.strokeStyle = 'rgba(60,50,40,0.7)';
    ctx.lineWidth = Math.max(1, 1.1 * cam.zoom);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 + 6 * cam.zoom, p2.x, p2.y);
    ctx.stroke();
    const bulbs = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#ff4081'];
    for (let i = 1; i < 7; i++) {
      const k = i / 7;
      const bx = p1.x + (p2.x - p1.x) * k;
      const by = p1.y + (p2.y - p1.y) * k + 6 * cam.zoom * Math.sin(Math.PI * k) + 3.5 * cam.zoom;
      const lit = (Math.floor(performance.now() / 700) + i) % 2 === 0;
      ctx.fillStyle = bulbs[i % bulbs.length];
      ctx.globalAlpha = lit ? 1 : 0.45;
      ctx.beginPath();
      ctx.arc(bx, by, 2 * cam.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  if (nightAlpha(game.time) > 0.15) {
    const t = performance.now() / 1000;
    ctx.font = Math.max(10, 13 * cam.zoom) + 'px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const bobn = Math.sin(t * 1.6 + i * 2.1) * 5 * cam.zoom;
      const nx = gx + 0.6 + i * 0.9, ny = gy + 0.4 + (i % 2) * 0.8;
      const np = projectPoint(nx, ny, 1.3 + Math.sin(t * 0.9 + i) * 0.12);
      const ns = worldToScreen(cam, np.x, np.y, cw, ch);
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 2 + i * 1.9);
      ctx.fillText('🎵', ns.x, ns.y + bobn);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  }
}

/* ---------- Vagalumes (noite) ---------- */
function drawFireflies(ctx, cam, cw, ch, na) {
  const t = performance.now() / 1000;
  const a = game.ownedArea;
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const hx = noiseHash(i * 13 + 1, 7);
    const hy = noiseHash(5, i * 29 + 3);
    const gx = a.x0 + hx * (a.x1 - a.x0) + Math.sin(t * 0.7 + i * 2.1) * 1.3;
    const gy = a.y0 + hy * (a.y1 - a.y0) + Math.cos(t * 0.5 + i * 1.7) * 1.3;
    const gz = 0.5 + Math.sin(t * 1.1 + i) * 0.3;
    const p = projectPoint(gx, gy, gz);
    const pt = worldToScreen(cam, p.x, p.y, cw, ch);
    const blink = Math.max(0, Math.sin(t * 2.2 + i * 2.7));
    const al = na * (0.25 + 0.75 * blink);
    ctx.globalAlpha = al * 0.3;
    ctx.fillStyle = '#e4ff6b';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4.5 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = al;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1.7 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- Textos flutuantes (ganhos, XP, água) ---------- */
const floaters = [];

function spawnFloater(gx, gy, text, color) {
  floaters.push({ gx, gy, text, color, born: performance.now() });
  if (floaters.length > 30) floaters.shift();
}

function drawFloaters(ctx, cam, cw, ch, now) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    const age = (now - f.born) / 1400;
    if (age >= 1) { floaters.splice(i, 1); continue; }
    const pp = projectPoint(f.gx + 0.5, f.gy + 0.5, 1.2 + age * 1.1);
    const pt = worldToScreen(cam, pp.x, pp.y, cw, ch);
    ctx.save();
    ctx.globalAlpha = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
    ctx.font = 'bold ' + Math.max(11, 13 * cam.zoom) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(f.text, pt.x, pt.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, pt.x, pt.y);
    ctx.restore();
  }
}

/* ---------- Prévia fantasma (construir / mover / girar) ---------- */
/* Previa do curral: retangulo verde/vermelho antes de confirmar. */
function drawPenPreview(ctx, cam, cw, ch, state) {
  const n = state.penSize || 8;
  const r = penRect(lastPointerGrid.gx, lastPointerGrid.gy, n);
  const valid = penValid(r);
  const pts = [
    projectPoint(r.x0, r.y0, 0), projectPoint(r.x1 + 1, r.y0, 0),
    projectPoint(r.x1 + 1, r.y1 + 1, 0), projectPoint(r.x0, r.y1 + 1, 0)
  ].map(p => worldToScreen(cam, p.x, p.y, cw, ch));
  ctx.fillStyle = valid ? 'rgba(76,175,80,0.16)' : 'rgba(229,57,53,0.16)';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y); ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = valid ? 'rgba(51,105,30,0.8)' : 'rgba(183,28,28,0.8)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = Math.max(11, 15 * cam.zoom) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(valid ? '\u2713' : '\u2717', (pts[0].x + pts[2].x) / 2, (pts[0].y + pts[2].y) / 2);
}

function drawGhost(ctx, cam, cw, ch, state) {
  const g = state.ghost;
  const valid = g.valid;
  const f = footprintOf(g.type, g.rot);

  for (let x = g.gx; x < g.gx + f.w; x++) {
    for (let y = g.gy; y < g.gy + f.d; y++) {
      const corners = tileCorners(cam, cw, ch, x, y);
      drawTileDiamond(ctx, corners,
        valid ? 'rgba(76,175,80,0.45)' : 'rgba(229,57,53,0.45)',
        valid ? 'rgba(46,125,50,0.9)' : 'rgba(183,28,28,0.9)');
    }
  }

  if (!valid) return;

  const fake = { id: -1, type: g.type, gx: g.gx, gy: g.gy, rot: g.rot };
  ctx.globalAlpha = 0.65;
  drawBuilding(ctx, cam, cw, ch, fake, false);
  ctx.globalAlpha = 1;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMindBubbles(ctx, cam, cw, ch) {
  const now = performance.now();
  for (const f of game.farmers) {
    if (!f.bubble || !f.bubble.text) continue;
    if (now > f.bubble.until) { f.bubble = null; continue; }
    if (f.inside) continue;
    const pp = projectPoint(f.gx, f.gy, 2.4);
    const pt = worldToScreen(cam, pp.x, pp.y, cw, ch);
    const words = f.bubble.text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > 20 && cur) { lines.push(cur.trim()); cur = w; }
      else cur += ' ' + w;
    }
    if (cur.trim()) lines.push(cur.trim());
    if (lines.length > 4) lines.length = 4;
    ctx.save();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const lw = Math.max.apply(null, lines.map(l => ctx.measureText(l).width)) + 14;
    const lh = 13;
    const bh = lines.length * lh + 8;
    const bx = pt.x - lw / 2, by = pt.y - bh - 8;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = 'rgba(93,64,55,0.8)';
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, bx, by, lw, bh, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pt.x - 4, by + bh);
    ctx.lineTo(pt.x + 4, by + bh);
    ctx.lineTo(pt.x, by + bh + 6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.fillStyle = '#4e342e';
    lines.forEach((l, i) => ctx.fillText(l, pt.x, by + 12 + i * lh));
    ctx.restore();
  }
}
