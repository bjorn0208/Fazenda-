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
  // jogo novo: comeca vazio (sem casa, sem poco, sem animais) com a cutscene do carro
  if (game.buildings.length !== 0) throw new Error('jogo novo com construcoes (init)');
  if (game.animals.length !== 0) throw new Error('jogo novo com animais (init)');
  if (!introActive()) throw new Error('jogo novo sem cutscene do carro (init)');
  render(ctx, cam, 800, 600, state);
  if (game.farmers.length !== 0) throw new Error('jogo novo com fazendeiros antes da cutscene');
  finishIntro();
  if (game.farmers.length !== 1) throw new Error('cutscene nao gerou o fazendeiro inicial');
  if (!game.farmers[0].isPlayer) throw new Error('fazendeiro inicial deveria ser o principal');
  if (game.farmers[0].name !== (game.playerName || 'Fazendeiro')) throw new Error('fazendeiro principal sem nome do perfil');
  if (!game.introDone) throw new Error('cutscene nao marcou introDone');
  if (t('build.till') === 'build.till') throw new Error('chave build.till sem traducao');

  // plantio continuo: fazendeiro planta do baú a tarde inteira, se tiver terra arada
  game.time = 0.35;
  const fpA = game.farmers[0];
  fpA.role = 'plant'; fpA.chest = { wheat: 3 };
  let ftA = null;
  for (let y = 27; y >= 20 && !ftA; y--) {
    for (let x = 27; x >= 20 && !ftA; x--) {
      if (inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)]) ftA = { x, y };
    }
  }
  if (ftA) {
    game.upgrades.till = 2;
    plantCrop('wheat', ftA.x, ftA.y, true);
    if (!tillSoil(ftA.x - 1, ftA.y)) throw new Error('tillSoil falhou no teste de plantio a tarde');
    const jobPM = farmerFindJob(fpA);
    if (!jobPM || jobPM.kind !== 'plant') throw new Error('fazendeiro deveria plantar a tarde com baú cheio');
  }
  fpA.role = 'all';
  game.upgrades.till = 0;

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
  for (const a of game.animals) a.gold = false; // testes de valor abaixo assumem animais comuns (R38 ouro e sorteado)
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
  game.coins = 999999;
  if (!buyAnimal('cow')) throw new Error('compra de vaca no teste falhou');
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
  let ftB = null;
  for (let y = 27; y >= 20 && !ftB; y--) {
    for (let x = 27; x >= 20 && !ftB; x--) {
      if (!occupancy[occIndex(x, y)]) ftB = { x, y };
    }
  }
  if (ftB) {
    game.upgrades.till = 2;
    plantCrop('corn', ftB.x, ftB.y, true);
    tillSoil(ftB.x - 1, ftB.y);
  }
  const jobP = farmerFindJob(fRole);
  game.upgrades.till = 0;
  if (jobP && jobP.kind === 'animal') throw new Error('role plant busca animais');
  if (!jobP && ftB) throw new Error('role plant sem trabalho de plantio/colheita');
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
  for (let i = 0; i < 2500; i++) updateFarmers(0.1);
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
  for (let i = game.buildings.length - 1; i >= 0; i--) {
    const bld = game.buildings[i];
    if (bld.type !== 'house') shovelTile(bld.gx, bld.gy);
  }
  let dhSpot = null;
  for (let y = 2; y < 46 && !dhSpot; y++) {
    for (let x = 2; x < 46 && !dhSpot; x++) {
      if (canPlace('doghouse', x, y, 0) && placeBuilding('doghouse', x, y, 0, true)) dhSpot = { x, y };
    }
  }
  if (!dhSpot) throw new Error('sem lugar para a casinha do cachorro');
  for (const dg of game.dogs) { dg.active = false; dg.resting = false; }
  let dogNear = null;
  outer:
  for (let r = 1; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dogWalkable(dhSpot.x + dx, dhSpot.y + dy)) { dogNear = { x: dhSpot.x + dx, y: dhSpot.y + dy }; break outer; }
      }
    }
  }
  if (dogNear) {
    for (const dg of game.dogs) {
      dg.gx = dogNear.x + 0.5; dg.gy = dogNear.y + 0.5;
      dg.walking = false; dg.wait = 0;
    }
  }
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

  // R33: menu de contexto da construcao, sons e trovao
  state.mode = 'idle'; game.visiting = false;
  const cb1 = game.buildings[game.buildings.length - 1];
  if (!cb1) throw new Error('sem construcao para menu de contexto');
  state.selId = cb1.id;
  updateBuildingCtx(cam, 800, 600);
  if (document.getElementById('bctx').style.display !== 'block') throw new Error('menu de contexto nao abriu');
  state.selId = null;
  updateBuildingCtx(cam, 800, 600);
  if (document.getElementById('bctx').style.display !== 'none') throw new Error('menu de contexto nao fechou');
  for (const sk of ['thunder', 'cow', 'pig', 'sheep', 'horse', 'dog', 'chicken', 'dig']) playSound(sk);
  game.flashT = 0.5;
  updateWeather(0.2);
  if (Math.abs(game.flashT - 0.3) > 0.001) throw new Error('flash do trovao nao decai');
  game.flashT = 0;

  // R34: pato, vara de pescar, semana, peixes e lago
  state.mode = 'idle'; state.fishing = null;
  if (!ANIMALS.duck) throw new Error('pato ausente do catalogo');
  if (!ANIMAL_KINDS.duck || typeof drawDuck !== 'function') throw new Error('pato sem movimento/desenho');
  if (!TOOLS.some(x => x.id === 'rod')) throw new Error('vara de pescar ausente');
  if (typeof lakeAt !== 'function' || typeof isSunday !== 'function' || typeof rollFish !== 'function') throw new Error('helpers de pesca ausentes');
  const wk0 = weekdayIndex();
  game.day = 6;
  if (!isSunday()) throw new Error('domingo nao detectado');
  game.day = 0;
  if (isSunday()) throw new Error('segunda detectada como domingo');
  game.day = wk0;
  if (!FISH.length || !rollFish().icon) throw new Error('tabela de peixes invalida');
  game.coins = 999999;
  game.level = Math.max(game.level || 1, 2);
  if (!buyTool('rod')) throw new Error('compra da vara de pescar falhou');
  if (!game.rodOwned) throw new Error('compra da vara nao marcou');
  const ca34 = game.ownedArea;
  let lkSpot = null;
  for (let y = ca34.y0; y <= ca34.y1 - 6 && !lkSpot; y++) {
    for (let x = ca34.x0; x <= ca34.x1 - 6 && !lkSpot; x++) {
      if (canPlace('lake', x, y, 0)) { lkSpot = { x, y }; }
    }
  }
  const lkB = lakeBuilding() || (lkSpot && placeBuilding('lake', lkSpot.x, lkSpot.y, 0, true));
  if (lkB) {
    const duckA = { kind: 'duck', gx: lkB.gx + 0.5, gy: lkB.gy + 0.5 };
    const cowA = { kind: 'cow', gx: 0.5, gy: 0.5 };
    if (!animalWalkable(duckA, lkB.gx + 2, lkB.gy + 2)) throw new Error('pato nao entra no lago');
    if (animalWalkable(cowA, lkB.gx + 2, lkB.gy + 2)) throw new Error('vaca entrou no lago');
    playSound('duck'); playSound('splash');
    const cBefore = game.coins;
    state.mode = 'fish';
    state.fishing = { gx: lkB.gx + 1, gy: lkB.gy + 1, t: 0.01 };
    updateFishing(0.02);
    if (state.fishing !== null) throw new Error('pesca nao resolveu');
    if (game.coins <= cBefore) throw new Error('pesca nao pagou');
    state.mode = 'idle';
    removeBuilding(lkB.id);
  }

  // R35: comprar/construir ligados, barra com janela de 3 ferramentas e setas
  try { bindUi(uiHandlers); } catch (e) { throw new Error('bindUi falhou: ' + e.message); }
  if (typeof $('btn-buy').onclick !== 'function') throw new Error('btn-buy sem onclick (comprar quebrado)');
  if (typeof $('btn-build').onclick !== 'function') throw new Error('btn-build sem onclick (construir quebrado)');
  if (typeof showToolWindow !== 'function' || typeof promoteTool !== 'function' || typeof updateToolArrows !== 'function') throw new Error('janela da barra de ferramentas ausente');
  showToolWindow(1); showToolWindow(0); showToolWindow(99);
  try { promoteTool($('btn-till')); } catch (e) { throw new Error('promoteTool lancou erro: ' + e.message); }
  if (typeof drawFarmerFishingGear !== 'function') throw new Error('vara do fazendeiro pescador ausente');
  const fr35 = game.farmers[0];
  fr35.fishing = true;
  render(ctx, cam, 800, 600, state);
  fr35.fishing = false;

  // R36: flag de pesca nao fica velho (doente/na cama) e vara some quando o pescador sai do lugar
  const fs36 = game.farmers[0];
  fs36.fishing = true; fs36.inside = false; fs36.walking = false; fs36.riding = false; fs36.sickT = 30;
  updateFarmers(0.05);
  if (fs36.fishing) throw new Error('flag de pesca velho com fazendeiro doente');
  fs36.sickT = 0; fs36.health = 100; fs36.mood = 'feliz';
  fs36.fishing = true; fs36.inside = true;
  updateFarmers(0.05);
  if (fs36.fishing) throw new Error('flag de pesca velho com fazendeiro dentro de casa');
  fs36.inside = false;
  if (typeof drawFarmerFishingGear !== 'function') throw new Error('vara do pescador ausente');
  fs36.fishing = true; fs36.fishSpot = { x: (fs36.gx | 0) + 9, y: (fs36.gy | 0) + 9 };
  render(ctx, cam, 800, 600, state);
  fs36.fishSpot = { x: fs36.gx, y: fs36.gy };
  fs36.gx = fs36.fishSpot.x + 0.4; fs36.gy = fs36.fishSpot.y + 0.4;
  render(ctx, cam, 800, 600, state);
  fs36.fishing = false; fs36.fishSpot = null;

  // R38: pesca so no domingo das 9h as 16h, peixe fica com o fazendeiro, 3 peixes coloridos e salario no dia 10
  if (FISH.length !== 3 || FISH.some(x => !x.color || !x.icon || !x.value)) throw new Error('catalogo de peixes deve ter 3 tipos coloridos');
  const chSum38 = FISH.reduce((acc, x) => acc + x.chance, 0);
  if (Math.abs(chSum38 - 1) > 0.002) throw new Error('chances dos peixes nao somam 1');
  let lk38 = lakeBuilding();
  if (!lk38) {
    const oa38 = game.ownedArea;
    for (let y = oa38.y0; y <= oa38.y1 - 6 && !lk38; y++) {
      for (let x = oa38.x0; x <= oa38.x1 - 6 && !lk38; x++) {
        if (canPlace('lake', x, y, 0)) lk38 = placeBuilding('lake', x, y, 0, true);
      }
    }
  }
  const fw38 = game.farmers[0];
  if (lk38 && fw38) {
    const sh38 = randomLakeShoreTile();
    fw38.walking = false; fw38.inside = false; fw38.sickT = 0; fw38.riding = false;
    fw38.fishing = false; fw38.fishSpot = null; fw38.fishT = undefined; fw38.wait = 0;
    fw38.barDone = true; fw38.role = 'all'; fw38.jobKind = null;
    if (sh38) { fw38.fishSpot = sh38; fw38.gx = sh38.x + 0.5; fw38.gy = sh38.y + 0.5; }
    game.day = 6; game.time = 8 / 24; game.meetingDone = true;
    updateFarmers(0.05);
    if (!fw38.fishing) throw new Error('fazendeiro deveria pescar no domingo entre 9h e 16h');
    if (!(fw38.fishT >= 14.5 && fw38.fishT <= 20.5)) throw new Error('fisgada fora da faixa de 15 a 20 s');
    const coins38 = game.coins;
    fw38.fishT = 0.05;
    let got38 = false;
    for (let i = 0; i < 40 && !got38; i++) { updateFarmers(0.05); got38 = fw38.fishT >= 14.5; }
    if (!got38) throw new Error('fazendeiro nao pegou peixe');
    if (game.coins !== coins38) throw new Error('peixe do fazendeiro nao pode pagar o jogador');
    game.time = 10 / 24; // 16h
    updateFarmers(0.05);
    if (fw38.fishing) throw new Error('pesca deveria terminar as 16h');
    game.day = 0; game.time = 8 / 24; fw38.fishing = true;
    updateFarmers(0.05);
    if (fw38.fishing) throw new Error('pesca dos fazendeiros so pode ser no domingo');
    fw38.fishing = false; fw38.fishSpot = null; fw38.fishT = undefined;
    removeBuilding(lk38.id);
  }

  // salario: cada fazendeiro recebe 20.000 no dia 10 do mes, do bolso do jogador
  const nf38 = game.farmers.length;
  game.coins = 500000;
  const w0_38 = game.coins;
  game.day = 38; game.time = 0.999;
  advanceClock(20);
  if (game.coins !== w0_38 - nf38 * FARMER_SALARY) throw new Error('salario do dia 10 nao pago (n=' + nf38 + ' delta=' + (w0_38 - game.coins) + ')');
  game.coins = 100;
  game.day = 68; game.time = 0.999;
  advanceClock(20);
  if (game.coins !== 100) throw new Error('salario sem saldo nao pode deixar moedas negativas');
  game.allDayRain = false; game.weather = 'clear'; game.weatherT = 0;


  // R37: adubo, plantar tudo, trator que planta, chuva o dia todo e animais de ouro
  if (!TOOLS.some(x => x.id === 'fert')) throw new Error('adubo ausente da loja de ferramentas');
  game.coins = 999999;
  game.level = Math.max(game.level || 1, 3);
  if (!buyTool('fert') || !game.fertOwned) throw new Error('compra do adubo falhou');
  const freeTile37 = () => {
    const oa = game.ownedArea;
    for (let y = oa.y0; y <= oa.y1; y++) for (let x = oa.x0; x <= oa.x1; x++) {
      if (!occupancy[occIndex(x, y)]) return { x, y };
    }
    return null;
  };
  const sf37 = freeTile37();
  if (!sf37) throw new Error('sem tile livre para o teste do adubo');
  tillSoil(sf37.x, sf37.y);
  const cf37 = plantCrop('wheat', sf37.x, sf37.y, true);
  if (!cf37) throw new Error('plantio de teste falhou (adubo)');
  const coinsF37 = game.coins;
  if (!fertilizeCrop(cf37)) throw new Error('adubo nao aplicado');
  if (game.coins !== coinsF37 - 10) throw new Error('adubo nao cobrou 10 moedas');
  if (!cf37.fert) throw new Error('cultivo sem marca de adubo');
  const progFert = cropProgress(cf37);
  const progPlain = Math.min(1, (Date.now() - cf37.plantedAt) / (CROPS.wheat.growTime * 1000));
  if (!(progFert > progPlain)) throw new Error('adubo nao acelerou o crescimento');
  if (fertilizeCrop(cf37)) throw new Error('adubo duplo aplicado');
  cf37.plantedAt = Date.now() - CROPS.wheat.growTime * 1000 * 10;
  const barnF37 = game.barn.wheat || 0;
  harvestCrop(cf37);
  if ((game.barn.wheat || 0) !== barnF37 + 2) throw new Error('adubo nao dobrou a colheita');
  if (fertilizeCrop(cf37)) throw new Error('adubo aplicado em plantio pronto');

  // trator que planta e colhe (estado do trator restaurado no fim: R29 compra o proprio)
  const trWas37 = game.tractorOwned;
  game.tractorOwned = true;
  game.tractor = null;
  game.coins = 999999;
  harvestAllCrops();
  const st37 = freeTile37();
  if (!st37) throw new Error('sem tile livre para o trator');
  tillSoil(st37.x, st37.y);
  const cropsTr0 = game.crops.length;
  if (!startTractor()) throw new Error('trator nao partiu com terra arada livre');
  for (let i = 0; i < 4000 && game.tractor && game.tractor.active; i++) updateTractor(0.25);
  if (game.crops.length <= cropsTr0) throw new Error('trator nao plantou nada');
  game.tractor = null;
  game.tractorOwned = trWas37;

  // plantar tudo
  const sp37 = freeTile37();
  if (!sp37) throw new Error('sem tile livre para plantar tudo');
  tillSoil(sp37.x, sp37.y);
  const cropsPa0 = game.crops.length;
  uiHandlers.plantAll();
  if (game.crops.length <= cropsPa0) throw new Error('plantar tudo nao plantou');

  // fazendeiro assume colheita e anda mais rapido nela
  const fj37 = game.farmers[0];
  fj37.walking = false; fj37.inside = false; fj37.sickT = 0; fj37.riding = false;
  fj37.fishing = false; fj37.jobKind = null; fj37.role = 'all'; fj37.chest = {}; fj37.wait = 0;
  const fjx = Math.floor(fj37.gx), fjy = Math.floor(fj37.gy);
  let cj37 = null;
  for (const djk of [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [2, 0], [0, 2]]) {
    const x = fjx + djk[0], y = fjy + djk[1];
    if (inOwnedArea(x, y) && !occupancy[occIndex(x, y)]) { cj37 = plantCrop('wheat', x, y, true); break; }
  }
  if (!cj37) throw new Error('sem tile vizinho para teste de colheita');
  cj37.plantedAt = Date.now() - CROPS.wheat.growTime * 1000 * 10;
  game.time = 0.4;
  game.meetingDone = true;
  game.day = ((game.day | 0) % 6);
  updateFarmers(0.05);
  if (fj37.jobKind !== 'harvest') throw new Error('fazendeiro nao assumiu colheita (' + fj37.jobKind + ')');

  // animal de ouro rende o triplo (teste nao-porco: coleta de porco abate)
  game.coins = 999999;
  let goldKind = null;
  for (const k of Object.keys(ANIMALS)) {
    if (k === 'pig') continue;
    if (game.animals.filter(a => a.kind === k).length < MAX_PER_KIND) { goldKind = k; break; }
  }
  if (!goldKind) throw new Error('nenhum tipo de animal livre para o teste de ouro');
  const goldDef37 = ANIMALS[goldKind];
  game.level = Math.max(game.level || 1, goldDef37.level || 1);
  if (!buyAnimal(goldKind, true)) throw new Error('compra de animal dourado falhou (' + goldKind + ')');
  const gA37 = game.animals[game.animals.length - 1];
  if (!gA37.gold) throw new Error('animal dourado nao marcado');
  if (gA37.kind !== goldKind) throw new Error('animal comprado com tipo errado');
  gA37.age = 9999; gA37.product = 1; gA37.prodT = 0;
  const cb37 = game.coins;
  if (!collectAnimal(gA37)) throw new Error('coleta do animal dourado falhou');
  if (game.coins - cb37 !== goldDef37.value * 3) throw new Error('ouro nao rende o triplo (' + goldKind + ')');
  game.coins = 999999;

  // chuva o dia todo
  game.allDayRain = true;
  game.weather = 'clear';
  game.weatherT = 1;
  updateWeather(0.1);
  if (game.weather !== 'rain') throw new Error('chuva o dia todo nao ativou');
  updateWeather(2);
  if (game.weather !== 'rain') throw new Error('chuva o dia todo nao segurou');
  game.allDayRain = false;
  game.weather = 'clear';
  game.weatherT = 0;
  game.flashT = 0;

  // R32: lote arado compravel
  game.coins = 999999;
  let plotDone = false;
  for (let y = 2; y < 42 && !plotDone; y++) {
    for (let x = 2; x < 42 && !plotDone; x++) {
      if (!plotValid(x, y, 6)) continue;
      const antes = game.coins;
      if (!placePlot(x, y, 6)) continue;
      if (game.coins >= antes) throw new Error('lote arado gratuito');
      if (!isTilled(x, y) || !isTilled(x + 5, y + 5)) throw new Error('lote arado nao arou tudo');
      plotDone = true;
    }
  }
  if (!plotDone) throw new Error('nenhum espaco para lote arado');
  if (placePlot(0, 0, 6)) throw new Error('lote arado deveria falhar fora da area');
  render(ctx, cam, 800, 600, state);

  // R32: saude - doente para de trabalhar, vai para casa e recupera devagar
  const fhp = game.farmers[0];
  fhp.health = 100; fhp.sickT = 0;
  fhp.inside = false; fhp.walking = false; fhp.wait = 0; fhp.riding = false;
  fhp.gx = 20.5; fhp.gy = 20.5;
  game.time = 0.2; game.meetingDone = true;
  fhp.sickT = 40; fhp.mood = 'feliz';
  for (let i = 0; i < 30; i++) updateFarmers(0.05);
  if (fhp.mood !== 'doente') throw new Error('doente deveria ter mood doente');
  if (fhp.health <= 35) throw new Error('doente deveria recuperar devagar');
  if (treatFarmer(fhp) !== true) throw new Error('treatFarmer falhou');
  game.coins = 999999;
  if (fhp.sickT !== 0 || fhp.health !== 100) throw new Error('tratamento nao curou');
  if (fhp.mood !== 'feliz') throw new Error('tratamento nao voltou o humor');
  if (treatFarmer(fhp) !== false) throw new Error('tratar fazendeiro saudavel deveria falhar');
  render(ctx, cam, 800, 600, state);

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
  if (game.crops.some(c => c.id === wch.id)) throw new Error('trator nao colheu a fileira'); // replantar no mesmo lugar nao conta (R37)

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

  console.log('celeiro/pedidos/cozinha/melhorias/filhotes/clima/particulas/estacoes/backup/carga OK');
  console.log('render: todas as construcoes, culturas, arvores, animais e fazendeiro sem erro');
  console.log('acoes: zoom, arar, plantio, rega, colher tudo, animais (teto 100), fazendeiro OK');
  console.log('save/load roundtrip OK');
`, sandbox, { filename: 'smoke' });

if (failures) {
  console.error(`\n${failures} problema(s) encontrado(s).`);
  process.exit(1);
}
console.log('\nTUDO OK');
