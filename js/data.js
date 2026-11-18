/* ================= FAZENDA 3D — DADOS DO JOGO =================
   Catálogo de construções, missões e conquistas.
   Cada construção define: id, nome, ícone, preço, tamanho (w×d em tiles),
   nível necessário, categoria e se pode ser girada. */

const BUILDINGS = {
  house: {
    id: 'house', name: 'Casa Principal', icon: '🏠',
    price: 500, w: 3, d: 3, level: 1, category: 'construcoes',
    desc: 'Centro administrativo da fazenda.',
    refund: 0.5
  },
  barn: {
    id: 'barn', name: 'Celeiro', icon: '🏚️',
    price: 400, w: 3, d: 3, level: 1, category: 'construcoes',
    desc: 'Armazena produtos agrícolas.',
    refund: 0.5
  },
  stable: {
    id: 'stable', name: 'Estábulo', icon: '🐴',
    price: 300, w: 2, d: 2, level: 1, category: 'construcoes',
    desc: 'Abriga vacas e produz leite (fase 2).',
    refund: 0.5
  },
  coop: {
    id: 'coop', name: 'Galinheiro', icon: '🐔',
    price: 250, w: 2, d: 2, level: 1, category: 'construcoes',
    desc: 'Abriga galinhas e produz ovos (fase 2).',
    refund: 0.5
  },
  well: {
    id: 'well', name: 'Poço', icon: '🪣',
    price: 150, w: 1, d: 1, level: 1, category: 'construcoes',
    desc: 'Fornece água para irrigação (fase 2).',
    refund: 0.5
  },
  stall: {
    id: 'stall', name: 'Barraca de Vendas', icon: '🎪',
    price: 200, w: 2, d: 1, level: 1, category: 'construcoes',
    desc: 'Ponto de comercialização de produtos (fase 3).',
    refund: 0.5
  },
  fence: {
    id: 'fence', name: 'Cerca', icon: '🚧',
    price: 10, w: 1, d: 1, level: 1, category: 'cercas',
    desc: 'Delimita áreas e currais.',
    refund: 0.5
  },
  tree: {
    id: 'tree', name: 'Árvore', icon: '🌳',
    price: 50, w: 1, d: 1, level: 1, category: 'arvores',
    desc: 'Decoração natural da fazenda.',
    refund: 0.5
  },
  tree_pine: {
    id: 'tree_pine', name: 'Pinheiro', icon: '🌲',
    price: 80, w: 1, d: 1, level: 2, category: 'arvores',
    desc: 'Perene e resistente.',
    refund: 0.5
  },
  tree_cherry: {
    id: 'tree_cherry', name: 'Cerejeira', icon: '🌸',
    price: 120, w: 1, d: 1, level: 3, category: 'arvores',
    desc: 'Flores rosas na primavera.',
    refund: 0.5
  },
  flowers: {
    id: 'flowers', name: 'Canteiro de Flores', icon: '🌷',
    price: 30, w: 1, d: 1, level: 1, category: 'decoracoes',
    desc: 'Enfeita os caminhos da fazenda.',
    refund: 0.5
  },
  path: {
    id: 'path', name: 'Trilha de Pedra', icon: '🪨',
    price: 15, w: 1, d: 1, level: 1, category: 'decoracoes',
    desc: 'Caminho decorativo de pedras.',
    refund: 0.5
  },
  hay: {
    id: 'hay', name: 'Fardo de Feno', icon: '🌾',
    price: 40, w: 1, d: 1, level: 1, category: 'decoracoes',
    desc: 'Fardo dourado para dar clima de fazenda.',
    refund: 0.5
  },
  bench: {
    id: 'bench', name: 'Banco de Jardim', icon: '🪑',
    price: 65, w: 2, d: 1, level: 1, category: 'decoracoes',
    desc: 'Banco de madeira para descansar e admirar a plantaço.',
    refund: 0.5
  },
  signpost: {
    id: 'signpost', name: 'Placa da Fazenda', icon: '🪧',
    price: 45, w: 1, d: 1, level: 1, category: 'decoracoes',
    desc: 'Placa de madeira com o nome da fazenda.',
    refund: 0.5
  },
  lamp: {
    id: 'lamp', name: 'Poste de Luz', icon: '🏮',
    price: 60, w: 1, d: 1, level: 2, category: 'decoracoes',
    desc: 'Ilumina a fazenda quando a noite cai.',
    refund: 0.5
  },
  flowerbed: {
    id: 'flowerbed', name: 'Canteiro Duplo', icon: '💐',
    price: 70, w: 2, d: 1, level: 2, category: 'decoracoes',
    desc: 'Canteiro comprido cheio de flores coloridas.',
    refund: 0.5
  },
  mushroom: {
    id: 'mushroom', name: 'Jardim de Cogumelos', icon: '🍄',
    price: 55, w: 1, d: 1, level: 2, category: 'decoracoes',
    desc: 'Cogumelinhos coloridos que brotam na sombra.',
    refund: 0.5
  },
  scarecrow: {
    id: 'scarecrow', name: 'Espantalho', icon: '🧑‍🌾',
    price: 90, w: 1, d: 1, level: 2, category: 'decoracoes',
    desc: 'Espanta os pássaros e enfeita a plantaço.',
    refund: 0.5
  },
  picnic: {
    id: 'picnic', name: 'Mesa de Piquenique', icon: '🍽',
    price: 110, w: 2, d: 2, level: 3, category: 'decoracoes',
    desc: 'Mesa com bancos para lanches ao ar livre.',
    refund: 0.5
  },
  statue: {
    id: 'statue', name: 'Estátua de Jardim', icon: '🗿',
    price: 140, w: 1, d: 1, level: 3, category: 'decoracoes',
    desc: 'Estátua de pedra para a entrada da fazenda.',
    refund: 0.5
  },
  fountain: {
    id: 'fountain', name: 'Fonte', icon: '⛲',
    price: 420, w: 2, d: 2, level: 4, category: 'decoracoes',
    desc: 'Fonte com água corrente e jatos animados.',
    refund: 0.5
  },
  windmill: {
    id: 'windmill', name: 'Moinho de Vento', icon: '🌀',
    price: 900, w: 3, d: 3, level: 6, category: 'decoracoes',
    desc: 'Moinho clássico com pás girando ao vento.',
    refund: 0.5
  },
  lake: {
    id: 'lake', name: 'Lago', icon: '🏞️',
    price: 1200, w: 7, d: 7, level: 2, category: 'natureza',
    desc: 'Água viva com curvas, vitórias-régias, taboas, sapos e peixes.',
    refund: 0.3
  },
  doghouse: {
    id: 'doghouse', name: 'Casinha do Cachorro', icon: '🛖',
    price: 600, w: 1, d: 1, level: 4, category: 'construcoes',
    desc: 'Quando você desliga o cachorro, ele volta para cá dormir.',
    refund: 0.5
  },
  kitchen: {
    id: 'kitchen', name: 'Cozinha', icon: '🍳',
    price: 3200, w: 2, d: 2, level: 5, category: 'construcoes',
    desc: 'Transforma colheitas em pratos que valem muito mais.',
    refund: 0.5
  },
  bar: {
    id: 'bar', name: 'Bar da Fazenda', icon: '🍺',
    price: 4500, w: 3, d: 2, level: 7, category: 'construcoes',
    desc: 'À noite os fazendeiros vêm tomar uma gelada, comer churrasco e ouvir música.',
    refund: 0.5
  },
  restaurant: {
    id: 'restaurant', name: 'Restaurante', icon: '🍽️',
    price: 250, w: 2, d: 2, level: 3, category: 'construcoes',
    desc: 'Os fazendeiros almçam aqui ao meio-dia: trabalham até as 12:00, almoçam e voltam às 13:00.'
  }
};

/* Catálogo de animais compráveis — passeiam livres pela fazenda. */
const ANIMALS = {
  chicken: {
    id: 'chicken', name: 'Galinha', icon: '🐔',
    price: 150, level: 1, desc: 'Põe ovos a cada 40s (toque para coletar e vender).',
    product: '🥚', cycle: 40, value: 15
  },
  duck: {
    id: 'duck', name: 'Pato', icon: '🦆',
    price: 260, level: 2, desc: 'Nada no lago e põe ovos a cada 55s (toque para coletar).',
    product: '🥚', cycle: 55, value: 20
  },
  pig: {
    id: 'pig', name: 'Porco', icon: '🐖',
    price: 350, level: 2, desc: 'Aos 5 minutos de vida pode ser abatido e vira bacon.',
    bacon: 300
  },
  cow: {
    id: 'cow', name: 'Vaca', icon: '🐄',
    price: 600, level: 3, desc: 'Dá leite a cada 60s (toque para coletar e vender).',
    product: '🥛', cycle: 60, value: 25
  },
  sheep: {
    id: 'sheep', name: 'Ovelha', icon: '🐑',
    price: 550, level: 4, desc: 'Esquila e dá lã a cada 70s; a lã cresce de novo no dia seguinte.',
    product: '🧶', cycle: 70, value: 40
  },
  horse: {
    id: 'horse', name: 'Cavalo', icon: '🐎',
    price: 5000, level: 6, desc: 'Os fazendeiros montam nele para colher mais rápido.'
  }
};

/* Catálogo de culturas: semente (custo), tempo de crescimento (s),
   valor de venda e XP ao colher. Crescimento usa tempo real (funciona offline). */
const CROPS = {
  wheat: {
    id: 'wheat', name: 'Trigo', icon: '🌾',
    seedCost: 10, growTime: 30, sell: 25, xp: 6, level: 1
  },
  corn: {
    id: 'corn', name: 'Milho', icon: '🌽',
    seedCost: 25, growTime: 60, sell: 65, xp: 12, level: 2
  },
  carrot: {
    id: 'carrot', name: 'Cenoura', icon: '🥕',
    seedCost: 45, growTime: 100, sell: 120, xp: 20, level: 3
  },
  tomato: {
    id: 'tomato', name: 'Tomate', icon: '🍅',
    seedCost: 70, growTime: 150, sell: 200, xp: 30, level: 4
  },
  pumpkin: {
    id: 'pumpkin', name: 'Abóbora', icon: '🎃',
    seedCost: 110, growTime: 240, sell: 330, xp: 45, level: 5
  },
  lettuce: {
    id: 'lettuce', name: 'Alface', icon: '🥬',
    seedCost: 15, growTime: 40, sell: 35, xp: 8, level: 1
  },
  potato: {
    id: 'potato', name: 'Batata', icon: '🥔',
    seedCost: 35, growTime: 80, sell: 85, xp: 15, level: 2
  },
  strawberry: {
    id: 'strawberry', name: 'Morango', icon: '🍓',
    seedCost: 90, growTime: 180, sell: 260, xp: 35, level: 4
  },
  grape: {
    id: 'grape', name: 'Uva', icon: '🍇',
    seedCost: 130, growTime: 300, sell: 420, xp: 55, level: 6
  },
  coffee: {
    id: 'coffee', name: 'Café', icon: '☕',
    seedCost: 200, growTime: 420, sell: 600, xp: 90, level: 5
  },
  sugarcane: {
    id: 'sugarcane', name: 'Cana', icon: '🎋',
    seedCost: 60, growTime: 200, sell: 160, xp: 30, level: 3
  },
  sunflower: {
    id: 'sunflower', name: 'Girassol', icon: '🌻',
    seedCost: 160, growTime: 360, sell: 520, xp: 70, level: 7
  }
};

const SHOP_CATEGORIES = [
  { id: 'ferramentas', name: 'Ferramentas' },
  { id: 'construcoes', name: 'Construções' },
  { id: 'animais', name: 'Animais' },
  { id: 'natureza', name: 'Natureza' },
  { id: 'decoracoes', name: 'Decorações' },
  { id: 'cercas', name: 'Cercas' },
  { id: 'arvores', name: 'Árvores' },
  { id: 'ajudantes', name: 'Ajudantes' },
  { id: 'upgrades', name: 'Melhorias' }
];

/* Ajudantes contrataveis (NPCs que trabalham sozinhos). */
const HELPERS = {
  farmer: { id: 'farmer', name: 'Fazendeiro', icon: '🧑‍🌾', price: 2000, level: 4 },
  dog: { id: 'dog', name: 'Cachorro', icon: '🐕', price: 3500, level: 5 }
};

/* Produtos da cozinha — feitos a partir de colheitas, valem mais. */
const PRODUCTS = {
  bread: { id: 'bread', name: 'Pão', icon: '🍞', sell: 90, xp: 12 },
  salad: { id: 'salad', name: 'Salada', icon: '🥗', sell: 210, xp: 26 },
  pie: { id: 'pie', name: 'Torta', icon: '🥧', sell: 480, xp: 60 },
  juice: { id: 'juice', name: 'Suco', icon: '🧃', sell: 380, xp: 45 },
  stew: { id: 'stew', name: 'Ensopado', icon: '🍲', sell: 640, xp: 80 }
};

const RECIPES = [
  { id: 'bread', inputs: { wheat: 3 } },
  { id: 'salad', inputs: { lettuce: 2, tomato: 1 } },
  { id: 'pie', inputs: { wheat: 2, strawberry: 2 } },
  { id: 'juice', inputs: { grape: 1, sugarcane: 1 } },
  { id: 'stew', inputs: { potato: 2, carrot: 2, pumpkin: 1 } }
];

/* Melhorias de ferramentas — radius em tiles (1 = so o tile). */
const UPGRADES = [
  { id: 'water', icon: '🎠', max: 3,
    prices: [0, 2500, 6000],
    names: ['Regador simples', 'Regador Grande (3x3)', 'Irrigação Total (5x5)'] },
  { id: 'till', icon: '⛏', max: 2,
    prices: [0, 1800],
    names: ['Enxada simples', 'Enxada de Aço (3x3)'] }
];

/* Ferramentas compráveis — o jogador começa sem nada. */
const TOOLS = [
  { id: 'hoe', icon: '⛏️', name: 'Enxada', price: 120, level: 1,
    desc: 'Permite arar a terra para plantar.' },
  { id: 'can', icon: '🚿', name: 'Regador', price: 180, level: 2,
    desc: 'Permite regar as plantas para crescerem mais rapido.' },
  { id: 'tractor', icon: '🚜', name: 'Trator Colheitadeira', price: 8000, level: 8,
    desc: 'Colhe as plantacoes prontas sozinho, passando fileira por fileira.' },
  { id: 'rod', icon: '🎣', name: 'Vara de Pescar', price: 400, level: 2,
    desc: 'Permite pescar no lago; os peixes sao vendidos na hora.' },
  { id: 'seeds', icon: '🌱', name: 'Pacote de Sementes', price: 0, level: 1,
    desc: 'Adiciona 2 sementes de cada cultura liberada ao seu estoque.' }
];

/* Curral: tamanhos disponiveis e preco por segmento de cerca. */
const PEN_SIZES = [8, 16, 36];
const PLOT_SIZES = [6, 10, 16];
const PLOT_PRICE_PER_TILE = 8;

/* Peixes do lago — sorteados ao pescar (jogador com a vara e fazendeiros no domingo). */
const FISH = [
  { id: 'lambari', icon: '🐟', value: 8, chance: 0.55 },
  { id: 'tilapia', icon: '🐟', value: 18, chance: 0.28 },
  { id: 'carpa', icon: '🐠', value: 32, chance: 0.13 },
  { id: 'dourado', icon: '🐠', value: 60, chance: 0.04 }
];
const PEN_PRICE_PER_TILE = 15;

/* Missões iniciais — progresso rastreado por contadores do jogo. */
const MISSIONS = [
  { id: 'm_house', title: 'Lar doce lar', desc: 'Construa a Casa Principal.',
    stat: 'built_house', target: 1, rewardCoins: 100, rewardXp: 50 },
  { id: 'm_well', title: 'Água na torneira', desc: 'Construa um Poço.',
    stat: 'built_well', target: 1, rewardCoins: 80, rewardXp: 40 },
  { id: 'm_fence', title: 'Cercando o sítio', desc: 'Posicione 10 Cercas.',
    stat: 'built_fence', target: 10, rewardCoins: 120, rewardXp: 60 },
  { id: 'm_tree', title: 'Pegada verde', desc: 'Plante 3 Árvores.',
    stat: 'built_tree', target: 3, rewardCoins: 90, rewardXp: 45 },
  { id: 'm_any', title: 'Em obras', desc: 'Construa 5 estruturas quaisquer.',
    stat: 'built_any', target: 5, rewardCoins: 150, rewardXp: 75 },
  { id: 'm_land', title: 'Território', desc: 'Compre 1 expansão de terreno.',
    stat: 'land_expansions', target: 1, rewardCoins: 200, rewardXp: 100 },
  { id: 'm_plant', title: 'Primeira horta', desc: 'Plante 5 sementes.',
    stat: 'planted', target: 5, rewardCoins: 100, rewardXp: 50 },
  { id: 'm_harvest', title: 'Primeira colheita', desc: 'Colha 10 plantações.',
    stat: 'harvested', target: 10, rewardCoins: 180, rewardXp: 90 }
];

/* Conquistas de longo prazo. */
const ACHIEVEMENTS = [
  { id: 'a_first', title: 'Primeira construção', desc: 'Construa sua primeira estrutura.',
    stat: 'built_any', target: 1, rewardCoins: 50 },
  { id: 'a_five', title: 'Constructor', desc: 'Construa 5 estruturas.',
    stat: 'built_any', target: 5, rewardCoins: 150 },
  { id: 'a_ten', title: 'Mestre das obras', desc: 'Construa 10 estruturas.',
    stat: 'built_any', target: 10, rewardCoins: 300 },
  { id: 'a_rich', title: 'Cofrinho cheio', desc: 'Acumule 2.000 moedas.',
    stat: 'peak_coins', target: 2000, rewardCoins: 200 },
  { id: 'a_level5', title: 'Fazendeiro experiente', desc: 'Alcance o nível 5.',
    stat: 'level', target: 5, rewardCoins: 250 },
  { id: 'a_expand', title: 'Expansor', desc: 'Compre 2 expansões de terreno.',
    stat: 'land_expansions', target: 2, rewardCoins: 300 },
  { id: 'a_harvest25', title: 'Colheitadeira', desc: 'Colha 25 plantações.',
    stat: 'harvested', target: 25, rewardCoins: 300 },
  { id: 'a_harvest100', title: 'Granjeiro', desc: 'Colha 100 plantações.',
    stat: 'harvested', target: 100, rewardCoins: 800 }
];

/* Expansão de terreno: cada compra adiciona um anel de tiles ao redor da área atual. */
const LAND_EXPANSION = {
  basePrice: 250,
  priceGrowth: 1.45,
  maxExpansions: 12
};

/* XP necessário por nível (nível 1 → 100, cresce 50% por nível). */
function xpForLevel(level) {
  return Math.round(100 * Math.pow(1.5, level - 1));
}
