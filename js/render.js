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
  const sky = ctx.createLinearGradient(0, 0, 0, ch);
  sky.addColorStop(0, '#87ceeb');
  sky.addColorStop(1, '#6ab04a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cw, ch);

  const view = visibleGridRange(cam, cw, ch);

  drawTerrain(ctx, cam, cw, ch, view);
  drawBuildings(ctx, cam, cw, ch, state);
  if (state.ghost) drawGhost(ctx, cam, cw, ch, state);
  if (state.highlightTile) drawTileHighlight(ctx, cam, cw, ch, state.highlightTile);
  drawFloaters(ctx, cam, cw, ch, performance.now());
  drawClouds(ctx, cam, cw, ch);
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

function drawTerrain(ctx, cam, cw, ch, view) {
  const a = game.ownedArea;
  const q = game.settings.quality;
  for (let x = view.x0; x < view.x1; x++) {
    for (let y = view.y0; y < view.y1; y++) {
      const corners = tileCorners(cam, cw, ch, x, y);
      const owned = inOwnedArea(x, y);
      const h = tileHash(x, y);
      const alt = (x + y) % 2 === 0;
      let fill;
      if (owned) {
        fill = h > 0.93 ? COLORS.grassOwnedDeep : (alt ? COLORS.grassOwned : COLORS.grassOwnedAlt);
      } else {
        fill = h > 0.93 ? COLORS.grassLockedDeep : (alt ? COLORS.grassLocked : COLORS.grassLockedAlt);
      }
      drawTileDiamond(ctx, corners, fill, 'rgba(0,0,0,0.05)');

      if (q === 'baixa') continue;

      const occupied = !!occupancy[occIndex(x, y)];
      if (owned && !occupied) {
        if (h > 0.955) {
          drawDirtPatch(ctx, cam, cw, ch, x, y, h);
        } else if (h > 0.9) {
          drawWildflowers(ctx, cam, cw, ch, x, y, h);
        } else if (h > 0.8) {
          drawGrassTuft(ctx, cam, cw, ch, x, y, h);
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

function drawGrassTuft(ctx, cam, cw, ch, x, y, h) {
  ctx.fillStyle = 'rgba(52,120,35,0.5)';
  for (let i = 0; i < 3; i++) {
    const hx = tileHash(x * 7 + i, y * 13 + 1);
    const hy = tileHash(x * 3 + 2, y * 5 + i);
    const pp = projectPoint(x + 0.2 + hx * 0.6, y + 0.2 + hy * 0.6, 0);
    const pt = worldToScreen(cam, pp.x, pp.y, cw, ch);
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y, 2.2 * cam.zoom, 1.4 * cam.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWildflowers(ctx, cam, cw, ch, x, y, h) {
  const palette = ['#ff8a80', '#fff176', '#ce93d8', '#ffab91'];
  for (let i = 0; i < 3; i++) {
    const hx = tileHash(x * 11 + i, y * 17 + 3);
    const hy = tileHash(x * 5 + 4, y * 9 + i);
    const pp = projectPoint(x + 0.15 + hx * 0.7, y + 0.15 + hy * 0.7, 0.06);
    const pt = worldToScreen(cam, pp.x, pp.y, cw, ch);
    ctx.fillStyle = palette[Math.floor(hx * palette.length)];
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffde7';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 0.8 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
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
  ctx.fillStyle = `rgba(20,40,10,${strength || 0.18})`;
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
    case 'flowers': drawFlowers(ctx, cam, cw, ch, gx, gy); break;
    case 'path':    drawPath(ctx, cam, cw, ch, gx, gy); break;
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
  drawPrism(ctx, cam, cw, ch, gx + w - 0.2, gy + d * 0.45 + 0.1, 0.18, 0.7, 0.12, '#bcaaa4');

  // janelas com moldura e brilho
  ctx.fillStyle = '#7ec8e3';
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
function drawTree(ctx, cam, cw, ch, gx, gy, q) {
  drawShadow(ctx, cam, cw, ch, gx, gy, 1, 1, 0.22);
  drawPrism(ctx, cam, cw, ch, gx + 0.42, gy + 0.42, 0.16, 0.16, 0.5, '#795548');
  drawPrism(ctx, cam, cw, ch, gx + 0.46, gy + 0.46, 0.08, 0.08, 0.62, '#5d4037');
  drawSphere(ctx, cam, cw, ch, gx + 0.5, gy + 0.5, 0.95, 0.5, '#2e7d32');
  if (q !== 'baixa') {
    drawSphere(ctx, cam, cw, ch, gx + 0.3, gy + 0.45, 0.72, 0.34, '#388e3c');
    drawSphere(ctx, cam, cw, ch, gx + 0.68, gy + 0.6, 0.78, 0.3, '#43a047');
    drawSphere(ctx, cam, cw, ch, gx + 0.5, gy + 0.35, 1.15, 0.3, '#4caf50');
    const h = tileHash(gx + 3, gy + 7);
    if (h > 0.4) {
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

/* ---------- Nuvens à deriva ---------- */
const CLOUDS = [
  { x: 0.15, y: 0.12, s: 1.0, v: 8 },
  { x: 0.55, y: 0.2, s: 0.7, v: 12 },
  { x: 0.85, y: 0.08, s: 1.3, v: 6 },
  { x: 0.35, y: 0.3, s: 0.55, v: 15 }
];

function drawClouds(ctx, cam, cw, ch) {
  if (game.settings.quality === 'baixa') return;
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (const c of CLOUDS) {
    const cx = ((c.x + t * c.v / cw) % 1.2 - 0.1) * cw;
    const cy = c.y * ch;
    const r = 26 * c.s;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.9, cy + r * 0.15, r * 0.75, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.85, cy + r * 0.2, r * 0.65, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.1, cy - r * 0.45, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- Prévia fantasma (construir / mover / girar) ---------- */
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
