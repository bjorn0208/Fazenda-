/* ================= FAZENDA 3D — ANIMAIS AMBIENTES =================
   Galinhas, vacas e porcos caminham livremente pelos tiles livres
   da fazenda, com animação de passos e pausas para descansar. */

const ANIMAL_KINDS = {
  chicken: { speed: 0.9, scale: 0.55, cycle: 40 },
  cow:     { speed: 0.45, scale: 1.0, cycle: 60 },
  pig:     { speed: 0.6, scale: 0.8 },
  horse:   { speed: 1.4, scale: 1.05 }
};

const MAX_PRODUCT = 3;

const ANIMAL_SPAWN = ['chicken', 'chicken', 'pig', 'cow', 'cow'];

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

function animalWalkable(a, x, y) {
  if (!inBounds(x, y) || !inOwnedArea(x, y) || occupancy[occIndex(x, y)]) return false;
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
function herdAnimal(a) {
  const pen = game.pen;
  if (!pen || inPen(a)) return false;
  a.scaredT = 8;
  a.grazing = false;
  a.herdStage = 1;
  a.herdOut = false;
  a.tx = pen.gateX + 0.5;
  a.ty = pen.gateY + 0.5;
  a.walking = true;
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
  a.tx = pen.gateX + 0.5;
  a.ty = pen.gateY + 0.5;
  a.walking = true;
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
    product: 0,
    prodT: 0
  };
}

function animalUpdateOne(a, dt) {
  a.phase += dt;
  if (a.kind !== 'pig' && ANIMAL_KINDS[a.kind].cycle) {
    a.prodT += dt;
    if (a.prodT >= ANIMAL_KINDS[a.kind].cycle) {
      a.prodT = 0;
      if (a.product < MAX_PRODUCT) a.product++;
    }
  }
  if (a.walking) {
    a.grazing = false;
    if (a.scaredT > 0) a.scaredT -= dt;
    const speed = ANIMAL_KINDS[a.kind].speed * (a.speedMul || 1) * (a.scaredT > 0 ? 1.8 : 1);
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
      if (a.herdStage === 1) {
        a.herdStage = 2;
        const spot = a.herdOut ? outsideGateTile() : randomPenTile();
        if (spot) { a.tx = spot.x + 0.5; a.ty = spot.y + 0.5; }
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
    if (a.product === undefined) a.product = 0;
    if (a.prodT === undefined) a.prodT = 0;
    animalUpdateOne(a, dt);
  }
}

function drawAnimal(ctx, cam, cw, ch, a) {
  const p = projectPoint(a.gx, a.gy, 0);
  const s = worldToScreen(cam, p.x, p.y, cw, ch);
  const z = cam.zoom;
  const k = ANIMAL_KINDS[a.kind];
  const grazing = !!a.grazing && !a.walking;
  const bob = grazing ? 0 : (a.walking ? Math.abs(Math.sin(a.phase * 9)) * 3 * z : Math.sin(a.phase * 2) * 0.8 * z);
  const face = a.face !== undefined ? a.face : ((a.dirCur || 1) >= 0 ? 0 : Math.PI);
  const fx = Math.cos(face);
  const dir = Math.abs(fx) < 0.15 ? (a.lastDir || 1) : (fx >= 0 ? 1 : -1);
  const squash = Math.max(0.5, Math.abs(fx));

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(z * k.scale * squash, z * k.scale);
  if (grazing) ctx.rotate(dir * 0.14);

  ctx.fillStyle = 'rgba(20,40,10,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (a.kind === 'chicken') drawChicken(ctx, bob, dir, a.walking, a.phase);
  else if (a.kind === 'cow') drawCow(ctx, bob, dir, a.walking, a.phase);
  else if (a.kind === 'horse') drawHorse(ctx, bob, dir, a.walking, a.phase);
  else drawPig(ctx, bob, dir, a.walking, a.phase);

  ctx.restore();

  let icon = null;
  if (a.kind === 'pig') {
    if (a.bornAt !== undefined && Date.now() - a.bornAt >= 300000) icon = '🥓';
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

function updateDog(dt) {
  const d = game.dog;
  if (!d) return;
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
    const step = 1.7 * dt;
    if (dist <= step) {
      d.gx = d.tx; d.gy = d.ty;
      d.walking = false;
      d.wait = 0.2;
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
      let best = null, bestD = Infinity;
      for (const a of game.animals) {
        if (a.herdStage) continue;
        if (inPen(a) === wantInside) continue;
        const dist = Math.hypot(a.gx - d.gx, a.gy - d.gy);
        if (dist <= 5 && d.barkT <= 0) {
          if (wantInside) herdAnimal(a); else releaseAnimal(a);
        }
        if (dist < bestD) { bestD = dist; best = a; }
      }
      if (d.barkT <= 0) d.barkT = 1.2;
      if (best) {
        if (bestD < 1.3) {
          if (wantInside) herdAnimal(best); else releaseAnimal(best);
          d.wait = 0.4;
        } else {
          d.tx = best.gx; d.ty = best.gy;
          d.walking = true;
        }
        return;
      }
    }
  }
  const cx = Math.floor(d.gx), cy = Math.floor(d.gy);
  const opts = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (dogWalkable(cx + dx, cy + dy)) opts.push([cx + dx, cy + dy]);
  }
  if (opts.length) {
    const [nx, ny] = opts[Math.floor(Math.random() * opts.length)];
    d.tx = nx + 0.5; d.ty = ny + 0.5;
    d.walking = true;
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

  ctx.fillStyle = 'rgba(20,40,10,0.2)';
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

  ctx.fillStyle = '#5d4037';
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
  ctx.ellipse(-4, -20 + bob * 0.4, 6, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();

  const tailWag = walking ? Math.sin(phase * 7) * 3 : Math.sin(phase * 2) * 1.5;
  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(dir * -16, -21 + bob * 0.4);
  ctx.quadraticCurveTo(dir * -22, -18 + bob * 0.4 + tailWag, dir * -23, -11 + bob * 0.4 + tailWag);
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

  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.moveTo(dir * 13, -29 + bob);
  ctx.quadraticCurveTo(dir * 15, -36 + bob, dir * 18, -30 + bob);
  ctx.quadraticCurveTo(dir * 15.5, -31.5 + bob, dir * 13, -29 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#e91e63';
  ctx.beginPath();
  ctx.ellipse(dir * 11, -20 + bob, 1.6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHorse(ctx, bob, dir, walking, phase) {
  ctx.fillStyle = 'rgba(20,40,10,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  drawHorseBody(ctx, bob, dir, walking, phase);
}
