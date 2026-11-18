/* Teste de fumaça do Fazenda 3D — roda com: node tests/smoke.js
   1) Varredura estática: nenhuma função chamada pode estar indefinida.
   2) Simulação completa: carrega os 7 scripts e exercita render, zoom,
      plantio, rega, colheita, animais e save/load. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = ['data.js', 'iso.js', 'game.js', 'render.js', 'animals.js', 'farmers.js', 'ui.js', 'multiplayer.js', 'main.js'];

let failures = 0;
const fail = msg => { failures++; console.error('FALHOU: ' + msg); };

/* ---------- 1) Varredura estática de chamadas indefinidas ---------- */
function stripNoise(src) {
  src = src.replace(/\/\*[\s\S]*?\*\//g, '');
  src = src.replace(/\/\/[^\n]*/g, '');
  src = src.replace(/'(?:\\.|[^'\\])*'/g, "''");
  src = src.replace(/"(?:\\.|[^"\\])*"/g, '""');
  src = src.replace(/`(?:\\.|[^`\\])*`/g, '``');
  return src;
}

const defined = new Set();
const stripped = {};
for (const f of SCRIPTS) {
  const src = stripNoise(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'));
  stripped[f] = src;
  for (const m of src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
  for (const m of src.matchAll(/^\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm)) defined.add(m[1]);
  for (const m of src.matchAll(/\bfunction\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)/g)) {
    for (const p of m[1].split(',')) {
      const name = p.trim().split(/[=\s]/)[0];
      if (name) defined.add(name);
    }
  }
  for (const m of src.matchAll(/\(([^()]*)\)\s*=>/g)) {
    for (const p of m[1].split(',')) {
      const name = p.trim().split(/[=\s]/)[0];
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) defined.add(name);
    }
  }
}

const BUILTINS = new Set(('if for while switch catch return function new delete typeof instanceof in of do ' +
  'else try console Math Date JSON parseInt parseFloat isNaN Number String Boolean Array Object ' +
  'Infinity NaN undefined performance requestAnimationFrame cancelAnimationFrame setTimeout ' +
  'clearTimeout setInterval clearInterval addEventListener removeEventListener localStorage ' +
  'document window navigator devicePixelRatio Symbol Proxy Set Map Promise Error TypeError').split(' '));

for (const [f, src] of Object.entries(stripped)) {
  for (const m of src.matchAll(/(?<![\w.$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = m[1];
    if (defined.has(name) || BUILTINS.has(name) || /^[A-Z]/.test(name)) continue;
    fail(`chamada indefinida "${name}" em js/${f}`);
  }
}

/* ---------- 2) Simulação completa em sandbox ---------- */
function makeCtx() {
  const proxy = new Proxy(function () {}, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === 'canvas') return { width: 800, height: 600 };
      return (...a) => proxy;
    },
    set() { return true; },
    apply() { return proxy; }
  });
  return proxy;
}

function makeEl() {
  return {
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    addEventListener() {}, removeEventListener() {},
    style: {}, dataset: {}, textContent: '', innerHTML: '', value: '', title: '',
    appendChild() {}, removeChild() {}, remove() {}, focus() {}, blur() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
    clientWidth: 800, clientHeight: 600, width: 800, height: 600,
    getContext() { return makeCtx(); },
    setPointerCapture() {}, releasePointerCapture() {},
    querySelector() { return makeEl(); }, querySelectorAll() { return []; },
    insertAdjacentHTML() {}, closest() { return null; },
    disabled: false, checked: false, hidden: false
  };
}

const store = {};
const els = {};
const noop = () => {};
const sandbox = {
  console, Math, Date, JSON,
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
  setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  addEventListener: noop, removeEventListener: noop, dispatchEvent() { return true; },
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  devicePixelRatio: 1,
  URLSearchParams: class { constructor() { this.p = {}; } get() { return null; } has() { return false; } },
  location: { search: '', origin: 'https://fazenda.test', pathname: '/index.html', hostname: 'fazenda.test', protocol: 'https:', reload: function () {} },
  navigator: { language: 'pt-BR' },
  document: {
    documentElement: makeEl(),
    getElementById: id => (els[id] = els[id] || makeEl()),
    createElement: () => makeEl(),
    querySelectorAll: () => [],
    addEventListener: noop, removeEventListener: noop,
    visibilityState: 'visible', body: makeEl(), hidden: false
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of SCRIPTS) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), sandbox, { filename: f });
}

vm.runInContext(`
  // jogo novo: casa e poco iniciais dentro da area possuida
  if (!game.buildings.some(b => b.type === 'house')) throw new Error('jogo novo sem casa (init)');
  if (!game.buildings.some(b => b.type === 'well')) throw new Error('jogo novo sem poco (init)');

  // render base com todas as construcoes do catalogo
  game.coins = 999999;
  game.gems = 99;
  let bx = 2, by = 2, row = 0;
  for (const id of Object.keys(BUILDINGS)) {
    placeBuilding(id, bx, by, 0, true);
    bx += 6;
    if (bx > 40) { bx = 2; by += 6; }
  }
  // todas as culturas nos 3 estagios de crescimento
  game.ownedArea = { x0: 0, y0: 0, x1: 47, y1: 47 };
  let cx = 2, cy = 20;
  for (const id of Object.keys(CROPS)) {
    const c = plantCrop(id, cx, cy);
    if (!c) throw new Error('plantCrop falhou para ' + id);
    if (Math.random === undefined) throw new Error('impossivel');
    cx += 1;
    if (cx > 12) { cx = 2; cy += 1; }
  }
  const crops = game.crops.slice();
  crops[0].plantedAt -= CROPS[crops[0].type].growTime * 1000;      // pronto
  crops[1].plantedAt -= CROPS[crops[1].type].growTime * 500;       // metade
  crops[1].watered = true;
  waterCrop(cropAt(crops[2].gx, crops[2].gy));
  crops[3].plantedAt -= CROPS[crops[3].type].growTime * 1000;
  crops[3].watered = true;

  // render em varios zooms e modos
  for (const z of [0.4, 0.72, 1, 1.5, 2.5]) {
    cam.zoom = z;
    render(ctx, cam, 800, 600, state);
  }
  spawnFloater(12, 12, '+25 moedas', '#ffd54f');
  render(ctx, cam, 800, 600, state);

  state.mode = 'build';
  state.ghost = { type: 'house', gx: 30, gy: 30, rot: 0, valid: true };
  render(ctx, cam, 800, 600, state);
  state.ghost = null;
  state.mode = 'idle';
  state.highlightTile = { gx: 22, gy: 22 };
  render(ctx, cam, 800, 600, state);
  state.highlightTile = null;

  // acoes centrais
  zoomAt(400, 300, 1.5);
  zoomStep(1 / 1.25);
  zoomHandlers.zoomReset();
  const c1 = cropAt(crops[0].gx, crops[0].gy);
  if (!harvestCrop(c1)) throw new Error('colheita falhou');
  buyAnimal('cow');
  updateAnimals(0.016);
  render(ctx, cam, 800, 600, state);

  // save/load roundtrip
  saveGame(false);
  const snapshot = JSON.stringify({ coins: game.coins, crops: game.crops.length, animals: game.animals.length });
  if (!loadGame()) throw new Error('loadGame falhou');
  const restored = JSON.stringify({ coins: game.coins, crops: game.crops.length, animals: game.animals.length });
  if (snapshot !== restored) throw new Error('save/load divergiu: ' + snapshot + ' vs ' + restored);

  // aracao + bonus de crescimento
  if (!tillSoil(30, 30)) throw new Error('tillSoil falhou');
  if (!isTilled(30, 30)) throw new Error('isTilled falhou');
  const tc = plantCrop('wheat', 30, 30);
  if (!(cropProgress(tc) > 0.2)) throw new Error('bonus de terra arada nao aplicado');

  // fazendeiro: contrata, enche o bau, deixa trabalhar e vender
  game.coins = 999999;
  game.level = 5;
  if (!buyFarmer()) throw new Error('buyFarmer falhou');
  const fm = game.farmers[0];
  if (!depositSeed(fm, 'corn', 5)) throw new Error('depositSeed falhou');
  if (fm.chest.corn !== 5) throw new Error('bau com contagem errada');
  const plantedBefore = game.stats.planted || 0;
  const harvestedBefore = game.stats.harvested || 0;
  for (const [tx2, ty2] of [[31, 30], [32, 30], [30, 31], [31, 31], [32, 31]]) tillSoil(tx2, ty2);
  game.meetingDone = true;
  game.time = 0.2;
  for (let i = 0; i < 900; i++) updateFarmers(0.1);
  if ((game.stats.planted || 0) <= plantedBefore) throw new Error('fazendeiro nao plantou');
  game.time = 0.5;
  for (let i = 0; i < 900; i++) updateFarmers(0.1);
  if ((game.stats.harvested || 0) <= harvestedBefore) throw new Error('fazendeiro nao colheu/vendeu');
  game.time = 0.1;
  render(ctx, cam, 800, 600, state);

  // teto de 100 por especie
  game.coins = 99999999;
  for (let i = 0; i < 105; i++) buyAnimal('chicken');
  const chickens = game.animals.filter(a => a.kind === 'chicken').length;
  if (chickens !== 100) throw new Error('limite de 100 por especie falhou: ' + chickens);
  updateAnimals(0.016);
  render(ctx, cam, 800, 600, state);

  // producao dos animais: ovo e leite
  game.coins = 999999;
  const hen = game.animals.find(a => a.kind === 'chicken');
  hen.product = 2;
  const coinsBefore = game.coins;
  if (!collectAnimal(hen)) throw new Error('coleta de ovo falhou');
  if (game.coins !== coinsBefore + 30) throw new Error('valor do ovo errado');
  if (hen.product !== 0) throw new Error('produto nao zerado');
  const cow2 = game.animals.find(a => a.kind === 'cow');
  cow2.product = 1;
  if (!collectAnimal(cow2)) throw new Error('coleta de leite falhou');

  // porco: jovem nao pode ser abatido; aos 5 min vira bacon
  buyAnimal('pig');
  const porky = game.animals[game.animals.length - 1];
  if (collectAnimal(porky)) throw new Error('porco jovem foi abatido');
  porky.bornAt -= 301000;
  const pigsBefore = game.animals.filter(a => a.kind === 'pig').length;
  if (!collectAnimal(porky)) throw new Error('abate do porco falhou');
  if (game.animals.filter(a => a.kind === 'pig').length !== pigsBefore - 1) throw new Error('porco nao removido');

  // recolher tudo: produtos de todos os animais de uma vez
  game.coins = 999999;
  game.animals.filter(a => a.kind === 'chicken').forEach(h => { h.product = 2; });
  game.animals.filter(a => a.kind === 'cow').forEach(c => { c.product = 1; });
  const ca = collectAllProducts();
  if (ca.n < 100) throw new Error('collectAllProducts coletou ' + ca.n);
  if (ca.coins <= 0) throw new Error('collectAllProducts sem moedas');
  if (game.animals.some(a => a.kind !== 'pig' && a.product > 0)) throw new Error('produto nao recolhido');

  // orientacao 360 graus: animais e fazendeiro ganham face
  updateAnimals(0.016);
  const walker = game.animals.find(a => a.face !== undefined);
  if (!walker) throw new Error('face do animal ausente');
  if (game.farmers.length && game.farmers[0].face === undefined) throw new Error('face do fazendeiro ausente');

  // funcoes dos fazendeiros: role filtra os trabalhos
  game.time = 0.2;
  const fRole = game.farmers[0];
  const henR = game.animals.find(a => a.kind === 'chicken');
  if (henR) henR.product = 2;
  fRole.role = 'animal';
  const jobA = farmerFindJob(fRole);
  if (!jobA || jobA.kind !== 'animal') throw new Error('role animal nao busca animais');
  fRole.role = 'plant';
  depositSeed(fRole, 'corn', 2);
  const jobP = farmerFindJob(fRole);
  if (jobP && jobP.kind === 'animal') throw new Error('role plant busca animais');
  if (!jobP) throw new Error('role plant sem trabalho de plantio/colheita');
  fRole.role = 'all';

  // curral: montar, cachorro junta os animais, eles nao saem, remover com reembolso
  game.coins = 999999;
  let penPlaced = false;
  for (let cy = 4; cy < 44 && !penPlaced; cy++) {
    for (let cx = 4; cx < 44 && !penPlaced; cx++) {
      if (penValid(penRect(cx, cy, 8)) && placePen(cx, cy, 8)) penPlaced = true;
    }
  }
  if (!penPlaced) throw new Error('nenhum lugar livre para o curral');
  if (!buyDog()) throw new Error('buyDog falhou');
  game.dogs[0].active = true;
  for (let i = 0; i < 600; i++) updateDogs(0.05);
  if (!game.animals.some(a => a.scaredT > 0 || a.herdStage > 0 || inPen(a))) throw new Error('cachorro nao assustou ninguem');
  for (const a of game.animals) if (!inPen(a)) herdAnimal(a);
  for (let i = 0; i < 8000; i++) updateAnimals(0.05);
  const outside = game.animals.filter(a => !inPen(a)).length;
  if (outside > 0) throw new Error('animais fora do curral: ' + outside);
  render(ctx, cam, 800, 600, state);
  const refund = removePen();
  if (game.pen !== null) throw new Error('curral nao removido');
  if (refund <= 0) throw new Error('reembolso zerado');

  // fazendeiro coleta produtos e planta em fileiras adjacentes
  game.meetingDone = true;
  game.time = 0.2;
  buyFarmer();
  const fm2 = game.farmers[game.farmers.length - 1];
  depositSeed(fm2, 'wheat', 6);
  game.crops.forEach(c => { c.product = undefined; });
  const anchor = plantCrop('wheat', 5, 40, true);
  for (let tx3 = 6; tx3 < 11; tx3++) tillSoil(tx3, 40);
  const cropsBefore2 = game.crops.length;
  for (let i = 0; i < 1200; i++) updateFarmers(0.1);
  const newCrops = game.crops.slice(cropsBefore2);
  if (newCrops.length === 0) throw new Error('fazendeiro nao plantou em fileira');
  for (const c of newCrops) {
    const adj = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => {
      const nb = occupancy[occIndex(c.gx + dx, c.gy + dy)];
      return nb && nb.isCrop;
    });
    if (!adj) throw new Error('plantio fora da fileira em ' + c.gx + ',' + c.gy);
  }
  render(ctx, cam, 800, 600, state);

  // colher tudo
  for (const c of game.crops) c.plantedAt -= CROPS[c.type].growTime * 1000;
  const total = game.crops.length;
  const ha = harvestAllCrops();
  if (ha.n !== total) throw new Error('harvestAllCrops colheu ' + ha.n + ' de ' + total);
  render(ctx, cam, 800, 600, state);

  // ciclo dia/noite: fases e alpha
  game.time = 0.02; if (dayPhase() !== 'dawn') throw new Error('fase 0.02 deveria ser dawn');
  game.time = 0.2;  if (dayPhase() !== 'day') throw new Error('fase 0.2 deveria ser day');
  game.time = 0.5;  if (dayPhase() !== 'afternoon') throw new Error('fase 0.5 deveria ser afternoon');
  game.time = 0.9;  if (dayPhase() !== 'night') throw new Error('fase 0.9 deveria ser night');
  if (Math.abs(nightAlpha(0.3)) > 1e-9) throw new Error('alpha de dia deveria ser 0');
  if (Math.abs(nightAlpha(0.9) - 0.45) > 1e-9) throw new Error('alpha de noite deveria ser 0.45');

  // cachorro automatico: a noite junta todos no curral
  game.coins = 999999;
  let pen2 = false;
  for (let cy = 4; cy < 44 && !pen2; cy++) {
    for (let cx = 4; cx < 44 && !pen2; cx++) {
      if (penValid(penRect(cx, cy, 8)) && placePen(cx, cy, 8)) pen2 = true;
    }
  }
  if (!pen2) throw new Error('nenhum lugar livre para o curral 2');
  for (const dg of game.dogs) dg.active = false;
  for (const a of game.animals) { a.herdStage = 0; a.scaredT = 0; }
  game.time = 0.9;
  for (let i = 0; i < 8000; i++) { updateDogs(0.05); updateAnimals(0.05); }
  const foraNoite = game.animals.filter(a => !inPen(a)).length;
  if (foraNoite > 0) throw new Error('cachorro nao juntou os animais a noite: ' + foraNoite);

  // ao amanhecer o cachorro solta os animais para pastar
  game.time = 0.02;
  for (const a of game.animals) { a.herdStage = 0; a.scaredT = 0; }
  for (let i = 0; i < 8000; i++) { updateDogs(0.05); updateAnimals(0.05); }
  if (!game.animals.some(a => !inPen(a))) throw new Error('cachorro nao soltou os animais ao amanhecer');
  const spotsDawn = new Set(game.animals.filter(a => !inPen(a)).map(a => Math.floor(a.gx) + ',' + Math.floor(a.gy)));
  if (game.animals.length > 3 && spotsDawn.size < 2) throw new Error('animais nao se espalharam ao amanhecer');
  removePen();

  // cavalo: compra e fazendeiro pode montar
  game.coins = 999999;
  game.level = 6;
  if (!buyAnimal('horse')) throw new Error('buyAnimal horse falhou');
  if (!game.animals.some(a => a.kind === 'horse')) throw new Error('cavalo nao criado');
  const horseA = game.animals.find(a => a.kind === 'horse');
  if (isAdult(horseA)) throw new Error('cavalo recem-comprado deveria ser filhote');
  horseA.age = 999;
  if (!hasHorse()) throw new Error('hasHorse falso com cavalo adulto');
  horseA.age = 0;
  if (hasHorse()) throw new Error('hasHorse verdadeiro com filhote');
  horseA.age = 999;
  updateAnimals(0.016);
  render(ctx, cam, 800, 600, state);

  // relogio: 06:00 ao amanhecer, 18:00 as 18h do ciclo
  if (clockString(0) !== '06:00') throw new Error('clockString(0) deveria ser 06:00');
  if (clockString(0.5) !== '18:00') throw new Error('clockString(0.5) deveria ser 18:00');

  // pathfinding: caminho ate o portao nao atravessa cerca nem construcao
  game.coins = 999999;
  let pen3 = false;
  for (let cy = 4; cy < 44 && !pen3; cy++) {
    for (let cx = 4; cx < 44 && !pen3; cx++) {
      if (penValid(penRect(cx, cy, 8)) && placePen(cx, cy, 8)) pen3 = true;
    }
  }
  if (!pen3) throw new Error('nenhum lugar livre para o curral 3');
  const far = randomFreeTile();
  const path = gridPath(far.x, far.y, game.pen.gateX, game.pen.gateY, herdPassable);
  if (!path) throw new Error('gridPath nao achou caminho ate o portao');
  for (const w of path.slice(0, -1)) {
    if (occupancy[occIndex(w.x, w.y)]) throw new Error('caminho atravessa obstaculo em ' + w.x + ',' + w.y);
  }

  // animais assustados correm na velocidade do cavalo
  const runner = game.animals.find(a => !inPen(a));
  if (runner) {
    herdAnimal(runner);
    const base = ANIMAL_KINDS[runner.kind].speed * (runner.speedMul || 1);
    if (base < ANIMAL_KINDS.horse.speed && runner.herdStage === 1) {
      const d0 = Math.hypot(runner.tx - runner.gx, runner.ty - runner.gy);
      runner.gx -= 0.3;
      updateAnimals(0.1);
      const moved = Math.hypot(runner.tx - runner.gx, runner.ty - runner.gy);
      const traveled = d0 + 0.3 - moved;
      if (traveled < ANIMAL_KINDS.horse.speed * 0.1 * 0.9) throw new Error('animal assustado mais lento que o cavalo');
    }
  }

  // fazendeiros dormem na casa a noite e voltam ao amanhecer
  if (!game.buildings.some(b => b.type === 'house')) {
    game.ownedArea = { x0: 0, y0: 0, x1: 47, y1: 47 };
    let hs = false;
    for (let cy = 2; cy < 42 && !hs; cy++) {
      for (let cx = 2; cx < 42 && !hs; cx++) {
        if (canPlace('house', cx, cy, 0)) { placeBuilding('house', cx, cy, 0, true); hs = true; }
      }
    }
    if (!hs) throw new Error('sem lugar para a casa no teste');
  }
  game.time = 0.9;
  for (let i = 0; i < 600; i++) updateFarmers(0.1);
  if (!game.farmers.length || !game.farmers.every(f => f.inside)) throw new Error('fazendeiro nao entrou na casa a noite');
  render(ctx, cam, 800, 600, state);
  game.time = 0.1;
  for (let i = 0; i < 60; i++) updateFarmers(0.1);
  if (!game.farmers.every(f => !f.inside)) throw new Error('fazendeiro nao voltou ao amanhecer');
  game.time = 0.1;
  removePen();

  // multiplayer: codigo da fazenda, snapshot/apply e presentes
  const code = ensureFarmCode();
  if (!/^[0-9]{6}$/.test(code)) throw new Error('codigo de fazenda invalido: ' + code);
  if (ensureFarmCode() !== code) throw new Error('codigo mudou entre chamadas');
  game.farmCode = 'F3D-AB12';
  if (!/^[0-9]{6}$/.test(ensureFarmCode())) throw new Error('codigo antigo nao migrou');
  if (normalizeFarmCode('12 34 56') !== '123456' || normalizeFarmCode('F3D-XY9') !== '39') throw new Error('normalizeFarmCode errado');
  game.farmCode = null;
  const snapBefore = JSON.stringify(snapshotData());
  if (!applySaveData(JSON.parse(snapBefore))) throw new Error('applySaveData falhou');
  if (JSON.stringify(snapshotData()) !== snapBefore) throw new Error('snapshot/applySaveData divergiu');
  updateMultiplayer(0.016);

  // modo visita: save bloqueado, simulacao congelada e volta para a fazenda certa
  const homeCoins = game.coins;
  const homeBuildings = game.buildings.length;
  const hostSnap = JSON.parse(JSON.stringify(snapshotData()));
  hostSnap.coins = 99999;
  hostSnap.buildings = hostSnap.buildings.slice(0, 1);
  hostSnap.farmers = [];
  enterVisitMode(hostSnap);
  if (!game.visiting) throw new Error('nao entrou em modo visita');
  if (game.coins !== 99999 || game.buildings.length !== 1) throw new Error('fazenda do host nao carregou');
  if (saveGame(false) !== false) throw new Error('save durante visita deveria ser bloqueado');
  for (let i = 0; i < 50; i++) { updateAnimals(0.1); updateFarmers(0.1); updateDogs(0.1); }
  leaveVisitMode();
  if (game.visiting) throw new Error('nao saiu do modo visita');
  if (game.coins !== homeCoins) throw new Error('moedas da fazenda propria nao restauradas: ' + game.coins + ' vs ' + homeCoins);
  if (game.buildings.length !== homeBuildings) throw new Error('construcoes da fazenda propria nao restauradas');

  const coinsG = game.coins;
  const g1 = receiveGift({ kind: 'coins', n: 500 });
  if (!g1 || game.coins !== coinsG + 500) throw new Error('presente de moedas falhou');
  game.coins = 999999; game.level = 9;
  const cowsG = game.animals.filter(a => a.kind === 'cow').length;
  const g2 = receiveGift({ kind: 'animal', id: 'cow', n: 2 });
  if (!g2 || game.animals.filter(a => a.kind === 'cow').length !== cowsG + 2) throw new Error('presente de animal falhou');
  const g3 = receiveGift({ kind: 'seed', id: 'wheat', n: 5 });
  if (g3) {
    if (!game.farmers.length || !(game.farmers[0].chest.wheat >= 5)) throw new Error('presente de sementes falhou');
  } else if (game.farmers.length) throw new Error('presente de sementes recusado sem motivo');
  game.visiting = true;
  if (receiveGift({ kind: 'coins', n: 500 })) throw new Error('presente aceito em modo visita');
  game.visiting = false;
  render(ctx, cam, 800, 600, state);

  // mente dos fazendeiros: nome, personalidade, pensamento e conversa
  for (const f of game.farmers) farmerEnsureMind(f);
  const mindF = game.farmers[0];
  if (!mindF.name || !PERSONALITIES[mindF.pers]) throw new Error('fazendeiro sem identidade');
  if (!farmerWorkMul(mindF)) throw new Error('workMul ausente');
  mindF.thoughtT = 0.01;
  updateFarmers(0.05);
  if (!mindF.bubble || !mindF.bubble.text) throw new Error('fazendeiro nao pensou');
  if (!mindF.thoughtLog.length) throw new Error('pensamento nao registrado');
  if (game.farmers.length >= 2) {
    const a = game.farmers[0], b = game.farmers[1];
    a.gx = b.gx + 0.5; a.gy = b.gy;
    a.walking = false; b.walking = false;
    a.chatT = 0; b.chatT = 0;
    a.inside = false; b.inside = false;
    updateFarmers(0.05);
    if ((a.friend[b.id] || 0) < 2) throw new Error('conversa nao aumentou amizade');
    if (!a.bubble || !b.bubble) throw new Error('conversa sem bolhas');
  }
  mindF.energy = 10;
  mindF.inside = true;
  game.time = 0.9;
  updateFarmers(1);
  if (mindF.energy <= 10) throw new Error('energia nao recuperou dormindo');
  game.time = 0.1;
  render(ctx, cam, 800, 600, state);

  // pa: remove plantacao, des-ara a terra e derruba construcao, grama volta
  const sc2 = plantCrop('wheat', 40, 2, true);
  if (!sc2) throw new Error('plantio para teste da pa falhou');
  const r1 = shovelTile(40, 2);
  if (!r1 || occupancy[occIndex(40, 2)]) throw new Error('pa nao removeu plantacao');
  if (!tillSoil(41, 2)) throw new Error('till para teste da pa falhou');
  const r3 = shovelTile(41, 2);
  if (!r3 || isTilled(41, 2)) throw new Error('pa nao restaurou a grama arada');
  const bb = game.buildings[game.buildings.length - 1];
  if (bb) {
    const rB = shovelTile(bb.gx, bb.gy);
    if (!rB || buildingAt(bb.gx, bb.gy)) throw new Error('pa nao removeu construcao');
  }
  const rNone = shovelTile(47, 47);
  updateGhostPosition(10, 10);
  render(ctx, cam, 800, 600, state);

  // ciclo de 10 minutos
  if (DAY_LENGTH !== 600) throw new Error('ciclo deveria durar 10 minutos (600s)');

  // multiplos cachorros: preco dobra e limite de 3
  game.coins = 999999;
  game.level = 5;
  while (game.dogs.length < 3) {
    const before = dogPrice();
    if (!buyDog()) throw new Error('buyDog adicional falhou com ' + game.dogs.length + ' cachorros');
    if (dogPrice() !== before * 2) throw new Error('preco do cachorro nao dobrou');
  }
  if (buyDog()) throw new Error('compra acima do limite de 3 cachorros deveria falhar');
  if (game.dogs.length !== 3) throw new Error('esperava 3 cachorros');

  // casinha do cachorro: desligado, ele vai dormir la
  let dhSpot = null;
  for (let y = 2; y < 46 && !dhSpot; y++) {
    for (let x = 2; x < 46 && !dhSpot; x++) {
      if (canPlace('doghouse', x, y, 0) && placeBuilding('doghouse', x, y, 0, true)) dhSpot = { x, y };
    }
  }
  if (!dhSpot) throw new Error('sem lugar para a casinha do cachorro');
  for (const dg of game.dogs) { dg.active = false; dg.resting = false; }
  game.time = 0.2;
  for (let i = 0; i < 4000; i++) updateDogs(0.05);
  for (const dg of game.dogs) {
    if (!dg.resting) throw new Error('cachorro desligado nao descansou na casinha');
    if (Math.hypot(dg.gx - (dhSpot.x + 0.5), dg.gy - (dhSpot.y + 0.5)) > 2.5) {
      throw new Error('cachorro longe da casinha: ' + dg.gx.toFixed(1) + ',' + dg.gy.toFixed(1));
    }
  }
  render(ctx, cam, 800, 600, state);
  shovelTile(dhSpot.x, dhSpot.y);

  // bar: a noite os fazendeiros vão ao bar beber e só depois dormem
  let barSpot = null;
  for (let y = 2; y < 45 && !barSpot; y++) {
    for (let x = 2; x < 45 && !barSpot; x++) {
      if (canPlace('bar', x, y, 0) && placeBuilding('bar', x, y, 0, true)) barSpot = { x, y };
    }
  }
  if (!barSpot) throw new Error('sem lugar para o bar');
  for (const f of game.farmers) {
    f.barTonight = true; f.barDone = false; f.barT = 0; f.atBar = false;
    f.inside = false; f.walking = false; f.wait = 0; f.riding = false;
  }
  game.meetingDone = true;
  game.time = 0.6;
  for (let i = 0; i < 600; i++) updateFarmers(0.1);
  const atBar = game.farmers.filter(f => f.atBar && Math.hypot(f.gx - (barSpot.x + 1.5), f.gy - (barSpot.y + 1)) < 3).length;
  if (atBar === 0) throw new Error('nenhum fazendeiro foi ao bar a noite');
  render(ctx, cam, 800, 600, state);
  game.time = 0.1;

  // camisa unica por fazendeiro
  if (!game.farmers.every(f => f.shirt && f.shirtDark)) throw new Error('fazendeiro sem roupa propria');

  // reuniao matinal: acontece, termina e empresta sementes
  for (const f of game.farmers) { f.chest = {}; f.inside = false; f.walking = false; }
  const rich = game.farmers[0];
  depositSeed(rich, 'wheat', 6);
  game.meetingDone = false;
  game.meetingScript = null;
  game.time = 0.2;
  let meetGuard = 0;
  while (!game.meetingDone && meetGuard < 600) { updateFarmers(0.1); meetGuard++; }
  if (!game.meetingDone) throw new Error('reuniao matinal nao aconteceu');
  const broke = game.farmers.find(f => f !== rich);
  if (!broke || !(broke.chest.wheat >= 3)) throw new Error('emprestimo de sementes nao aconteceu');
  if ((rich.chest.wheat || 0) !== 3) throw new Error('sementes nao foram deduzidas de quem emprestou');
  for (let i = 0; i < 400 && game.meetingScript && game.meetingScript.length; i++) updateFarmers(0.1);
  if (game.meetingScript && game.meetingScript.length) throw new Error('falas da reuniao nao terminaram');

  // bolha longa renderiza sem estourar em zoom afastado
  const bFarmer = game.farmers[0];
  farmerSay(bFarmer, 'Essa e uma frase bem comprida para testar a quebra de linha da bolha de fala no zoom afastado', 5000);
  cam.zoom = 0.4;
  render(ctx, cam, 800, 600, state);
  cam.zoom = 2.5;
  render(ctx, cam, 800, 600, state);
  cam.zoom = 1;
  game.time = 0.1;

  // luz do dia e render noturno (ceu, vagalumes, janelas acesas)
  if (dayLight(0.3) !== 1 || dayLight(0.9) !== 0) throw new Error('dayLight fora do esperado');
  game.time = 0.9;
  render(ctx, cam, 800, 600, state);
  game.time = 0.02;
  render(ctx, cam, 800, 600, state);
  game.time = 0.1;

  // fazendeiro montado no cavalo renderiza
  const rf = game.farmers[0];
  if (rf) { rf.riding = true; render(ctx, cam, 800, 600, state); rf.riding = false; }

  // presente de sementes nao cobra moedas
  const f0 = game.farmers[0];
  if (f0) {
    const coinsBeforeGift = game.coins;
    f0.chest = {};
    const g1 = receiveGift({ kind: 'seed', id: 'wheat', n: 5 });
    if (!g1 || !(f0.chest.wheat >= 5)) throw new Error('presente de sementes nao chegou');
    if (game.coins !== coinsBeforeGift) throw new Error('presente de sementes cobrou moedas');
  }

  // celeiro: colheita vai para o estoque e vende por moedas
  game.barn = {};
  game.coins = 500;
  game.tilled['36,36'] = 1;
  const w5 = plantCrop('wheat', 36, 36);
  if (!w5) throw new Error('plantio para celeiro falhou');
  w5.plantedAt -= CROPS.wheat.growTime * 1000;
  if (!harvestCrop(w5)) throw new Error('colheita para celeiro falhou');
  if ((game.barn.wheat || 0) < 1) throw new Error('colheita nao foi para o celeiro');
  const coinsBarn = game.coins;
  if (!sellBarnItem('wheat', 99)) throw new Error('venda do celeiro falhou');
  if (game.coins !== coinsBarn + CROPS.wheat.sell) throw new Error('venda do celeiro pagou errado');
  if (game.coins === coinsBarn) throw new Error('celeiro nao rendeu moedas');

  // pedidos: entregar com estoque e falhar sem
  ensureOrders();
  if (game.orders.length !== 3) throw new Error('pedidos nao foram gerados');
  const o1 = game.orders[0];
  for (const id of Object.keys(o1.items)) game.barn[id] = (game.barn[id] || 0) + o1.items[id] + 5;
  const coinsO = game.coins;
  if (!deliverOrder(o1.id)) throw new Error('pedido com estoque nao entregou');
  if (!game.couriers.length) throw new Error('entregador nao saiu de moto');
  if (game.coins !== coinsO) throw new Error('pedido pagou antes do entregador chegar');
  const o1Coins = o1.coins;
  const o2 = game.orders[0];
  for (const id of Object.keys(o2.items)) delete game.barn[id];
  const couriersBefore = game.couriers.length;
  if (deliverOrder(o2.id)) throw new Error('pedido sem estoque foi entregue');
  if (game.couriers.length !== couriersBefore) throw new Error('entregador saiu sem estoque');
  let courierGuard = 0;
  while (game.couriers.length && courierGuard < 4000) { updateCouriers(0.1); courierGuard++; }
  if (courierGuard >= 4000) throw new Error('entregador nao terminou a corrida');
  if (game.coins !== coinsO + o1Coins) throw new Error('entregador pagou errado');
  if (!Array.isArray(game.couriers)) throw new Error('game.couriers invalido');

  // cozinha: exige cozinha construida; receita consome insumos e produz produto
  if (cookRecipe('bread')) throw new Error('cozinhou sem cozinha');
  if (!placeBuilding('kitchen', 40, 40, 0, true)) throw new Error('cozinha nao foi construida');
  game.barn.wheat = 9;
  if (!cookRecipe('bread')) throw new Error('receita valida nao cozinhou');
  if ((game.barn.bread || 0) !== 1 || (game.barn.wheat || 0) !== 6) throw new Error('receita consumiu/produziu errado');
  if (barnItemValue('bread') !== PRODUCTS.bread.sell) throw new Error('valor do produto errado');

  // ferramentas: jogo novo comeca sem nada, melhoria exige a ferramenta base
  game.coins = 999999;
  if (upgradeLevel('water') !== 0 || upgradeLevel('till') !== 0) throw new Error('jogo novo deveria comecar sem ferramentas');
  if (toolOwned('hoe') || toolOwned('can')) throw new Error('ferramentas deveriam comecar sem dono');
  if (buyUpgrade('water')) throw new Error('melhorias deveriam exigir a ferramenta base');
  if (!buyTool('can')) throw new Error('compra do regador falhou');
  if (upgradeLevel('water') !== 1) throw new Error('regador nao virou nivel 1');
  if (waterRadius() !== 0) throw new Error('raio do regador lvl1 errado');
  if (!buyUpgrade('water')) throw new Error('compra do regador lvl2 falhou');
  if (waterRadius() !== 1) throw new Error('raio do regador lvl2 errado');
  if (!buyUpgrade('water')) throw new Error('compra do regador lvl3 falhou');
  if (waterRadius() !== 2) throw new Error('raio do regador lvl3 errado');
  if (buyTool('can')) throw new Error('compra duplicada do regador deveria falhar');
  if (!buyTool('hoe')) throw new Error('compra da enxada falhou');
  if (upgradeLevel('till') !== 1) throw new Error('enxada nao virou nivel 1');
  if (tillRadius() !== 0) throw new Error('raio da enxada lvl1 errado');
  if (!buyUpgrade('till')) throw new Error('compra da enxada lvl2 falhou');
  if (tillRadius() !== 1) throw new Error('raio da enxada lvl2 errado');

  // filhote: nasce pequeno, cresce com o tempo e so produz adulto
  game.coins = 999999;
  if (!buyAnimal('cow')) throw new Error('compra de filhote falhou');
  const calf = game.animals[game.animals.length - 1];
  if (calf.age >= ANIMAL_GROW_S) throw new Error('recem-comprado deveria ser filhote');
  if (animalBuyPrice('cow') !== Math.round(ANIMALS.cow.price * 0.4)) throw new Error('preco de filhote errado');
  for (let i = 0; i < 200; i++) updateAnimals(1);
  if (!isAdult(calf)) throw new Error('filhote nao cresceu');

  // clima: chuva rega plantacoes sozinha
  game.weather = 'rain';
  game.weatherT = 30;
  game.tilled['37,36'] = 1;
  const w6 = plantCrop('wheat', 37, 36);
  for (let i = 0; i < 40; i++) updateWeather(0.2);
  if (!w6.watered) throw new Error('chuva nao regou as plantacoes');

  // particulas: poeira nasce, vida cai e some
  spawnDust(30, 30);
  if (!game.particles.length) throw new Error('poeira nao criou particulas');
  for (let i = 0; i < 100; i++) updateParticles(0.05);
  if (game.particles.length) throw new Error('particulas nao morreram');
  updateAmbient(0.6);

  const dayTol = game.time;

  // estacoes: dia avanca e estacao gira
  const dayBefore = game.day;
  game.time = 0.99;
  advanceClock(0.2 * DAY_LENGTH);
  if (game.day !== dayBefore + 1) throw new Error('dia nao avancou');
  if (!['spring', 'summer', 'autumn', 'winter'].includes(seasonName())) throw new Error('estacao invalida');
  game.day = 0;
  if (gameDate().day !== 1 || gameDate().name !== 'Janeiro' || seasonName() !== 'summer') throw new Error('1 de janeiro deveria ser verao');
  game.day = 150;
  if (gameDate().name !== 'Junho' || seasonName() !== 'winter') throw new Error('junho deveria ser inverno');
  game.day = 250;
  if (gameDate().name !== 'Setembro' || seasonName() !== 'spring') throw new Error('setembro deveria ser primavera');
  game.day = 359;
  if (gameDate().day !== 30 || gameDate().name !== 'Dezembro' || seasonName() !== 'summer') throw new Error('dezembro deveria fechar o ano no verao');
  game.day = dayBefore + 1;
  if (typeof t('season.summer') !== 'string' || t('season.summer').length < 5) throw new Error('nomes de estacao faltando no i18n');

  // R29: niveis (max 50), 3 tarefas por nivel e recompensa
  game.level = 49;
  spawnLevelTasks(49);
  if (game.levelTasks.length !== 3) throw new Error('nivel deveria ter 3 tarefas');
  const t0z = game.levelTasks[0];
  const coinsT = game.coins;
  game.stats[t0z.stat] = (game.stats[t0z.stat] || 0) + t0z.target;
  checkLevelTasks();
  if (game.levelTasks.length !== 2) throw new Error('tarefa concluida nao saiu da lista');
  if (game.coins !== coinsT + t0z.coins) throw new Error('recompensa da tarefa errada');
  game.level = 49; game.xp = 0;
  addXp(1000000000000);
  if (game.level !== 50) throw new Error('nivel maximo deveria ser 50: ' + game.level);

  // R29: plantio consome semente do estoque ou cobra seedCost
  game.seeds.wheat = 0;
  game.coins = 5000;
  const seedCoins = game.coins;
  const sfa = randomFreeTile();
  const sfb = randomFreeTile();
  const w7 = sfa && plantCrop('wheat', sfa.x, sfa.y);
  if (!w7) throw new Error('plantio sem semente deveria pagar em moedas');
  if (game.coins !== seedCoins - CROPS.wheat.seedCost) throw new Error('seedCost nao cobrado no plantio');
  game.seeds.wheat = 1;
  const w8 = sfb && plantCrop('wheat', sfb.x, sfb.y);
  if (!w8) throw new Error('plantio com semente falhou');
  if (game.seeds.wheat !== undefined) throw new Error('semente do estoque nao consumida');
  if (game.coins !== seedCoins - CROPS.wheat.seedCost) throw new Error('plantio com semente pagou moedas');

  // R29: ovelha produz la colhivel
  game.coins = 999999;
  if (!buyAnimal('sheep')) throw new Error('compra de ovelha falhou');
  const sheep1 = game.animals.find(a => a.kind === 'sheep');
  if (!sheep1) throw new Error('ovelha nao criada');
  sheep1.age = 999;
  sheep1.product = 1;
  if (!collectAnimal(sheep1)) throw new Error('colheita de la falhou');
  if (sheep1.product !== 0) throw new Error('la nao zerou');
  updateAnimals(0.016);
  render(ctx, cam, 800, 600, state);

  // R29: trator colhe fileira por fileira sozinho
  game.coins = 999999;
  game.level = 9;
  if (!buyTool('tractor')) throw new Error('compra do trator falhou');
  if (!game.tractorOwned) throw new Error('trator nao registrado');
  game.tilled['35,34'] = 1;
  const wch = plantCrop('wheat', 35, 34);
  wch.plantedAt -= CROPS.wheat.growTime * 1000;
  if (!startTractor()) throw new Error('trator nao partiu');
  for (let i = 0; i < 3000 && game.tractor.active; i++) updateTractor(0.05);
  if (game.tractor.active) throw new Error('trator nao terminou');
  if (game.crops.some(c => c.type === 'wheat' && c.gx === 35 && c.gy === 34)) throw new Error('trator nao colheu a fileira');

  // R29: neve acumula no inverno derrete fora dele
  game.day = 150; game.snow = 0;
  advanceClock(20);
  if (!(game.snow > 0)) throw new Error('neve nao acumulou no inverno');
  game.snow = 1;
  game.day = 0; game.weather = 'clear';
  advanceClock(2);
  if (game.snow >= 1) throw new Error('neve nao derreteu fora do inverno');
  game.day = dayBefore + 1;

  // R29: relgio de 24h mapeia 12:00/03:00
  game.time = 0.25;
  if (Math.abs(gameHour() - 12) > 1e-9) throw new Error('12:00 deveria ser t=0.25');
  game.time = 0.875;
  if (Math.abs(gameHour() - 3) > 1e-9) throw new Error('03:00 deveria ser t=0.875');

  // R29: almoao no restaurante das 12h as 13h
  game.coins = 999999;
  let restSpot = null;
  for (let y = 2; y < 46 && !restSpot; y++) {
    for (let x = 2; x < 46 && !restSpot; x++) {
      if (canPlace('restaurant', x, y, 0) && placeBuilding('restaurant', x, y, 0, true)) restSpot = { x, y };
    }
  }
  if (!restSpot) throw new Error('sem lugar para o restaurante');
  const fl = game.farmers[0];
  fl.chest = { wheat: 4 };
  fl.inside = false; fl.walking = false; fl.wait = 0;
  fl.gx = restSpot.x + 0.5; fl.gy = restSpot.y + 2.5;
  game.meetingDone = true;
  const plantedLunch = game.stats.planted || 0;
  game.time = 0.26;
  for (let i = 0; i < 120; i++) updateFarmers(0.1);
  if ((game.stats.planted || 0) !== plantedLunch) throw new Error('fazendeiro trabalhou durante o almoco');
  if (Math.hypot(fl.gx - (restSpot.x + 0.5), fl.gy - (restSpot.y + 2.5)) > 2.6) throw new Error('fazendeiro ficou longe do restaurante: ' + fl.gx.toFixed(1) + ',' + fl.gy.toFixed(1));
  game.time = dayTol;

  // R29: perfil (nome e foto) persiste
  game.playerName = 'Dono Teste';
  game.playerFace = PLAYER_FACES[3];
  const snapP = JSON.stringify(snapshotData());
  applySaveData(JSON.parse(snapP));
  if (game.playerName !== 'Dono Teste') throw new Error('nome do jogador nao persistiu');
  if (!PLAYER_FACES.includes(game.playerFace)) throw new Error('foto do jogador invalida');

  // tutorial: avanca por acoes e terminal por skip
  tutAdvance('till');
  if (!tutorialActive()) throw new Error('tutorial deveria estar ativo apos 1 passo');
  tutSkip();
  if (!game.tutorialDone) throw new Error('tutorial nao marcou como concluido');

  // backup rotativo: save corrompido cai para o _bak
  saveGame(false);
  const coinsBak = game.coins;
  game.coins = coinsBak + 777;
  saveGame(false);
  localStorage.setItem(SAVE_KEY, '{quebrado');
  if (!loadGame()) throw new Error('loadGame falhou com save principal corrompido');
  if (game.coins !== coinsBak) throw new Error('backup rotativo nao restaurou o save anterior');

  // reset: apaga os 3 slots e trava o autosave ate recarregar
  saveGame(false);
  resetGame();
  if (!resetPending) throw new Error('resetPending nao marcado');
  if (localStorage.getItem(SAVE_KEY) || localStorage.getItem(SAVE_KEY + '_bak') || localStorage.getItem(SAVE_KEY + '_visit')) {
    throw new Error('reset deixou save para tras');
  }
  if (saveGame(false)) throw new Error('autosave gravou durante o reset');

  // chat de visita: lista de frases existe; sendChat sem conexao retorna false
  if (!Array.isArray(t('chat.list')) || t('chat.list').length < 4) throw new Error('chat.list invalida');
  if (sendChat(0)) throw new Error('sendChat deveria falhar sem conexao');

  // teste de carga: 300 animais atualizados e renderizados
  game.coins = 999999;
  const beforeLoad = game.animals.length;
  for (let i = game.animals.length; i < 300; i++) {
    const kindsA = ['chicken', 'pig', 'cow', 'horse', 'sheep'];
    game.animals.push(makeAnimal(kindsA[i % 4], { x: 30 + (i % 12), y: 20 + (i % 12) }));
    game.animals[game.animals.length - 1].age = 999;
  }
  const t0Load = Date.now();
  for (let i = 0; i < 120; i++) { updateAnimals(0.016); updateDogs(0.016); updateFarmers(0.016); }
  render(ctx, cam, 800, 600, state);
  const loadMs = Date.now() - t0Load;
  console.log('carga: ' + game.animals.length + ' animais x 120 iters = ' + loadMs + 'ms');
  game.animals.length = beforeLoad;
  if (loadMs > 10000) throw new Error('teste de carga lento demais: ' + loadMs + 'ms');

  console.log('celeiro/pedidos/cozinha/melhorias/filhotes/clima/particulas/estacoes/tutorial/backup/carga OK');
  console.log('render: todas as construcoes, culturas, arvores, animais e fazendeiro sem erro');
  console.log('acoes: zoom, arar, plantio, rega, colher tudo, animais (teto 100), fazendeiro OK');
  console.log('save/load roundtrip OK');
`, sandbox, { filename: 'smoke' });

if (failures) {
  console.error(`\n${failures} problema(s) encontrado(s).`);
  process.exit(1);
}
console.log('\nTUDO OK');
