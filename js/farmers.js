/* ================= FAZENDA 3D — FAZENDEIRO AUTOMÁTICO =================
   NPC contratável: caminha pela fazenda, planta as sementes do baú,
   rega, colhe o que ficar pronto e vende na hora pelos você. */

const FARMER_SPEED = 1.1;

function gameHour() {
  return (6 + game.time * 24) % 24;
}

/* ================= MENTE DOS FAZENDEIROS =================
   Cada fazendeiro tem nome, personalidade, energia, humor,
   amizades e pensa/fala por conta propria. */

const FARMER_NAMES = ['João', 'Maria', 'Pedro', 'Ana', 'Zé', 'Tião', 'Rita', 'Bento', 'Sofia', 'Duca', 'Lurdes', 'Chico'];

const PERSONALITIES = {
  trabalhador: { workMul: 1.2, chat: 0.5, mood: 'feliz' },
  sonhador:    { workMul: 0.9, chat: 0.7, mood: 'feliz' },
  rabugento:   { workMul: 1.0, chat: 0.3, mood: 'irritado' },
  brincalhao:  { workMul: 0.95, chat: 0.9, mood: 'animado' },
  sabio:       { workMul: 1.05, chat: 0.5, mood: 'feliz' }
};

const MIND_LINES = {
  'pt-BR': {
    idle: ['Que dia bonito na {farm}.', 'Alguem viu meu chapeu?', 'Que silencio bom...', 'O sol hoje ta bom pra plantio.', 'Adoro o cheiro da terra de manha.', 'Essa cerca precisa de um retoque.', 'O poco nunca secou, que bencao.', 'Passarinho demais hoje.', 'Meu jaw ta doendo de tanto falar.', 'Ate que enfim um descanso.', 'A {farm} ta linda esse ano.', 'Devia ter trazido agua.', 'As abelhas tavam bravas la atras.', 'Essa bota nova aperta o pe.', 'Quanto tempo a gente trabalha aqui ja?'],
    work: ['Essa terra e boa, viu.', 'Mais um dia de trabalho na {farm}.', 'Arar, plantar, regar... e repetir.', 'A terra agradece capricho.', 'Essa enxada e minha melhor amiga.', 'Sem pressa que o dia e longo.', 'Terra arada rende o dobro, sabia?', 'Trabalho bem feito nao precisa refazer.', 'Hoje rendo o triplo, marca la.', 'Nao e forca, e tecnica.', 'Aqui o trigo nasce ate com elogio.', 'Meu cantinho favorito da {farm}.', 'Planta que a {farm} cresce.', 'Cuidar da terra e como criar filho.', 'Nem parece trabalho quando da colheita.'],
    chestEmpty: ['Meu bau ta vazio... preciso de sementes.', 'Sem sementes nao tem colheita.', 'Bau zerado, coracao apertado.', 'Preciso pedir sementes emprestadas.', 'Cadê meu estoque de sementes?', 'Bau vazio nao planta nada.', 'Vou pedir emprestado na reuniao.', 'Quem tiver semente sobrando me avisa.'],
    tired: ['Ai, minhas costas...', 'Precisava de um cafe agora.', 'Hoje nao rendo mais nada...', 'Meus pes pedindo arrego.', 'Ja da hora de um cochilo.', 'A idade nao perdoa, nao.', 'Dormir mal ontem cobrou hoje.', 'So mais um canteiro e eu paro.', 'Cansaco bom, de trabalho honesto.', 'Amanha rendo mais, prometo.'],
    night: ['Que bom dormir numa cama de verdade.', 'Amanha eu acordo cedinho.', 'Boa noite, fazenda.', 'O galo me acorda, nao precisa despertador.', 'Sonho com colheita boa.', 'A casa fica quentinha a noite.', 'Dormir bem e meio do trabalho.', 'Hoje foi um dia produtivo.', 'Ate amanha, companheiros.', 'A lua ta bonita hoje...'],
    dawn: ['Bom dia, fazenda!', 'O galo ja cantou? Vamos trabalhar!', 'O ar da manha e outro bicho.', 'Orvalho na grama, dia perfeito.', 'Levantar cedo vale a pena.', 'Primeira reuniao do dia, pessoal!', 'O sol chegou, hora de acao.', 'Hoje o dia vai ser produtivo, aposto.'],
    harvest: ['Colheita boa e dinheiro no bolso.', 'Que espiga linda!', 'O patrao vai gostar dessa.', 'Do jeito que plantei, cresceu.', 'Colher e a melhor parte.', 'Cesta cheia, coracao feliz.', 'Isso vai dar um bom preco.', 'Colheita record hoje, aposto.', 'A terra retribui quem cuida.', 'Mais uma pro estoque!', 'Cheiro de colheita fresca...', 'Ve o tamanho desse tomate!'],
    animals: ['Esses animais comem mais que eu.', 'O leite de hoje ta fresquinho.', 'Cuidado com o porco, ele e bravo.', 'As galinhas tavam ciscando meu canteiro.', 'O cavalo corre demais.', 'Vaca feliz da leite bom.', 'Quem soltou as galinhas?', 'Esse ovo ta quentinho ainda.', 'O cachorro de novo atras do coitado.', 'Bichos comem melhor que a gente.'],
    greet: ['Oi, {other}!', 'Fala, {other}.', 'E ai, {other}, firme?', 'Coé, {other}!', 'Bom te ver, {other}.', 'Tudo certo, {other}?'],
    smalltalk: ['A colheita ta vindo boa, ne?', 'Ja contou os animais hoje?', 'Dizem que vai chover.', 'O patrao ta de olho na gente...', 'Essa {farm} cresce todo dia.', 'O preco do trigo subiu, ouvi dizer.', 'Ontem sonhei com um campo dourado.', 'O vizinho plantou milho tambem.', 'Vamos ter que ampliar o curral.', 'O lago ta cheio de peixes.', 'Voce viu o tamanho da abobora?', 'Esse vento ta bom pra trabalhar.'],
    reply: ['Pois e, {other}.', 'Verdade!', 'Nem me fale...', 'Boa ideia, {other}.', 'Vamos com fe.', 'Concordo plenamente.', 'E o que eu tava pensando!', 'Palavra de fazendeiro.'],
    joke: ['Hahaha!', 'Essa foi boa, {other}!', 'Voce e o diabo, {other}!', 'Ri tanto que doeu a barriga.', 'Conto essa pro patrao depois.'],
    meetOpen: ['Bom dia, pessoal! Reuniao!', 'Vamos planejar o dia, gente.', 'Atencao, time! Reuniao rapida.', 'Circulo aqui! Assunto importante.'],
    meetPlan: ['Hoje vamos plantar {crop}. Temos {n} sementes.', 'O plano e {crop}: temos {n} sementes no bau.', 'Foco no {crop} hoje — {n} sementes disponiveis.', 'Prioridade de hoje: {crop}, {n} sementes no total.'],
    meetHave: ['Eu tenho {n} sementes de {crop} aqui.', 'Comigo vai {n} sementes de {crop}.', 'Deixo {n} sementes de {crop} com voces.'],
    meetBorrow: ['{other}, me empresta sementes de {crop}? Meu bau zerou.', 'To sem {crop}... {other}, pode me emprestar?', 'Empresta umas sementes de {crop}, {other}? Devolvo na colheita.'],
    meetLend: ['Claro, {other}! Te dou umas agora.', 'Pega, {other}! A colheita e de quem planta.', 'Toma, {other}. Sucesso com elas!'],
    meetNoSeeds: ['Sem sementes por enquanto... vou ajudar no resto.', 'Hoje trabalho na aracao e na agua.'],
    meetClose: ['Combinado. Ao trabalho!', 'Entao e isso. Cada um pro seu canto!', 'Boa equipe. Vamos fazer acontecer!', 'Reuniao encerrada. Bom trabalho a todos!'],
    bar: ['Uma gelada, por favor!', 'Esse churrasco ta um espetaculo.', 'Brindes, companheiros!', 'Essa musica e boa demais.', 'Depois de um dia desses, eu mereco.', 'Quem traz a terceira rodada?', 'O porco do churrasco era o Juca... coitado.', 'Saude e boa colheita!', 'Amanha eu rendo o dobro, palavra.', 'Esse bar foi a melhor compra da fazenda.', 'Musica boa, cerveja fria e amigos.', 'O churrasco ficou no ponto, chefia!'],
    fish: ['Hoje e domingo, dia de pescar!', 'O peixe de hoje sai do lago.', 'A vara ta dançando...', 'Esse lago so tem peixe grande.', 'Domingo a enxada descansa.', 'Quem pesca no domingo, come na segunda.', 'Paciencia e a ferramenta do pescador.', 'Domingo sem plantio, so pesca e descanso.']
  },
  'en-US': {
    idle: ['Nice day at {farm}.', 'Anyone seen my hat?', 'What a peaceful silence...', 'Good sun for planting today.', 'I love the morning soil smell.', 'That fence needs a touch-up.', 'The well never ran dry. Bless it.', 'So many birds today.', 'My jaw hurts from talking.', 'Finally a little rest.', 'The {farm} looks great this year.', 'I should have brought water.', 'The bees were angry back there.', 'These new boots pinch.', 'How long have we worked here?'],
    work: ['This soil is good stuff.', 'Another workday at {farm}.', 'Till, plant, water... repeat.', 'The land rewards care.', 'This hoe is my best friend.', 'No rush, the day is long.', 'Tilled soil doubles yield, you know?', 'Well done needs no redo.', 'Today I triple my output, watch me.', "It's not force, it's technique.", 'Wheat even grows on compliments here.', 'My favorite spot at {farm}.', 'Plant and the {farm} grows.', 'Caring for soil is like raising kids.', "Doesn't feel like work when harvest comes."],
    chestEmpty: ['My chest is empty... need seeds.', 'No seeds, no harvest.', 'Empty chest, heavy heart.', 'I need to borrow some seeds.', 'Where is my seed stock?', 'An empty chest plants nothing.', "I'll ask for a loan at the meeting.", 'Anyone with spare seeds, call me.'],
    tired: ['Ouch, my back...', 'Could use a coffee now.', 'Not much left in me today...', 'My feet are begging for a break.', 'Nap time almost.', 'Age does not forgive.', 'Bad sleep last night charged me.', 'Just one more bed and I stop.', 'Good tired, from honest work.', 'Tomorrow I do more, promise.'],
    night: ['Nothing like a real bed.', 'I will wake up early.', 'Goodnight, farm.', 'The rooster wakes me, no alarm needed.', 'I dream of a good harvest.', 'The house is warm at night.', 'Sleeping well is half the job.', 'Productive day today.', 'See you tomorrow, friends.', 'The moon is lovely tonight...'],
    dawn: ['Morning, farm!', 'Did the rooster crow? Time to work!', 'Morning air hits different.', 'Dew on the grass, perfect day.', 'Waking early pays off.', 'First meeting of the day, folks!', 'Sun is up, time to act.', 'Today will be productive, I bet.'],
    harvest: ['A good harvest is money in the pocket.', 'What a beautiful ear of corn!', 'The boss will like this one.', 'I planted it and it grew.', 'Harvesting is the best part.', 'Full basket, happy heart.', 'This will fetch a good price.', 'Record harvest today, I bet.', 'The land repays those who care.', 'One more for the stock!', 'Smell of fresh harvest...', 'Look at the size of this tomato!'],
    animals: ['These animals eat more than me.', "Today's milk is fresh.", 'Careful with the pig, he bites.', 'The hens were pecking my bed.', 'The horse runs too much.', 'Happy cow, good milk.', 'Who let the chickens out?', 'This egg is still warm.', 'The dog chasing the poor thing again.', 'Animals eat better than us.'],
    greet: ['Hi, {other}!', 'Hey, {other}.', "What's up, {other}?", 'Yo, {other}!', 'Good to see you, {other}.', 'All good, {other}?'],
    smalltalk: ['Harvest is looking good, right?', 'Counted the animals today?', 'They say it will rain.', 'The boss is watching us...', 'This {farm} grows every day.', 'Wheat price went up, I heard.', 'Last night I dreamed of a golden field.', 'The neighbor planted corn too.', 'We will need a bigger pen.', 'The lake is full of fish.', 'Did you see the size of that pumpkin?', 'This wind is good for working.'],
    reply: ['True, {other}.', 'So true!', "Don't get me started...", 'Good idea, {other}.', "Let's do it.", 'Fully agree.', "That's what I was thinking!", "Farmer's word."],
    joke: ['Hahaha!', 'Good one, {other}!', 'You are something else, {other}!', 'I laughed so hard.', "I'll tell the boss this one."],
    meetOpen: ['Morning, everyone! Meeting!', "Let's plan the day, folks.", 'Attention, team! Quick meeting.', 'Gather round! Important topic.'],
    meetPlan: ['Today we plant {crop}. We have {n} seeds.', "The plan is {crop}: {n} seeds in the chests.", "Today's focus: {crop} — {n} seeds available.", "Today's priority: {crop}, {n} seeds total."],
    meetHave: ['I have {n} {crop} seeds here.', 'I carry {n} {crop} seeds.', 'I leave {n} {crop} seeds with you.'],
    meetBorrow: ['{other}, lend me {crop} seeds? My chest is empty.', "I'm out of {crop}... {other}, can you lend me some?", 'Lend me some {crop} seeds, {other}? I pay you back at harvest.'],
    meetLend: ['Sure, {other}! Here you go.', 'Take it, {other}! The harvest belongs to whoever plants.', 'Here, {other}. Good luck with them!'],
    meetNoSeeds: ['No seeds for now... I will help with the rest.', "I'll work the tilling and watering today."],
    meetClose: ['Agreed. Back to work!', "That's it. Everyone to their corner!", "Great team. Let's make it happen!", 'Meeting closed. Good work, all!'],
    bar: ['One cold one, please!', 'This barbecue is a masterpiece.', 'Cheers, companions!', 'This song is too good.', 'After a day like this, I deserve it.', 'Who is bringing the third round?', 'The barbecue pig was Juca... poor guy.', 'Health and good harvest!', 'Tomorrow I work double, promise.', 'This bar was the best farm purchase.', 'Good music, cold beer and friends.', 'The barbecue is cooked to perfection, chef!'],
    fish: ['Sunday is fishing day!', 'Today dinner comes from the lake.', 'The rod is bending...', 'This lake has only big fish.', 'Resting day, fishing day.', 'Fish on Sunday, eat on Monday.', 'Patience is the fishing tool.', 'No hoe on Sunday, just peace.']
  }
};

function mindLang() {
  return (game.settings && game.settings.language) === 'en-US' ? 'en-US' : 'pt-BR';
}

function mindLine(pool) {
  const book = MIND_LINES[mindLang()];
  const arr = (book && book[pool]) || MIND_LINES['pt-BR'][pool] || ['...'];
  return arr[Math.floor(Math.random() * arr.length)];
}

function mindFmt(pool, params) {
  let txt = mindLine(pool);
  for (const k in (params || {})) txt = txt.split('{' + k + '}').join(params[k]);
  return txt;
}

const SHIRT_PALETTE = ['#c62828', '#d81b60', '#8e24aa', '#5e35b1', '#1e88e5', '#00897b', '#43a047', '#f4511e', '#6d4c41', '#ad1457', '#ef6c00', '#7cb342'];

/* ---------- Reuniao matinal dos fazendeiros ---------- */
function meetingPoint() {
  const door = houseDoorTile();
  if (door) return door;
  const a = game.ownedArea;
  return { x: a.x0 + 2, y: a.y0 + 2 };
}

/* ---------- Domingo: fazendeiros pescam no lago o dia todo ---------- */
function wanderIdle(f) {
  const cx = Math.floor(f.gx), cy = Math.floor(f.gy);
  const opts = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (farmerWalkable(cx + dx, cy + dy)) opts.push([cx + dx, cy + dy]);
  }
  if (opts.length) {
    const [nx, ny] = opts[Math.floor(Math.random() * opts.length)];
    f.tx = nx + 0.5; f.ty = ny + 0.5;
    f.walking = true;
  } else {
    f.wait = 2;
  }
}

function farmerFishing(f, dt) {
  const lake = lakeBuilding();
  if (!lake) { f.fishing = false; wanderIdle(f); return; }
  let spot = f.fishSpot;
  if (!spot || lakeAt(spot.x, spot.y) || !nearLake(spot.x, spot.y, 1) || !farmerWalkable(spot.x, spot.y)) {
    spot = randomLakeShoreTile();
    if (!spot) { f.fishing = false; wanderIdle(f); return; }
    f.fishSpot = spot;
  }
  if (Math.hypot(spot.x + 0.5 - f.gx, spot.y + 0.5 - f.gy) > 0.9) {
    f.fishing = false;
    f.riding = false;
    f.tx = spot.x + 0.5;
    f.ty = spot.y + 0.5;
    f.walking = true;
    return;
  }
  f.fishing = true;
  if (f.fishT === undefined) f.fishT = 12 + Math.random() * 10;
  f.fishT -= dt;
  if (f.fishT <= 0) {
    f.fishT = 18 + Math.random() * 22;
    const fish = rollFish();
    addCoins(fish.value);
    spawnFloater(f.gx - 0.5, f.gy - 1, fish.icon + ' +' + fish.value + ' \ud83e\ude99', '#4fc3f7');
    playSound('splash');
    if (Math.random() < 0.3) farmerSay(f, mindLine('fish'), 4200);
  } else if (Math.random() < dt * 0.06) {
    spawnFloater(f.gx - 0.5, f.gy - 1, '\ud83c\udfa3', '#90caf9');
  }
}

function farmerChestTotal(f) {
  let n = 0;
  for (const k in (f.chest || {})) n += f.chest[k];
  return n;
}

function startMeetingDiscussion() {
  const farmers = game.farmers.filter(f => !f.inside);
  if (!farmers.length) return;
  const script = [];
  const leader = farmers[Math.floor(Math.random() * farmers.length)];
  const totals = {};
  for (const f of farmers) {
    for (const k in (f.chest || {})) totals[k] = (totals[k] || 0) + f.chest[k];
  }
  const types = Object.keys(totals).filter(k => totals[k] > 0);
  const chosen = types.length ? types[Math.floor(Math.random() * types.length)] : null;
  script.push({ f: leader, text: mindFmt('meetOpen') });
  if (chosen) {
    script.push({ f: leader, text: mindFmt('meetPlan', { crop: t('c_' + chosen), n: totals[chosen] }) });
    const holder = farmers.find(f => f !== leader && (f.chest[chosen] || 0) > 0);
    if (holder) script.push({ f: holder, text: mindFmt('meetHave', { n: holder.chest[chosen], crop: t('c_' + chosen) }) });
  }
  const broke = farmers.find(f => farmerChestTotal(f) === 0);
  if (broke) {
    const rich = farmers.filter(f => f !== broke && farmerChestTotal(f) >= 3)
      .sort((a, b) => farmerChestTotal(b) - farmerChestTotal(a))[0];
    if (rich && chosen && (rich.chest[chosen] || 0) > 0) {
      script.push({ f: broke, text: mindFmt('meetBorrow', { other: rich.name, crop: t('c_' + chosen) }) });
      script.push({ f: rich, text: mindFmt('meetLend', { other: broke.name }) });
      const give = Math.min(3, rich.chest[chosen]);
      rich.chest[chosen] -= give;
      if (rich.chest[chosen] <= 0) delete rich.chest[chosen];
      broke.chest[chosen] = (broke.chest[chosen] || 0) + give;
    } else {
      script.push({ f: broke, text: mindFmt('meetNoSeeds') });
    }
  }
  const closer = farmers[farmers.length - 1];
  if (closer !== leader) script.push({ f: closer, text: mindFmt('meetClose') });
  game.meetingScript = script.map((l, i) => ({ f: l.f, text: l.text, at: 1.2 + i * 2.6 }));
  game.meetingT = 0;
}

function updateMeeting(dt) {
  if (game.meetingDone) return;
  const Hm = gameHour();
  if (Hm < 7.5 || Hm >= 19 || !game.farmers.length) return;
  const point = meetingPoint();
  let allHere = true;
  for (const f of game.farmers) {
    farmerEnsureMind(f);
    if (f.inside) continue;
    const d = Math.hypot(point.x + 0.5 - f.gx, point.y + 0.5 - f.gy);
    if (d > 1.8) {
      allHere = false;
      if (!f.walking) {
        f.riding = false;
        f.tx = point.x + 0.5 + (Math.random() * 1.6 - 0.8);
        f.ty = point.y + 0.5 + (Math.random() * 1.6 - 0.8);
        f.walking = true;
      }
    }
  }
  game.meetingWait = (game.meetingWait || 0) + dt;
  if (allHere || game.meetingWait > 20) {
    game.meetingDone = true;
    game.meetingWait = 0;
    startMeetingDiscussion();
  }
}

function farmerTargetBusy(f, x, y) {
  for (const o of game.farmers) {
    if (o === f || o.inside) continue;
    const sx = o.jobSpot ? o.jobSpot.x : o.gx;
    const sy = o.jobSpot ? o.jobSpot.y : o.gy;
    if (Math.hypot(sx - x, sy - y) < 10) return true;
  }
  return false;
}

function farmerEnsureMind(f) {
  if (f.name) return;
  f.name = f.isPlayer ? (game.playerName || 'Fazendeiro') : FARMER_NAMES[(f.id || 0) % FARMER_NAMES.length];
  const keys = Object.keys(PERSONALITIES);
  f.pers = keys[Math.floor(Math.random() * keys.length)];
  f.mood = (PERSONALITIES[f.pers] || {}).mood || 'feliz';
  f.energy = 70 + Math.random() * 30;
  f.health = 100;
  f.sickT = 0;
  f.friend = {};
  f.thoughtT = 3 + Math.random() * 8;
  f.chatT = 8 + Math.random() * 15;
  f.bubble = null;
  f.thoughtLog = [];
  f.shirt = f.isPlayer ? '#2e7d32' : SHIRT_PALETTE[(f.id || 0) % SHIRT_PALETTE.length];
  f.shirtDark = shadeColor(f.shirt, 0.62);
  f.barTonight = Math.random() < 0.65;
  f.barDone = false;
  f.atBar = false;
  f.barT = 0;
}

function barSpotFor(f, bar) {
  const cands = [];
  for (let x = bar.gx; x < bar.gx + 3; x++) {
    if (inBounds(x, bar.gy + 2) && inOwnedArea(x, bar.gy + 2) && !occupancy[occIndex(x, bar.gy + 2)]) cands.push({ x, y: bar.gy + 2 });
  }
  for (const [x, y] of [[bar.gx - 1, bar.gy + 1], [bar.gx + 3, bar.gy + 1]]) {
    if (inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)]) cands.push({ x, y });
  }
  if (!cands.length) return { x: bar.gx + 1, y: bar.gy + 2 };
  return cands[(f.id || 0) % cands.length];
}

function restaurantSpotFor(f, rest) {
  const cands = [];
  for (let x = rest.gx; x < rest.gx + 2; x++) {
    if (inBounds(x, rest.gy + 2) && inOwnedArea(x, rest.gy + 2) && !occupancy[occIndex(x, rest.gy + 2)]) cands.push({ x, y: rest.gy + 2 });
  }
  for (const [x, y] of [[rest.gx - 1, rest.gy + 1], [rest.gx + 2, rest.gy + 1]]) {
    if (inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)]) cands.push({ x, y });
  }
  if (!cands.length) return { x: rest.gx, y: rest.gy + 2 };
  return cands[(f.id || 0) % cands.length];
}

function farmerSay(f, text, dur) {
  f.bubble = { text, until: performance.now() + (dur || 4200) };
  f.thoughtLog = f.thoughtLog || [];
  f.thoughtLog.unshift(text);
  if (f.thoughtLog.length > 6) f.thoughtLog.length = 6;
}

function farmerThink(f) {
  if (f.atBar) { farmerSay(f, mindLine('bar'), 4200); return; }
  if (f.inside) { farmerSay(f, mindLine('night'), 4200); return; }
  const phase = dayPhase();
  let pool = 'idle';
  if (phase === 'dawn') pool = 'dawn';
  else if ((f.energy || 100) < 25) pool = 'tired';
  else if (phase === 'day' && Object.keys(f.chest || {}).length === 0) pool = 'chestEmpty';
  else if (phase === 'day') pool = 'work';
  else if (phase === 'afternoon') pool = 'harvest';
  farmerSay(f, mindLine(pool).replace('{farm}', game.farmName).replace('{other}', ''), 4200);
}

function farmerChat(a, b) {
  farmerSay(a, mindLine('greet').replace('{other}', b.name), 4500);
  const replyPool = Math.random() < 0.3 ? 'joke' : 'reply';
  farmerSay(b, mindLine(replyPool).replace('{other}', a.name), 4500);
  a.friend = a.friend || {};
  b.friend = b.friend || {};
  a.friend[b.id] = Math.min(100, (a.friend[b.id] || 0) + 2);
  b.friend[a.id] = Math.min(100, (b.friend[a.id] || 0) + 2);
  a.chatT = 20 + Math.random() * 25;
  b.chatT = 20 + Math.random() * 25;
  if ((PERSONALITIES[a.pers] || {}).chat > 0.7) a.mood = 'animado';
  if (a.pers === 'rabugento') a.mood = 'irritado';
}

function farmerWorkCost(f, n) {
  f.energy = Math.max(0, (f.energy || 100) - (n || 2));
  if (f.energy < 25) f.mood = 'cansado';
  else if (f.mood === 'cansado') f.mood = (PERSONALITIES[f.pers] || {}).mood || 'feliz';
}

function farmerWorkMul(f) {
  return (PERSONALITIES[f.pers] || {}).workMul || 1;
}

function farmerWalkable(x, y) {
  return inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)];
}

function farmerFindWaterTarget(f) {
  let best = null, bestD = Infinity;
  let bestFree = null, bestFreeD = Infinity;
  for (const c of game.crops) {
    if (c.watered || cropProgress(c) >= 1) continue;
    const d = Math.hypot(c.gx + 0.5 - f.gx, c.gy + 0.5 - f.gy);
    if (d < bestD) { bestD = d; best = c; }
    if (d < bestFreeD && !farmerTargetBusy(f, c.gx, c.gy)) { bestFreeD = d; bestFree = c; }
  }
  return bestFree || best;
}

function hasHorse() {
  return game.animals.some(a => a.kind === 'horse' && isAdult(a));
}

/* Escolhe o proximo trabalho respeitando a fase do dia e a funcao do fazendeiro. */
function farmerFindJob(f) {
  const role = f.role || 'all';
  const H = gameHour();
  if (H >= 19 || H < 8.5) return null;
  if (role !== 'animal') {
    for (const type of Object.keys(f.chest)) {
      if (f.chest[type] > 0 && farmerFindPlantSpot(f, type)) return { kind: 'plant', type };
    }
    let best = null, bestD = Infinity;
    let bestFree = null, bestFreeD = Infinity;
    for (const c of game.crops) {
      if (cropProgress(c) < 1) continue;
      const d = Math.hypot(c.gx + 0.5 - f.gx, c.gy + 0.5 - f.gy);
      if (d < bestD) { bestD = d; best = c; }
      if (d < bestFreeD && !farmerTargetBusy(f, c.gx, c.gy)) { bestFreeD = d; bestFree = c; }
    }
    best = bestFree || best;
    if (best) return { kind: 'harvest', target: best };
    const dry = farmerFindWaterTarget(f);
    if (dry) return { kind: 'water', target: dry };
  }
  if (role !== 'plant') {
    let an = null;
    let bestD = Infinity;
    for (const a of game.animals) {
      const ready = pigReady(a) || a.product > 0;
      if (!ready) continue;
      const d = Math.hypot(a.gx - f.gx, a.gy - f.gy);
      if (d < bestD) { bestD = d; an = a; }
    }
    if (an) return { kind: 'animal', target: an };
  }
  return null;
}

function farmerFindPlantSpot(f, type) {
  const a = game.ownedArea;
  const candidates = new Set();
  for (const c of game.crops) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = c.gx + dx, y = c.gy + dy;
      if (inBounds(x, y) && inOwnedArea(x, y) && !occupancy[occIndex(x, y)] && isTilled(x, y)) {
        candidates.add(x + ',' + y);
      }
    }
  }
  let best = null, bestScore = -Infinity;
  for (const key of candidates) {
    const [x, y] = key.split(',').map(Number);
    const d = Math.hypot(x + 0.5 - f.gx, y + 0.5 - f.gy);
    let score = -d;
    if (!farmerTargetBusy(f, x, y)) score += 8;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nb = occupancy[occIndex(x + dx, y + dy)];
      if (nb && nb.isCrop) score += (nb.type === type ? 20 : 5);
    }
    if (score > bestScore) { bestScore = score; best = { x, y }; }
  }
  if (best) return best;
  for (let tries = 0; tries < 60; tries++) {
    const x = a.x0 + Math.floor(Math.random() * (a.x1 - a.x0 + 1));
    const y = a.y0 + Math.floor(Math.random() * (a.y1 - a.y0 + 1));
    if (!occupancy[occIndex(x, y)] && isTilled(x, y)) return { x, y };
  }
  return null;
}

function houseDoorTile() {
  const b = game.buildings.find(x => x.type === 'house');
  if (!b) return null;
  const cands = [[b.gx + 1, b.gy + 3], [b.gx, b.gy + 3], [b.gx + 2, b.gy + 3], [b.gx + 3, b.gy + 1], [b.gx - 1, b.gy + 1]];
  for (const [x, y] of cands) {
    if (farmerWalkable(x, y)) return { x, y };
  }
  return { x: b.gx + 1, y: b.gy + 3 };
}

function updateFarmers(dt) {
  if (game.intro) return;
  updateMeeting(dt);
  if (game.meetingScript && game.meetingScript.length) {
    game.meetingT += dt;
    while (game.meetingScript.length && game.meetingT >= game.meetingScript[0].at) {
      const line = game.meetingScript.shift();
      farmerSay(line.f, line.text, 5000);
    }
  }
  for (const f of game.farmers) {
    f.phase += dt;
    farmerEnsureMind(f);
    if (!isSunday()) f.fishing = false;

    f.thoughtT -= dt;
    if (f.thoughtT <= 0) {
      f.thoughtT = 14 + Math.random() * 18;
      if (!f.bubble || performance.now() > f.bubble.until) farmerThink(f);
    }
    f.chatT -= dt;
    if (f.chatT <= 0) {
      f.chatT = 12 + Math.random() * 20;
      if (!f.walking && !f.inside) {
        for (const o of game.farmers) {
          if (o === f || o.inside || o.walking) continue;
          if (Math.hypot(o.gx - f.gx, o.gy - f.gy) < 1.8) { farmerChat(f, o); break; }
        }
      }
    }

    if (f.health === undefined) { f.health = 100; f.sickT = 0; }
    if (f.sickT > 0) {
      f.sickT -= dt;
      f.health = Math.min(100, f.health + 6 * dt);
      f.mood = 'doente';
      if (f.sickT <= 0) {
        f.sickT = 0; f.health = 100; f.mood = 'feliz';
        farmerSay(f, t('farm.th.cured'), 4200);
      } else {
        const home = meetingPoint();
        if (!f.walking && Math.hypot(home.x + 0.5 - f.gx, home.y + 0.5 - f.gy) > 0.9) {
          f.riding = false;
          f.tx = home.x + 0.5; f.ty = home.y + 0.5;
          f.walking = true;
        } else if (!f.walking && Math.random() < dt * 0.25) {
          farmerSay(f, t('farm.th.rest'), 4200);
        }
      }
      continue;
    }
    if (Math.random() < dt * 0.0008) {
      const Hs = gameHour();
      if (Hs >= 8.5 && Hs < 19) {
        f.sickT = 70 + Math.random() * 50;
        f.health = 35 + Math.random() * 20;
        f.mood = 'doente';
        farmerSay(f, t('farm.th.sick'), 5000);
      }
    }

    if (f.inside) {
      const Hw = gameHour();
      if (Hw >= 7.5 && Hw < 19) {
        f.inside = false;
        f.wait = 0.5;
        f.barTonight = Math.random() < 0.65;
        f.barDone = false;
        f.atBar = false;
        f.barT = 0;
      }
      else {
        f.energy = Math.min(100, (f.energy || 60) + 40 * dt);
        f.mood = (PERSONALITIES[f.pers] || {}).mood || 'feliz';
        if (f.bubble && performance.now() > f.bubble.until) f.bubble = null;
      }
      continue;
    }

    if (f.walking) {
      const dx = f.tx - f.gx, dy = f.ty - f.gy;
      const sdx = dx - dy, sdy = (dx + dy) * 0.5;
      if (sdx * sdx + sdy * sdy > 1e-6) {
        f.face = lerpAngle(f.face || 0, Math.atan2(sdy, sdx), Math.min(1, dt * 6));
        const fx = Math.cos(f.face);
        if (Math.abs(fx) >= 0.15) f.lastDir = fx >= 0 ? 1 : -1;
      }
      const dist = Math.hypot(dx, dy);
      const step = FARMER_SPEED * farmerWorkMul(f) * (f.riding ? 2.5 : 1) * dt;
      if (dist <= step) {
        f.gx = f.tx; f.gy = f.ty;
        f.walking = false;
        f.wait = 0.3;
      } else {
        f.gx += dx / dist * step;
        f.gy += dy / dist * step;
      }
      continue;
    }

    f.wait -= dt;
    if (f.wait > 0) continue;

    const H = gameHour();

    if (H >= 12 && H < 13) {
      const rest = game.buildings.find(b => b.type === 'restaurant');
      if (rest) {
        const spot = restaurantSpotFor(f, rest);
        if (Math.hypot(spot.x + 0.5 - f.gx, spot.y + 0.5 - f.gy) < 0.7) {
          f.walking = false;
          f.riding = false;
          f.energy = Math.min(100, (f.energy || 60) + 28 * dt);
          f.wait = 0.5;
          if (Math.random() < dt * 0.2) spawnFloater(spot.x, spot.y, '\uD83C\uDF7D', '#ffcc80');
        } else {
          f.riding = false;
          f.tx = spot.x + 0.5;
          f.ty = spot.y + 0.5;
          f.walking = true;
        }
      }
      continue;
    }

    if (!game.meetingDone && H >= 7.5 && H < 19) continue;

    if (H >= 19 || H < 7.5) {
      const bar = game.buildings.find(b => b.type === 'bar');
      if (bar && f.barTonight && !f.barDone && (H >= 19 || H < 3)) {
        f.atBar = true;
        const spot = barSpotFor(f, bar);
        if (Math.hypot(spot.x + 0.5 - f.gx, spot.y + 0.5 - f.gy) < 0.7) {
          f.walking = false;
          f.riding = false;
          f.energy = Math.min(100, (f.energy || 60) + 22 * dt);
          f.wait = 0.5;
          f.barT = (f.barT || 0) + dt;
          if (Math.random() < dt * 0.25) farmerSay(f, mindLine('bar'), 4500);
          if (f.barT > 40 || (H >= 3 && H < 19)) f.barDone = true;
        } else {
          f.riding = false;
          f.tx = spot.x + 0.5;
          f.ty = spot.y + 0.5;
          f.walking = true;
        }
        continue;
      }
      const door = houseDoorTile();
      if (door) {
        if (Math.hypot(door.x + 0.5 - f.gx, door.y + 0.5 - f.gy) < 0.9) {
          f.inside = true;
          f.walking = false;
          f.riding = false;
        } else {
          f.riding = false;
          f.tx = door.x + 0.5;
          f.ty = door.y + 0.5;
          f.walking = true;
        }
        continue;
      }
    }
    if (isSunday()) {
      farmerFishing(f, dt);
      continue;
    }
    if (H < 8.5 || H >= 19) continue;
    const job = farmerFindJob(f);

    if (job && job.kind === 'water') {
      const c = job.target;
      if (Math.hypot(c.gx + 0.5 - f.gx, c.gy + 0.5 - f.gy) < 0.9) {
        if (waterCrop(c)) { spawnFloater(c.gx, c.gy, '💧', '#4fc3f7'); farmerWorkCost(f); }
        f.wait = 0.4;
      } else {
        f.riding = false;
        f.tx = c.gx + 0.5; f.ty = c.gy + 0.5;
        f.walking = true;
      }
      continue;
    }

    if (job && job.kind === 'harvest') {
      const c = job.target;
      if (Math.hypot(c.gx + 0.5 - f.gx, c.gy + 0.5 - f.gy) < 0.9) {
        const r = harvestCrop(c);
        if (r) {
          const val = r.def.sell;
          addCoins(val);
          spawnFloater(c.gx, c.gy, '+' + val + ' 🪙', '#ffd54f');
          farmerWorkCost(f);
        }
        f.riding = false;
        f.wait = 0.4;
      } else {
        f.riding = hasHorse() && Math.hypot(c.gx + 0.5 - f.gx, c.gy + 0.5 - f.gy) > 5;
        f.tx = c.gx + 0.5; f.ty = c.gy + 0.5;
        f.walking = true;
      }
      continue;
    }

    if (job && job.kind === 'animal') {
      const a = job.target;
      if (Math.hypot(a.gx - f.gx, a.gy - f.gy) < 1.4) {
        if (collectAnimal(a)) farmerWorkCost(f);
        f.wait = 0.5;
      } else {
        f.riding = false;
        f.tx = a.gx; f.ty = a.gy;
        f.walking = true;
      }
      continue;
    }

    if (job && job.kind === 'plant') {
      let spot = f.jobSpot;
      if (!spot || occupancy[occIndex(spot.x, spot.y)]) {
        spot = farmerFindPlantSpot(f, job.type);
        if (!spot) { f.wait = 2; continue; }
        f.jobSpot = spot;
        f.jobType = job.type;
      }
      if (Math.hypot(spot.x + 0.5 - f.gx, spot.y + 0.5 - f.gy) < 0.9) {
        const crop = plantCrop(job.type, spot.x, spot.y, true);
        f.jobSpot = null;
        if (crop) {
          f.chest[job.type]--;
          if (f.chest[job.type] <= 0) delete f.chest[job.type];
          waterCrop(crop);
          spawnFloater(spot.x, spot.y, '🌱', '#aed581');
          farmerWorkCost(f);
        }
        f.wait = 0.5;
      } else {
        f.riding = false;
        f.tx = spot.x + 0.5; f.ty = spot.y + 0.5;
        f.walking = true;
      }
      continue;
    }

    const cx = Math.floor(f.gx), cy = Math.floor(f.gy);
    const opts = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (farmerWalkable(cx + dx, cy + dy)) opts.push([cx + dx, cy + dy]);
    }
    if (opts.length) {
      const [nx, ny] = opts[Math.floor(Math.random() * opts.length)];
      f.tx = nx + 0.5; f.ty = ny + 0.5;
      f.walking = true;
    } else {
      f.wait = 2;
    }
  }
}

function drawFarmer(ctx, cam, cw, ch, f) {
  const p = projectPoint(f.gx, f.gy, 0);
  const s = worldToScreen(cam, p.x, p.y, cw, ch);
  const z = cam.zoom;
  const bob = f.walking ? Math.abs(Math.sin(f.phase * 8)) * 2.5 * z : Math.sin(f.phase * 2) * 0.6 * z;
  const legSwing = f.walking ? Math.sin(f.phase * 8) * 3 : 0;
  const armSwing = f.walking ? Math.sin(f.phase * 8 + Math.PI) * 2 : 0;
  const face = f.face || 0;
  const fx = Math.cos(face);
  const flip = Math.abs(fx) < 0.15 ? (f.lastDir || 1) : (fx >= 0 ? 1 : -1);
  const squash = Math.max(0.5, Math.abs(fx));

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(z * flip * squash, z);

  ctx.fillStyle = 'rgba(20,40,10,' + (0.2 * (0.35 + 0.65 * dayLight())).toFixed(3) + ')';
  ctx.beginPath();
  ctx.ellipse(0, 1, f.riding ? 17 : 8, f.riding ? 7 : 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (f.riding) {
    drawHorseBody(ctx, bob, 1, f.walking, f.phase);
    ctx.translate(0, -13);
  }

  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-2.5, -8); ctx.lineTo(-2.5 + legSwing, 0);
  ctx.moveTo(2.5, -8); ctx.lineTo(2.5 - legSwing, 0);
  ctx.stroke();

  ctx.fillStyle = '#4e342e';
  ctx.beginPath();
  ctx.ellipse(-2.5 + legSwing, 0.5, 2.2, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(2.5 - legSwing, 0.5, 2.2, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = f.shirt || '#c62828';
  ctx.beginPath();
  ctx.rect(-5, -18 + bob * 0.4, 10, 11);
  ctx.fill();

  ctx.fillStyle = f.shirtDark || '#8e0000';
  ctx.fillRect(-5, -12 + bob * 0.4, 10, 2);

  ctx.strokeStyle = f.shirtDark || '#8e0000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -16 + bob * 0.4); ctx.lineTo(-8, -11 + armSwing + bob * 0.4);
  ctx.moveTo(5, -16 + bob * 0.4); ctx.lineTo(8, -11 - armSwing + bob * 0.4);
  ctx.stroke();
  ctx.strokeStyle = '#ffcc80';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-8, -12 + armSwing + bob * 0.4); ctx.lineTo(-8.5, -10 + armSwing + bob * 0.4);
  ctx.moveTo(8, -12 - armSwing + bob * 0.4); ctx.lineTo(8.5, -10 - armSwing + bob * 0.4);
  ctx.stroke();

  ctx.fillStyle = '#ffcc80';
  ctx.beginPath();
  ctx.arc(0, -22 + bob * 0.4, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.arc(1.5 - 1.2, -23.5 + bob * 0.4, 0.8, 0, Math.PI * 2);
  ctx.arc(1.5 + 1.2, -23.5 + bob * 0.4, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#a1887f';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(2, -21.6 + bob * 0.4, 1.6, 0.25, Math.PI - 0.25);
  ctx.stroke();

  ctx.fillStyle = '#e6c465';
  ctx.beginPath();
  ctx.ellipse(0, -24.5 + bob * 0.4, 7, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.ellipse(0, -25.8 + bob * 0.4, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
