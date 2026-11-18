/* ================= FAZENDA 3D — LÓGICA DO JOGO =================
   Estado, grade de ocupação, economia, XP/nível, missões,
   conquistas e salvamento. */

const GRID_SIZE = 48;
const SAVE_KEY = 'fazenda3d_save_v1';
const START_AREA = { x0: 20, y0: 20, x1: 27, y1: 27 }; // 8x8 inicial, centralizada no mapa 48x48

const game = {
  coins: 750,
  gems: 5,
  xp: 0,
  level: 1,
  farmName: 'Fazenda do Jogador',
  ownedArea: { ...START_AREA },
  intro: null, introDone: false,
  buildings: [],          // {id, type, gx, gy, rot}
  crops: [],              // {id, isCrop, type, gx, gy, plantedAt, watered}
  animals: [],            // {id, kind, gx, gy, tx, ty, walking, wait, phase}
  tilled: {},             // "gx,gy" -> 1 (terra arada: plantio 25% mais rapido)
  farmers: [],            // {id, gx, gy, tx, ty, walking, wait, phase, chest}
  pen: null,              // {x0, y0, x1, y1, gateX, gateY, paid}
  time: 0.1,              // fracao do dia (0..1): ciclo dia/noite
  dogs: [],               // cachorros pastores: {gx, gy, tx, ty, walking, wait, phase, active, face, lastDir}
  nextId: 1,
  stats: {},              // contadores p/ missões e conquistas
  missionsClaimed: [],
  achievementsClaimed: [],
  settings: { sound: true, music: false, quality: 'alta', language: 'pt-BR' },
  landExpansions: 0,
  meetingDone: false,     // reuniao matinal dos fazendeiro ja aconteceu hoje
  farmCode: null,         // codigo da sala multiplayer (6 numeros, ex.: 482913)
  visiting: false,        // modo visita: somente leitura
  tutorialDone: false,    // tutorial da primeira vez ja visto
  barn: {},               // celeiro: id de colheita/produto -> quantidade
  orders: [],             // pedidos do mercado: {id, items, coins, xp}
  upgrades: { water: 0, till: 0 },   // 0 = ferramenta ainda nao comprada
  seeds: {},              // estoque de sementes do jogador: {wheat: 3, ...}
  tractorOwned: false,    // trator comprado na loja de ferramentas
  tractor: null,          // trator em campo (transiente): {gx,gy,active,path,tx,ty,phase,walking}
  snow: 0,                // camada de neve acumulada no inverno (0 a 1)
  playerName: 'Fazendeiro',
  playerFace: '👨‍🌾',
  levelTasks: [],         // 3 tarefas por nivel
  tasksLevel: 1,
  day: 0,                 // dias completos (define a estacao)
  weather: 'clear',       // clear | rain
  weatherT: 0,
  weatherTick: 0,
  flashT: 0,
  ambT: 0,
  particles: [],          // {x,y,z,vx,vy,vz,life,ttl,g,color,size}
  couriers: []            // entregador de moto (transiente, nao salva)
};

/* ---------- Grade de ocupação ---------- */
const occupancy = new Array(GRID_SIZE * GRID_SIZE).fill(null);

function occIndex(x, y) { return y * GRID_SIZE + x; }

function inOwnedArea(x, y) {
  const a = game.ownedArea;
  return x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
}

/* Footprint de um tipo com rotação aplicada (0 ou 1 → 90°). */
function footprintOf(type, rot) {
  const b = BUILDINGS[type];
  return (rot % 2 === 0) ? { w: b.w, d: b.d } : { w: b.d, d: b.w };
}

/* Verifica se um prédio cabe em (gx,gy) com rotação dada.
   ignoreId permite ignorar o próprio prédio (modo mover). */
function canPlace(type, gx, gy, rot, ignoreId) {
  const f = footprintOf(type, rot);
  for (let x = gx; x < gx + f.w; x++) {
    for (let y = gy; y < gy + f.d; y++) {
      if (!inBounds(x, y) || !inOwnedArea(x, y)) return false;
      const occ = occupancy[occIndex(x, y)];
      if (occ && occ.id !== ignoreId) return false;
    }
  }
  return true;
}

function markOccupancy(building, value) {
  const f = footprintOf(building.type, building.rot);
  for (let x = building.gx; x < building.gx + f.w; x++) {
    for (let y = building.gy; y < building.gy + f.d; y++) {
      occupancy[occIndex(x, y)] = value ? building : null;
    }
  }
}

function buildingAt(x, y) {
  if (!inBounds(x, y)) return null;
  return occupancy[occIndex(x, y)];
}

/* ---------- Economia ---------- */
function addCoins(n) {
  game.coins = Math.max(0, game.coins + n);
  game.stats.peak_coins = Math.max(game.stats.peak_coins || 0, game.coins);
  uiDirty.coins = true;
}

function addGems(n) { game.gems = Math.max(0, game.gems + n); uiDirty.gems = true; }

const MAX_LEVEL = 50;

function addXp(n) {
  game.xp += n;
  uiDirty.xp = true;
  while (game.level < MAX_LEVEL && game.xp >= xpForLevel(game.level)) {
    game.xp -= xpForLevel(game.level);
    game.level++;
    game.stats.level = game.level;
    spawnLevelTasks(game.level);
    showToast(t('toast.levelUp', { n: game.level }));
    playSound('level');
  }
  if (game.level >= MAX_LEVEL) game.xp = Math.min(game.xp, xpForLevel(MAX_LEVEL));
}

/* ---------- Tarefas por nivel (3 por nivel, ate 50) ---------- */
function spawnLevelTasks(lvl) {
  const c = 80 + lvl * 40;
  const x = 15 + lvl * 5;
  game.levelTasks = [
    { icon: '🌾', label: 'Colher ' + (2 + lvl * 2) + ' planta\u00e7\u00f5es', stat: 'harvested', base: game.stats.harvested || 0, target: 2 + lvl * 2, coins: c, xp: x },
    { icon: '🌱', label: 'Plantar ' + (4 + lvl) + ' sementes', stat: 'planted', base: game.stats.planted || 0, target: 4 + lvl, coins: Math.round(c * 0.8), xp: x },
    { icon: '🐑', label: 'Animais: coletar ' + (3 + lvl) + ' produtos', stat: 'collected', base: game.stats.collected || 0, target: 3 + lvl, coins: c, xp: x }
  ];
  game.tasksLevel = lvl;
}

function checkLevelTasks() {
  if (!game.levelTasks.length) return;
  const done = game.levelTasks.filter(m => (game.stats[m.stat] || 0) - m.base >= m.target);
  if (!done.length) return;
  for (const m of done) {
    addCoins(m.coins);
    addXp(m.xp);
    showToast(t('toast.taskDone', { label: m.label, c: m.coins }));
  }
  game.levelTasks = game.levelTasks.filter(m => !done.includes(m));
}

/* ---------- Construções ---------- */
function placeBuilding(type, gx, gy, rot, free) {
  const def = BUILDINGS[type];
  if (!canPlace(type, gx, gy, rot)) return null;
  if (!free) {
    if (game.coins < def.price) { showToast(t('toast.noCoins')); return null; }
    addCoins(-def.price);
  }
  const building = {
    id: game.nextId++,
    type, gx, gy, rot: rot || 0
  };
  game.buildings.push(building);
  markOccupancy(building, true);

  game.stats.built_any = (game.stats.built_any || 0) + 1;
  game.stats['built_' + type] = (game.stats['built_' + type] || 0) + 1;
  if (!free) addXp(Math.max(5, Math.round(def.price / 10)));
  playSound('place');
  return building;
}

function removeBuilding(id) {
  const idx = game.buildings.findIndex(b => b.id === id);
  if (idx === -1) return null;
  const b = game.buildings[idx];
  markOccupancy(b, false);
  game.buildings.splice(idx, 1);
  const def = BUILDINGS[b.type];
  const refund = Math.floor(def.price * def.refund);
  if (refund > 0) addCoins(refund);
  playSound('remove');
  return { refund, def };
}

function moveBuilding(id, gx, gy, rot) {
  const b = game.buildings.find(b => b.id === id);
  if (!b) return false;
  const newRot = (rot === undefined) ? b.rot : rot;
  if (!canPlace(b.type, gx, gy, newRot, id)) return false;
  markOccupancy(b, false);
  b.gx = gx; b.gy = gy; b.rot = newRot;
  markOccupancy(b, true);
  playSound('place');
  return true;
}

function rotateBuilding(id) {
  const b = game.buildings.find(b => b.id === id);
  if (!b) return false;
  const newRot = (b.rot + 1) % 4;
  if (!canPlace(b.type, b.gx, b.gy, newRot, id)) return false;
  markOccupancy(b, false);
  b.rot = newRot;
  markOccupancy(b, true);
  playSound('rotate');
  return true;
}

/* ---------- Plantações ---------- */
function cropProgress(crop) {
  const def = CROPS[crop.type];
  return Math.min(1, (Date.now() - crop.plantedAt) / (def.growTime * 1000));
}

function cropAt(x, y) {
  const occ = buildingAt(x, y);
  return (occ && occ.isCrop) ? occ : null;
}

function plantCrop(type, gx, gy, free) {
  const def = CROPS[type];
  if (!def) return null;
  if (!inBounds(gx, gy) || !inOwnedArea(gx, gy)) { showToast(t('toast.invalid')); return null; }
  if (occupancy[occIndex(gx, gy)]) { showToast(t('toast.tileBusy')); return null; }
  if (!free && !game.visiting) {
    if (game.seeds[type] > 0) {
      game.seeds[type]--;
      if (game.seeds[type] <= 0) delete game.seeds[type];
    } else {
      if (game.coins < def.seedCost) { showToast(t('toast.noSeeds')); return null; }
      addCoins(-def.seedCost);
    }
  }
  const bonus = isTilled(gx, gy) ? def.growTime * 1000 * 0.25 : 0;
  const crop = {
    id: game.nextId++, isCrop: true, type, gx, gy,
    plantedAt: Date.now() - bonus, watered: false
  };
  game.crops.push(crop);
  occupancy[occIndex(gx, gy)] = crop;
  game.stats.planted = (game.stats.planted || 0) + 1;
  playSound('plant');
  return crop;
}

/* ---------- Aracao ---------- */
function tillSoil(gx, gy) {
  if (!inBounds(gx, gy) || !inOwnedArea(gx, gy)) return false;
  if (occupancy[occIndex(gx, gy)]) return false;
  game.tilled[gx + ',' + gy] = 1;
  spawnDust(gx, gy);
  playSound('dig');
  return true;
}

/* ---------- Lote arado: compra terra pronta para plantar ---------- */
function plotPrice(n) { return n * n * PLOT_PRICE_PER_TILE; }

function plotValid(cx, cy, n) {
  for (let y = cy; y < cy + n; y++) {
    for (let x = cx; x < cx + n; x++) {
      if (!inBounds(x, y) || !inOwnedArea(x, y)) return false;
      if (occupancy[occIndex(x, y)]) return false;
    }
  }
  return true;
}

function placePlot(cx, cy, n) {
  if (!plotValid(cx, cy, n)) { showToast(t('toast.plotPlace')); return false; }
  let newTiles = 0;
  for (let y = cy; y < cy + n; y++) {
    for (let x = cx; x < cx + n; x++) {
      if (!game.tilled[x + ',' + y]) newTiles++;
    }
  }
  if (newTiles === 0) { showToast(t('toast.plotNothing')); return false; }
  const price = newTiles * PLOT_PRICE_PER_TILE;
  if (game.coins < price) { showToast(t('toast.noCoins')); return false; }
  addCoins(-price);
  for (let y = cy; y < cy + n; y++) {
    for (let x = cx; x < cx + n; x++) {
      game.tilled[x + ',' + y] = 1;
    }
  }
  spawnFloater(cx + n / 2, cy + n / 2, '\u{1FA99}-' + price, '#ffd54f');
  playSound('dig');
  return true;
}

function isTilled(gx, gy) {
  return !!game.tilled[gx + ',' + gy];
}

/* ---------- Colher tudo ---------- */
function harvestAllCrops() {
  let n = 0, xp = 0;
  for (let i = game.crops.length - 1; i >= 0; i--) {
    const r = harvestCrop(game.crops[i]);
    if (r) { n++; xp += r.xp; }
  }
  return { n, xp };
}

/* ---------- Celeiro: vender estoque ---------- */
function barnItemValue(id) {
  return (CROPS[id] && CROPS[id].sell) || (PRODUCTS[id] && PRODUCTS[id].sell) || 0;
}

function barnItemIcon(id) {
  return (CROPS[id] && CROPS[id].icon) || (PRODUCTS[id] && PRODUCTS[id].icon) || '📦';
}

function sellBarnItem(id, n) {
  const have = game.barn[id] || 0;
  n = Math.min(n, have);
  if (n <= 0) return false;
  const value = barnItemValue(id) * n;
  game.barn[id] -= n;
  if (game.barn[id] <= 0) delete game.barn[id];
  game.stats.barn_sold = (game.stats.barn_sold || 0) + n;
  addCoins(value);
  playSound('harvest');
  return true;
}

function sellAllBarn() {
  let coins = 0, sold = 0;
  for (const id of Object.keys(game.barn)) {
    coins += barnItemValue(id) * game.barn[id];
    sold += game.barn[id];
    delete game.barn[id];
  }
  if (sold > 0) game.stats.barn_sold = (game.stats.barn_sold || 0) + sold;
  if (coins > 0) { addCoins(coins); playSound('level'); }
  return coins;
}

/* ---------- Pedidos do mercado ---------- */
function genOrder() {
  const pool = Object.values(CROPS).filter(c => c.level <= game.level + 1);
  const items = {};
  const kinds = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < kinds; i++) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    items[c.id] = 2 + Math.floor(Math.random() * 6);
  }
  let coins = 0;
  for (const id of Object.keys(items)) coins += barnItemValue(id) * items[id];
  coins = Math.round(coins * 1.5) + 20;
  return { id: 'o' + game.nextId++, items, coins, xp: Math.round(coins / 8) };
}

function ensureOrders() {
  while (game.orders.length < 3) game.orders.push(genOrder());
}

function deliverOrder(orderId) {
  const o = game.orders.find(x => x.id === orderId);
  if (!o) return false;
  for (const id of Object.keys(o.items)) {
    if ((game.barn[id] || 0) < o.items[id]) { showToast(t('toast.orderFail')); return false; }
  }
  for (const id of Object.keys(o.items)) {
    game.barn[id] -= o.items[id];
    if (game.barn[id] <= 0) delete game.barn[id];
  }
  game.orders = game.orders.filter(x => x.id !== orderId);
  ensureOrders();
  spawnCourier(o);
  showToast(t('toast.courierGoing'));
  return true;
}

/* ---------- Ferramentas ---------- */
function toolOwned(id) {
  if (id === 'hoe') return upgradeLevel('till') > 0;
  if (id === 'can') return upgradeLevel('water') > 0;
  if (id === 'tractor') return game.tractorOwned;
  return true;
}

function buyTool(id) {
  const def = TOOLS.find(x => x.id === id);
  if (!def) return false;
  if (id !== 'seeds' && toolOwned(id)) { showToast(t('toast.toolOwned')); return false; }
  if (game.level < def.level) { showToast(t('shop.locked', { n: def.level })); return false; }
  const price = id === 'seeds' ? 12 * Object.values(CROPS).filter(c => c.level <= game.level).length : def.price;
  if (game.coins < price) { showToast(t('toast.noCoins')); return false; }
  addCoins(-price);
  if (id === 'hoe') game.upgrades.till = 1;
  else if (id === 'can') game.upgrades.water = 1;
  else if (id === 'tractor') {
    game.tractorOwned = true;
    game.tractor = null;
  } else if (id === 'seeds') {
    for (const c of Object.values(CROPS)) {
      if (c.level <= game.level) game.seeds[c.id] = (game.seeds[c.id] || 0) + 2;
    }
  }
  playSound('place');
  return true;
}

/* ---------- Trator colheitadeira ---------- */
function tractorWalkable(x, y) {
  if (!inBounds(x, y) || !inOwnedArea(x, y)) return false;
  const occ = occupancy[occIndex(x, y)];
  return !occ || occ.isCrop;
}

function startTractor() {
  if (!game.tractorOwned) return false;
  const ready = game.crops.find(c => cropProgress(c) >= 1);
  if (!ready) { showToast(t('toast.tractorNone')); return false; }
  if (!game.tractor) {
    const spot = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
    for (let tries = 0; tries < 200; tries++) {
      const x = game.ownedArea.x0 + Math.floor(Math.random() * (game.ownedArea.x1 - game.ownedArea.x0 + 1));
      const y = game.ownedArea.y0 + Math.floor(Math.random() * (game.ownedArea.y1 - game.ownedArea.y0 + 1));
      if (tractorWalkable(x, y)) { spot.x = x; spot.y = y; break; }
    }
    game.tractor = { gx: spot.x + 0.5, gy: spot.y + 0.5, tx: spot.x + 0.5, ty: spot.y + 0.5, path: [], phase: 0, smokeT: 0, walking: false };
  }
  const tr = game.tractor;
  tr.target = null;
  tr.path = gridPath(Math.floor(tr.gx), Math.floor(tr.gy), Math.floor(ready.gx + 0.5), Math.floor(ready.gy + 0.5), tractorWalkable) || [];
  tr.tx = ready.gx + 0.5; tr.ty = ready.gy + 0.5;
  if (tr.path.length) { const w = tr.path.shift(); tr.tx = w.x + 0.5; tr.ty = w.y + 0.5; }
  tr.walking = true;
  tr.active = true;
  showToast(t('toast.tractorGo'));
  return true;
}

function tractorNextTarget(t) {
  let best = null, bestD = Infinity;
  for (const c of game.crops) {
    if (cropProgress(c) < 1) continue;
    const d = Math.hypot(c.gx + 0.5 - t.gx, c.gy + 0.5 - t.gy);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function updateTractor(dt) {
  const tr = game.tractor;
  if (!tr || !tr.active) return;
  tr.phase += dt;
  if (tr.walking) {
    const dx = tr.tx - tr.gx, dy = tr.ty - tr.gy;
    const dist = Math.hypot(dx, dy);
    const step = 2.4 * dt;
    tr.smokeT += dt;
    if (tr.smokeT > 0.3) {
      tr.smokeT = 0;
      if (Math.random() < 0.7) spawnParticle(tr.gx - 0.3, tr.gy, 0.5, -0.3, -0.1, 0.3, 0.9, 'rgba(90,90,90,0.5)', 2.5, -0.12);
    }
    if (dist <= step) {
      tr.gx = tr.tx; tr.gy = tr.ty;
      const occ = occupancy[occIndex(Math.floor(tr.gx), Math.floor(tr.gy))];
      if (occ && occ.isCrop && cropProgress(occ) >= 1 && !game.visiting) {
        harvestCrop(occ);
        spawnFloater(occ.gx, occ.gy, '🌾', '#c5e1a5');
      }
      if (tr.path && tr.path.length) {
        const w = tr.path.shift();
        tr.tx = w.x + 0.5; tr.ty = w.y + 0.5;
      } else {
        tr.walking = false;
      }
    } else {
      tr.gx += dx / dist * step;
      tr.gy += dy / dist * step;
    }
    return;
  }
  const next = tractorNextTarget(tr);
  if (!next) {
    tr.active = false;
    showToast(t('toast.tractorDone'));
    playSound('level');
    return;
  }
  tr.path = gridPath(Math.floor(tr.gx), Math.floor(tr.gy), next.gx, next.gy, tractorWalkable) || [];
  tr.tx = next.gx + 0.5; tr.ty = next.gy + 0.5;
  if (tr.path.length) { const w = tr.path.shift(); tr.tx = w.x + 0.5; tr.ty = w.y + 0.5; }
  tr.walking = true;
}

/* ---------- Entregador de moto ---------- */
function courierWalkable(x, y) {
  return inBounds(x, y) && !occupancy[occIndex(x, y)];
}

function courierTargetTile() {
  const barn = game.buildings.find(b => b.type === 'barn');
  if (barn) {
    const f = footprintOf('barn', barn.rot);
    return { x: barn.gx + Math.floor(f.w / 2), y: Math.min(GRID_SIZE - 1, barn.gy + f.d) };
  }
  return { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
}

function courierEdgeTile(fx, fy) {
  let best = null, bestD = Infinity;
  const test = (x, y) => {
    if (!courierWalkable(x, y)) return;
    const d = Math.abs(x + 0.5 - fx) + Math.abs(y + 0.5 - fy);
    if (d < bestD) { best = { x, y }; bestD = d; }
  };
  for (let x = 0; x < GRID_SIZE; x += 2) { test(x, 0); test(x, GRID_SIZE - 1); }
  for (let y = 0; y < GRID_SIZE; y += 2) { test(0, y); test(GRID_SIZE - 1, y); }
  return best;
}

function spawnCourier(order) {
  const tgt = courierTargetTile();
  const exit = courierEdgeTile(tgt.x, tgt.y);
  if (!exit) return;
  const path = gridPath(exit.x, exit.y, tgt.x, tgt.y, courierWalkable) || [];
  const c = {
    coins: order.coins, xp: order.xp,
    gx: exit.x + 0.5, gy: exit.y + 0.5,
    tx: exit.x + 0.5, ty: exit.y + 0.5,
    path, stage: 'in', wait: 0, smokeT: 0,
    face: 0, lastDir: 1, phase: Math.random() * 10, walking: true, done: false
  };
  if (c.path.length) { const w = c.path.shift(); c.tx = w.x + 0.5; c.ty = w.y + 0.5; }
  game.couriers.push(c);
}

function courierBeginExit(c) {
  const exit = courierEdgeTile(c.gx, c.gy);
  if (!exit) { c.done = true; return; }
  const path = gridPath(Math.floor(c.gx), Math.floor(c.gy), exit.x, exit.y, courierWalkable) || [];
  c.path = path;
  c.tx = exit.x + 0.5; c.ty = exit.y + 0.5;
  if (c.path.length) { const w = c.path.shift(); c.tx = w.x + 0.5; c.ty = w.y + 0.5; }
  c.walking = true;
}

function updateCourierOne(c, dt) {
  c.phase += dt;
  if (c.walking) {
    const dx = c.tx - c.gx, dy = c.ty - c.gy;
    const sdx = dx - dy, sdy = (dx + dy) * 0.5;
    if (sdx * sdx + sdy * sdy > 1e-6) {
      const na = Math.atan2(sdy, sdx);
      let diff = ((na - (c.face || 0) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      c.face = (c.face || 0) + diff * Math.min(1, dt * 8);
      const fx = Math.cos(c.face);
      if (Math.abs(fx) >= 0.15) c.lastDir = fx >= 0 ? 1 : -1;
    }
    c.smokeT += dt;
    if (c.smokeT > 0.45) {
      c.smokeT = 0;
      spawnParticle(c.gx - c.lastDir * 0.25, c.gy, 0.35, -c.lastDir * 0.3, -0.05, 0.25, 0.8, 'rgba(150,150,150,0.4)', 2, -0.1);
    }
    const dist = Math.hypot(dx, dy);
    const step = 4.2 * dt;
    if (dist <= step) {
      c.gx = c.tx; c.gy = c.ty;
      if (c.path && c.path.length) {
        const w = c.path.shift();
        c.tx = w.x + 0.5; c.ty = w.y + 0.5;
      } else {
        c.walking = false;
      }
    } else {
      c.gx += dx / dist * step;
      c.gy += dy / dist * step;
    }
    return;
  }
  if (c.stage === 'in') {
    game.stats.orders_done = (game.stats.orders_done || 0) + 1;
    addCoins(c.coins);
    addXp(c.xp);
    spawnFloater(c.gx, c.gy - 0.5, '+' + c.coins + ' \u{1FA99}', '#ffd54f');
    showToast(t('toast.orderDone', { c: c.coins, x: c.xp }));
    playSound('level');
    c.stage = 'wait';
    c.wait = 2 + Math.random() * 2;
    return;
  }
  if (c.stage === 'wait') {
    c.wait -= dt;
    if (c.wait <= 0) {
      c.stage = 'out';
      courierBeginExit(c);
    }
    return;
  }
  c.done = true;
}

function updateCouriers(dt) {
  if (!game.couriers.length) return;
  for (const c of game.couriers) updateCourierOne(c, dt);
  game.couriers = game.couriers.filter(c => !c.done);
}

function swapOrder(orderId) {
  if (game.coins < 50) { showToast(t('toast.noCoins')); return false; }
  const i = game.orders.findIndex(o => o.id === orderId);
  if (i === -1) return false;
  addCoins(-50);
  game.orders[i] = genOrder();
  return true;
}

/* ---------- Cozinha: receitas ---------- */
function kitchenBuilt() {
  return game.buildings.some(b => b.type === 'kitchen');
}

function canCook(r) {
  for (const id of Object.keys(r.inputs)) {
    if ((game.barn[id] || 0) < r.inputs[id]) return false;
  }
  return true;
}

function cookRecipe(id) {
  const r = RECIPES.find(x => x.id === id);
  if (!r) return false;
  if (!kitchenBuilt()) { showToast(t('toast.kitchenNeed')); return false; }
  if (!canCook(r)) { showToast(t('toast.cookFail')); return false; }
  for (const k of Object.keys(r.inputs)) {
    game.barn[k] -= r.inputs[k];
    if (game.barn[k] <= 0) delete game.barn[k];
  }
  const prod = PRODUCTS[id];
  game.barn[id] = (game.barn[id] || 0) + 1;
  addXp(prod.xp);
  showToast(t('toast.cooked', { icon: prod.icon }));
  playSound('harvest');
  return true;
}

/* ---------- Melhorias de ferramentas ---------- */
function upgradeLevel(id) {
  return (game.upgrades && game.upgrades[id]) || 0;
}

function buyUpgrade(id) {
  const def = UPGRADES.find(u => u.id === id);
  if (!def) return false;
  const lvl = upgradeLevel(id);
  if (lvl === 0) { showToast(t('toast.toolNeed', { name: t(id === 'water' ? 'tool.can' : 'tool.hoe') })); return false; }
  if (lvl >= def.max) return false;
  const price = def.prices[lvl];
  if (game.coins < price) { showToast(t('toast.noCoins')); return false; }
  addCoins(-price);
  game.upgrades[id] = lvl + 1;
  showToast(t('toast.upgraded'));
  playSound('level');
  return true;
}

function waterRadius() { return upgradeLevel('water') >= 3 ? 2 : (upgradeLevel('water') === 2 ? 1 : 0); }
function tillRadius() { return upgradeLevel('till') >= 2 ? 1 : 0; }

function waterAreaAt(gx, gy) {
  if (upgradeLevel('water') === 0) return 0;
  const r = waterRadius();
  let n = 0;
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      const c = cropAt(gx + dx, gy + dy);
      if (c && waterCrop(c, true)) n++;
    }
  }
  if (n > 0) playSound('water');
  return n;
}

function tillAreaAt(gx, gy) {
  if (upgradeLevel('till') === 0) return 0;
  const r = tillRadius();
  let n = 0;
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      if (tillSoil(gx + dx, gy + dy)) n++;
    }
  }
  return n;
}

/* ---------- Ciclo dia/noite ---------- */
const DAY_LENGTH = 600; // segundos reais por dia completo (10 minutos)

function dayPhase() {
  const t = game.time;
  if (t < 0.05) return 'dawn';
  if (t < 0.45) return 'day';
  if (t < 0.65) return 'afternoon';
  return 'night';
}

function advanceClock(dt) {
  const prev = game.time;
  game.time = (prev + dt / DAY_LENGTH) % 1;
  if (game.time < prev) { game.meetingDone = false; game.day++; }
  if (seasonIndex() === 3) game.snow = Math.min(1, game.snow + dt / 180);
  else game.snow = Math.max(0, game.snow - dt / 20);
  checkLevelTasks();
}

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const MONTH_LEN = 30;
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Mar\u00e7o', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Out\u00faro', 'Novembro', 'Dezembro'];
const SEASON_BY_MONTH = [1, 1, 2, 2, 2, 3, 3, 3, 0, 0, 0, 1];
const SEASON_ICONS = { spring: '\u{1F338}', summer: '\u{1F506}', autumn: '\u{1F342}', winter: '\u{2744}\uFE0F' };

let _dateCache = { day: -1, val: null };
function gameDate() {
  if (_dateCache.day === game.day) return _dateCache.val;
  const d = ((game.day % 360) + 360) % 360;
  const month = Math.floor(d / MONTH_LEN);
  _dateCache = { day: game.day, val: { day: (d % MONTH_LEN) + 1, month, name: MONTH_NAMES[month] } };
  return _dateCache.val;
}
function seasonIndex() { return SEASON_BY_MONTH[gameDate().month]; }
function seasonName() { return SEASONS[seasonIndex()]; }

/* ---------- Clima: chuva ocasional que irriga sozinha ---------- */
function updateWeather(dt) {
  if (game.flashT > 0) game.flashT -= dt;
  if (game.visiting) return;
  if (game.weather === 'rain') {
    game.weatherT -= dt;
    game.weatherTick -= dt;
    if (game.weatherTick <= 0) {
      game.weatherTick = 1.2;
      const dry = game.crops.filter(c => !c.watered && cropProgress(c) < 1);
      if (dry.length) waterCrop(dry[Math.floor(Math.random() * dry.length)], true);
      if (Math.random() < 0.22) { game.flashT = 0.4; playSound('thunder'); }
    }
    if (game.weatherT <= 0) { game.weather = 'clear'; game.weatherT = 0; }
  } else {
    game.weatherT -= dt;
    if (game.weatherT <= 0 && game.time > 0.05 && game.time < 0.6 && Math.random() < 0.008) {
      game.weather = 'rain';
      game.weatherT = 40 + Math.random() * 70;
      game.weatherTick = 0;
      showToast(t('toast.rain'));
    }
  }
}

/* ---------- Particulas ---------- */
function spawnParticle(x, y, z, vx, vy, vz, ttl, color, size, g) {
  if (game.visiting) return;
  if (game.particles.length > 220) game.particles.shift();
  game.particles.push({ x, y, z, vx, vy, vz, life: ttl, ttl, color, size: size || 3, g: g === undefined ? 2.2 : g });
}

function spawnDust(gx, gy) {
  for (let i = 0; i < 6; i++) {
    spawnParticle(gx + 0.5 + (Math.random() - 0.5) * 0.6, gy + 0.5 + (Math.random() - 0.5) * 0.6, 0.1,
      (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, 0.8 + Math.random(), 0.7, '#a1887f', 2 + Math.random() * 2);
  }
}

function spawnSplash(gx, gy) {
  for (let i = 0; i < 7; i++) {
    spawnParticle(gx + 0.5 + (Math.random() - 0.5) * 0.5, gy + 0.5 + (Math.random() - 0.5) * 0.5, 0.15,
      (Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 1.1, 1.2 + Math.random(), 0.5, '#4fc3f7', 1.5 + Math.random() * 1.5);
  }
}

function updateParticles(dt) {
  const ps = game.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.life -= dt;
    if (p.life <= 0) { ps.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vz -= (p.g || 2.2) * dt;
    if (p.z < 0) { p.z = 0; p.vz = 0; p.vx *= 0.6; p.vy *= 0.6; }
  }
}

function updateAmbient(dt) {
  if (game.visiting) return;
  game.ambT -= dt;
  if (game.ambT > 0) return;
  game.ambT = 0.5;
  const house = game.buildings.find(b => b.type === 'house');
  if (house && Math.random() < 0.7) {
    spawnParticle(house.gx + 1.5, house.gy + 0.9, 2.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2,
      0.5 + Math.random() * 0.3, 2.5, 'rgba(235,235,235,0.55)', 4 + Math.random() * 3, -0.12);
  }
  const si = seasonIndex();
  const trees = game.buildings.filter(b => b.type === 'tree' || b.type === 'tree_pine' || b.type === 'tree_cherry');
  if (trees.length && Math.random() < 0.6) {
    const tr = trees[Math.floor(Math.random() * trees.length)];
    const col = si === 2 ? '#e6902f' : (si === 0 && tr.type === 'tree_cherry' ? '#f8bbd0' : '#7cb342');
    spawnParticle(tr.gx + 0.5 + (Math.random() - 0.5), tr.gy + 0.5 + (Math.random() - 0.5), 1.6,
      (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, -0.15, 3, col, 2.5, 0.05);
  }
}

function clockString(t) {
  const total = (6 + t * 24) % 24;
  const h = Math.floor(total);
  const m = Math.floor((total - h) * 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

function nightAlpha(t) {
  if (t < 0.05) return 0.45 * (1 - t / 0.05);
  if (t < 0.55) return 0;
  if (t < 0.65) return 0.45 * ((t - 0.55) / 0.10);
  return 0.45;
}

/* Luz do dia (1 = meio-dia, 0 = noite mais escura) para sombras e ceu. */
function dayLight(t) {
  return 1 - nightAlpha(t === undefined ? game.time : t) / 0.45;
}

/* ---------- Curral (cerca automatica com porteiro) ---------- */
function penSegments(n) { return 4 * n - 4; }

function penPrice(n) { return penSegments(n) * PEN_PRICE_PER_TILE; }

function penRect(cx, cy, n) {
  const x0 = cx - Math.floor(n / 2), y0 = cy - Math.floor(n / 2);
  return { x0, y0, x1: x0 + n - 1, y1: y0 + n - 1, n };
}

function penValid(r) {
  for (let x = r.x0; x <= r.x1; x++) {
    if (!penTileFree(x, r.y0) || !penTileFree(x, r.y1)) return false;
  }
  for (let y = r.y0; y <= r.y1; y++) {
    if (!penTileFree(r.x0, y) || !penTileFree(r.x1, y)) return false;
  }
  return true;
}

function penTileFree(x, y) {
  return inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)];
}

function placePen(cx, cy, n) {
  const price = penPrice(n);
  if (game.coins < price) { showToast(t('toast.noCoins')); return false; }
  const r = penRect(cx, cy, n);
  if (!penValid(r)) { showToast(t('toast.penInvalid')); return false; }
  const gateX = r.x0 + Math.floor(n / 2);
  for (let x = r.x0; x <= r.x1; x++) {
    addPenFence(x, r.y0);
    if (x !== gateX) addPenFence(x, r.y1);
  }
  for (let y = r.y0 + 1; y <= r.y1 - 1; y++) {
    addPenFence(r.x0, y);
    addPenFence(r.x1, y);
  }
  addCoins(-price);
  game.pen = { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, gateX, gateY: r.y1, paid: price };
  playSound('place');
  return true;
}

function addPenFence(x, y) {
  if (!penTileFree(x, y)) return;
  const seg = { id: game.nextId++, type: 'fence', gx: x, gy: y, rot: 0 };
  game.buildings.push(seg);
  markOccupancy(seg, true);
  game.stats.built_any = (game.stats.built_any || 0) + 1;
  game.stats.built_fence = (game.stats.built_fence || 0) + 1;
}

function removePen() {
  const pen = game.pen;
  if (!pen) return 0;
  const keep = [];
  let removed = 0;
  for (const b of game.buildings) {
    const onPerimeter = b.type === 'fence' && (
      (b.gy === pen.y0 && b.gx >= pen.x0 && b.gx <= pen.x1) ||
      (b.gy === pen.y1 && b.gx >= pen.x0 && b.gx <= pen.x1) ||
      (b.gx === pen.x0 && b.gy >= pen.y0 && b.gy <= pen.y1) ||
      (b.gx === pen.x1 && b.gy >= pen.y0 && b.gy <= pen.y1));
    if (onPerimeter) { markOccupancy(b, false); removed++; }
    else keep.push(b);
  }
  game.buildings = keep;
  const refund = Math.floor(pen.paid / 2);
  addCoins(refund);
  game.pen = null;
  playSound('dig');
  return refund;
}

/* ---------- Cachorro (pastor automatico) ---------- */
const MAX_DOGS = 3;

function dogPrice() {
  return HELPERS.dog.price * Math.pow(2, game.dogs.length);
}

function buyDog() {
  const def = HELPERS.dog;
  if (game.level < def.level) { showToast(t('shop.locked', { n: def.level })); return false; }
  if (game.dogs.length >= MAX_DOGS) { showToast(t('toast.dogLimit')); return false; }
  const price = dogPrice();
  if (game.coins < price) { showToast(t('toast.noCoins')); return false; }
  const spot = randomFreeTile();
  if (!spot) { showToast(t('toast.invalid')); return false; }
  addCoins(-price);
  game.dogs.push({
    gx: spot.x + 0.5, gy: spot.y + 0.5,
    tx: spot.x + 0.5, ty: spot.y + 0.5,
    walking: false, wait: 1, phase: Math.random() * 10,
    active: false, face: 0, lastDir: 1, resting: false
  });
  playSound('level');
  return true;
}

/* Tile livre ao lado da casinha do cachorro. */
function doghouseSpot() {
  const h = game.buildings.find(b => b.type === 'doghouse');
  if (!h) return null;
  for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
    const x = h.gx + dx, y = h.gy + dy;
    if (inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)]) return { x, y };
  }
  return null;
}

/* ---------- Producao dos animais ---------- */
const PIG_SLAUGHTER_MS = 300000;

function pigReady(a) {
  return a.kind === 'pig' && a.bornAt !== undefined && Date.now() - a.bornAt >= PIG_SLAUGHTER_MS;
}

function collectAnimal(a) {
  if (pigReady(a)) {
    const value = ANIMALS.pig.bacon;
    const idx = game.animals.indexOf(a);
    if (idx === -1) return false;
    game.animals.splice(idx, 1);
    addCoins(value);
    game.stats.slaughtered = (game.stats.slaughtered || 0) + 1;
    spawnFloater(a.gx - 0.5, a.gy - 0.5, '+' + value + ' 🪙', '#ff8a65');
    playSound('pig');
    return true;
  }
  if (!a.product) return false;
  const def = ANIMALS[a.kind];
  const value = def.value * a.product;
  game.stats.collected = (game.stats.collected || 0) + a.product;
  addCoins(value);
  spawnFloater(a.gx - 0.5, a.gy - 0.5, def.product + ' +' + value + ' 🪙', '#ffd54f');
  a.product = 0;
  playSound(a.kind || 'harvest');
  return true;
}

function collectAllProducts() {
  const before = game.coins;
  let n = 0;
  for (let i = game.animals.length - 1; i >= 0; i--) {
    if (collectAnimal(game.animals[i])) n++;
  }
  return { n, coins: game.coins - before };
}

/* ---------- Fazendeiro (ajudante automatico) ---------- */
function farmerPrice() {
  return HELPERS.farmer.price * Math.pow(2, game.farmers.length);
}

function buyFarmer() {
  const def = HELPERS.farmer;
  if (game.level < def.level) { showToast(t('shop.locked', { n: def.level })); return false; }
  const price = farmerPrice();
  if (game.coins < price) { showToast(t('toast.noCoins')); return false; }
  const spot = randomFreeTile();
  if (!spot) { showToast(t('toast.invalid')); return false; }
  addCoins(-price);
  game.farmers.push({
    id: game.nextId++, gx: spot.x + 0.5, gy: spot.y + 0.5,
    tx: spot.x + 0.5, ty: spot.y + 0.5,
    walking: false, wait: 1, phase: Math.random() * 10,
    chest: {}, role: 'all'
  });
  playSound('level');
  return true;
}

function depositSeed(farmer, type, n) {
  const def = CROPS[type];
  if (!def || n <= 0) return false;
  const cost = def.seedCost * n;
  if (game.coins < cost) { showToast(t('toast.noCoins')); return false; }
  addCoins(-cost);
  farmer.chest[type] = (farmer.chest[type] || 0) + n;
  playSound('click');
  return true;
}

function waterCrop(crop, silent) {
  if (!crop || crop.watered || cropProgress(crop) >= 1) return false;
  const def = CROPS[crop.type];
  const remaining = def.growTime * 1000 - (Date.now() - crop.plantedAt);
  crop.plantedAt -= remaining * 0.4;
  crop.watered = true;
  if (!silent) { spawnSplash(crop.gx, crop.gy); playSound('water'); }
  return true;
}

function harvestCrop(crop) {
  if (!crop || cropProgress(crop) < 1) return null;
  const def = CROPS[crop.type];
  const idx = game.crops.indexOf(crop);
  if (idx === -1) return null;
  game.crops.splice(idx, 1);
  occupancy[occIndex(crop.gx, crop.gy)] = null;
  game.barn[def.id] = (game.barn[def.id] || 0) + 1;
  addXp(def.xp);
  game.stats.harvested = (game.stats.harvested || 0) + 1;
  playSound('harvest');
  return { def, sell: 0, xp: def.xp, toBarn: true };
}

function removeCrop(crop) {
  const idx = game.crops.indexOf(crop);
  if (idx === -1) return null;
  const def = CROPS[crop.type];
  game.crops.splice(idx, 1);
  occupancy[occIndex(crop.gx, crop.gy)] = null;
  const refund = Math.floor(def.seedCost * 0.5);
  addCoins(refund);
  playSound('remove');
  return { refund, def };
}

/* ---------- Animais compráveis ---------- */
const MAX_PER_KIND = 100;
const ANIMAL_GROW_S = 180;

function animalBuyPrice(kind) {
  const def = ANIMALS[kind];
  return def ? Math.round(def.price * 0.4) : 0;
}

function isAdult(a) {
  return (a.age === undefined ? 999 : a.age) >= ANIMAL_GROW_S;
}

function buyAnimal(kind) {
  const def = ANIMALS[kind];
  if (!def) return false;
  const kindCount = game.animals.filter(a => a.kind === kind).length;
  if (kindCount >= MAX_PER_KIND) { showToast(t('toast.animalLimit')); return false; }
  if (game.level < def.level) { showToast(t('shop.locked', { n: def.level })); return false; }
  if (game.coins < def.price) { showToast(t('toast.noCoins')); return false; }
  const spot = randomFreeTile();
  if (!spot) { showToast(t('toast.invalid')); return false; }
  const price = animalBuyPrice(kind);
  if (game.coins < price) { showToast(t('toast.noCoins')); return false; }
  addCoins(-price);
  game.animals.push(makeAnimal(kind, spot));
  game.stats.animals_bought = (game.stats.animals_bought || 0) + 1;
  playSound('place');
  return true;
}

/* ---------- Expansão de terreno ---------- */
function expansionPrice() {
  return Math.round(LAND_EXPANSION.basePrice * Math.pow(LAND_EXPANSION.priceGrowth, game.landExpansions));
}

function canExpand() {
  return game.landExpansions < LAND_EXPANSION.maxExpansions;
}

function buyLand() {
  if (!canExpand()) { showToast(t('toast.expandLimit')); return false; }
  const price = expansionPrice();
  if (game.coins < price) { showToast(t('toast.noCoins')); return false; }
  addCoins(-price);
  game.landExpansions++;
  game.stats.land_expansions = game.landExpansions;

  // adiciona um anel de 3 tiles ao redor da área atual
  const a = game.ownedArea;
  const ring = 3;
  a.x0 = Math.max(0, a.x0 - ring);
  a.y0 = Math.max(0, a.y0 - ring);
  a.x1 = Math.min(GRID_SIZE - 1, a.x1 + ring);
  a.y1 = Math.min(GRID_SIZE - 1, a.y1 + ring);

  addXp(60);
  playSound('level');
  showToast(t('toast.landExpanded', { w: a.x1 - a.x0 + 1, h: a.y1 - a.y0 + 1 }));
  return true;
}

/* ---------- Missões e conquistas ---------- */
function missionProgress(m) {
  return Math.min(m.target, game.stats[m.stat] || 0);
}

function claimMission(m) {
  if (game.missionsClaimed.includes(m.id)) return false;
  if (missionProgress(m) < m.target) return false;
  game.missionsClaimed.push(m.id);
  addCoins(m.rewardCoins);
  addXp(m.rewardXp);
  playSound('level');
  showToast(t('toast.missionDone', { c: m.rewardCoins, x: m.rewardXp }));
  return true;
}

function achievementProgress(a) {
  return Math.min(a.target, game.stats[a.stat] || 0);
}

function claimAchievement(a) {
  if (game.achievementsClaimed.includes(a.id)) return false;
  if (achievementProgress(a) < a.target) return false;
  game.achievementsClaimed.push(a.id);
  addCoins(a.rewardCoins);
  playSound('level');
  showToast(t('toast.achievementDone', { c: a.rewardCoins }));
  return true;
}

function autoClaimReady() {
  for (const m of MISSIONS) {
    if (!game.missionsClaimed.includes(m.id) && missionProgress(m) >= m.target) claimMission(m);
  }
  for (const a of ACHIEVEMENTS) {
    if (!game.achievementsClaimed.includes(a.id) && achievementProgress(a) >= a.target) claimAchievement(a);
  }
}

/* ---------- Salvamento ---------- */
function applyToolMigration(data) {
  const legacy = (data.day || 0) > 0 || (data.level || 1) > 1;
  if (!data.upgrades) return legacy ? { water: 2, till: 2 } : { water: 0, till: 0 };
  return { water: 0, till: 0, ...data.upgrades };
}

function snapshotData() {
  return {
    coins: game.coins, gems: game.gems, xp: game.xp, level: game.level,
    farmName: game.farmName, ownedArea: game.ownedArea,
    buildings: game.buildings, crops: game.crops, animals: game.animals, nextId: game.nextId,
    tilled: game.tilled, farmers: game.farmers,
    pen: game.pen, dogs: game.dogs, time: game.time,
    barn: game.barn, orders: game.orders, upgrades: game.upgrades,
    day: game.day, weather: game.weather, weatherT: game.weatherT,
    tutorialDone: game.tutorialDone, introDone: game.introDone,
    stats: game.stats, missionsClaimed: game.missionsClaimed,
    seeds: game.seeds, tractorOwned: game.tractorOwned, snow: game.snow,
    playerName: game.playerName, playerFace: game.playerFace,
    levelTasks: game.levelTasks, tasksLevel: game.tasksLevel,
    achievementsClaimed: game.achievementsClaimed,
    settings: game.settings, landExpansions: game.landExpansions,
    farmCode: game.farmCode
  };
}

let resetPending = false;

function saveGame(showToastMsg) {
  if (game.visiting || resetPending) return false;
  try {
    const prev = localStorage.getItem(SAVE_KEY);
    if (prev) localStorage.setItem(SAVE_KEY + '_bak', prev);
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshotData()));
    if (showToastMsg) showToast(t('toast.saved'));
    return true;
  } catch (e) {
    console.error('Falha ao salvar', e);
    return false;
  }
}

function loadGame() {
  let data = null;
  for (const key of [SAVE_KEY, SAVE_KEY + '_bak']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      data = JSON.parse(raw);
      break;
    } catch (e) { data = null; }
  }
  if (!data) return false;
  return applySaveData(data);
}

function applySaveData(data) {
  try {
    Object.assign(game, {
      coins: data.coins ?? 750, gems: data.gems ?? 5,
      xp: data.xp ?? 0, level: data.level ?? 1,
      farmName: data.farmName ?? 'Fazenda do Jogador',
      ownedArea: data.ownedArea ?? { ...START_AREA },
      buildings: data.buildings ?? [], crops: data.crops ?? [], animals: data.animals ?? [], nextId: data.nextId ?? 1,
      tilled: data.tilled ?? {}, farmers: data.farmers ?? [],
      pen: data.pen ?? null, dogs: data.dogs ?? (data.dog ? [data.dog] : []), time: data.time ?? 0.1,
      stats: data.stats ?? {}, missionsClaimed: data.missionsClaimed ?? [],
      achievementsClaimed: data.achievementsClaimed ?? [],
      settings: { ...game.settings, ...(data.settings ?? {}) },
      landExpansions: data.landExpansions ?? 0,
      farmCode: data.farmCode ?? null,
      barn: data.barn ?? {}, orders: data.orders ?? [],
      upgrades: applyToolMigration(data), 
      tutorialDone: data.tutorialDone ?? ((data.day || 0) > 0 || (data.level || 1) > 1),
      introDone: data.introDone ?? ((data.day || 0) > 0 || (data.level || 1) > 1 || (data.buildings || []).length > 0),
      intro: null,
      day: data.day ?? 0,
      weather: data.weather ?? 'clear', weatherT: data.weatherT ?? 0,
      seeds: data.seeds ?? {},
      tractorOwned: data.tractorOwned ?? false, tractor: null,
      snow: data.snow ?? 0,
      playerName: data.playerName ?? 'Fazendeiro',
      playerFace: data.playerFace ?? '👨‍🌾',
      levelTasks: data.levelTasks ?? [], tasksLevel: data.tasksLevel ?? 1,
      particles: [],
      couriers: []
    });
    for (const a of game.animals) {
      if (a.age === undefined) a.age = 999;
      if (a.bornAt === undefined) a.bornAt = Date.now();
    }
    for (const ff of game.farmers) {
      if (ff.health === undefined) ff.health = 100;
      if (ff.sickT === undefined) ff.sickT = 0;
    }
    if (!data.upgrades && ((data.day || 0) > 0 || (data.level || 1) > 1)) {
      game.upgrades = { water: 2, till: 2 };
    }
    if (!data.seeds && ((data.day || 0) > 0 || (data.level || 1) > 1)) {
      for (const c of Object.values(CROPS)) {
        if (c.level <= game.level) game.seeds[c.id] = 5;
      }
    }
    if (!data.orders) ensureOrders();
    game.stats.level = game.level;
    game.stats.peak_coins = Math.max(game.stats.peak_coins || 0, game.coins);
    occupancy.fill(null);
    for (const b of game.buildings) markOccupancy(b, true);
    for (const c of game.crops) occupancy[occIndex(c.gx, c.gy)] = c;
    return true;
  } catch (e) {
    console.error('Falha ao aplicar estado', e);
    return false;
  }
}

const FARM_CODE_RE = /^[0-9]{6}$/;
function genFarmCode() {
  let c = '';
  for (let i = 0; i < 6; i++) c += String(Math.floor(Math.random() * 10));
  return c;
}

function ensureFarmCode() {
  if (!FARM_CODE_RE.test(game.farmCode || '')) game.farmCode = genFarmCode();
  return game.farmCode;
}

function normalizeFarmCode(raw) {
  return String(raw || '').replace(/[^0-9]/g, '').slice(0, 6);
}

/* ---------- Pa: remove qualquer coisa e devolve a grama ---------- */
function shovelTile(gx, gy) {
  const c = cropAt(gx, gy);
  if (c) {
    const idx = game.crops.indexOf(c);
    if (idx !== -1) game.crops.splice(idx, 1);
    occupancy[occIndex(gx, gy)] = null;
    const def = CROPS[c.type];
    const refund = Math.floor((def.seedCost || 0) * 0.25);
    if (refund > 0) addCoins(refund);
    playSound('remove');
    return { what: t('c_' + c.type), refund };
  }
  const b = buildingAt(gx, gy);
  if (b) {
    const r = removeBuilding(b.id);
    return r ? { what: t('b_' + r.def.id), refund: r.refund } : null;
  }
  const key = gx + ',' + gy;
  if (game.tilled[key]) {
    delete game.tilled[key];
    playSound('remove');
    return { what: t('shovel.tilled'), refund: 0 };
  }
  return null;
}

/* ---------- Presentes de visitantes ---------- */
function receiveGift(gift) {
  if (!gift || game.visiting) return null;
  if (gift.kind === 'coins') {
    const n = Math.max(1, Math.min(MP_GIFT_LIMITS.coins, Math.floor(gift.n || 0)));
    addCoins(n);
    spawnFloater(game.ownedArea.x0 + 6, game.ownedArea.y0 + 6, '+' + n, '#ffd54f');
    return { msg: '+' + n + ' moedas' };
  }
  if (gift.kind === 'seed' && CROPS[gift.id]) {
    const n = Math.max(1, Math.min(MP_GIFT_LIMITS.seeds, Math.floor(gift.n || 0)));
    const target = game.farmers[0];
    if (!target) return null;
    target.chest[gift.id] = (target.chest[gift.id] || 0) + n;
    return { msg: n + 'x ' + t('c_' + gift.id) };
  }
  if (gift.kind === 'animal' && ANIMALS[gift.id]) {
    const kind = gift.id;
    const room = MAX_PER_KIND - game.animals.filter(a => a.kind === kind).length;
    if (room <= 0) return null;
    const howMany = Math.max(1, Math.min(MP_GIFT_LIMITS.animals, Math.min(room, Math.floor(gift.n || 1))));
    let added = 0;
    for (let i = 0; i < howMany; i++) {
      const spot = randomFreeTile();
      if (!spot) break;
      game.animals.push(makeAnimal(kind, spot));
      added++;
    }
    if (!added) return null;
    return { msg: added + 'x ' + t('an_' + kind) };
  }
  return null;
}

function resetGame() {
  resetPending = true;
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(SAVE_KEY + '_bak');
  localStorage.removeItem(SAVE_KEY + '_visit');
  location.reload();
}
