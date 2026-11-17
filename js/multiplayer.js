/* ============================================================
   MULTIPLAYER P2P (PeerJS) — salas por codigo de fazenda
   O dono abre a sala (peer id = codigo); visitantes conectam,
   recebem o estado da fazenda (somente leitura) e podem
   presentear com moedas, sementes e animais.
   ============================================================ */

const MP_PREFIX = 'fazenda3d-v1-';
const MP_SYNC_INTERVAL = 10;
const MP_GIFT_LIMITS = { coins: 10000, seeds: 20, animals: 2 };

let mpPeer = null;
let mpConns = [];
let mpVisitConn = null;
let mpSyncT = 0;
let mpStatus = 'off'; /* off | connecting | hosting | visiting */

function mpPeerId(code) {
  return MP_PREFIX + String(code || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function loadPeerJs(cb) {
  if (typeof Peer !== 'undefined') { cb(null); return; }
  const s = document.createElement('script');
  s.src = ['https:', '', 'unpkg.com', 'peerjs@1.5.4', 'dist', 'peerjs.min.js'].join('/');
  s.onload = () => cb(null);
  s.onerror = () => cb(new Error('cdn'));
  document.head.appendChild(s);
}

function mpSnapshot() {
  return snapshotData();
}

function mpClosePeer() {
  for (const c of mpConns) { try { c.close(); } catch (e) {} }
  mpConns = [];
  if (mpVisitConn) { try { mpVisitConn.close(); } catch (e) {} mpVisitConn = null; }
  if (mpPeer) { try { mpPeer.destroy(); } catch (e) {} mpPeer = null; }
  mpStatus = 'off';
}

function stopHosting() {
  mpClosePeer();
}

function hostFarm(onReady) {
  if (mpStatus === 'hosting') { onReady(null); return; }
  loadPeerJs(err => {
    if (err) { onReady(err); return; }
    mpClosePeer();
    const code = ensureFarmCode();
    mpPeer = new Peer(mpPeerId(code));
    mpStatus = 'connecting';
    mpPeer.on('open', () => { mpStatus = 'hosting'; onReady(null); });
    mpPeer.on('connection', conn => {
      mpConns.push(conn);
      conn.on('open', () => { try { conn.send({ type: 'state', data: mpSnapshot() }); } catch (e) {} });
      conn.on('data', msg => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'hello') {
          try { conn.send({ type: 'state', data: mpSnapshot() }); } catch (e) {}
        } else if (msg.type === 'gift') {
          const res = receiveGift(msg.gift);
          try { conn.send({ type: 'gift-ack', ok: !!res, msg: res ? res.msg : null }); } catch (e) {}
          if (res) showToast(t('toast.giftReceived', { msg: res.msg }));
        }
      });
      const drop = () => { mpConns = mpConns.filter(c => c !== conn); };
      conn.on('close', drop);
      conn.on('error', drop);
    });
    mpPeer.on('error', e => {
      if (mpStatus === 'connecting') { mpStatus = 'off'; onReady(e); }
    });
  });
}

function visitFarm(code, onReady) {
  loadPeerJs(err => {
    if (err) { onReady(err); return; }
    mpClosePeer();
    mpPeer = new Peer();
    mpStatus = 'connecting';
    mpPeer.on('open', () => {
      const conn = mpPeer.connect(mpPeerId(code), { reliable: true });
      mpVisitConn = conn;
      const timer = setTimeout(() => {
        if (mpStatus === 'connecting') { mpStatus = 'off'; onReady(new Error('timeout')); }
      }, 12000);
      conn.on('open', () => {
        clearTimeout(timer);
        try { conn.send({ type: 'hello' }); } catch (e) {}
      });
      conn.on('data', msg => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'state') {
          const first = mpStatus !== 'visiting';
          clearTimeout(timer);
          if (first) {
            enterVisitMode(msg.data);
            onReady(null);
          } else {
            applySaveData(msg.data);
          }
        } else if (msg.type === 'gift-ack') {
          showToast(msg.ok ? (t('toast.giftSent') + (msg.msg ? ': ' + msg.msg : '')) : t('toast.giftFailed'));
        }
      });
      conn.on('close', () => { if (mpStatus === 'visiting') leaveVisitMode(); });
    });
    mpPeer.on('error', e => {
      if (mpStatus === 'connecting') { mpStatus = 'off'; onReady(e); }
    });
  });
}

function enterVisitMode(data) {
  saveGame(false);
  try { localStorage.setItem(SAVE_KEY + '_visit', JSON.stringify(snapshotData())); } catch (e) {}
  applySaveData(data);
  game.visiting = true;
  mpStatus = 'visiting';
  if (typeof setMode === 'function') setMode('idle');
  state.ghost = null;
  state.highlightTile = null;
  updateVisitBanner();
  showToast(t('toast.visiting'));
}

function leaveVisitMode() {
  if (mpVisitConn) { try { mpVisitConn.close(); } catch (e) {} mpVisitConn = null; }
  game.visiting = false;
  mpStatus = 'off';
  let restored = false;
  try {
    const raw = localStorage.getItem(SAVE_KEY + '_visit');
    if (raw) {
      restored = applySaveData(JSON.parse(raw));
      localStorage.removeItem(SAVE_KEY + '_visit');
    }
  } catch (e) {}
  if (!restored) loadGame();
  updateVisitBanner();
  showToast(t('toast.backHome'));
}

function sendGift(gift) {
  if (mpStatus !== 'visiting' || !mpVisitConn) return false;
  try { mpVisitConn.send({ type: 'gift', gift }); return true; } catch (e) { return false; }
}

function updateMultiplayer(dt) {
  if (mpStatus !== 'hosting') return;
  mpSyncT -= dt;
  if (mpSyncT <= 0) {
    mpSyncT = MP_SYNC_INTERVAL;
    const snap = mpSnapshot();
    for (const c of mpConns) {
      try { if (c.open) c.send({ type: 'state', data: snap }); } catch (e) {}
    }
  }
}
