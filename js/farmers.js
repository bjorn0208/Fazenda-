/* ================= FAZENDA 3D — FAZENDEIRO AUTOMÁTICO =================
   NPC contratável: caminha pela fazenda, planta as sementes do baú,
   rega, colhe o que ficar pronto e vende na hora pelos você. */

const FARMER_SPEED = 1.1;

function farmerWalkable(x, y) {
  return inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)];
}

/* Agenda pelo ciclo do dia: de dia arar/plantar/regar; a tarde colher; noite descansam. */
function farmerFindTillSpot(f) {
  const candidates = new Set();
  for (const c of game.crops) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = c.gx + dx, y = c.gy + dy;
      if (inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)] && !isTilled(x, y)) {
        candidates.add(x + ',' + y);
      }
    }
  }
  let best = null, bestD = Infinity;
  for (const key of candidates) {
    const [x, y] = key.split(',').map(Number);
    const d = Math.hypot(x + 0.5 - f.gx, y + 0.5 - f.gy);
    if (d < bestD) { bestD = d; best = { x, y }; }
  }
  return best;
}

function farmerFindWaterTarget(f) {
  let best = null, bestD = Infinity;
  for (const c of game.crops) {
    if (c.watered || cropProgress(c) >= 1) continue;
    const d = Math.hypot(c.gx + 0.5 - f.gx, c.gy + 0.5 - f.gy);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function hasHorse() {
  return game.animals.some(a => a.kind === 'horse');
}

/* Escolhe o proximo trabalho respeitando a fase do dia e a funcao do fazendeiro. */
function farmerFindJob(f) {
  const role = f.role || 'all';
  const phase = dayPhase();
  if (phase === 'night') return null;
  if (role !== 'animal') {
    if (phase === 'day') {
      for (const type of Object.keys(f.chest)) {
        if (f.chest[type] > 0) return { kind: 'plant', type };
      }
      const till = farmerFindTillSpot(f);
      if (till) return { kind: 'till', target: till };
      const dry = farmerFindWaterTarget(f);
      if (dry) return { kind: 'water', target: dry };
    }
    if (phase === 'afternoon') {
      let best = null, bestD = Infinity;
      for (const c of game.crops) {
        if (cropProgress(c) < 1) continue;
        const d = Math.hypot(c.gx + 0.5 - f.gx, c.gy + 0.5 - f.gy);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (best) return { kind: 'harvest', target: best };
    }
  }
  if (role !== 'plant') {
    let an = null;
    let bestD = Infinity;
    for (const a of game.animals) {
      const ready = pigReady(a) || a.product > 0;
      if (!ready) continue;
      const d = Math.hypot(a.gx - f.gx, a.gy - f.gy);
      if (d < bestD) { bestD = d; an = a; }
    }
    if (an) return { kind: 'animal', target: an };
  }
  return null;
}

function farmerFindPlantSpot(f, type) {
  const a = game.ownedArea;
  const candidates = new Set();
  for (const c of game.crops) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = c.gx + dx, y = c.gy + dy;
      if (inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)]) {
        candidates.add(x + ',' + y);
      }
    }
  }
  let best = null, bestScore = -Infinity;
  for (const key of candidates) {
    const [x, y] = key.split(',').map(Number);
    const d = Math.hypot(x + 0.5 - f.gx, y + 0.5 - f.gy);
    let score = -d;
    if (isTilled(x, y)) score += 50;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nb = occupancy[occIndex(x + dx, y + dy)];
      if (nb && nb.isCrop) score += (nb.type === type ? 20 : 5);
    }
    if (score > bestScore) { bestScore = score; best = { x, y }; }
  }
  if (best) return best;
  for (let tries = 0; tries < 40; tries++) {
    const x = a.x0 + Math.floor(Math.random() * (a.x1 - a.x0 + 1));
    const y = a.y0 + Math.floor(Math.random() * (a.y1 - a.y0 + 1));
    if (!occupancy[occIndex(x, y)]) return { x, y };
  }
  return null;
}

function updateFarmers(dt) {
  for (const f of game.farmers) {
    f.phase += dt;

    if (f.walking) {
      const dx = f.tx - f.gx, dy = f.ty - f.gy;
      const sdx = dx - dy, sdy = (dx + dy) * 0.5;
      if (sdx * sdx + sdy * sdy > 1e-6) {
        f.face = lerpAngle(f.face || 0, Math.atan2(sdy, sdx), Math.min(1, dt * 6));
        const fx = Math.cos(f.face);
        if (Math.abs(fx) >= 0.15) f.lastDir = fx >= 0 ? 1 : -1;
      }
      const dist = Math.hypot(dx, dy);
      const step = FARMER_SPEED * (f.riding ? 2.5 : 1) * dt;
      if (dist <= step) {
        f.gx = f.tx; f.gy = f.ty;
        f.walking = false;
        f.wait = 0.3;
      } else {
        f.gx += dx / dist * step;
        f.gy += dy / dist * step;
      }
      continue;
    }

    f.wait -= dt;
    if (f.wait > 0) continue;

    const job = farmerFindJob(f);

    if (job && job.kind === 'till') {
      const s = job.target;
      if (Math.hypot(s.x + 0.5 - f.gx, s.y + 0.5 - f.gy) < 0.9) {
        if (tillSoil(s.x, s.y)) spawnFloater(s.x, s.y, '\u26cf\ufe0f', '#a1887f');
        f.wait = 0.4;
      } else {
        f.riding = false;
        f.tx = s.x + 0.5; f.ty = s.y + 0.5;
        f.walking = true;
      }
      continue;
    }

    if (job && job.kind === 'water') {
      const c = job.target;
      if (Math.hypot(c.gx + 0.5 - f.gx, c.gy + 0.5 - f.gy) < 0.9) {
        if (waterCrop(c)) spawnFloater(c.gx, c.gy, '💧', '#4fc3f7');
        f.wait = 0.4;
      } else {
        f.riding = false;
        f.tx = c.gx + 0.5; f.ty = c.gy + 0.5;
        f.walking = true;
      }
      continue;
    }

    if (job && job.kind === 'harvest') {
      const c = job.target;
      if (Math.hypot(c.gx + 0.5 - f.gx, c.gy + 0.5 - f.gy) < 0.9) {
        const r = harvestCrop(c);
        if (r) spawnFloater(c.gx, c.gy, '+' + r.sell + ' 🪙', '#ffd54f');
        f.riding = false;
        f.wait = 0.4;
      } else {
        f.riding = hasHorse() && Math.hypot(c.gx + 0.5 - f.gx, c.gy + 0.5 - f.gy) > 5;
        f.tx = c.gx + 0.5; f.ty = c.gy + 0.5;
        f.walking = true;
      }
      continue;
    }

    if (job && job.kind === 'animal') {
      const a = job.target;
      if (Math.hypot(a.gx - f.gx, a.gy - f.gy) < 1.4) {
        collectAnimal(a);
        f.wait = 0.5;
      } else {
        f.riding = false;
        f.tx = a.gx; f.ty = a.gy;
        f.walking = true;
      }
      continue;
    }

    if (job && job.kind === 'plant') {
      let spot = f.jobSpot;
      if (!spot || occupancy[occIndex(spot.x, spot.y)]) {
        spot = farmerFindPlantSpot(f, job.type);
        if (!spot) { f.wait = 2; continue; }
        f.jobSpot = spot;
        f.jobType = job.type;
      }
      if (Math.hypot(spot.x + 0.5 - f.gx, spot.y + 0.5 - f.gy) < 0.9) {
        const crop = plantCrop(job.type, spot.x, spot.y, true);
        f.jobSpot = null;
        if (crop) {
          f.chest[job.type]--;
          if (f.chest[job.type] <= 0) delete f.chest[job.type];
          waterCrop(crop);
          spawnFloater(spot.x, spot.y, '🌱', '#aed581');
        }
        f.wait = 0.5;
      } else {
        f.riding = false;
        f.tx = spot.x + 0.5; f.ty = spot.y + 0.5;
        f.walking = true;
      }
      continue;
    }

    const cx = Math.floor(f.gx), cy = Math.floor(f.gy);
    const opts = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (farmerWalkable(cx + dx, cy + dy)) opts.push([cx + dx, cy + dy]);
    }
    if (opts.length) {
      const [nx, ny] = opts[Math.floor(Math.random() * opts.length)];
      f.tx = nx + 0.5; f.ty = ny + 0.5;
      f.walking = true;
    } else {
      f.wait = 2;
    }
  }
}

function drawFarmer(ctx, cam, cw, ch, f) {
  const p = projectPoint(f.gx, f.gy, 0);
  const s = worldToScreen(cam, p.x, p.y, cw, ch);
  const z = cam.zoom;
  const bob = f.walking ? Math.abs(Math.sin(f.phase * 8)) * 2.5 * z : Math.sin(f.phase * 2) * 0.6 * z;
  const legSwing = f.walking ? Math.sin(f.phase * 8) * 3 : 0;
  const armSwing = f.walking ? Math.sin(f.phase * 8 + Math.PI) * 2 : 0;
  const face = f.face || 0;
  const fx = Math.cos(face);
  const flip = Math.abs(fx) < 0.15 ? (f.lastDir || 1) : (fx >= 0 ? 1 : -1);
  const squash = Math.max(0.5, Math.abs(fx));

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(z * flip * squash, z);

  ctx.fillStyle = 'rgba(20,40,10,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 1, 8, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-2.5, -8); ctx.lineTo(-2.5 + legSwing, 0);
  ctx.moveTo(2.5, -8); ctx.lineTo(2.5 - legSwing, 0);
  ctx.stroke();

  ctx.fillStyle = '#4e342e';
  ctx.beginPath();
  ctx.ellipse(-2.5 + legSwing, 0.5, 2.2, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(2.5 - legSwing, 0.5, 2.2, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3949ab';
  ctx.beginPath();
  ctx.rect(-5, -18 + bob * 0.4, 10, 11);
  ctx.fill();

  ctx.fillStyle = '#303f9f';
  ctx.fillRect(-5, -12 + bob * 0.4, 10, 2);

  ctx.fillStyle = '#a1887f';
  ctx.beginPath();
  ctx.rect(-3.5, -17 + bob * 0.4, 7, 8.5);
  ctx.fill();
  ctx.strokeStyle = '#8d6e63';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-3.5, -17 + bob * 0.4, 7, 8.5);
  ctx.beginPath();
  ctx.moveTo(-3.5, -17 + bob * 0.4); ctx.lineTo(-5, -18.5 + bob * 0.4);
  ctx.moveTo(3.5, -17 + bob * 0.4); ctx.lineTo(5, -18.5 + bob * 0.4);
  ctx.stroke();

  ctx.strokeStyle = '#c62828';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -16 + bob * 0.4); ctx.lineTo(-8, -11 + armSwing + bob * 0.4);
  ctx.moveTo(5, -16 + bob * 0.4); ctx.lineTo(8, -11 - armSwing + bob * 0.4);
  ctx.stroke();
  ctx.strokeStyle = '#ffcc80';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-8, -12 + armSwing + bob * 0.4); ctx.lineTo(-8.5, -10 + armSwing + bob * 0.4);
  ctx.moveTo(8, -12 - armSwing + bob * 0.4); ctx.lineTo(8.5, -10 - armSwing + bob * 0.4);
  ctx.stroke();

  ctx.fillStyle = '#ffcc80';
  ctx.beginPath();
  ctx.arc(0, -22 + bob * 0.4, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.arc(1.5 - 1.2, -23.5 + bob * 0.4, 0.8, 0, Math.PI * 2);
  ctx.arc(1.5 + 1.2, -23.5 + bob * 0.4, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#a1887f';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(2, -21.6 + bob * 0.4, 1.6, 0.25, Math.PI - 0.25);
  ctx.stroke();

  ctx.fillStyle = '#e6c465';
  ctx.beginPath();
  ctx.ellipse(0, -24.5 + bob * 0.4, 7, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.ellipse(0, -25.8 + bob * 0.4, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
