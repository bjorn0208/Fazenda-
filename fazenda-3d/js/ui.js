/* ================= FAZENDA 3D — INTERFACE (DOM) =================
   HUD, painéis, modais, toasts, sons e diálogos. */

const uiDirty = { coins: true, gems: true, xp: true };

const $ = id => document.getElementById(id);

/* ---------- Sons (WebAudio, sem arquivos externos) ---------- */
let audioCtx = null;
function playSound(kind) {
  if (!game.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = {
      click: [660, 0.05], place: [520, 0.12], remove: [220, 0.15],
      rotate: [440, 0.08], level: [784, 0.2], error: [180, 0.18]
    };
    const [freq, dur] = notes[kind] || notes.click;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
  } catch (e) { /* áudio indisponível */ }
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.classList.add('hidden'), 300);
  }, 2200);
}

/* ---------- HUD ---------- */
function refreshHud() {
  if (uiDirty.coins) { $('coins-value').textContent = game.coins.toLocaleString('pt-BR'); uiDirty.coins = false; }
  if (uiDirty.gems) { $('gems-value').textContent = game.gems; uiDirty.gems = false; }
  if (uiDirty.xp) {
    $('level-text').textContent = 'Nível ' + game.level;
    $('farm-name').textContent = game.farmName;
    const need = xpForLevel(game.level);
    $('xp-fill').style.width = Math.min(100, (game.xp / need) * 100) + '%';
    uiDirty.xp = false;
  }
}

/* ---------- Modais ---------- */
function openModal(title, bodyBuilder) {
  $('modal-title').textContent = title;
  const body = $('modal-body');
  body.innerHTML = '';
  bodyBuilder(body);
  $('modal-overlay').classList.remove('hidden');
  playSound('click');
}

function closeModal() { $('modal-overlay').classList.add('hidden'); }

/* ---------- Loja ---------- */
let currentShopTab = 'construcoes';

function openShop() {
  openModal('🏪 Loja da Fazenda', body => {
    const tabs = document.createElement('div');
    tabs.className = 'shop-tabs';
    for (const cat of SHOP_CATEGORIES) {
      const btn = document.createElement('button');
      btn.className = 'shop-tab' + (cat.id === currentShopTab ? ' active' : '');
      btn.textContent = cat.name;
      btn.onclick = () => { currentShopTab = cat.id; openShop(); };
      tabs.appendChild(btn);
    }
    body.appendChild(tabs);

    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    for (const def of Object.values(BUILDINGS)) {
      if (def.category !== currentShopTab) continue;
      const locked = game.level < def.level;
      const afford = game.coins >= def.price;
      const item = document.createElement('div');
      item.className = 'shop-item';
      item.innerHTML = `
        <div class="shop-item-icon">${def.icon}</div>
        <div class="shop-item-name">${def.name}</div>
        <div class="shop-item-size">${def.w}×${def.d} tiles</div>
        <div class="shop-item-desc" style="font-size:11px;color:#6d4c41;text-align:center">${def.desc}</div>
        <div class="shop-item-price">🪙 ${def.price.toLocaleString('pt-BR')}</div>
        ${locked ? `<div class="shop-item-locked">🔒 Requer nível ${def.level}</div>` : ''}
      `;
      const buyBtn = document.createElement('button');
      buyBtn.className = 'shop-buy-btn';
      buyBtn.textContent = 'Selecionar';
      buyBtn.disabled = locked || !afford;
      buyBtn.onclick = () => {
        closeModal();
        enterBuildMode(def.id);
      };
      item.appendChild(buyBtn);
      grid.appendChild(item);
    }
    body.appendChild(grid);
  });
}

/* Loja de moedas (botão + das moedas) */
function openCoinShop() {
  openModal('🪙 Loja de Moedas', body => {
    body.innerHTML = `<p style="text-align:center;margin-bottom:12px">
      A loja de moedas com compras reais será integrada na fase de monetização.
      Por enquanto, ganhe moedas vendendo produtos e concluindo missões!</p>`;
    const btn = document.createElement('button');
    btn.className = 'settings-btn';
    btn.style.background = 'var(--green)';
    btn.style.color = '#fff';
    btn.textContent = '🎁 Receber 100 moedas de boas-vindas (1x por dia)';
    btn.onclick = () => {
      const today = new Date().toDateString();
      const last = localStorage.getItem('fazenda3d_daily');
      if (last === today) { showToast('⏰ Volte amanhã para a recompensa diária!'); return; }
      localStorage.setItem('fazenda3d_daily', today);
      addCoins(100);
      playSound('level');
      showToast('🪙 +100 moedas!');
    };
    body.appendChild(btn);
  });
}

function openGemShop() {
  openModal('💎 Loja de Diamantes', body => {
    body.innerHTML = `<p style="text-align:center">
      Diamantes são a moeda premium: aceleram construções e produções
      e desbloqueiam itens especiais. A loja de compra será integrada
      na fase de monetização.</p>`;
  });
}

/* ---------- Missões ---------- */
function openMissions() {
  openModal('📋 Missões', body => {
    for (const m of MISSIONS) {
      const done = game.missionsClaimed.includes(m.id);
      const prog = missionProgress(m);
      const item = document.createElement('div');
      item.className = 'mission-item' + (done ? ' mission-done' : '');
      item.innerHTML = `
        <div class="mission-info">
          <div class="mission-title">${done ? '✅ ' : ''}${m.title}</div>
          <div class="mission-desc">${m.desc}</div>
          <div class="mission-progress">Progresso: ${prog}/${m.target}</div>
        </div>
        <div class="mission-reward">🪙 ${m.rewardCoins}<br>⭐ ${m.rewardXp} XP</div>
      `;
      body.appendChild(item);
    }
  });
}

/* ---------- Conquistas ---------- */
function openAchievements() {
  openModal('🏆 Conquistas', body => {
    for (const a of ACHIEVEMENTS) {
      const done = game.achievementsClaimed.includes(a.id);
      const prog = achievementProgress(a);
      const item = document.createElement('div');
      item.className = 'achievement-item' + (done ? ' achievement-done' : '');
      item.innerHTML = `
        <div class="achievement-info">
          <div class="achievement-title">${done ? '🏆 ' : '🔒 '}${a.title}</div>
          <div class="achievement-desc">${a.desc} (${prog}/${a.target})</div>
        </div>
        <div class="achievement-reward">🪙 ${a.rewardCoins}</div>
      `;
      body.appendChild(item);
    }
  });
}

/* ---------- Amigos ---------- */
function openFriends() {
  openModal('👥 Amigos', body => {
    body.innerHTML = `<div class="friends-placeholder">
      👥 O sistema de amigos (visitar fazendas, trocar presentes e produtos)
      será ativado na fase multiplayer. Sua fazenda está pronta para recebê-los!</div>`;
  });
}

/* ---------- Configurações ---------- */
function openSettings() {
  openModal('⚙️ Configurações', body => {
    const rows = [
      { label: '🔊 Som', key: 'sound', type: 'toggle' },
      { label: '🎵 Música', key: 'music', type: 'toggle' },
      { label: '✨ Qualidade gráfica', key: 'quality', type: 'select',
        options: ['baixa', 'média', 'alta'] },
      { label: '🌐 Idioma', key: 'language', type: 'select',
        options: ['pt-BR', 'en-US'] }
    ];
    for (const r of rows) {
      const row = document.createElement('div');
      row.className = 'settings-row';
      row.innerHTML = `<span>${r.label}</span>`;
      let input;
      if (r.type === 'toggle') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = game.settings[r.key];
        input.onchange = () => { game.settings[r.key] = input.checked; playSound('click'); };
      } else {
        input = document.createElement('select');
        for (const opt of r.options) {
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt;
          if (game.settings[r.key] === opt) o.selected = true;
          input.appendChild(o);
        }
        input.onchange = () => { game.settings[r.key] = input.value; playSound('click'); };
      }
      row.appendChild(input);
      body.appendChild(row);
    }

    const saveBtn = document.createElement('button');
    saveBtn.className = 'settings-btn';
    saveBtn.style.background = 'var(--blue)';
    saveBtn.style.color = '#fff';
    saveBtn.textContent = '💾 Salvar progresso agora';
    saveBtn.onclick = () => { saveGame(true); };

    const resetBtn = document.createElement('button');
    resetBtn.className = 'settings-btn';
    resetBtn.style.background = 'var(--red)';
    resetBtn.style.color = '#fff';
    resetBtn.textContent = '🗑️ Reiniciar fazenda (apaga tudo)';
    resetBtn.onclick = () => {
      confirmDialog('Tem certeza? Todo o progresso será PERDIDO para sempre.', () => resetGame());
    };

    body.appendChild(saveBtn);
    body.appendChild(resetBtn);
  });
}

/* ---------- Comprar (expansão + atalhos) ---------- */
function openBuyMenu() {
  openModal('🛒 Comprar', body => {
    const price = expansionPrice();
    const can = canExpand();
    const afford = game.coins >= price;
    const card = document.createElement('div');
    card.className = 'shop-item';
    card.style.maxWidth = '320px';
    card.style.margin = '0 auto 14px';
    card.innerHTML = `
      <div class="shop-item-icon">🌍</div>
      <div class="shop-item-name">Expansão de Terreno</div>
      <div class="shop-item-size">+2 tiles em toda a borda da fazenda</div>
      <div class="shop-item-price">🪙 ${price.toLocaleString('pt-BR')}</div>
      ${can ? '' : '<div class="shop-item-locked">Limite de expansões atingido</div>'}
    `;
    const btn = document.createElement('button');
    btn.className = 'shop-buy-btn';
    btn.textContent = can ? 'Comprar expansão' : 'Indisponível';
    btn.disabled = !can || !afford;
    btn.onclick = () => { if (buyLand()) { closeModal(); refreshHud(); } };
    card.appendChild(btn);
    body.appendChild(card);

    const hint = document.createElement('p');
    hint.style.cssText = 'text-align:center;font-size:13px;color:#6d4c41';
    hint.textContent = 'Para construir estruturas, use o botão 🪧 Construir ou a 🏪 Loja.';
    body.appendChild(hint);
  });
}

/* ---------- Diálogo de confirmação ---------- */
let dialogCallback = null;
function confirmDialog(text, onOk) {
  $('dialog-text').textContent = text;
  dialogCallback = onOk;
  $('dialog-overlay').classList.remove('hidden');
  playSound('click');
}

/* ---------- Barra de confirmação flutuante ---------- */
function showConfirmBar(info) {
  $('confirm-info').textContent = info;
  $('confirm-bar').classList.remove('hidden');
}
function hideConfirmBar() { $('confirm-bar').classList.add('hidden'); }

/* ---------- Ligação dos botões ---------- */
function bindUi(handlers) {
  $('btn-settings').onclick = openSettings;
  $('btn-add-coins').onclick = openCoinShop;
  $('btn-add-gems').onclick = openGemShop;
  $('btn-build').onclick = () => handlers.build();
  $('btn-move').onclick = () => handlers.move();
  $('btn-remove').onclick = () => handlers.remove();
  $('btn-rotate').onclick = () => handlers.rotate();
  $('btn-buy').onclick = openBuyMenu;

  for (const btn of document.querySelectorAll('.side-btn')) {
    btn.onclick = () => {
      const panel = btn.dataset.panel;
      if (panel === 'missions') openMissions();
      else if (panel === 'shop') openShop();
      else if (panel === 'achievements') openAchievements();
      else if (panel === 'friends') openFriends();
    };
  }

  $('modal-close').onclick = closeModal;
  $('modal-overlay').onclick = e => { if (e.target === $('modal-overlay')) closeModal(); };

  $('dialog-ok').onclick = () => {
    $('dialog-overlay').classList.add('hidden');
    if (dialogCallback) dialogCallback();
    dialogCallback = null;
  };
  $('dialog-cancel').onclick = () => { $('dialog-overlay').classList.add('hidden'); dialogCallback = null; };

  $('confirm-ok').onclick = () => handlers.confirmOk();
  $('confirm-cancel').onclick = () => handlers.confirmCancel();
}
