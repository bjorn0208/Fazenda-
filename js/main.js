/* ================= FAZENDA 3D — INICIALIZAÇÃO, ENTRADA E LOOP ================= */

const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');

const cam = { x: 0, y: 0, zoom: 1 };
const MIN_ZOOM = 0.35, MAX_ZOOM = 3;

const state = {
  mode: 'idle',        // idle | build | move | remove | rotate
  ghost: null,         // {type, gx, gy, rot, valid}
  moveId: null,
  rotateId: null,
  ghostPinned: false,  // posição fixa aguardando confirmação
  highlightTile: null,
  selectedSeed: 'wheat'
};

let lastPointerGrid = { gx: 12, gy: 12 };

/* ---------- Canvas / resize ---------- */
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (typeof clampCamera === 'function') clampCamera();
}
window.addEventListener('resize', resize);

/* ---------- Câmera ---------- */
function centerCamera() {
  const c = projectPoint((game.ownedArea.x0 + game.ownedArea.x1 + 1) / 2,
                         (game.ownedArea.y0 + game.ownedArea.y1 + 1) / 2, 0);
  cam.x = c.x; cam.y = c.y;
}

function clampCamera() {
  const limit = GRID_SIZE * TILE_W / 2 + 200;
  cam.x = Math.max(-limit, Math.min(limit, cam.x));
  cam.y = Math.max(-limit, Math.min(limit, cam.y));
}

function zoomAt(sx, sy, factor) {
  const before = screenToWorld(cam, sx, sy, canvas.clientWidth, canvas.clientHeight);
  cam.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom * factor));
  const after = screenToWorld(cam, sx, sy, canvas.clientWidth, canvas.clientHeight);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
  clampCamera();
  dbgShowZoom();
}

/* ---------- Diagnostico na tela ---------- */
const GAME_VERSION = 'v38';
const dbgBadge = $('debug-badge');
function dbgShowZoom() {
  if (dbgBadge && !dbgBadge.classList.contains('dbg-error')) {
    dbgBadge.textContent = GAME_VERSION + ' \u00b7 zoom ' + cam.zoom.toFixed(2) + 'x';
  }
}
window.addEventListener('error', e => {
  if (!dbgBadge) return;
  dbgBadge.textContent = 'ERRO ' + GAME_VERSION + ': ' + (e.message || 'desconhecido');
  dbgBadge.classList.add('dbg-error');
});

/* ---------- Entrada: gestos unificados (Pointer Events + fallback touch) ---------- */
const pointer = { down: false, dragging: false, sx: 0, sy: 0, cx: 0, cy: 0 };
const activePointers = new Map();
let gesture = null;
let lastTap = { t: 0, x: 0, y: 0 };

function eventPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function gridFromEvent(e) {
  const p = eventPos(e);
  const w = screenToWorld(cam, p.x, p.y, canvas.clientWidth, canvas.clientHeight);
  lastPointerGrid = screenToGrid(w.x, w.y);
  return lastPointerGrid;
}

function updateGhostFollow() {
  if (!state.ghostPinned && state.ghost &&
      (state.mode === 'build' || (state.mode === 'move' && state.moveId))) {
    updateGhostPosition(lastPointerGrid.gx, lastPointerGrid.gy);
  }
}

function beginPinch() {
  const [a, b] = [...activePointers.values()];
  gesture = {
    type: 'pinch',
    dist: Math.hypot(a.x - b.x, a.y - b.y)
  };
}

function onDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (game.intro) return;
  if (e.pointerType === 'mouse') {
    pointer.down = true; pointer.dragging = false;
    pointer.sx = e.clientX; pointer.sy = e.clientY;
    pointer.cx = cam.x; pointer.cy = cam.y;
  }
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sem captura */ }
  activePointers.set(e.pointerId, eventPos(e));
  if (activePointers.size === 1) {
    gesture = { type: 'pending', sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y };
    gridFromEvent(e);
  } else if (activePointers.size >= 2) {
    beginPinch();
  }
}

function onMove(e) {
  if (!activePointers.has(e.pointerId)) {
    if (e.pointerType === 'mouse') { gridFromEvent(e); updateGhostFollow(); }
    return;
  }
  activePointers.set(e.pointerId, eventPos(e));
  if (!gesture) return;

  if (gesture.type === 'pending') {
    const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
    if (Math.abs(dx) + Math.abs(dy) > 8) gesture.type = 'drag';
  }

  if (gesture.type === 'drag') {
    const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
    cam.x = gesture.cx - dx / cam.zoom;
    cam.y = gesture.cy - dy / cam.zoom;
    clampCamera();
    canvas.classList.add('dragging');
    gridFromEvent(e);
  } else if (gesture.type === 'pinch' && activePointers.size >= 2) {
    const [a, b] = [...activePointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (gesture.dist > 0 && d > 0) zoomAt(mid.x, mid.y, d / gesture.dist);
    gesture.dist = d;
  }
  updateGhostFollow();
}

function onEnd(e) {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.delete(e.pointerId);
  canvas.classList.remove('dragging');

  const wasTap = gesture && gesture.type === 'pending';
  const wasMouse = e.pointerType === 'mouse';
  if (wasMouse) pointer.down = false;

  if (activePointers.size === 0) {
    gesture = null;
    if (wasTap) {
      const now = performance.now();
      const near = Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40;
      let didZoom = false;
      if (!wasMouse && now - lastTap.t < 320 && near) {
        const p = eventPos(e);
        zoomAt(p.x, p.y, 1.5);
        lastTap = { t: 0, x: 0, y: 0 };
        didZoom = true;
      } else {
        lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
      if (!didZoom) handleClick(e);
    }
  } else if (activePointers.size === 1) {
    const [p] = [...activePointers.values()];
    const rect = canvas.getBoundingClientRect();
    gesture = { type: 'drag', sx: rect.left + p.x, sy: rect.top + p.y, cx: cam.x, cy: cam.y };
    if (wasMouse) { pointer.dragging = true; }
  } else {
    beginPinch();
  }
}

if (window.PointerEvent) {
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onEnd);
  canvas.addEventListener('pointercancel', onEnd);
} else {
  const toSynthetic = t => ({
    pointerId: t.identifier, pointerType: 'touch',
    clientX: t.clientX, clientY: t.clientY
  });
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) onDown(toSynthetic(t));
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) onMove(toSynthetic(t));
  }, { passive: false });
  canvas.addEventListener('touchend', e => {
    for (const t of e.changedTouches) onEnd(toSynthetic(t));
  }, { passive: false });
  canvas.addEventListener('touchcancel', e => {
    for (const t of e.changedTouches) onEnd(toSynthetic(t));
  }, { passive: false });
}

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const p = eventPos(e);
  zoomAt(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
}, { passive: false });

/* ---------- Clique no mundo ---------- */
function handleClick(e) {
  if (game.visiting) { showToast(t('toast.visitingBlock')); return; }
  const g = gridFromEvent(e);

  if (state.mode === 'build' && state.ghost) {
    if (state.ghostPinned) {
      // novo clique reposiciona o fantasma em vez de ficar preso
      state.ghostPinned = false;
      hideConfirmBar();
      updateGhostPosition(g.gx, g.gy);
      if (state.ghost.valid) {
        state.ghostPinned = true;
        const def = BUILDINGS[state.ghost.type];
        showConfirmBar(t('confirm.build', { icon: def.icon, name: t('b_' + def.id), price: def.price.toLocaleString('pt-BR') }));
      }
      return;
    }
    updateGhostPosition(g.gx, g.gy);
    if (state.ghost.valid) {
      state.ghostPinned = true;
      const def = BUILDINGS[state.ghost.type];
      showConfirmBar(t('confirm.build', { icon: def.icon, name: t('b_' + def.id), price: def.price.toLocaleString('pt-BR') }));
    } else {
      playSound('error');
      showToast(t('toast.invalid'));
    }
    return;
  }

  if (state.mode === 'shovel') {
    const r = shovelTile(g.gx, g.gy);
    if (r) {
      showToast(t('toast.shoveled', { what: r.what, refund: (r.refund || 0).toLocaleString('pt-BR') }));
      refreshHud();
      autoClaimReady();
    } else {
      showToast(t('toast.shovelNothing'));
    }
    return;
  }

  if (state.mode === 'pen') {
    const n = state.penSize || 8;
    if (placePen(g.gx, g.gy, n)) {
      showToast(t('toast.penPlaced', { n }));
      refreshHud();
      setMode('idle');
    }
    return;
  }

  if (state.mode === 'till') {
    if (!inOwnedArea(g.gx, g.gy)) { showToast(t('toast.invalid')); return; }
    if (buildingAt(g.gx, g.gy)) { showToast(t('toast.tileBusy')); return; }
    if (upgradeLevel('till') === 0) { showToast(t('toast.toolNeed', { name: t('tool.hoe') })); return; }
    if (tillAreaAt(g.gx, g.gy) > 0) {
      spawnFloater(g.gx, g.gy, '⛏️', '#a1887f');
    }
    return;
  }

  if (state.mode === 'plant') {
    if (!inOwnedArea(g.gx, g.gy)) { showToast(t('toast.invalid')); return; }
    if (buildingAt(g.gx, g.gy)) { showToast(t('toast.tileBusy')); return; }
    const usedSeed = !game.visiting && (game.seeds[state.selectedSeed] || 0) > 0;
    const crop = plantCrop(state.selectedSeed, g.gx, g.gy);
    if (crop) {
      const def = CROPS[crop.type];
      spawnFloater(g.gx, g.gy, usedSeed ? '-1 🌱' : '-' + def.seedCost + ' 🪙', usedSeed ? '#aed581' : '#ffd54f');
      showToast(t('toast.planted', { icon: def.icon, name: t('c_' + def.id) }));
      refreshHud();
      autoClaimReady();
    }
    return;
  }

  if (state.mode === 'water') {
    if (upgradeLevel('water') === 0) { showToast(t('toast.toolNeed', { name: t('tool.can') })); return; }
    const occ = buildingAt(g.gx, g.gy);
    if (occ && occ.isCrop) {
      if (cropProgress(occ) >= 1) { doHarvest(occ); return; }
      if (waterAreaAt(occ.gx, occ.gy) > 0) {
        spawnFloater(occ.gx, occ.gy, '💧', '#4fc3f7');
        showToast(t('toast.watered'));
      } else {
        showToast(t('toast.alreadyWatered'));
      }
    } else {
      showToast(t('toast.waterHint'));
    }
    return;
  }

  if (state.mode === 'move') {
    if (!state.moveId) {
      const sel = buildingAt(g.gx, g.gy);
      if (!sel) { showToast(t('toast.clickBuilding')); return; }
      if (sel.isCrop) { showToast(t('toast.cropNoMove')); return; }
      state.moveId = sel.id;
      state.ghost = { type: sel.type, gx: sel.gx, gy: sel.gy, rot: sel.rot, valid: true };
      showToast(t('toast.moveSelect'));
      return;
    }
    if (state.ghostPinned) {
      state.ghostPinned = false;
      hideConfirmBar();
      updateGhostPosition(g.gx, g.gy);
      if (state.ghost.valid) {
        state.ghostPinned = true;
        showConfirmBar(t('confirm.move'));
      }
      return;
    }
    updateGhostPosition(g.gx, g.gy);
    if (state.ghost.valid) {
      state.ghostPinned = true;
      showConfirmBar(t('confirm.move'));
    } else {
      playSound('error');
      showToast(t('toast.invalid'));
    }
    return;
  }

  const b = buildingAt(g.gx, g.gy);

  if (state.mode === 'remove') {
    if (b && b.isCrop) {
      const def = CROPS[b.type];
      const refund = Math.floor(def.seedCost * 0.5);
      confirmDialog(
        t('dialog.removeCropText', { icon: def.icon, name: t('c_' + def.id), refund: refund.toLocaleString('pt-BR') }),
        () => {
          const r = removeCrop(b);
          if (r) showToast(t('toast.removed', { refund: r.refund.toLocaleString('pt-BR') }));
          refreshHud();
        });
      return;
    }
    if (b) {
      const def = BUILDINGS[b.type];
      const refund = Math.floor(def.price * def.refund);
      confirmDialog(
        t('dialog.removeText', { icon: def.icon, name: t('b_' + def.id), refund: refund.toLocaleString('pt-BR') }),
        () => {
          const r = removeBuilding(b.id);
          if (r) showToast(t('toast.removed', { refund: r.refund.toLocaleString('pt-BR') }));
          refreshHud();
          autoClaimReady();
        });
    } else {
      showToast(t('toast.removeHint'));
    }
    return;
  }

  if (state.mode === 'rotate') {
    if (b) {
      if (b.isCrop) { showToast(t('toast.cropNoMove')); return; }
      const def = BUILDINGS[b.type];
      if (def.w === 1 && def.d === 1) {
        showToast(t('toast.noRotate'));
        return;
      }
      state.rotateId = b.id;
      const newRot = (b.rot + 1) % 4;
      const valid = canPlace(b.type, b.gx, b.gy, newRot, b.id);
      state.ghost = { type: b.type, gx: b.gx, gy: b.gy, rot: newRot, valid };
      state.ghostPinned = true;
      showConfirmBar(t('confirm.rotate'));
    } else {
      showToast(t('toast.rotateHint'));
    }
    return;
  }

  if (state.mode === 'idle') {
    for (const f of game.farmers) {
      if (f.inside) continue;
      if (Math.hypot(f.gx - (g.gx + 0.5), f.gy - (g.gy + 0.5)) < 0.9) {
        openFarmerChest(f);
        return;
      }
    }
    let nearest = null, nd = Infinity;
    for (const a of game.animals) {
      const d = Math.hypot(a.gx - (g.gx + 0.5), a.gy - (g.gy + 0.5));
      if (d < 0.9 && d < nd) { nd = d; nearest = a; }
    }
    if (nearest) {
      if (collectAnimal(nearest)) {
        refreshHud();
        autoClaimReady();
      } else if (nearest.kind === 'pig') {
        showToast(t('toast.pigYoung'));
      } else {
        showToast(t('toast.animalNotReady'));
      }
      return;
    }
    const bld = buildingAt(g.gx, g.gy);
    if (bld && ['house', 'barn', 'stable', 'coop'].includes(bld.type)) {
      openBuildingPanel(bld.type);
      return;
    }
  }

  // modo normal: colher plantação pronta ou destacar construção
  if (b && b.isCrop) {
    const p = cropProgress(b);
    if (p >= 1) {
      doHarvest(b);
    } else {
      showToast(t('toast.notReady', { p: Math.floor(p * 100) }));
    }
    return;
  }

  if (b) {
    const def = BUILDINGS[b.type];
    state.highlightTile = { gx: b.gx, gy: b.gy };
    showToast(t('toast.highlight', { icon: def.icon, name: t('b_' + def.id) }));
    setTimeout(() => { state.highlightTile = null; }, 1200);
  }
}

/* ---------- Fantasma ---------- */
function updateGhostPosition(gx, gy) {
  if (!state.ghost) return;
  const g = state.ghost;
  const f = footprintOf(g.type, g.rot);
  g.gx = Math.max(0, Math.min(GRID_SIZE - f.w, gx));
  g.gy = Math.max(0, Math.min(GRID_SIZE - f.d, gy));
  g.valid = canPlace(g.type, g.gx, g.gy, g.rot, state.moveId || undefined);
}

/* ---------- Modos ---------- */
function setMode(mode) {
  state.mode = mode;
  state.ghost = null;
  state.ghostPinned = false;
  state.moveId = null;
  state.rotateId = null;
  hideConfirmBar();
  if (mode !== 'plant') hideSeedBar();
  canvas.classList.remove('mode-build', 'mode-move', 'mode-remove', 'mode-rotate', 'mode-plant', 'mode-water', 'mode-till', 'mode-pen', 'mode-shovel');
  if (mode !== 'idle') canvas.classList.add('mode-' + mode);
  for (const btn of document.querySelectorAll('.build-btn')) btn.classList.remove('active');
  const map = { build: 'btn-build', move: 'btn-move', remove: 'btn-remove', rotate: 'btn-rotate', plant: 'btn-plant', water: 'btn-water', pen: 'btn-pen', shovel: 'btn-shovel' };
  if (map[mode]) $(map[mode]).classList.add('active');
}

function enterBuildMode(typeId) {
  setMode('build');
  const def = BUILDINGS[typeId];
  state.ghost = { type: typeId, gx: lastPointerGrid.gx, gy: lastPointerGrid.gy, rot: 0, valid: false };
  updateGhostPosition(lastPointerGrid.gx, lastPointerGrid.gy);
  showToast(t('toast.buildHint', { icon: def.icon }));
}

const uiHandlers = {
  build() {
    if (state.mode === 'build' && !state.ghostPinned) { setMode('idle'); return; }
    playSound('click');
    openShop();
  },
  move() {
    playSound('click');
    if (state.mode === 'move') { setMode('idle'); return; }
    setMode('move');
    showToast(t('toast.moveHint'));
  },
  remove() {
    playSound('click');
    if (state.mode === 'remove') { setMode('idle'); return; }
    setMode('remove');
    showToast(t('toast.removeHint'));
  },
  rotate() {
    playSound('click');
    if (state.mode === 'rotate') { setMode('idle'); return; }
    setMode('rotate');
    showToast(t('toast.rotateHint'));
  },
  confirmOk() {
    if (state.mode === 'build' && state.ghost) {
      const b = placeBuilding(state.ghost.type, state.ghost.gx, state.ghost.gy, state.ghost.rot);
      if (b) {
        showToast(t('toast.built', { icon: BUILDINGS[b.type].icon, name: t('b_' + b.type) }));
        autoClaimReady();
        refreshHud();
        // continua no modo construir, fantasma livre a partir do cursor
        const type = state.ghost.type;
        setMode('build');
        state.ghost = { type, gx: lastPointerGrid.gx, gy: lastPointerGrid.gy, rot: 0, valid: false };
        updateGhostPosition(lastPointerGrid.gx, lastPointerGrid.gy);
      }
    } else if (state.mode === 'move' && state.moveId && state.ghost) {
      if (moveBuilding(state.moveId, state.ghost.gx, state.ghost.gy, state.ghost.rot)) {
        showToast(t('toast.moved'));
        autoClaimReady();
      }
      setMode('idle');
    } else if (state.mode === 'rotate' && state.rotateId) {
      if (rotateBuilding(state.rotateId)) {
        showToast(t('toast.rotated'));
      } else {
        playSound('error');
        showToast(t('toast.rotateNoSpace'));
      }
      setMode('idle');
    } else {
      hideConfirmBar();
    }
  },
  confirmCancel() {
    setMode('idle');
  },
  plant() {
    playSound('click');
    if (state.mode === 'plant') { setMode('idle'); return; }
    setMode('plant');
    buildSeedBar();
    showToast(t('toast.plantHint'));
  },
  water() {
    playSound('click');
    if (state.mode === 'water') { setMode('idle'); return; }
    setMode('water');
    showToast(t('toast.waterHint'));
  },
  shovel() {
    playSound('click');
    if (state.mode === 'shovel') { setMode('idle'); return; }
    setMode('shovel');
    showToast(t('toast.shovelHint'));
  },
  till() {
    playSound('click');
    if (state.mode === 'till') { setMode('idle'); return; }
    setMode('till');
    showToast(t('toast.tillHint'));
  },
  harvestAll() {
    playSound('click');
    const r = harvestAllCrops();
    if (r.n > 0) {
      showToast(t('toast.harvestAllBarn', { n: r.n, x: r.xp }));
      refreshHud();
      autoClaimReady();
    } else {
      showToast(t('toast.noneReady'));
    }
  },
  pen() {
    playSound('click');
    openPenModal();
  },
  dog() {
    playSound('click');
    if (!game.dogs.length) { showToast(t('toast.noDog')); return; }
    const any = game.dogs.some(d => d.active);
    if (!any && !game.pen) { showToast(t('toast.needPen')); return; }
    for (const d of game.dogs) d.active = !any;
    showToast(!any ? t('toast.dogOn') : t('toast.dogOff'));
    refreshHud();
  },
  collectAll() {
    playSound('click');
    const r = collectAllProducts();
    if (r.n > 0) {
      showToast(t('toast.collectAll', { n: r.n, c: r.coins }));
      refreshHud();
      autoClaimReady();
    } else {
      showToast(t('toast.nothingToCollect'));
    }
  }
};

function zoomStep(factor) {
  zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, factor);
}

const zoomHandlers = {
  zoomIn() { playSound('click'); zoomStep(1.25); },
  zoomOut() { playSound('click'); zoomStep(1 / 1.25); },
  zoomReset() {
    playSound('click');
    cam.zoom = canvas.clientWidth < 520 ? 0.72 : 1;
    centerCamera();
  }
};

function doHarvest(crop) {
  const r = harvestCrop(crop);
  if (r) {
    spawnFloater(crop.gx, crop.gy, '+1 ' + r.def.icon, '#c5e1a5');
    spawnFloater(crop.gx - 0.4, crop.gy - 0.4, '+' + r.xp + ' XP', '#aed581');
    showToast(t('toast.harvestedBarn', { icon: r.def.icon, name: t('c_' + r.def.id) }));
    refreshHud();
    autoClaimReady();
  }
}

/* ---------- Teclado ---------- */
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('modal-overlay').classList.contains('hidden')) { closeModal(); return; }
    if (!$('dialog-overlay').classList.contains('hidden')) {
      $('dialog-overlay').classList.add('hidden');
      dialogCallback = null;
      return;
    }
    setMode('idle');
    return;
  }
  if ((e.key === 'r' || e.key === 'R') && state.ghost && !state.ghostPinned &&
      (state.mode === 'build' || state.mode === 'move')) {
    state.ghost.rot = (state.ghost.rot + 1) % 4;
    updateGhostPosition(state.ghost.gx, state.ghost.gy);
  }

  if (e.key === 'Enter' && state.ghostPinned) uiHandlers.confirmOk();
});

/* Guarda de visita: uma unica vez, fora do handler de teclado */
for (const k of ['build', 'shovel', 'till', 'plant', 'water', 'harvestAll', 'collectAll', 'pen', 'dog', 'move', 'remove', 'rotate', 'confirmOk']) {
  const orig = uiHandlers[k];
  uiHandlers[k] = (...a) => {
    if (game.visiting) { showToast(t('toast.visitingBlock')); return; }
    if (game.intro) return;
    orig(...a);
  };
}

/* ---------- Cutscene inicial: chega de carro com o amigo ---------- */
function introActive() { return !!(game.intro && !game.visiting); }

function startIntroCutscene() {
  const a = game.ownedArea;
  game.intro = { phase: 'arrive', t: 0, x: a.x0 - 9, y: a.y0 - 14 };
}

function finishIntro() {
  if (!game.intro) return;
  game.intro = null;
  game.introDone = true;
  const a = game.ownedArea;
  const spot = { x: a.x0 + 2, y: a.y0 + 3 };
  game.farmers.push({
    id: game.nextId++, gx: spot.x + 0.5, gy: spot.y + 0.5,
    tx: spot.x + 0.5, ty: spot.y + 0.5,
    walking: false, wait: 1, phase: Math.random() * 10,
    chest: {}, role: 'all'
  });
  saveGame(false);
  centerCamera();
  showToast(t('toast.welcome'));
}

function updateIntro(dt) {
  if (!introActive()) return;
  const it = game.intro;
  it.t += dt;
  const a = game.ownedArea;
  const p0 = { x: a.x0 - 9, y: a.y0 - 14 };
  const stop = { x: a.x0 + 2, y: a.y0 - 1 };
  if (it.phase === 'arrive') {
    const k = Math.min(1, it.t / 5.5);
    it.x = p0.x + (stop.x - p0.x) * k;
    it.y = p0.y + (stop.y - p0.y) * k;
    if (k >= 1) { it.phase = 'drop'; it.t = 0; }
  } else if (it.phase === 'drop') {
    if (it.t >= 2.4) { it.phase = 'leave'; it.t = 0; it.sx = stop.x; it.sy = stop.y; }
  } else if (it.phase === 'leave') {
    const k = Math.min(1, it.t / 5);
    it.x = it.sx + (p0.x - it.sx) * k;
    it.y = it.sy + (p0.y - it.sy) * k;
    if (k >= 1) finishIntro();
  }
  const c = projectPoint(it.x, it.y, 0);
  cam.x = c.x; cam.y = c.y;
  clampCamera();
}

/* ---------- Salvamento ao sair ---------- */
window.addEventListener('beforeunload', () => saveGame(false));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGame(false);
});

/* ---------- Loop ---------- */
let lastTime = 0;
let autosaveAcc = 0;

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 1);
  lastTime = ts;
  try {
    if (!game.visiting) {
      advanceClock(dt);
      updateWeather(dt);
      updateAnimals(dt);
      updateFarmers(dt);
      updateDogs(dt);
      updateCouriers(dt);
      updateTractor(dt);
      updateParticles(dt);
      updateAmbient(dt);
      updateIntro(dt);
    }
    updateMultiplayer(dt);
    render(ctx, cam, canvas.clientWidth, canvas.clientHeight, state);
    refreshHud();
  } catch (err) {
    if (dbgBadge) {
      dbgBadge.textContent = 'ERRO ' + GAME_VERSION + ': ' + err.message;
      dbgBadge.classList.add('dbg-error');
    }
  }
  autosaveAcc += dt;
  if (autosaveAcc > 15) { autosaveAcc = 0; saveGame(false); }
  requestAnimationFrame(loop);
}

/* ---------- Início ---------- */
function init() {
  resize();
  const loaded = loadGame();
  ensureFarmCode();
  if (!loaded || !game.introDone) {
    // jogo novo comeca vazio (sem casa, sem poco e sem animais) com a cutscene do carro;
    // se o jogador fechar no meio da cutscene, ela recomeca ao voltar
    startIntroCutscene();
    if (!loaded) saveGame(false);
  }
  game.stats.level = game.level;
  game.stats.peak_coins = Math.max(game.stats.peak_coins || 0, game.coins);
  if (loaded) spawnAnimals();
  applyLang();
  centerCamera();
  if (canvas.clientWidth < 520) cam.zoom = 0.72;
  dbgShowZoom();
  bindUi(uiHandlers);
  refreshHud();
  requestAnimationFrame(loop);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    try { navigator.serviceWorker.register('sw.js'); } catch (e) {}
  }
  const farmParam = new URLSearchParams(location.search).get('farm');
  if (farmParam && /^[0-9]{6}$/.test(farmParam)) {
    visitFarm(farmParam, err => {
      if (err) showToast(t('toast.mpError', { err: err.message || err.type || 'erro' }));
    });
  }
}

init();
