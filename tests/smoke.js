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
  game.time = 0.1;
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
  game.time = 0.1;
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
  game.time = 0.1;
  buyFarmer();
  const fm2 = game.farmers[game.farmers.length - 1];
  depositSeed(fm2, 'wheat', 6);
  game.crops.forEach(c => { c.product = undefined; });
  const anchor = plantCrop('wheat', 5, 40, true);
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
  if (!hasHorse()) throw new Error('hasHorse falso com cavalo comprado');
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
  game.time = 0.02;
  for (let i = 0; i < 60; i++) updateFarmers(0.1);
  if (!game.farmers.every(f => !f.inside)) throw new Error('fazendeiro nao voltou ao amanhecer');
  game.time = 0.1;
  removePen();

  // multiplayer: codigo da fazenda, snapshot/apply e presentes
  const code = ensureFarmCode();
  if (!/^F3D-[A-Z2-9]{4}$/.test(code)) throw new Error('codigo de fazenda invalido: ' + code);
  if (ensureFarmCode() !== code) throw new Error('codigo mudou entre chamadas');
  const snapBefore = JSON.stringify(snapshotData());
  if (!applySaveData(JSON.parse(snapBefore))) throw new Error('applySaveData falhou');
  if (JSON.stringify(snapshotData()) !== snapBefore) throw new Error('snapshot/applySaveData divergiu');
  updateMultiplayer(0.016);
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
  game.time = 0.9;
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

  console.log('render: todas as construcoes, culturas, arvores, animais e fazendeiro sem erro');
  console.log('acoes: zoom, arar, plantio, rega, colher tudo, animais (teto 100), fazendeiro OK');
  console.log('save/load roundtrip OK');
`, sandbox, { filename: 'smoke' });

if (failures) {
  console.error(`\n${failures} problema(s) encontrado(s).`);
  process.exit(1);
}
console.log('\nTUDO OK');
