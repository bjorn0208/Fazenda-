/* ================= FAZENDA 3D — ANIMAIS AMBIENTES =================
   Galinhas, vacas e porcos caminham livremente pelos tiles livres
   da fazenda, com animação de passos e pausas para descansar. */

const ANIMAL_KINDS = {
  chicken: { speed: 0.9, scale: 0.55, cycle: 40 },
  duck:    { speed: 0.7, scale: 0.62, cycle: 55 },
  cow:     { speed: 0.45, scale: 1.0, cycle: 60 },
  pig:     { speed: 0.6, scale: 0.8 },
  horse:   { speed: 1.4, scale: 1.05 },
  sheep:   { speed: 0.5, scale: 0.92, cycle: 70 }
};

const MAX_PRODUCT = 3;

const ANIMAL_SPAWN = ['chicken', 'chicken', 'pig', 'cow', 'cow', 'cow', 'sheep'];

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function randomFreeTile() {
  const a = game.ownedArea;
  for (let tries = 0; tries < 60; tries++) {
    const x = a.x0 + Math.floor(Math.random() * (a.x1 - a.x0 + 1));
    const y = a.y0 + Math.floor(Math.random() * (a.y1 - a.y0 + 1));
    if (!occupancy[occIndex(x, y)]) return { x, y };
  }
  return null;
}

function herdPassable(x, y) {
  return inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)];
}

/* BFS no grid: devolve a lista de tiles do caminho (sem o inicio) ou null. */
function gridPath(sx, sy, tx, ty, walkFn) {
  if (sx === tx && sy === ty) return [];
  const N = GRID_SIZE;
  const prev = new Int32Array(N * N).fill(-1);
  const seen = new Uint8Array(N * N);
  const q = [sy * N + sx];
  seen[sy * N + sx] = 1;
  let found = -1;
  for (let qi = 0; qi < q.length && found < 0; qi++) {
    const cur = q[qi];
    const cxx = cur % N, cyy = (cur - cxx) / N;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cxx + dx, ny = cyy + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const ni = ny * N + nx;
      if (seen[ni]) continue;
      const isTarget = nx === tx && ny === ty;
      if (!isTarget && !walkFn(nx, ny)) continue;
      seen[ni] = 1;
      prev[ni] = cur;
      q.push(ni);
      if (isTarget) { found = ni; break; }
    }
  }
  if (found < 0) return null;
  const path = [];
  let cur = found;
  while (cur !== sy * N + sx) {
    const cxx = cur % N, cyy = (cur - cxx) / N;
    path.push({ x: cxx, y: cyy });
    cur = prev[cur];
  }
  return path.reverse();
}

function animalWalkable(a, x, y) {
  if (!inBounds(x, y) || !inOwnedArea(x, y)) return false;
  if (lakeAt(x, y)) return a.kind === 'duck';
  if (occupancy[occIndex(x, y)]) return false;
  const pen = game.pen;
  if (!pen) return true;
  if (x === pen.gateX && y === pen.gateY) return false;
  const inside = Math.floor(a.gx) >= pen.x0 && Math.floor(a.gx) <= pen.x1 &&
                 Math.floor(a.gy) >= pen.y0 && Math.floor(a.gy) <= pen.y1;
  if (inside && (x < pen.x0 || x > pen.x1 || y < pen.y0 || y > pen.y1)) return false;
  return true;
}

function inPen(a) {
  const pen = game.pen;
  if (!pen) return false;
  return Math.floor(a.gx) >= pen.x0 && Math.floor(a.gx) <= pen.x1 &&
         Math.floor(a.gy) >= pen.y0 && Math.floor(a.gy) <= pen.y1;
}

function randomPenTile() {
  const pen = game.pen;
  if (!pen) return null;
  for (let tries = 0; tries < 60; tries++) {
    const x = pen.x0 + 1 + Math.floor(Math.random() * (pen.x1 - pen.x0 - 1));
    const y = pen.y0 + 1 + Math.floor(Math.random() * (pen.y1 - pen.y0 - 1));
    if (!occupancy[occIndex(x, y)]) return { x, y };
  }
  return null;
}

/* Cachorro assusta: o animal corre para o portao e entra no curral. */
function startHerdPath(a, tx, ty) {
  const path = gridPath(Math.floor(a.gx), Math.floor(a.gy), tx, ty, herdPassable);
  if (path) {
    a.path = path;
    a.tx = tx + 0.5;
    a.ty = ty + 0.5;
    if (a.path.length) {
      const w = a.path.shift();
      a.tx = w.x + 0.5;
      a.ty = w.y + 0.5;
    }
  } else {
    const cx = Math.floor(a.gx), cy = Math.floor(a.gy);
    const opts = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (animalWalkable(a, cx + dx, cy + dy)) opts.push([cx + dx, cy + dy]);
    }
    if (!opts.length) { a.herdStage = 0; a.walking = false; return; }
    const [nx, ny] = opts[Math.floor(Math.random() * opts.length)];
    a.path = [];
    a.tx = nx + 0.5;
    a.ty = ny + 0.5;
  }
  a.walking = true;
}

function herdAnimal(a) {
  const pen = game.pen;
  if (!pen || inPen(a)) return false;
  a.scaredT = 8;
  a.grazing = false;
  a.herdStage = 1;
  a.herdOut = false;
  startHerdPath(a, pen.gateX, pen.gateY);
  return true;
}

/* Ao amanhecer: cachorro espanta os animais do curral para pastarem. */
function releaseAnimal(a) {
  const pen = game.pen;
  if (!pen || !inPen(a)) return false;
  a.scaredT = 8;
  a.grazing = false;
  a.herdStage = 1;
  a.herdOut = true;
  startHerdPath(a, pen.gateX, pen.gateY);
  return true;
}

function outsideGateTile() {
  const pen = game.pen;
  if (!pen) return randomFreeTile();
  const x = pen.gateX, y = pen.gateY + 1;
  if (inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)]) return { x, y };
  return randomFreeTile();
}

function spawnAnimals() {
  if (game.animals.length) return;
  for (const kind of ANIMAL_SPAWN) {
    const spot = randomFreeTile();
    if (!spot) return;
    game.animals.push(makeAnimal(kind, spot));
  }
}

function makeAnimal(kind, spot) {
  return {
    id: game.nextId++, kind,
    gx: spot.x + 0.5, gy: spot.y + 0.5,
    tx: spot.x + 0.5, ty: spot.y + 0.5,
    walking: false, wait: 1 + Math.random() * 4,
    phase: Math.random() * 10,
    speedMul: 0.85 + Math.random() * 0.3,
    grazing: false,
    dirCur: Math.random() < 0.5 ? -1 : 1,
    face: 0,
    lastDir: 1,
    herdStage: 0,
    scaredT: 0,
    bornAt: Date.now(),
    age: 0,
    product: 0,
    prodT: 0
  };
}

function animalUpdateOne(a, dt) {
  a.phase += dt;
  a.age += dt;
  if (isAdult(a) && a.kind !== 'pig' && ANIMAL_KINDS[a.kind].cycle) {
    a.prodT += dt;
    if (a.prodT >= ANIMAL_KINDS[a.kind].cycle) {
      a.prodT = 0;
      if (a.product < MAX_PRODUCT) a.product++;
    }
  }
  if (a.walking) {
    a.grazing = false;
    if (a.scaredT > 0) a.scaredT -= dt;
    const base = ANIMAL_KINDS[a.kind].speed * (a.speedMul || 1);
    const speed = (a.scaredT > 0 || a.herdStage > 0) ? Math.max(base, ANIMAL_KINDS.horse.speed) : base;
    const dx = a.tx - a.gx, dy = a.ty - a.gy;
    const sdx = dx - dy, sdy = (dx + dy) * 0.5;
    if (sdx * sdx + sdy * sdy > 1e-6) {
      a.face = lerpAngle(a.face, Math.atan2(sdy, sdx), Math.min(1, dt * 6));
      const fx = Math.cos(a.face);
      if (Math.abs(fx) >= 0.15) a.lastDir = fx >= 0 ? 1 : -1;
    }
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step) {
      a.gx = a.tx; a.gy = a.ty;
      if (a.path && a.path.length) {
        const w = a.path.shift();
        a.tx = w.x + 0.5; a.ty = w.y + 0.5;
      } else if (a.herdStage === 1) {
        a.herdStage = 2;
        const spot = a.herdOut ? (randomFreeTile() || outsideGateTile()) : randomPenTile();
        if (spot) startHerdPath(a, spot.x, spot.y);
        else { a.herdStage = 0; a.walking = false; a.wait = 1; }
      } else if (a.herdStage === 2) {
        a.herdStage = 0;
        a.herdOut = false;
        a.walking = false;
        a.grazing = true;
        a.wait = 2 + Math.random() * 3;
      } else {
        a.walking = false;
        if (Math.random() < 0.45) {
          a.grazing = true;
          a.wait = 2 + Math.random() * 4;
        } else {
          a.wait = 1 + Math.random() * 3.5;
        }
      }
    } else {
      a.gx += dx / dist * step;
      a.gy += dy / dist * step;
    }
  } else {
    a.wait -= dt;
    if (a.wait <= 0) {
      const lk = (a.kind === 'duck' && Math.random() < 0.45) ? lakeBuilding() : null;
      if (lk) {
        const lx = lk.gx + Math.floor(Math.random() * lk.w);
        const ly = lk.gy + Math.floor(Math.random() * lk.d);
        a.tx = lx + 0.5; a.ty = ly + 0.5;
        a.walking = true;
      } else {
        const cx = Math.floor(a.gx), cy = Math.floor(a.gy);
        const opts = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (animalWalkable(a, cx + dx, cy + dy)) opts.push([cx + dx, cy + dy]);
        }
        if (opts.length) {
          const [nx, ny] = opts[Math.floor(Math.random() * opts.length)];
          a.tx = nx + 0.5; a.ty = ny + 0.5;
          a.walking = true;
        } else {
          a.wait = 2;
        }
      }
    }
  }
}

function updateAnimals(dt) {
  for (const a of game.animals) {
    if (a.speedMul === undefined) {
      a.speedMul = 0.85 + Math.random() * 0.3;
      a.grazing = false;
      a.dirCur = 1;
    }
    if (a.face === undefined) a.face = (a.dirCur || 1) >= 0 ? 0 : Math.PI;
    if (a.lastDir === undefined) a.lastDir = (a.dirCur || 1) >= 0 ? 1 : -1;
    if (a.herdStage === undefined) a.herdStage = 0;
    if (a.scaredT === undefined) a.scaredT = 0;
    if (a.herdOut === undefined) a.herdOut = false;
    if (a.bornAt === undefined) a.bornAt = Date.now();
    if (a.age === undefined) a.age = 999;
    if (a.product === undefined) a.product = 0;
    if (a.prodT === undefined) a.prodT = 0;
    animalUpdateOne(a, dt);
    if (!game.visiting && Math.random() < dt * 0.004) playSound(a.kind);
  }
}

function drawAnimal(ctx, cam, cw, ch, a) {
  const p = projectPoint(a.gx, a.gy, 0);
  const s = worldToScreen(cam, p.x, p.y, cw, ch);
  const z = cam.zoom;
  const k = ANIMAL_KINDS[a.kind];
  const grazing = !!a.grazing && !a.walking;
  const swim = a.kind === 'duck' && lakeAt(Math.floor(a.gx), Math.floor(a.gy));
  const bob = swim ? Math.sin(a.phase * 3) * 1.6 * z
            : a.walking ? Math.abs(Math.sin(a.phase * 9)) * 3 * z
            : grazing ? Math.abs(Math.sin(a.phase * 5)) * 1.6 * z
            : Math.sin(a.phase * 2) * 0.8 * z;
  const lightK = 0.35 + 0.65 * dayLight();
  const babyK = isAdult(a) ? 1 : 0.55 + 0.45 * Math.min(1, a.age / ANIMAL_GROW_S);
  const face = a.face !== undefined ? a.face : ((a.dirCur || 1) >= 0 ? 0 : Math.PI);
  const fx = Math.cos(face);
  const dir = Math.abs(fx) < 0.15 ? (a.lastDir || 1) : (fx >= 0 ? 1 : -1);
  const squash = Math.max(0.5, Math.abs(fx));

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(z * k.scale * squash * babyK, z * k.scale * babyK);
  if (grazing) ctx.rotate(dir * 0.14);

  ctx.fillStyle = 'rgba(20,40,10,' + (0.2 * lightK).toFixed(3) + ')';
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (a.kind === 'duck') {
    const lk = lakeAt(Math.floor(a.gx), Math.floor(a.gy));
    drawDuck(ctx, bob, dir, a.walking, a.phase, !!lk);
  } else if (a.kind === 'chicken') drawChicken(ctx, bob, dir, a.walking, a.phase);
  else if (a.kind === 'cow') drawCow(ctx, bob, dir, a.walking, a.phase);
  else if (a.kind === 'horse') drawHorse(ctx, bob, dir, a.walking, a.phase);
  else if (a.kind === 'sheep') drawSheep(ctx, bob, dir, a.walking, a.phase, a);
  else drawPig(ctx, bob, dir, a.walking, a.phase);

  ctx.restore();

  if (grazing) {
    const heads = { chicken: [13, -14.5], cow: [23, -22], pig: [15, -13], horse: [24, -22], sheep: [21, -18] };
    const hp = heads[a.kind] || [14, -14];
    drawGrazingBits(ctx, s.x + dir * hp[0] * z * k.scale * squash, s.y + hp[1] * z * k.scale, z, dir, a.phase);
  }

  let icon = null;
  if (a.kind === 'pig') {
    if (a.bornAt !== undefined && Date.now() - a.bornAt >= PIG_SLAUGHTER_MS) icon = '🥓';
  } else if (a.product > 0 && ANIMALS[a.kind] && ANIMALS[a.kind].product) {
    icon = ANIMALS[a.kind].product;
  }
  if (icon) {
    const bob2 = Math.sin(a.phase * 3) * 2 * z;
    ctx.font = Math.max(10, 13 * z) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(icon, s.x, s.y - 30 * z * k.scale + bob2);
  }
}

/* Pato: caminha de nadadeiras curtas em terra, nada de boia no lago */
function drawDuck(ctx, bob, dir, walking, phase, swimming) {
  const legSwing = walking && !swimming ? Math.sin(phase * 9) * 2.5 : 0;
  const d = dir >= 0 ? 1 : -1;
  if (!swimming) {
    ctx.strokeStyle = '#e69138';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-2.5, -4); ctx.lineTo(-2.5 + legSwing, 1);
    ctx.moveTo(2.5, -4); ctx.lineTo(2.5 - legSwing, 1);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 14, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const y0 = swimming ? -6 + bob * 0.6 : -9 + bob * 0.5;
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.ellipse(0, y0, 9, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cfd8dc';
  ctx.beginPath();
  ctx.ellipse(d * -2, y0 + 3.5, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fafafa';
  ctx.beginPath();
  ctx.moveTo(d * -6, y0 - 2);
  ctx.lineTo(d * -11, y0 - 5);
  ctx.lineTo(d * -6, y0 + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.ellipse(d * 7, y0 - 10, 3.8, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f9a825';
  ctx.beginPath();
  ctx.moveTo(d * 9.5, y0 - 10.5);
  ctx.lineTo(d * 15, y0 - 9);
  ctx.lineTo(d * 9.5, y0 - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#263238';
  ctx.beginPath();
  ctx.arc(d * 8.2, y0 - 11.2, 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawSheep(ctx, bob, dir, walking, phase, a) {
  const legSwing = walking ? Math.sin(phase * 9) * 3 : 0;
  const woolOut = (!isAdult(a)) ? 0.5 : (a.product > 0 ? 1 : 0.35);
  const L = -1 + legSwing, R = 1 - legSwing;
  ctx.strokeStyle = '#4a4a4a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -8); ctx.lineTo(-5 + L, 0);
  ctx.moveTo(5, -8); ctx.lineTo(5 + R, 0);
  ctx.stroke();

  ctx.fillStyle = '#78909c';
  ctx.beginPath();
  ctx.ellipse(0, -11, 11.5 * (0.75 + 0.25 * woolOut), 8.5 * (0.75 + 0.25 * woolOut), 0, 0, Math.PI * 2);
  ctx.fill();

  if (woolOut > 0.2) {
    ctx.fillStyle = '#eceff1';
    for (const [wx, wy, wr] of [[-8, -11, 4.2], [-3.5, -14.5, 4.6], [1.5, -15.5, 4.8], [6.5, -14, 4.4], [9.5, -10.5, 3.8], [-9, -6.5, 3.6], [-1, -4.8, 4.6], [6, -6.2, 4]]) {
      ctx.beginPath();
      ctx.arc(wx, wy, wr * (0.55 + 0.45 * woolOut), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const faceDir = dir >= 0 ? 1 : -1;
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.ellipse(dir * 11.5, -15.5, 3.6, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.ellipse(dir * 14.5 * 0 + dir * 10.5, -19, 2.8, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#263238';
  ctx.beginPath();
  ctx.arc(dir * 12.6, -15.8, 0.75, 0, Math.PI * 2);
  ctx.arc(dir * 13.4, -15.2, 0.75, 0, Math.PI * 2);
  ctx.fill();
}

function drawChicken(ctx, bob, dir, walking, phase) {
  const legSwing = walking ? Math.sin(phase * 9) * 3 : 0;
  ctx.strokeStyle = '#e69138';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-3, -4); ctx.lineTo(-3 + legSwing, 1);
  ctx.moveTo(3, -4); ctx.lineTo(3 - legSwing, 1);
  ctx.stroke();

  ctx.fillStyle = '#fafafa';
  ctx.beginPath();
  ctx.ellipse(0, -9 + bob * 0.5, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(160,160,160,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, -5.5 + bob * 0.5, 7, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ededed';
  ctx.beginPath();
  ctx.ellipse(dir * -2, -9.5 + bob * 0.5, 4.5, 3.2, dir * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,120,120,0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(dir * -4, -10.5 + bob * 0.5);
  ctx.lineTo(dir * -0.5, -10 + bob * 0.5);
  ctx.moveTo(dir * -4, -8.8 + bob * 0.5);
  ctx.lineTo(dir * -0.5, -8.6 + bob * 0.5);
  ctx.stroke();

  ctx.fillStyle = '#e0e0e0';
  ctx.beginPath();
  ctx.moveTo(dir * -8, -10 + bob * 0.5);
  ctx.lineTo(dir * -14, -14 + bob * 0.5);
  ctx.lineTo(dir * -8, -6 + bob * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fafafa';
  ctx.beginPath();
  ctx.arc(dir * 6, -16 + bob, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.arc(dir * 5, -21 + bob, 1.8, 0, Math.PI * 2);
  ctx.arc(dir * 7, -20.5 + bob, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  ctx.moveTo(dir * 10, -16 + bob);
  ctx.lineTo(dir * 15, -14.5 + bob);
  ctx.lineTo(dir * 10, -13.5 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(dir * 7.5, -17 + bob, 1, 0, Math.PI * 2);
  ctx.fill();
}

/* Filetes de grama sendo comidos (desenhados fora do scale do bicho). */
function drawGrazingBits(ctx, hx, hy, z, dir, phase) {
  const k = 0.5 + 0.5 * Math.sin(phase * 5);
  ctx.strokeStyle = '#4c9c33';
  ctx.lineWidth = Math.max(1, 1.2 * z);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const bx = hx + dir * (i * 3 - 3) * z;
    const len = (2.5 + i) * z * (1 - k * 0.6);
    ctx.beginPath();
    ctx.moveTo(bx, hy);
    ctx.quadraticCurveTo(bx + dir * 1.2 * z, hy - len * 0.6, bx + dir * 2 * z, hy - len);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawCow(ctx, bob, dir, walking, phase) {
  const legSwing = walking ? Math.sin(phase * 5) * 2.5 : 0;
  ctx.strokeStyle = '#e8e4dc';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, -10); ctx.lineTo(-10 + legSwing, 1);
  ctx.moveTo(10, -10); ctx.lineTo(10 - legSwing, 1);
  ctx.moveTo(-4, -10); ctx.lineTo(-4 - legSwing, 1);
  ctx.moveTo(4, -10); ctx.lineTo(4 + legSwing, 1);
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.fillStyle = '#4e342e';
  ctx.beginPath();
  ctx.ellipse(-10 + legSwing, 1, 2.2, 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(10 - legSwing, 1, 2.2, 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(-4 - legSwing, 1, 2.2, 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(4 + legSwing, 1, 2.2, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5f1e8';
  ctx.beginPath();
  ctx.ellipse(0, -14 + bob * 0.4, 17, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(140,125,105,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, -8.5 + bob * 0.4, 13, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#424242';
  ctx.beginPath();
  ctx.ellipse(-6, -16 + bob * 0.4, 5, 4, 0.4, 0, Math.PI * 2);
  ctx.ellipse(7, -11 + bob * 0.4, 4, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8bbd0';
  ctx.beginPath();
  ctx.ellipse(dir * -9, -8 + bob * 0.4, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e91e63';
  ctx.beginPath();
  ctx.arc(dir * -10.5, -7 + bob * 0.4, 0.8, 0, Math.PI * 2);
  ctx.arc(dir * -7.5, -7 + bob * 0.4, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e8e4dc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dir * -16, -16 + bob * 0.4);
  ctx.quadraticCurveTo(dir * -21, -14 + bob * 0.4, dir * -20, -8 + bob * 0.4);
  ctx.stroke();
  ctx.fillStyle = '#6d4c41';
  ctx.beginPath();
  ctx.arc(dir * -20, -7 + bob * 0.4, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e8e4dc';
  ctx.beginPath();
  ctx.ellipse(dir * 12.5, -22.5 + bob, 3, 1.8, 0.5, 0, Math.PI * 2);
  ctx.ellipse(dir * 23.5, -22.5 + bob, 3, 1.8, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d7ccc8';
  ctx.beginPath();
  ctx.arc(dir * 12.5, -22.5 + bob, 1.2, 0, Math.PI * 2);
  ctx.arc(dir * 23.5, -22.5 + bob, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5f1e8';
  ctx.beginPath();
  ctx.ellipse(dir * 18, -20 + bob, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d7ccc8';
  ctx.beginPath();
  ctx.ellipse(dir * 22, -17 + bob, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8d6e63';
  ctx.beginPath();
  ctx.arc(dir * 21, -17.5 + bob, 0.9, 0, Math.PI * 2);
  ctx.arc(dir * 23.5, -17.5 + bob, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#eceff1';
  ctx.beginPath();
  ctx.moveTo(dir * 15, -25 + bob);
  ctx.lineTo(dir * 12, -29 + bob);
  ctx.lineTo(dir * 18, -27 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(dir * 21, -24.5 + bob);
  ctx.lineTo(dir * 24.5, -28 + bob);
  ctx.lineTo(dir * 18.5, -26.5 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d7ccc8';
  ctx.beginPath();
  ctx.ellipse(dir * 13, -25 + bob, 2.5, 1.5, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(dir * 19, -22 + bob, 1.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawPig(ctx, bob, dir, walking, phase) {
  const legSwing = walking ? Math.sin(phase * 7) * 2.5 : 0;
  ctx.strokeStyle = '#f2b3c2';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7, -7); ctx.lineTo(-7 + legSwing, 1);
  ctx.moveTo(7, -7); ctx.lineTo(7 - legSwing, 1);
  ctx.moveTo(-2, -7); ctx.lineTo(-2 - legSwing, 1);
  ctx.moveTo(2, -7); ctx.lineTo(2 + legSwing, 1);
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.fillStyle = '#8d5a6b';
  ctx.beginPath();
  ctx.ellipse(-7 + legSwing, 1, 1.9, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(7 - legSwing, 1, 1.9, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(-2 - legSwing, 1, 1.9, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(2 + legSwing, 1, 1.9, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f4a9bc';
  ctx.beginPath();
  ctx.ellipse(0, -11 + bob * 0.5, 13, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(190,110,135,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, -6.5 + bob * 0.5, 10, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(140,90,60,0.45)';
  ctx.beginPath();
  ctx.ellipse(-5, -14 + bob * 0.5, 3, 2, 0.3, 0, Math.PI * 2);
  ctx.ellipse(6, -9 + bob * 0.5, 2.4, 1.6, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e28ba0';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(dir * -13, -11 + bob * 0.5, 3, 0.5, 4.5);
  ctx.stroke();

  ctx.fillStyle = '#f4a9bc';
  ctx.beginPath();
  ctx.ellipse(dir * 12, -14 + bob, 6.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e28ba0';
  ctx.beginPath();
  ctx.moveTo(dir * 9, -19 + bob);
  ctx.lineTo(dir * 7, -23 + bob);
  ctx.lineTo(dir * 12, -21 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ec8aa5';
  ctx.beginPath();
  ctx.ellipse(dir * 17, -13 + bob, 3.5, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c96f88';
  ctx.beginPath();
  ctx.arc(dir * 16, -13 + bob, 0.8, 0, Math.PI * 2);
  ctx.arc(dir * 18, -13 + bob, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(dir * 13, -16 + bob, 1, 0, Math.PI * 2);
  ctx.fill();
}


/* ================= CACHORRO PASTOR ================= */

function dogWalkable(x, y) {
  return inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)];
}

function dogWalkTo(d, tx, ty) {
  d.path = gridPath(Math.floor(d.gx), Math.floor(d.gy), tx, ty, dogWalkable) || [];
  d.tx = tx + 0.5;
  d.ty = ty + 0.5;
  if (d.path.length) {
    const w = d.path.shift();
    d.tx = w.x + 0.5;
    d.ty = w.y + 0.5;
  }
  d.walking = true;
}

function updateDogs(dt) {
  for (const d of game.dogs) updateDogOne(d, dt);
}

function updateDogOne(d, dt) {
  d.phase += dt;
  if (d.walking) {
    const dx = d.tx - d.gx, dy = d.ty - d.gy;
    const sdx = dx - dy, sdy = (dx + dy) * 0.5;
    if (sdx * sdx + sdy * sdy > 1e-6) {
      d.face = lerpAngle(d.face || 0, Math.atan2(sdy, sdx), Math.min(1, dt * 8));
      const fx = Math.cos(d.face);
      if (Math.abs(fx) >= 0.15) d.lastDir = fx >= 0 ? 1 : -1;
    }
    const dist = Math.hypot(dx, dy);
    const step = 3.4 * dt;
    if (dist <= step) {
      d.gx = d.tx; d.gy = d.ty;
      if (d.path && d.path.length) {
        const w = d.path.shift();
        d.tx = w.x + 0.5; d.ty = w.y + 0.5;
      } else {
        d.walking = false;
        d.wait = 0.2;
      }
    } else {
      d.gx += dx / dist * step;
      d.gy += dy / dist * step;
    }
    return;
  }
  d.wait -= dt;
  if (d.wait > 0) return;
  if (game.pen) {
    const phase = dayPhase();
    const mode = d.active ? 'herd' : (phase === 'night' ? 'herd' : ((phase === 'dawn' || phase === 'day') ? 'release' : null));
    if (mode) {
      const wantInside = mode === 'herd';
      d.barkT = (d.barkT === undefined ? 0 : d.barkT) - dt;
      const claimed = new Set();
      for (const o of game.dogs) if (o !== d && o.targetA) claimed.add(o.targetA);
      let best = null, bestD = Infinity;
      for (const a of game.animals) {
        if (a.herdStage) continue;
        if (inPen(a) === wantInside) continue;
        const dist = Math.hypot(a.gx - d.gx, a.gy - d.gy);
        if (dist <= 10 && d.barkT <= 0) {
          if (wantInside) herdAnimal(a); else releaseAnimal(a);
        }
        if (claimed.has(a)) continue;
        if (dist < bestD) { bestD = dist; best = a; }
      }
      d.targetA = best || null;
      if (d.barkT <= 0) d.barkT = 1.2;
      if (best) {
        if (bestD < 1.3) {
          if (wantInside) herdAnimal(best); else releaseAnimal(best);
          d.wait = 0.4;
        } else {
          dogWalkTo(d, Math.floor(best.gx), Math.floor(best.gy));
        }
        return;
      }
    }
  }
  const home = (!d.active && dayPhase() !== 'night') ? doghouseSpot() : null;
  if (home) {
    d.resting = true;
    if (Math.hypot(home.x + 0.5 - d.gx, home.y + 0.5 - d.gy) > 0.6) {
      dogWalkTo(d, home.x, home.y);
    } else {
      d.walking = false;
      d.wait = 2 + Math.random() * 3;
    }
    return;
  }
  d.resting = false;

  const cx = Math.floor(d.gx), cy = Math.floor(d.gy);
  const opts = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (dogWalkable(cx + dx, cy + dy)) opts.push([cx + dx, cy + dy]);
  }
  if (opts.length) {
    const [nx, ny] = opts[Math.floor(Math.random() * opts.length)];
    dogWalkTo(d, nx, ny);
  } else {
    d.wait = 2;
  }
}

function drawDog(ctx, cam, cw, ch, d) {
  const p = projectPoint(d.gx, d.gy, 0);
  const s = worldToScreen(cam, p.x, p.y, cw, ch);
  const z = cam.zoom;
  const bob = d.walking ? Math.abs(Math.sin(d.phase * 10)) * 2.5 * z : Math.sin(d.phase * 2) * 0.7 * z;
  const face = d.face || 0;
  const fx = Math.cos(face);
  const dir = Math.abs(fx) < 0.15 ? (d.lastDir || 1) : (fx >= 0 ? 1 : -1);
  const squash = Math.max(0.5, Math.abs(fx));

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(z * 0.75 * squash, z * 0.75);

  ctx.fillStyle = 'rgba(20,40,10,' + (0.2 * (0.35 + 0.65 * dayLight())).toFixed(3) + ')';
  ctx.beginPath();
  ctx.ellipse(0, 2, 13, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const legSwing = d.walking ? Math.sin(d.phase * 10) * 3 : 0;
  ctx.strokeStyle = '#8d6e63';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -7); ctx.lineTo(-8 + legSwing, 1);
  ctx.moveTo(8, -7); ctx.lineTo(8 - legSwing, 1);
  ctx.moveTo(-3, -7); ctx.lineTo(-3 - legSwing, 1);
  ctx.moveTo(3, -7); ctx.lineTo(3 + legSwing, 1);
  ctx.stroke();
  ctx.lineCap = 'butt';

  const wag = d.active ? Math.sin(d.phase * 12) * 4 : Math.sin(d.phase * 3) * 1.5;
  ctx.strokeStyle = '#795548';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(dir * -11, -13 + bob);
  ctx.quadraticCurveTo(dir * -16, -17 + bob + wag, dir * -18, -14 + bob + wag);
  ctx.stroke();

  ctx.fillStyle = '#a1887f';
  ctx.beginPath();
  ctx.ellipse(0, -11 + bob * 0.5, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(120,100,85,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, -6.5 + bob * 0.5, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a1887f';
  ctx.beginPath();
  ctx.ellipse(dir * 12, -16 + bob, 6, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#795548';
  ctx.beginPath();
  ctx.moveTo(dir * 9, -20 + bob);
  ctx.lineTo(dir * 8, -26 + bob);
  ctx.lineTo(dir * 12.5, -21.5 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(dir * 14, -20.5 + bob);
  ctx.lineTo(dir * 15.5, -26 + bob);
  ctx.lineTo(dir * 17, -20 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#8d6e63';
  ctx.beginPath();
  ctx.ellipse(dir * 17.5, -15 + bob, 3, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.arc(dir * 20, -15 + bob, 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(dir * 13.5, -17.5 + bob, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e53935';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(dir * 8.5, -13.5 + bob, 3.2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  if (d.resting && !d.walking) {
    ctx.font = Math.max(9, 11 * z) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.75;
    ctx.fillText('💤', s.x + 10 * z, s.y - 26 * z + Math.sin(d.phase * 2) * 2 * z);
    ctx.globalAlpha = 1;
  }
}


/* ================= CAVALO ================= */

/* Corpo do cavalo reutilizado pelo fazendeiro montado. */
function drawHorseBody(ctx, bob, dir, walking, phase) {
  const legSwing = walking ? Math.sin(phase * 7) * 3.5 : 0;
  ctx.strokeStyle = '#6d4c41';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, -12); ctx.lineTo(-12 + legSwing, 1);
  ctx.moveTo(12, -12); ctx.lineTo(12 - legSwing, 1);
  ctx.moveTo(-5, -12); ctx.lineTo(-5 - legSwing, 1);
  ctx.moveTo(5, -12); ctx.lineTo(5 + legSwing, 1);
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.ellipse(-12 + legSwing, 1, 2.2, 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(12 - legSwing, 1, 2.2, 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(-5 - legSwing, 1, 2.2, 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(5 + legSwing, 1, 2.2, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8d6e63';
  ctx.beginPath();
  ctx.ellipse(0, -18 + bob * 0.4, 17, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(80,60,45,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, -12 + bob * 0.4, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#795548';
  ctx.beginPath();
  ctx.ellipse(dir * -10, -19 + bob * 0.4, 6.5, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(dir * 12, -18 + bob * 0.4, 5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(dir * -13, -23.5 + bob * 0.4);
  ctx.quadraticCurveTo(0, -26.5 + bob * 0.4, dir * 13, -24 + bob * 0.4);
  ctx.stroke();

  ctx.fillStyle = '#1976d2';
  ctx.beginPath();
  ctx.ellipse(0, -22.5 + bob * 0.4, 7.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e91e63';
  ctx.beginPath();
  ctx.ellipse(0, -22.5 + bob * 0.4, 7.5, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#795548';
  ctx.beginPath();
  ctx.ellipse(-4, -20 + bob * 0.4, 6, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4e342e';
  ctx.beginPath();
  ctx.ellipse(0, -24 + bob * 0.4, 6.5, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8d6e63';
  ctx.beginPath();
  ctx.ellipse(0, -25.2 + bob * 0.4, 4.2, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, -22.5 + bob * 0.4);
  ctx.lineTo(-5, -12 + bob * 0.4);
  ctx.moveTo(6, -22.5 + bob * 0.4);
  ctx.lineTo(5, -12 + bob * 0.4);
  ctx.stroke();

  const tailWag = walking ? Math.sin(phase * 7) * 3 : Math.sin(phase * 2) * 1.5;
  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(dir * -16, -21 + bob * 0.4);
  ctx.quadraticCurveTo(dir * -22, -18 + bob * 0.4 + tailWag, dir * -23, -11 + bob * 0.4 + tailWag);
  ctx.stroke();
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dir * -16, -20 + bob * 0.4);
  ctx.quadraticCurveTo(dir * -20.5, -16 + bob * 0.4 + tailWag, dir * -21.5, -9 + bob * 0.4 + tailWag);
  ctx.stroke();

  ctx.fillStyle = '#8d6e63';
  ctx.beginPath();
  ctx.ellipse(dir * 17, -25 + bob, 6.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a1887f';
  ctx.beginPath();
  ctx.ellipse(dir * 22, -23.5 + bob, 3.2, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4e342e';
  ctx.beginPath();
  ctx.arc(dir * 23.5, -24 + bob, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(dir * 20.5, -24 + bob);
  ctx.lineTo(dir * 21.5, -20 + bob);
  ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(dir * 17.5, -27 + bob, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(dir * 17.1, -27.4 + bob, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.arc(dir * 23.2, -23 + bob, 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(dir * 21.5, -23.5 + bob);
  ctx.quadraticCurveTo(dir * 10, -22 + bob, dir * 2, -23.5 + bob * 0.4);
  ctx.stroke();

  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.moveTo(dir * 13, -29 + bob);
  ctx.quadraticCurveTo(dir * 15, -36 + bob, dir * 18, -30 + bob);
  ctx.quadraticCurveTo(dir * 15.5, -31.5 + bob, dir * 13, -29 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.moveTo(dir * 14, -29 + bob);
  ctx.quadraticCurveTo(dir * 8, -27 + bob, dir * 4, -24 + bob * 0.4);
  ctx.quadraticCurveTo(dir * 9, -25.5 + bob, dir * 14.5, -27.5 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(dir * 17, -30 + bob);
  ctx.lineTo(dir * 21, -24 + bob);
  ctx.moveTo(dir * 15, -26 + bob);
  ctx.lineTo(dir * 21, -22.5 + bob);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(dir * 18.5, -26.5 + bob, 1.1, 2.2, dir * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e91e63';
  ctx.beginPath();
  ctx.ellipse(dir * 11, -20 + bob, 1.6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHorse(ctx, bob, dir, walking, phase) {
  ctx.fillStyle = 'rgba(20,40,10,' + (0.2 * (0.35 + 0.65 * dayLight())).toFixed(3) + ')';
  ctx.beginPath();
  ctx.ellipse(0, 2, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  drawHorseBody(ctx, bob, dir, walking, phase);
}
