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
}

/* ---------- Entrada: mouse (pointer) e toque (touch nativo) ---------- */
const pointer = { down: false, dragging: false, sx: 0, sy: 0, cx: 0, cy: 0 };

function eventPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function touchPos(t) {
  const rect = canvas.getBoundingClientRect();
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

function gridFromScreenPos(p) {
  const w = screenToWorld(cam, p.x, p.y, canvas.clientWidth, canvas.clientHeight);
  lastPointerGrid = screenToGrid(w.x, w.y);
  return lastPointerGrid;
}

function gridFromEvent(e) { return gridFromScreenPos(eventPos(e)); }
function gridFromTouch(t) { return gridFromScreenPos(touchPos(t)); }

/* Mouse: arrastar move a câmera; clique curto interage. */
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse' || e.button !== 0) return;
  pointer.down = true; pointer.dragging = false;
  pointer.sx = e.clientX; pointer.sy = e.clientY;
  pointer.cx = cam.x; pointer.cy = cam.y;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  gridFromEvent(e);
  if (pointer.down) {
    const dx = e.clientX - pointer.sx, dy = e.clientY - pointer.sy;
    if (!pointer.dragging && Math.abs(dx) + Math.abs(dy) > 6) pointer.dragging = true;
    if (pointer.dragging) {
      cam.x = pointer.cx - dx / cam.zoom;
      cam.y = pointer.cy - dy / cam.zoom;
      clampCamera();
      canvas.classList.add('dragging');
    }
  }
  if (!state.ghostPinned && state.ghost &&
      (state.mode === 'build' || (state.mode === 'move' && state.moveId))) {
    updateGhostPosition(lastPointerGrid.gx, lastPointerGrid.gy);
  }
});

canvas.addEventListener('pointerup', e => {
  if (e.pointerType !== 'mouse') return;
  canvas.classList.remove('dragging');
  if (!pointer.down) return;
  const wasDragging = pointer.dragging;
  pointer.down = false; pointer.dragging = false;
  if (!wasDragging) handleClick(e);
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const p = eventPos(e);
  zoomAt(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
}, { passive: false });

/* Toque: 1 dedo arrasta, 2 dedos dão zoom por pinça. */
let touchDrag = null;
let pinch = null;

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (e.touches.length === 1) {
    const t = e.touches[0];
    touchDrag = { sx: t.clientX, sy: t.clientY, cx: cam.x, cy: cam.y, moved: false };
    gridFromTouch(t);
  } else if (e.touches.length >= 2) {
    touchDrag = null;
    const a = touchPos(e.touches[0]), b = touchPos(e.touches[1]);
    pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1 && touchDrag) {
    const t = e.touches[0];
    const dx = t.clientX - touchDrag.sx, dy = t.clientY - touchDrag.sy;
    if (!touchDrag.moved && Math.abs(dx) + Math.abs(dy) > 6) touchDrag.moved = true;
    if (touchDrag.moved) {
      cam.x = touchDrag.cx - dx / cam.zoom;
      cam.y = touchDrag.cy - dy / cam.zoom;
      clampCamera();
    } else {
      gridFromTouch(t);
    }
  } else if (e.touches.length >= 2) {
    const a = touchPos(e.touches[0]), b = touchPos(e.touches[1]);
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (!pinch) pinch = { dist: d };
    if (pinch.dist > 0) zoomAt(mid.x, mid.y, d / pinch.dist);
    pinch.dist = d;
    touchDrag = null;
    return;
  }
  if (!state.ghostPinned && state.ghost &&
      (state.mode === 'build' || (state.mode === 'move' && state.moveId))) {
    updateGhostPosition(lastPointerGrid.gx, lastPointerGrid.gy);
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  if (e.touches.length === 0) {
    if (touchDrag && !touchDrag.moved) {
      const t = e.changedTouches[0];
      handleClick({ clientX: t.clientX, clientY: t.clientY });
    }
    touchDrag = null;
    pinch = null;
  } else if (e.touches.length === 1 && pinch) {
    const t = e.touches[0];
    touchDrag = { sx: t.clientX, sy: t.clientY, cx: cam.x, cy: cam.y, moved: true };
    pinch = null;
  }
}, { passive: false });

canvas.addEventListener('touchcancel', () => {
  touchDrag = null;
  pinch = null;
}, { passive: false });

/* ---------- Clique no mundo ---------- */
function handleClick(e) {
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

  if (state.mode === 'plant') {
    if (!inOwnedArea(g.gx, g.gy)) { showToast(t('toast.invalid')); return; }
    if (buildingAt(g.gx, g.gy)) { showToast(t('toast.tileBusy')); return; }
    const crop = plantCrop(state.selectedSeed, g.gx, g.gy);
    if (crop) {
      const def = CROPS[crop.type];
      spawnFloater(g.gx, g.gy, '-' + def.seedCost + ' 🪙', '#ffd54f');
      showToast(t('toast.planted', { icon: def.icon, name: t('c_' + def.id) }));
      refreshHud();
      autoClaimReady();
    }
    return;
  }

  if (state.mode === 'water') {
    const occ = buildingAt(g.gx, g.gy);
    if (occ && occ.isCrop) {
      if (cropProgress(occ) >= 1) { doHarvest(occ); return; }
      if (waterCrop(occ)) {
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
  canvas.classList.remove('mode-build', 'mode-move', 'mode-remove', 'mode-rotate', 'mode-plant', 'mode-water');
  if (mode !== 'idle') canvas.classList.add('mode-' + mode);
  for (const btn of document.querySelectorAll('.build-btn')) btn.classList.remove('active');
  const map = { build: 'btn-build', move: 'btn-move', remove: 'btn-remove', rotate: 'btn-rotate', plant: 'btn-plant', water: 'btn-water' };
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
    spawnFloater(crop.gx, crop.gy, '+' + r.sell + ' 🪙', '#ffd54f');
    spawnFloater(crop.gx - 0.4, crop.gy - 0.4, '+' + r.xp + ' XP', '#aed581');
    showToast(t('toast.harvested', { icon: r.def.icon, c: r.sell, x: r.xp }));
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
  updateAnimals(dt);
  render(ctx, cam, canvas.clientWidth, canvas.clientHeight, state);
  autosaveAcc += dt;
  if (autosaveAcc > 15) { autosaveAcc = 0; saveGame(false); }
  requestAnimationFrame(loop);
}

/* ---------- Início ---------- */
function init() {
  resize();
  const loaded = loadGame();
  if (!loaded) {
    // propriedade inicial: casa e poço já construídos
    placeBuilding('house', 12, 12, 0, true);
    placeBuilding('well', 16, 16, 0, true);
    saveGame(false);
  }
  game.stats.level = game.level;
  game.stats.peak_coins = Math.max(game.stats.peak_coins || 0, game.coins);
  spawnAnimals();
  applyLang();
  centerCamera();
  if (canvas.clientWidth < 520) cam.zoom = 0.72;
  bindUi(uiHandlers);
  refreshHud();
  requestAnimationFrame(loop);
  if (!loaded) showToast(t('toast.welcome'));
}

init();
