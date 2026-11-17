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
  buildings: [],          // {id, type, gx, gy, rot}
  crops: [],              // {id, isCrop, type, gx, gy, plantedAt, watered}
  animals: [],            // {id, kind, gx, gy, tx, ty, walking, wait, phase}
  tilled: {},             // "gx,gy" -> 1 (terra arada: plantio 25% mais rapido)
  farmers: [],            // {id, gx, gy, tx, ty, walking, wait, phase, chest}
  pen: null,              // {x0, y0, x1, y1, gateX, gateY, paid}
  dog: null,              // {gx, gy, tx, ty, walking, wait, phase, active, face, lastDir}
  nextId: 1,
  stats: {},              // contadores p/ missões e conquistas
  missionsClaimed: [],
  achievementsClaimed: [],
  settings: { sound: true, music: false, quality: 'alta', language: 'pt-BR' },
  landExpansions: 0
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

function addXp(n) {
  game.xp += n;
  uiDirty.xp = true;
  while (game.xp >= xpForLevel(game.level)) {
    game.xp -= xpForLevel(game.level);
    game.level++;
    game.stats.level = game.level;
    showToast(t('toast.levelUp', { n: game.level }));
    playSound('level');
  }
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
  if (!free) {
    if (game.coins < def.seedCost) { showToast(t('toast.noCoins')); return null; }
    addCoins(-def.seedCost);
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
  playSound('dig');
  return true;
}

function isTilled(gx, gy) {
  return !!game.tilled[gx + ',' + gy];
}

/* ---------- Colher tudo ---------- */
function harvestAllCrops() {
  let n = 0, coins = 0, xp = 0;
  for (let i = game.crops.length - 1; i >= 0; i--) {
    const r = harvestCrop(game.crops[i]);
    if (r) { n++; coins += r.sell; xp += r.xp; }
  }
  return { n, coins, xp };
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
function buyDog() {
  const def = HELPERS.dog;
  if (game.level < def.level) { showToast(t('shop.locked', { n: def.level })); return false; }
  if (game.dog) { showToast(t('toast.dogOwned')); return false; }
  if (game.coins < def.price) { showToast(t('toast.noCoins')); return false; }
  const spot = randomFreeTile();
  if (!spot) { showToast(t('toast.invalid')); return false; }
  addCoins(-def.price);
  game.dog = {
    gx: spot.x + 0.5, gy: spot.y + 0.5,
    tx: spot.x + 0.5, ty: spot.y + 0.5,
    walking: false, wait: 1, phase: Math.random() * 10,
    active: false, face: 0, lastDir: 1
  };
  playSound('level');
  return true;
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
    playSound('harvest');
    return true;
  }
  if (!a.product) return false;
  const def = ANIMALS[a.kind];
  const value = def.value * a.product;
  addCoins(value);
  spawnFloater(a.gx - 0.5, a.gy - 0.5, def.product + ' +' + value + ' 🪙', '#ffd54f');
  a.product = 0;
  playSound('harvest');
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

function waterCrop(crop) {
  if (!crop || crop.watered || cropProgress(crop) >= 1) return false;
  const def = CROPS[crop.type];
  const remaining = def.growTime * 1000 - (Date.now() - crop.plantedAt);
  crop.plantedAt -= remaining * 0.4;
  crop.watered = true;
  playSound('water');
  return true;
}

function harvestCrop(crop) {
  if (!crop || cropProgress(crop) < 1) return null;
  const def = CROPS[crop.type];
  const idx = game.crops.indexOf(crop);
  if (idx === -1) return null;
  game.crops.splice(idx, 1);
  occupancy[occIndex(crop.gx, crop.gy)] = null;
  addCoins(def.sell);
  addXp(def.xp);
  game.stats.harvested = (game.stats.harvested || 0) + 1;
  playSound('harvest');
  return { def, sell: def.sell, xp: def.xp };
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

function buyAnimal(kind) {
  const def = ANIMALS[kind];
  if (!def) return false;
  const kindCount = game.animals.filter(a => a.kind === kind).length;
  if (kindCount >= MAX_PER_KIND) { showToast(t('toast.animalLimit')); return false; }
  if (game.level < def.level) { showToast(t('shop.locked', { n: def.level })); return false; }
  if (game.coins < def.price) { showToast(t('toast.noCoins')); return false; }
  const spot = randomFreeTile();
  if (!spot) { showToast(t('toast.invalid')); return false; }
  addCoins(-def.price);
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
function saveGame(showToastMsg) {
  try {
    const data = {
      coins: game.coins, gems: game.gems, xp: game.xp, level: game.level,
      farmName: game.farmName, ownedArea: game.ownedArea,
      buildings: game.buildings, crops: game.crops, animals: game.animals, nextId: game.nextId,
      tilled: game.tilled, farmers: game.farmers,
      pen: game.pen, dog: game.dog,
      stats: game.stats, missionsClaimed: game.missionsClaimed,
      achievementsClaimed: game.achievementsClaimed,
      settings: game.settings, landExpansions: game.landExpansions
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    if (showToastMsg) showToast(t('toast.saved'));
    return true;
  } catch (e) {
    console.error('Falha ao salvar', e);
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    Object.assign(game, {
      coins: data.coins ?? 750, gems: data.gems ?? 5,
      xp: data.xp ?? 0, level: data.level ?? 1,
      farmName: data.farmName ?? 'Fazenda do Jogador',
      ownedArea: data.ownedArea ?? { ...START_AREA },
      buildings: data.buildings ?? [], crops: data.crops ?? [], animals: data.animals ?? [], nextId: data.nextId ?? 1,
      tilled: data.tilled ?? {}, farmers: data.farmers ?? [],
      pen: data.pen ?? null, dog: data.dog ?? null,
      stats: data.stats ?? {}, missionsClaimed: data.missionsClaimed ?? [],
      achievementsClaimed: data.achievementsClaimed ?? [],
      settings: { ...game.settings, ...(data.settings ?? {}) },
      landExpansions: data.landExpansions ?? 0
    });
    game.stats.level = game.level;
    game.stats.peak_coins = Math.max(game.stats.peak_coins || 0, game.coins);
    occupancy.fill(null);
    for (const b of game.buildings) markOccupancy(b, true);
    for (const c of game.crops) occupancy[occIndex(c.gx, c.gy)] = c;
    return true;
  } catch (e) {
    console.error('Falha ao carregar', e);
    return false;
  }
}

function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}
