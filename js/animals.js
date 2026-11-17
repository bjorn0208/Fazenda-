/* ================= FAZENDA 3D — ANIMAIS AMBIENTES =================
   Galinhas, vacas e porcos caminham livremente pelos tiles livres
   da fazenda, com animação de passos e pausas para descansar. */

const ANIMAL_KINDS = {
  chicken: { speed: 0.9, scale: 0.55 },
  cow:     { speed: 0.45, scale: 1.0 },
  pig:     { speed: 0.6, scale: 0.8 }
};

const ANIMAL_SPAWN = ['chicken', 'chicken', 'pig', 'cow', 'cow'];

function randomFreeTile() {
  const a = game.ownedArea;
  for (let tries = 0; tries < 60; tries++) {
    const x = a.x0 + Math.floor(Math.random() * (a.x1 - a.x0 + 1));
    const y = a.y0 + Math.floor(Math.random() * (a.y1 - a.y0 + 1));
    if (!occupancy[occIndex(x, y)]) return { x, y };
  }
  return null;
}

function animalWalkable(x, y) {
  return inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)];
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
    dirCur: Math.random() < 0.5 ? -1 : 1
  };
}

function animalUpdateOne(a, dt) {
  a.phase += dt;
  const targetDir = a.walking ? (a.tx >= a.gx ? 1 : -1) : a.dirCur;
  a.dirCur += (targetDir - a.dirCur) * Math.min(1, dt * 8);
  if (a.walking) {
    a.grazing = false;
    const speed = ANIMAL_KINDS[a.kind].speed * (a.speedMul || 1);
    const dx = a.tx - a.gx, dy = a.ty - a.gy;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step) {
      a.gx = a.tx; a.gy = a.ty;
      a.walking = false;
      if (Math.random() < 0.45) {
        a.grazing = true;
        a.wait = 2 + Math.random() * 4;
      } else {
        a.wait = 1 + Math.random() * 3.5;
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
        if (animalWalkable(cx + dx, cy + dy)) opts.push([cx + dx, cy + dy]);
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
  const dir = a.dirCur !== undefined ? a.dirCur : 1;

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(z * k.scale, z * k.scale);
  if (grazing) ctx.rotate(dir * 0.14);

  ctx.fillStyle = 'rgba(20,40,10,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (a.kind === 'chicken') drawChicken(ctx, bob, dir, a.walking, a.phase);
  else if (a.kind === 'cow') drawCow(ctx, bob, dir, a.walking, a.phase);
  else drawPig(ctx, bob, dir, a.walking, a.phase);

  ctx.restore();
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

  ctx.fillStyle = '#e0e0e0';
  ctx.beginPath();
  ctx.moveTo(-8, -10 + bob * 0.5);
  ctx.lineTo(-14, -14 + bob * 0.5);
  ctx.lineTo(-8, -6 + bob * 0.5);
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

  ctx.fillStyle = '#f5f1e8';
  ctx.beginPath();
  ctx.ellipse(0, -14 + bob * 0.4, 17, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#424242';
  ctx.beginPath();
  ctx.ellipse(-6, -16 + bob * 0.4, 5, 4, 0.4, 0, Math.PI * 2);
  ctx.ellipse(7, -11 + bob * 0.4, 4, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e8e4dc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -16 + bob * 0.4);
  ctx.quadraticCurveTo(-21, -14 + bob * 0.4, -20, -8 + bob * 0.4);
  ctx.stroke();
  ctx.fillStyle = '#6d4c41';
  ctx.beginPath();
  ctx.arc(-20, -7 + bob * 0.4, 1.5, 0, Math.PI * 2);
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

  ctx.fillStyle = '#f4a9bc';
  ctx.beginPath();
  ctx.ellipse(0, -11 + bob * 0.5, 13, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e28ba0';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-13, -11 + bob * 0.5, 3, 0.5, 4.5);
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
