/* ================= FAZENDA 3D — INTERFACE (DOM) =================
   HUD, painéis, modais, toasts, sons, música e i18n. */

const uiDirty = { coins: true, gems: true, xp: true };

const $ = id => document.getElementById(id);

/* ---------- Internacionalização ---------- */
const I18N = {
  'pt-BR': {
    'menu.missions': 'Missões', 'menu.shop': 'Loja',
    'menu.achievements': 'Conquistas', 'menu.friends': 'Amigos',
    'build.build': 'Construir', 'build.move': 'Mover', 'build.remove': 'Remover',
    'build.rotate': 'Girar', 'build.buy': 'Comprar',
    'build.plant': 'Plantar', 'build.water': 'Regar',
    'modal.shop': '🏪 Loja da Fazenda', 'modal.missions': '📋 Missões',
    'modal.achievements': '🏆 Conquistas', 'modal.friends': '👥 Amigos',
    'modal.settings': '⚙️ Configurações', 'modal.buy': '🛒 Comprar',
    'modal.coins': '🪙 Loja de Moedas', 'modal.gems': '💎 Loja de Diamantes',
    'settings.sound': '🔊 Som', 'settings.music': '🎵 Música',
    'settings.quality': '✨ Qualidade gráfica', 'settings.language': '🌐 Idioma',
    'settings.saveNow': '💾 Salvar progresso agora',
    'settings.reset': '🗑️ Reiniciar fazenda (apaga tudo)',
    'settings.resetConfirm': 'Tem certeza? Todo o progresso será PERDIDO para sempre.',
    'q.baixa': 'baixa', 'q.média': 'média', 'q.alta': 'alta',
    'cat.construcoes': 'Construções', 'cat.decoracoes': 'Decorações',
    'cat.cercas': 'Cercas', 'cat.arvores': 'Árvores',
    'cat.animais': 'Animais', 'cat.natureza': 'Natureza',
    'shop.select': 'Selecionar', 'shop.noCoins': 'Sem moedas 🪙',
    'shop.locked': '🔒 Requer nível {n}', 'shop.expansion': 'Expansão de Terreno',
    'shop.expansionDesc': '+2 tiles em toda a borda da fazenda',
    'shop.buyExpansion': 'Comprar expansão', 'shop.unavailable': 'Indisponível',
    'shop.hint': 'Para construir estruturas, use o botão 🪧 Construir ou a 🏪 Loja.',
    'confirm.build': '{icon} {name} — 🪙 {price}',
    'confirm.move': '✥ Mover para esta posição (grátis)',
    'confirm.rotate': '🔄 Girar 90°?',
    'dialog.cancel': 'Cancelar', 'dialog.ok': 'Confirmar',
    'dialog.removeText': 'Remover {icon} {name}? Você receberá 🪙 {refund} de volta.',
    'coinshop.body': 'A loja de moedas com compras reais será integrada na fase de monetização. Por enquanto, ganhe moedas vendendo produtos e concluindo missões!',
    'coinshop.daily': '🎁 Receber 100 moedas de boas-vindas (1x por dia)',
    'gemshop.body': 'Diamantes são a moeda premium: aceleram construções e produções e desbloqueiam itens especiais. A loja de compra será integrada na fase de monetização.',
    'friends.placeholder': '👥 O sistema de amigos (visitar fazendas, trocar presentes e produtos) será ativado na fase multiplayer. Sua fazenda está pronta para recebê-los!',
    'toast.welcome': '🌾 Bem-vindo! Use 🌱 Plantar para semear sua primeira colheita.',
    'toast.plantHint': '🌱 Escolha uma semente e toque no terreno para plantar.',
    'toast.waterHint': '💧 Toque em uma plantação para regar (cresce mais rápido).',
    'toast.planted': '{icon} {name} plantado!',
    'toast.harvested': '{icon} Colhido! +🪙 {c} +{x} XP',
    'toast.watered': '💧 Regado! Crescimento acelerado.',
    'toast.alreadyWatered': 'Essa plantação já foi regada.',
    'toast.notReady': '⏳ Ainda crescendo: {p}%',
    'toast.tileBusy': 'Esse tile já está ocupado.',
    'toast.cropNoMove': 'Plantações não podem ser movidas. Use ✖ Remover para arrancar.',
    'dialog.removeCropText': 'Arrancar {icon} {name}? Você receberá 🪙 {refund} de volta.',
    'toast.buildHint': '{icon} Escolha o local e clique para confirmar (R gira · Esc cancela)',
    'toast.invalid': '🚫 Local inválido! Escolha uma área livre dentro do terreno.',
    'toast.noCoins': '🪙 Moedas insuficientes!',
    'toast.built': '{icon} {name} construído!',
    'toast.moved': '✥ Construção movida!',
    'toast.rotated': '🔄 Construção girada!',
    'toast.rotateNoSpace': '🚫 Sem espaço para girar aqui.',
    'toast.removed': '🗑️ Removido! +🪙 {refund}',
    'toast.removeHint': 'Clique em uma construção para removê-la.',
    'toast.moveHint': '✥ Clique em uma construção e depois no novo local.',
    'toast.moveSelect': 'Agora clique no novo local (R gira · Esc cancela).',
    'toast.rotateHint': '🔄 Clique em uma construção para visualizar a rotação.',
    'toast.noRotate': 'Esta construção não precisa girar.',
    'toast.clickBuilding': 'Clique em uma construção para mover.',
    'toast.missionDone': '📋 Missão concluída! +{c} 🪙 +{x} XP',
    'toast.achievementDone': '🏆 Conquista desbloqueada! +{c} 🪙',
    'toast.levelUp': '⭐ Nível {n} alcançado! Novos itens desbloqueados.',
    'toast.saved': '💾 Progresso salvo!',
    'toast.landExpanded': '🌍 Terreno ampliado! Área agora: {w}×{h}',
    'toast.expandLimit': '🚫 Limite de expansões atingido!',
    'toast.dailyWait': '⏰ Volte amanhã para a recompensa diária!',
    'toast.dailyDone': '🪙 +100 moedas!',
    'toast.highlight': '{icon} {name}',
    'b_house': 'Casa Principal', 'b_house_desc': 'Centro administrativo da fazenda.',
    'b_barn': 'Celeiro', 'b_barn_desc': 'Armazena produtos agrícolas.',
    'b_stable': 'Estábulo', 'b_stable_desc': 'Abriga vacas e produz leite (fase 2).',
    'b_coop': 'Galinheiro', 'b_coop_desc': 'Abriga galinhas e produz ovos (fase 2).',
    'b_well': 'Poço', 'b_well_desc': 'Fornece água para irrigação (fase 2).',
    'b_stall': 'Barraca de Vendas', 'b_stall_desc': 'Ponto de comercialização de produtos (fase 3).',
    'b_fence': 'Cerca', 'b_fence_desc': 'Delimita áreas e currais.',
    'b_tree': 'Árvore', 'b_tree_desc': 'Decoração natural da fazenda.',
    'b_flowers': 'Canteiro de Flores', 'b_flowers_desc': 'Enfeita os caminhos da fazenda.',
    'b_path': 'Trilha de Pedra', 'b_path_desc': 'Caminho decorativo de pedras.',
    'c_wheat': 'Trigo', 'c_corn': 'Milho', 'c_carrot': 'Cenoura',
    'c_tomato': 'Tomate', 'c_pumpkin': 'Abóbora',
    'c_lettuce': 'Alface', 'c_potato': 'Batata', 'c_strawberry': 'Morango',
    'c_grape': 'Uva', 'c_sunflower': 'Girassol',
    'an_chicken': 'Galinha', 'an_chicken_desc': 'Ciscando feliz (põe ovos na fase 3).',
    'an_pig': 'Porco', 'an_pig_desc': 'Adora um banho de lama.',
    'an_cow': 'Vaca', 'an_cow_desc': 'Produz leite (fase 3).',
    'an_horse': 'Cavalo', 'an_horse_desc': 'Os fazendeiros montam nele para colher mais rápido.',
    'phase.dawn': 'Amanhecer', 'phase.day': 'Dia', 'phase.afternoon': 'Tarde', 'phase.night': 'Noite',
    'bld.house': 'Casa da Fazenda', 'bld.barn': 'Celeiro', 'bld.stable': 'Estábulo', 'bld.coop': 'Galinheiro',
    'bld.coins': 'Moedas', 'bld.level': 'Nível', 'bld.total': 'Animais na fazenda', 'bld.farmers': 'Fazendeiros', 'bld.phase': 'Período',
    'bld.count': 'Animais aqui',
    'bld.eggInfo': 'Ovo: 🥚 🪙15 · a cada 40s',
    'bld.milkInfo': 'Leite: 🥛 🪙25 · a cada 60s',
    'bld.baconInfo': 'Bacon: 🥩 🪙300 · a cada 5 min',
    'menu.multiplayer': 'Multiplayer',
    'mp.title': '🌐 Multiplayer',
    'mp.myCode': 'Código da sua fazenda',
    'mp.host': 'Abrir minha fazenda para visitas',
    'mp.stop': 'Fechar minha fazenda',
    'mp.hosting': '✅ Fazenda aberta! Amigos entram com o código.',
    'mp.visit': 'Visitar uma fazenda',
    'mp.visitBtn': 'Visitar',
    'mp.hint': 'A visita vê a fazenda em tempo real (só leitura) e pode presentear com moedas, sementes e animais.',
    'mp.gift': '🎁 Presentear esta fazenda',
    'mp.giftCoins': 'Moedas',
    'mp.giftSeeds': 'Sementes',
    'mp.giftAnimal': 'Animal',
    'mp.giftSend': 'Enviar presente',
    'mp.leave': '🏡 Voltar para minha fazenda',
    'mp.qty': 'Quantidade',
    'toast.giftReceived': '🎁 Presente recebido: {msg}',
    'toast.giftSent': '🎁 Presente enviado',
    'toast.giftFailed': 'O presente não pôde ser entregue.',
    'toast.visiting': '👀 Modo visita — você está na fazenda de outro jogador.',
    'toast.backHome': '🏡 Você voltou para a sua fazenda.',
    'toast.visitingBlock': 'Modo visita: somente leitura.',
    'toast.mpError': 'Multiplayer: {err}',
    'toast.mpCodeCopied': 'Código copiado!',
    'visit.banner': '👀 Visitando: {name}',
    'visit.back': '🏡 Voltar',
    'pers.trabalhador': 'Trabalhador', 'pers.sonhador': 'Sonhador', 'pers.rabugento': 'Rabugento', 'pers.brincalhao': 'Brincalhão', 'pers.sabio': 'Sábio',
    'mood.feliz': 'Feliz', 'mood.animado': 'Animado', 'mood.cansado': 'Cansado', 'mood.irritado': 'Irritado',
    'b_lake': 'Lago', 'b_lake_desc': 'Água viva com vitórias-régias e taboas.',
    'shop.buyAnimal': 'Comprar animal',
    'toast.animalBought': '{icon} {name} chegou à fazenda!',
    'toast.animalLimit': 'Máximo de 100 animais de cada tipo!',
    'build.shovel': 'Pá',
    'shovel.tilled': 'Terra arada',
    'toast.shovelHint': '🪏 Pá ativa: toque no que quiser remover — plantação, construção ou terra arada. A grama volta ao normal.',
    'toast.shoveled': 'Removido: {what} (+🪙{refund})',
    'toast.shovelNothing': 'Nada para remover aqui.', 'build.harvestAll': 'Colher Tudo',
    'build.collectAll': 'Recolher',
    'toast.collectAll': '🥚 {n} coletados e vendidos (+{c} 🪙)',
    'toast.nothingToCollect': 'Nenhum ovo, leite ou porco pronto ainda.',
    'toast.tillHint': '⛏️ Toque no chão para arar (plantio 25% mais rápido)',
    'toast.tilled': '⛏️ Terra arada!',
    'toast.harvestAll': '🧺 {n} plantações colhidas (+{c} 🪙)',
    'toast.noneReady': 'Nada pronto para colher ainda.',
    'cat.ajudantes': 'Ajudantes',
    'menu.farmers': 'Fazendeiros',
    'farmers.title': 'Fazendeiros',
    'farmers.name': 'Fazendeiro {n}',
    'farmers.none': 'Nenhum fazendeiro ainda. Contrate o primeiro por 🪙 {price}!',
    'farmers.roleAll': 'Tudo', 'farmers.roleAllDesc': 'Planta, colhe e cuida dos animais',
    'farmers.rolePlant': 'Plantio', 'farmers.rolePlantDesc': 'Só planta e colhe plantações',
    'farmers.roleAnimal': 'Animais', 'farmers.roleAnimalDesc': 'Só coleta ovos, leite e abate porcos',
    'farmers.chest': 'Baú',
    'farmers.hire': 'Contratar fazendeiro — 🪙 {price}',
    'farmers.roleSet': '{name} agora trabalha com: {role}',
    'build.pen': 'Montar curral', 'build.dog': 'Cachorro',
    'pen.title': 'Curral', 'pen.desc': 'Cerca pronta com porteiro; os animais ficam dentro.',
    'pen.current': 'Curral atual: {n}×{n}',
    'pen.remove': 'Remover curral (reembolso 🪙 {price})',
    'toast.penHint': '🚧 Toque no mapa para montar o curral (verde = ok)',
    'toast.penPlaced': '🚧 Curral {n}×{n} pronto! Use o cachorro para juntar os animais.',
    'toast.penInvalid': '🚧 Não dá para montar aí — área ocupada ou fora da fazenda.',
    'toast.penRemoved': '🚧 Curral removido.',
    'toast.needPen': '🐕 Construa um curral primeiro (botão 🚧).',
    'toast.dogOn': '🐕 O cachorro está juntando os animais no curral!',
    'toast.dogOff': '🐕 O cachorro foi descansar.',
    'toast.noDog': '🐕 Compre um cachorro na loja (aba Ajudantes)!',
    'toast.dogOwned': 'Você já tem um cachorro.',
    'toast.dogBought': '🐕 Cachorro chegou! Toque no botão 🐕 para soltá-lo.',
    'h_dog': 'Cachorro', 'h_dog_desc': 'Solte-o e ele assusta os animais para dentro do curral.',
    'shop.dogOwned': 'Já tem um',
    'h_farmer': 'Fazendeiro', 'h_farmer_desc': 'Planta, rega, colhe e vende sozinho. Encha o baú dele com sementes!',
    'shop.hire': 'Contratar',
    'toast.farmerBought': '🧑‍🌾 Fazendeiro contratado! Toque nele para encher o baú.',
    'chest.title': '🧺 Baú do Fazendeiro',
    'chest.hint': 'Compre sementes para o baú — ele planta, rega, colhe e vende por você.',
    'chest.in': 'no baú: {n}',
    'toast.seedsBought': '{icon} {n}× {name} no baú',
    'toast.collected': '{icon} Coletado e vendido: +{n} 🪙!',
    'toast.animalNotReady': 'Ainda não há produto para coletar.',
    'toast.pigYoung': '🐖 O porco fica pronto para abate aos 5 minutos de vida.',
    'c_coffee': 'Café', 'c_sugarcane': 'Cana',
    'b_tree_pine': 'Pinheiro', 'b_tree_pine_desc': 'Perene e resistente.',
    'b_tree_cherry': 'Cerejeira', 'b_tree_cherry_desc': 'Flores rosas na primavera.'
  },
  'en-US': {
    'menu.missions': 'Missions', 'menu.shop': 'Shop',
    'menu.achievements': 'Achievements', 'menu.friends': 'Friends',
    'build.build': 'Build', 'build.move': 'Move', 'build.remove': 'Remove',
    'build.rotate': 'Rotate', 'build.buy': 'Buy',
    'build.plant': 'Plant', 'build.water': 'Water',
    'modal.shop': '🏪 Farm Shop', 'modal.missions': '📋 Missions',
    'modal.achievements': '🏆 Achievements', 'modal.friends': '👥 Friends',
    'modal.settings': '⚙️ Settings', 'modal.buy': '🛒 Buy',
    'modal.coins': '🪙 Coin Shop', 'modal.gems': '💎 Diamond Shop',
    'settings.sound': '🔊 Sound', 'settings.music': '🎵 Music',
    'settings.quality': '✨ Graphics quality', 'settings.language': '🌐 Language',
    'settings.saveNow': '💾 Save progress now',
    'settings.reset': '🗑️ Reset farm (erases everything)',
    'settings.resetConfirm': 'Are you sure? All progress will be LOST forever.',
    'q.baixa': 'low', 'q.média': 'medium', 'q.alta': 'high',
    'cat.construcoes': 'Buildings', 'cat.decoracoes': 'Decorations',
    'cat.cercas': 'Fences', 'cat.arvores': 'Trees',
    'cat.animais': 'Animals', 'cat.natureza': 'Nature',
    'shop.select': 'Select', 'shop.noCoins': 'Not enough coins 🪙',
    'shop.locked': '🔒 Requires level {n}', 'shop.expansion': 'Land Expansion',
    'shop.expansionDesc': '+2 tiles along the entire farm border',
    'shop.buyExpansion': 'Buy expansion', 'shop.unavailable': 'Unavailable',
    'shop.hint': 'To build structures, use the 🪧 Build button or the 🏪 Shop.',
    'confirm.build': '{icon} {name} — 🪙 {price}',
    'confirm.move': '✥ Move to this spot (free)',
    'confirm.rotate': '🔄 Rotate 90°?',
    'dialog.cancel': 'Cancel', 'dialog.ok': 'Confirm',
    'dialog.removeText': 'Remove {icon} {name}? You will get 🪙 {refund} back.',
    'coinshop.body': 'The real-money coin shop will be integrated in the monetization phase. For now, earn coins by selling products and completing missions!',
    'coinshop.daily': '🎁 Claim 100 welcome coins (once a day)',
    'gemshop.body': 'Diamonds are the premium currency: they speed up construction and production and unlock special items. The purchase shop will be integrated in the monetization phase.',
    'friends.placeholder': '👥 The friends system (visit farms, trade gifts and products) will be enabled in the multiplayer phase. Your farm is ready to receive them!',
    'toast.welcome': '🌾 Welcome! Use 🌱 Plant to sow your first harvest.',
    'toast.plantHint': '🌱 Pick a seed and tap the ground to plant.',
    'toast.waterHint': '💧 Tap a crop to water it (grows faster).',
    'toast.planted': '{icon} {name} planted!',
    'toast.harvested': '{icon} Harvested! +🪙 {c} +{x} XP',
    'toast.watered': '💧 Watered! Growth boosted.',
    'toast.alreadyWatered': 'This crop was already watered.',
    'toast.notReady': '⏳ Still growing: {p}%',
    'toast.tileBusy': 'That tile is already occupied.',
    'toast.cropNoMove': 'Crops cannot be moved. Use ✖ Remove to dig them up.',
    'dialog.removeCropText': 'Dig up {icon} {name}? You will get 🪙 {refund} back.',
    'toast.buildHint': '{icon} Choose a spot and click to confirm (R rotates · Esc cancels)',
    'toast.invalid': '🚫 Invalid spot! Choose a free area inside your land.',
    'toast.noCoins': '🪙 Not enough coins!',
    'toast.built': '{icon} {name} built!',
    'toast.moved': '✥ Building moved!',
    'toast.rotated': '🔄 Building rotated!',
    'toast.rotateNoSpace': '🚫 No room to rotate here.',
    'toast.removed': '🗑️ Removed! +🪙 {refund}',
    'toast.removeHint': 'Click a building to remove it.',
    'toast.moveHint': '✥ Click a building, then the new spot.',
    'toast.moveSelect': 'Now click the new spot (R rotates · Esc cancels).',
    'toast.rotateHint': '🔄 Click a building to preview the rotation.',
    'toast.noRotate': 'This building does not need rotating.',
    'toast.clickBuilding': 'Click a building to move it.',
    'toast.missionDone': '📋 Mission complete! +{c} 🪙 +{x} XP',
    'toast.achievementDone': '🏆 Achievement unlocked! +{c} 🪙',
    'toast.levelUp': '⭐ Level {n} reached! New items unlocked.',
    'toast.saved': '💾 Progress saved!',
    'toast.landExpanded': '🌍 Land expanded! Area is now {w}×{h}',
    'toast.expandLimit': '🚫 Expansion limit reached!',
    'toast.dailyWait': '⏰ Come back tomorrow for the daily reward!',
    'toast.dailyDone': '🪙 +100 coins!',
    'toast.highlight': '{icon} {name}',
    'b_house': 'Main House', 'b_house_desc': 'Administrative center of the farm.',
    'b_barn': 'Barn', 'b_barn_desc': 'Stores agricultural products.',
    'b_stable': 'Stable', 'b_stable_desc': 'Houses cows and produces milk (phase 2).',
    'b_coop': 'Chicken Coop', 'b_coop_desc': 'Houses chickens and produces eggs (phase 2).',
    'b_well': 'Well', 'b_well_desc': 'Provides water for irrigation (phase 2).',
    'b_stall': 'Market Stall', 'b_stall_desc': 'Selling point for products (phase 3).',
    'b_fence': 'Fence', 'b_fence_desc': 'Delimits areas and pens.',
    'b_tree': 'Tree', 'b_tree_desc': 'Natural farm decoration.',
    'b_flowers': 'Flower Bed', 'b_flowers_desc': 'Beautifies the farm paths.',
    'b_path': 'Stone Path', 'b_path_desc': 'Decorative stone walkway.',
    'c_wheat': 'Wheat', 'c_corn': 'Corn', 'c_carrot': 'Carrot',
    'c_tomato': 'Tomato', 'c_pumpkin': 'Pumpkin',
    'c_lettuce': 'Lettuce', 'c_potato': 'Potato', 'c_strawberry': 'Strawberry',
    'c_grape': 'Grape', 'c_sunflower': 'Sunflower',
    'an_chicken': 'Chicken', 'an_chicken_desc': 'Happily pecking (lays eggs in phase 3).',
    'an_pig': 'Pig', 'an_pig_desc': 'Loves a mud bath.',
    'an_cow': 'Cow', 'an_cow_desc': 'Produces milk (phase 3).',
    'an_horse': 'Horse', 'an_horse_desc': 'Farmhands sometimes ride him to harvest faster.',
    'phase.dawn': 'Dawn', 'phase.day': 'Day', 'phase.afternoon': 'Afternoon', 'phase.night': 'Night',
    'bld.house': 'Farmhouse', 'bld.barn': 'Barn', 'bld.stable': 'Stable', 'bld.coop': 'Coop',
    'bld.coins': 'Coins', 'bld.level': 'Level', 'bld.total': 'Animals on farm', 'bld.farmers': 'Farmhands', 'bld.phase': 'Period',
    'bld.count': 'Animals here',
    'bld.eggInfo': 'Egg: 🥚 🪙15 · every 40s',
    'bld.milkInfo': 'Milk: 🥛 🪙25 · every 60s',
    'bld.baconInfo': 'Bacon: 🥩 🪙300 · every 5 min',
    'menu.multiplayer': 'Multiplayer',
    'mp.title': '🌐 Multiplayer',
    'mp.myCode': 'Your farm code',
    'mp.host': 'Open my farm for visits',
    'mp.stop': 'Close my farm',
    'mp.hosting': '✅ Farm open! Friends join with the code.',
    'mp.visit': 'Visit a farm',
    'mp.visitBtn': 'Visit',
    'mp.hint': 'Visitors see the farm in real time (read only) and can gift coins, seeds and animals.',
    'mp.gift': '🎁 Gift this farm',
    'mp.giftCoins': 'Coins',
    'mp.giftSeeds': 'Seeds',
    'mp.giftAnimal': 'Animal',
    'mp.giftSend': 'Send gift',
    'mp.leave': '🏡 Back to my farm',
    'mp.qty': 'Quantity',
    'toast.giftReceived': '🎁 Gift received: {msg}',
    'toast.giftSent': '🎁 Gift sent',
    'toast.giftFailed': 'The gift could not be delivered.',
    'toast.visiting': '👀 Visit mode — you are on another player\'s farm.',
    'toast.backHome': '🏡 You are back at your farm.',
    'toast.visitingBlock': 'Visit mode: read only.',
    'toast.mpError': 'Multiplayer: {err}',
    'toast.mpCodeCopied': 'Code copied!',
    'visit.banner': '👀 Visiting: {name}',
    'visit.back': '🏡 Back',
    'pers.trabalhador': 'Hard worker', 'pers.sonhador': 'Dreamer', 'pers.rabugento': 'Grumpy', 'pers.brincalhao': 'Joker', 'pers.sabio': 'Wise',
    'mood.feliz': 'Happy', 'mood.animado': 'Cheerful', 'mood.cansado': 'Tired', 'mood.irritado': 'Grumpy',
    'b_lake': 'Lake', 'b_lake_desc': 'Living water with lily pads and cattails.',
    'shop.buyAnimal': 'Buy animal',
    'toast.animalLimit': 'Maximum of 100 animals of each kind!',
    'build.shovel': 'Shovel',
    'shovel.tilled': 'Tilled soil',
    'toast.shovelHint': '🪏 Shovel active: tap anything to remove it — crops, buildings or tilled soil. The grass grows back.',
    'toast.shoveled': 'Removed: {what} (+🪙{refund})',
    'toast.shovelNothing': 'Nothing to remove here.', 'build.harvestAll': 'Harvest All',
    'build.collectAll': 'Collect',
    'toast.collectAll': '🥚 {n} collected and sold (+{c} 🪙)',
    'toast.nothingToCollect': 'No eggs, milk or pig ready yet.',
    'toast.tillHint': '⛏️ Tap the ground to till (planting 25% faster)',
    'toast.tilled': '⛏️ Soil tilled!',
    'toast.harvestAll': '🧺 {n} crops harvested (+{c} 🪙)',
    'toast.noneReady': 'Nothing ready to harvest yet.',
    'cat.ajudantes': 'Helpers',
    'menu.farmers': 'Farmhands',
    'farmers.title': 'Farmhands',
    'farmers.name': 'Farmhand {n}',
    'farmers.none': 'No farmhands yet. Hire the first one for 🪙 {price}!',
    'farmers.roleAll': 'Everything', 'farmers.roleAllDesc': 'Plants, harvests and tends animals',
    'farmers.rolePlant': 'Planting', 'farmers.rolePlantDesc': 'Only plants and harvests crops',
    'farmers.roleAnimal': 'Animals', 'farmers.roleAnimalDesc': 'Only collects eggs, milk and slaughters pigs',
    'farmers.chest': 'Chest',
    'farmers.hire': 'Hire farmhand — 🪙 {price}',
    'farmers.roleSet': '{name} now works as: {role}',
    'build.pen': 'Build pen', 'build.dog': 'Dog',
    'pen.title': 'Pen', 'pen.desc': 'Ready-made fence with a gate; animals stay inside.',
    'pen.current': 'Current pen: {n}×{n}',
    'pen.remove': 'Remove pen (refund 🪙 {price})',
    'toast.penHint': '🚧 Tap the map to build the pen (green = ok)',
    'toast.penPlaced': '🚧 {n}×{n} pen ready! Use the dog to gather the animals.',
    'toast.penInvalid': '🚧 Cannot build there — occupied or outside the farm.',
    'toast.penRemoved': '🚧 Pen removed.',
    'toast.needPen': '🐕 Build a pen first (🚧 button).',
    'toast.dogOn': '🐕 The dog is gathering the animals into the pen!',
    'toast.dogOff': '🐕 The dog went to rest.',
    'toast.noDog': '🐕 Buy a dog in the shop (Helpers tab)!',
    'toast.dogOwned': 'You already have a dog.',
    'toast.dogBought': '🐕 Dog arrived! Tap the 🐕 button to release him.',
    'h_dog': 'Dog', 'h_dog_desc': 'Release him and he scares the animals into the pen.',
    'shop.dogOwned': 'Already owned',
    'h_farmer': 'Farmhand', 'h_farmer_desc': 'Plants, waters, harvests and sells on his own. Fill his chest with seeds!',
    'shop.hire': 'Hire',
    'toast.farmerBought': '🧑‍🌾 Farmhand hired! Tap him to fill the chest.',
    'chest.title': '🧺 Farmhand Chest',
    'chest.hint': 'Buy seeds into the chest — he plants, waters, harvests and sells for you.',
    'chest.in': 'in chest: {n}',
    'toast.seedsBought': '{icon} {n}× {name} in chest',
    'toast.collected': '{icon} Collected and sold: +{n} 🪙!',
    'toast.animalNotReady': 'No product to collect yet.',
    'toast.pigYoung': '🐖 Pigs are ready for slaughter after 5 minutes of life.',
    'c_coffee': 'Coffee', 'c_sugarcane': 'Sugarcane',
    'b_tree_pine': 'Pine Tree', 'b_tree_pine_desc': 'Evergreen and hardy.',
    'b_tree_cherry': 'Cherry Tree', 'b_tree_cherry_desc': 'Pink spring blossoms.',
    'toast.animalBought': '{icon} {name} arrived at the farm!',
    'toast.animalLimit': 'Animal limit of 15 reached!'
  }
};

let LANG = 'pt-BR';

function t(key, params) {
  let s = (I18N[LANG] && I18N[LANG][key]) || I18N['pt-BR'][key] || key;
  if (params) for (const k in params) s = s.replaceAll('{' + k + '}', params[k]);
  return s;
}

function applyLang() {
  LANG = game.settings.language || 'pt-BR';
  document.documentElement.lang = LANG;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
}

/* ---------- Sons (WebAudio, sem arquivos externos) ---------- */
let audioCtx = null;

function getAudioCtx() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playSound(kind) {
  if (!game.settings.sound) return;
  try {
    const ac = getAudioCtx();
    const notes = {
      click: [660, 0.05], place: [520, 0.12], remove: [220, 0.15],
      rotate: [440, 0.08], level: [784, 0.2], error: [180, 0.18],
      plant: [392, 0.1], water: [330, 0.12], harvest: [880, 0.16], dig: [180, 0.14]
    };
    const [freq, dur] = notes[kind] || notes.click;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(); osc.stop(ac.currentTime + dur);
  } catch (e) { /* áudio indisponível */ }
}

/* ---------- Música ambiente (gerada, sem arquivos) ---------- */
const MELODY = [523.25, 659.25, 783.99, 659.25, 587.33, 783.99, 880, 783.99,
                659.25, 523.25, 587.33, 659.25, 523.25, 392, 440, 523.25];
const BASS = [130.81, 130.81, 174.61, 174.61, 196, 196, 130.81, 130.81];
let musicTimer = null;
let musicStep = 0;

function musicNote(freq, dur, vol, type) {
  const ac = getAudioCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(vol, ac.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  osc.connect(gain); gain.connect(ac.destination);
  osc.start(); osc.stop(ac.currentTime + dur);
}

function startMusic() {
  if (musicTimer) return;
  try {
    getAudioCtx();
    musicTimer = setInterval(() => {
      if (!game.settings.music) { stopMusic(); return; }
      musicNote(MELODY[musicStep % MELODY.length], 0.9, 0.045, 'triangle');
      if (musicStep % 2 === 0) {
        musicNote(BASS[(musicStep / 2) % BASS.length], 1.8, 0.03, 'sine');
      }
      musicStep++;
    }, 450);
  } catch (e) { /* áudio indisponível */ }
}

function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.classList.add('hidden'), 300);
  }, 2200);
}

/* ---------- HUD ---------- */
let lastDayPhase = null;
let lastClockStr = '';
const PHASE_ICONS = { dawn: '🌅', day: '☀', afternoon: '🌤', night: '🌙' };

function refreshHud() {
  const phase = dayPhase();
  const clock = clockString(game.time);
  if (phase !== lastDayPhase || clock !== lastClockStr) {
    lastDayPhase = phase;
    lastClockStr = clock;
    const chip = $('day-chip');
    if (chip) chip.textContent = PHASE_ICONS[phase] + ' ' + clock;
  }
  const dogBtn = $('btn-dog');
  if (dogBtn) {
    dogBtn.classList.toggle('hidden', !game.dog);
    dogBtn.classList.toggle('active', !!(game.dog && game.dog.active));
  }
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

/* ---------- Painel de gestao dos predios ---------- */
const COIN_ICON = '\u{1FA99}';
function openBuildingPanel(type) {
  openModal(t('bld.' + type), body => {
    const mkRow = (label, value) => {
      const row = document.createElement('div');
      row.className = 'bld-row';
      const l = document.createElement('span');
      l.textContent = label;
      const v = document.createElement('strong');
      v.textContent = value;
      row.appendChild(l);
      row.appendChild(v);
      body.appendChild(row);
    };
    if (type === 'house') {
      const phase = dayPhase();
      mkRow(t('bld.coins'), COIN_ICON + ' ' + game.coins.toLocaleString('pt-BR'));
      mkRow(t('bld.level'), String(game.level));
      mkRow(t('bld.total'), String(game.animals.length));
      mkRow(t('bld.farmers'), String(game.farmers.length));
      mkRow(t('bld.phase'), PHASE_ICONS[phase] + ' ' + t('phase.' + phase));
    } else {
      const kinds = { coop: ['chicken'], stable: ['cow'], barn: ['pig'] }[type];
      let n = 0;
      for (const k of kinds) n += game.animals.filter(a => a.kind === k).length;
      mkRow(t('bld.count'), String(n));
      if (type === 'coop') body.appendChild(mkInfo(t('bld.eggInfo')));
      if (type === 'stable') body.appendChild(mkInfo(t('bld.milkInfo')));
      if (type === 'barn') body.appendChild(mkInfo(t('bld.baconInfo')));
    }
  });
}

function mkInfo(text) {
  const d = document.createElement('div');
  d.className = 'bld-info';
  d.textContent = text;
  return d;
}

/* ---------- Loja ---------- */
let currentShopTab = 'construcoes';

function openShop() {
  openModal(t('modal.shop'), body => {
    const tabs = document.createElement('div');
    tabs.className = 'shop-tabs';
    for (const cat of SHOP_CATEGORIES) {
      const btn = document.createElement('button');
      btn.className = 'shop-tab' + (cat.id === currentShopTab ? ' active' : '');
      btn.textContent = t('cat.' + cat.id);
      btn.onclick = () => { currentShopTab = cat.id; openShop(); };
      tabs.appendChild(btn);
    }
    body.appendChild(tabs);

    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    if (currentShopTab === 'animais') {
      for (const def of Object.values(ANIMALS)) {
        const locked = game.level < def.level;
        const afford = game.coins >= def.price;
        const full = game.animals.filter(a => a.kind === def.id).length >= MAX_PER_KIND;
        const item = document.createElement('div');
        item.className = 'shop-item';
        item.innerHTML = `
          <div class="shop-item-icon">${def.icon}</div>
          <div class="shop-item-name">${t('an_' + def.id)}</div>
          <div class="shop-item-desc" style="font-size:11px;color:#6d4c41;text-align:center">${t('an_' + def.id + '_desc')}</div>
          <div class="shop-item-price">🪙 ${def.price.toLocaleString('pt-BR')}</div>
          ${locked ? `<div class="shop-item-locked">${t('shop.locked', { n: def.level })}</div>` : ''}
        `;
        const buyBtn = document.createElement('button');
        buyBtn.className = 'shop-buy-btn';
        buyBtn.textContent = locked ? t('shop.locked', { n: def.level }) : (!afford ? t('shop.noCoins') : (full ? t('toast.animalLimit') : t('shop.buyAnimal')));
        buyBtn.disabled = locked || !afford || full;
        buyBtn.onclick = () => {
          if (buyAnimal(def.id)) {
            showToast(t('toast.animalBought', { icon: def.icon, name: t('an_' + def.id) }));
            refreshHud();
            openShop();
          }
        };
        item.appendChild(buyBtn);
        grid.appendChild(item);
      }
      body.appendChild(grid);
      return;
    }
    if (currentShopTab === 'ajudantes') {
      for (const def of Object.values(HELPERS)) {
        const locked = game.level < def.level;
        const price = def.id === 'farmer' ? farmerPrice() : def.price;
        const owned = def.id === 'dog' && game.dog;
        const afford = game.coins >= price;
        const item = document.createElement('div');
        item.className = 'shop-item';
        item.innerHTML = `
          <div class="shop-item-icon">${def.icon}</div>
          <div class="shop-item-name">${t('h_' + def.id)}</div>
          <div class="shop-item-desc" style="font-size:11px;color:#6d4c41;text-align:center">${t('h_' + def.id + '_desc')}</div>
          <div class="shop-item-price">🪙 ${price.toLocaleString('pt-BR')}</div>
          ${locked ? `<div class="shop-item-locked">${t('shop.locked', { n: def.level })}</div>` : ''}
        `;
        const buyBtn = document.createElement('button');
        buyBtn.className = 'shop-buy-btn';
        const buyLabel = def.id === 'farmer' ? t('shop.hire') : t('shop.buyAnimal');
        buyBtn.textContent = locked ? t('shop.locked', { n: def.level }) : (owned ? t('shop.dogOwned') : (!afford ? t('shop.noCoins') : buyLabel));
        buyBtn.disabled = locked || !afford || owned;
        buyBtn.onclick = () => {
          const ok = def.id === 'farmer' ? buyFarmer() : buyDog();
          if (ok) {
            showToast(def.id === 'farmer' ? t('toast.farmerBought') : t('toast.dogBought'));
            refreshHud();
            openShop();
          }
        };
        item.appendChild(buyBtn);
        grid.appendChild(item);
      }
      body.appendChild(grid);
      return;
    }
    for (const def of Object.values(BUILDINGS)) {
      if (def.category !== currentShopTab) continue;
      const locked = game.level < def.level;
      const afford = game.coins >= def.price;
      const item = document.createElement('div');
      item.className = 'shop-item';
      item.innerHTML = `
        <div class="shop-item-icon">${def.icon}</div>
        <div class="shop-item-name">${t('b_' + def.id)}</div>
        <div class="shop-item-size">${def.w}×${def.d} tiles</div>
        <div class="shop-item-desc" style="font-size:11px;color:#6d4c41;text-align:center">${t('b_' + def.id + '_desc')}</div>
        <div class="shop-item-price">🪙 ${def.price.toLocaleString('pt-BR')}</div>
        ${locked ? `<div class="shop-item-locked">${t('shop.locked', { n: def.level })}</div>` : ''}
      `;
      const buyBtn = document.createElement('button');
      buyBtn.className = 'shop-buy-btn';
      buyBtn.textContent = locked ? t('shop.locked', { n: def.level }) : (!afford ? t('shop.noCoins') : t('shop.select'));
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
  openModal(t('modal.coins'), body => {
    body.innerHTML = `<p style="text-align:center;margin-bottom:12px">${t('coinshop.body')}</p>`;
    const btn = document.createElement('button');
    btn.className = 'settings-btn';
    btn.style.background = 'var(--green)';
    btn.style.color = '#fff';
    btn.textContent = t('coinshop.daily');
    btn.onclick = () => {
      const today = new Date().toDateString();
      const last = localStorage.getItem('fazenda3d_daily');
      if (last === today) { showToast(t('toast.dailyWait')); return; }
      localStorage.setItem('fazenda3d_daily', today);
      addCoins(100);
      playSound('level');
      showToast(t('toast.dailyDone'));
      refreshHud();
    };
    body.appendChild(btn);
  });
}

function openGemShop() {
  openModal(t('modal.gems'), body => {
    body.innerHTML = `<p style="text-align:center">${t('gemshop.body')}</p>`;
  });
}

/* ---------- Baú do fazendeiro ---------- */
function openFarmerChest(farmer) {
  openModal(t('chest.title'), body => {
    body.innerHTML = `<p style="font-size:12px;color:#6d4c41;text-align:center;margin-bottom:10px">${t('chest.hint')}</p>`;
    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    for (const def of Object.values(CROPS)) {
      const n = farmer.chest[def.id] || 0;
      const afford = game.coins >= def.seedCost;
      const item = document.createElement('div');
      item.className = 'shop-item';
      item.innerHTML = `
        <div class="shop-item-icon">${def.icon}</div>
        <div class="shop-item-name">${t('c_' + def.id)}</div>
        <div class="shop-item-price">🪙 ${def.seedCost}</div>
        <div class="shop-item-desc" style="font-size:11px;color:#6d4c41;text-align:center">${t('chest.in', { n })}</div>
      `;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:4px;justify-content:center';
      for (const qty of [1, 10]) {
        const btn = document.createElement('button');
        btn.className = 'shop-buy-btn';
        btn.textContent = '+' + qty;
        btn.disabled = !afford;
        btn.onclick = () => {
          if (depositSeed(farmer, def.id, qty)) {
            showToast(t('toast.seedsBought', { icon: def.icon, n: qty, name: t('c_' + def.id) }));
            refreshHud();
            openFarmerChest(farmer);
          }
        };
        row.appendChild(btn);
      }
      item.appendChild(row);
      grid.appendChild(item);
    }
    body.appendChild(grid);
  });
}

/* ---------- Curral ---------- */
function openPenModal() {
  openModal(t('pen.title'), body => {
    if (game.pen) {
      const info = document.createElement('p');
      info.style.cssText = 'text-align:center;color:#33691e;font-weight:bold;font-size:14px;padding:6px';
      info.textContent = t('pen.current', { n: game.pen.x1 - game.pen.x0 + 1 });
      body.appendChild(info);
      const rm = document.createElement('button');
      rm.className = 'shop-buy-btn';
      rm.style.cssText = 'display:block;margin:8px auto;padding:9px 16px';
      rm.textContent = t('pen.remove', { price: Math.floor((game.pen.paid || 0) / 2) });
      rm.onclick = () => {
        removePen();
        showToast(t('toast.penRemoved'));
        refreshHud();
        closeModal();
      };
      body.appendChild(rm);
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    for (const n of PEN_SIZES) {
      const price = penPrice(n);
      const item = document.createElement('div');
      item.className = 'shop-item';
      item.innerHTML = `
        <div class="shop-item-icon">🚧</div>
        <div class="shop-item-name">${n}×${n}</div>
        <div class="shop-item-desc" style="font-size:11px;color:#6d4c41;text-align:center">${t('pen.desc')}</div>
        <div class="shop-item-price">🪙 ${price.toLocaleString('pt-BR')}</div>
      `;
      const btn = document.createElement('button');
      btn.className = 'shop-buy-btn';
      btn.textContent = game.coins >= price ? t('build.pen') : t('shop.noCoins');
      btn.disabled = game.coins < price;
      btn.onclick = () => {
        state.penSize = n;
        setMode('pen');
        showToast(t('toast.penHint'));
        closeModal();
      };
      item.appendChild(btn);
      grid.appendChild(item);
    }
    body.appendChild(grid);
  });
}

/* ---------- Gerenciador de fazendeiros ---------- */
function openFarmersPanel() {
  openModal(t('farmers.title'), body => {
    if (!game.farmers.length) {
      const empty = document.createElement('p');
      empty.style.cssText = 'text-align:center;color:#6d4c41;font-size:13px;padding:12px';
      empty.textContent = t('farmers.none', { price: farmerPrice() });
      body.appendChild(empty);
    }
    const roles = [
      { id: 'all', label: t('farmers.roleAll'), desc: t('farmers.roleAllDesc') },
      { id: 'plant', label: t('farmers.rolePlant'), desc: t('farmers.rolePlantDesc') },
      { id: 'animal', label: t('farmers.roleAnimal'), desc: t('farmers.roleAnimalDesc') }
    ];
    game.farmers.forEach((f, i) => {
      const seeds = Object.values(f.chest).reduce((s, n) => s + n, 0);
      const card = document.createElement('div');
      card.className = 'farmer-card';
      const head = document.createElement('div');
      head.className = 'farmer-head';
      head.innerHTML = `<span class="farmer-icon">🧑‍🌾</span>` +
        `<span class="farmer-name">${f.name || t('farmers.name', { n: i + 1 })}</span>` +
        `<span class="farmer-seeds">🧺 ${seeds}</span>`;
      card.appendChild(head);
      const mind = document.createElement('div');
      mind.className = 'farmer-mind';
      const lastThought = f.thoughtLog && f.thoughtLog[0] ? ' — “' + f.thoughtLog[0] + '”' : '';
      mind.textContent = (t('pers.' + (f.pers || 'trabalhador'))) + ' · ' + (t('mood.' + (f.mood || 'feliz'))) +
        ' ⚡' + Math.round(f.energy || 100) + lastThought;
      card.appendChild(mind);
      const roleRow = document.createElement('div');
      roleRow.className = 'farmer-roles';
      for (const r of roles) {
        const btn = document.createElement('button');
        btn.className = 'farmer-role-btn' + ((f.role || 'all') === r.id ? ' active' : '');
        btn.textContent = r.label;
        btn.title = r.desc;
        btn.onclick = () => {
          f.role = r.id;
          playSound('click');
          showToast(t('farmers.roleSet', { name: t('farmers.name', { n: i + 1 }), role: r.label }));
          openFarmersPanel();
        };
        roleRow.appendChild(btn);
      }
      card.appendChild(roleRow);
      const actions = document.createElement('div');
      actions.className = 'farmer-actions';
      const chestBtn = document.createElement('button');
      chestBtn.className = 'shop-buy-btn';
      chestBtn.textContent = '🧺 ' + t('farmers.chest');
      chestBtn.onclick = () => openFarmerChest(f);
      actions.appendChild(chestBtn);
      card.appendChild(actions);
      body.appendChild(card);
    });
    if (game.farmers.length) {
      const hire = document.createElement('button');
      hire.className = 'shop-buy-btn';
      hire.style.cssText = 'display:block;margin:10px auto 0;padding:10px 18px;font-size:14px';
      hire.textContent = t('farmers.hire', { price: farmerPrice() });
      hire.onclick = () => {
        if (buyFarmer()) { refreshHud(); openFarmersPanel(); }
      };
      body.appendChild(hire);
    }
  });
}

/* ---------- Missões ---------- */
function openMissions() {
  openModal(t('modal.missions'), body => {
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
  openModal(t('modal.achievements'), body => {
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
  openModal(t('modal.friends'), body => {
    body.innerHTML = `<div class="friends-placeholder">${t('friends.placeholder')}</div>`;
  });
}

/* ---------- Configurações ---------- */
function openSettings() {
  openModal(t('modal.settings'), body => {
    const rows = [
      { label: t('settings.sound'), key: 'sound', type: 'toggle' },
      { label: t('settings.music'), key: 'music', type: 'toggle' },
      { label: t('settings.quality'), key: 'quality', type: 'select',
        options: ['baixa', 'média', 'alta'], translate: true },
      { label: t('settings.language'), key: 'language', type: 'select',
        options: ['pt-BR', 'en-US'], translate: false }
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
        input.onchange = () => {
          game.settings[r.key] = input.checked;
          playSound('click');
          if (r.key === 'music') {
            if (input.checked) startMusic(); else stopMusic();
          }
          saveGame(false);
        };
      } else {
        input = document.createElement('select');
        for (const opt of r.options) {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = r.translate ? t('q.' + opt) : opt;
          if (game.settings[r.key] === opt) o.selected = true;
          input.appendChild(o);
        }
        input.onchange = () => {
          game.settings[r.key] = input.value;
          playSound('click');
          if (r.key === 'language') applyLang();
          saveGame(false);
        };
      }
      row.appendChild(input);
      body.appendChild(row);
    }

    const saveBtn = document.createElement('button');
    saveBtn.className = 'settings-btn';
    saveBtn.style.background = 'var(--blue)';
    saveBtn.style.color = '#fff';
    saveBtn.textContent = t('settings.saveNow');
    saveBtn.onclick = () => { saveGame(true); refreshHud(); };

    const resetBtn = document.createElement('button');
    resetBtn.className = 'settings-btn';
    resetBtn.style.background = 'var(--red)';
    resetBtn.style.color = '#fff';
    resetBtn.textContent = t('settings.reset');
    resetBtn.onclick = () => {
      confirmDialog(t('settings.resetConfirm'), () => resetGame());
    };

    body.appendChild(saveBtn);
    body.appendChild(resetBtn);
  });
}

/* ---------- Comprar (expansão + atalhos) ---------- */
function openBuyMenu() {
  openModal(t('modal.buy'), body => {
    const price = expansionPrice();
    const can = canExpand();
    const afford = game.coins >= price;
    const card = document.createElement('div');
    card.className = 'shop-item';
    card.style.maxWidth = '320px';
    card.style.margin = '0 auto 14px';
    card.innerHTML = `
      <div class="shop-item-icon">🌍</div>
      <div class="shop-item-name">${t('shop.expansion')}</div>
      <div class="shop-item-size">${t('shop.expansionDesc')}</div>
      <div class="shop-item-price">🪙 ${price.toLocaleString('pt-BR')}</div>
      ${can ? '' : `<div class="shop-item-locked">${t('toast.expandLimit')}</div>`}
    `;
    const btn = document.createElement('button');
    btn.className = 'shop-buy-btn';
    btn.textContent = can ? t('shop.buyExpansion') : t('shop.unavailable');
    btn.disabled = !can || !afford;
    btn.onclick = () => { if (buyLand()) { closeModal(); refreshHud(); } };
    card.appendChild(btn);
    body.appendChild(card);

    const hint = document.createElement('p');
    hint.style.cssText = 'text-align:center;font-size:13px;color:#6d4c41';
    hint.textContent = t('shop.hint');
    body.appendChild(hint);
  });
}

/* ---------- Diálogo de confirmação ---------- */
let dialogCallback = null;
function confirmDialog(text, onOk) {
  $('dialog-text').textContent = text;
  $('dialog-ok').textContent = t('dialog.ok');
  $('dialog-cancel').textContent = t('dialog.cancel');
  dialogCallback = onOk;
  $('dialog-overlay').classList.remove('hidden');
  playSound('click');
}

/* ---------- Barra de confirmação flutuante ---------- */
function showConfirmBar(info) {
  $('confirm-info').textContent = info;
  $('confirm-ok').textContent = '✓ ' + t('dialog.ok');
  $('confirm-cancel').textContent = '✕ ' + t('dialog.cancel');
  $('confirm-bar').classList.remove('hidden');
}
function hideConfirmBar() { $('confirm-bar').classList.add('hidden'); }

/* ---------- Barra de sementes (modo plantar) ---------- */
function buildSeedBar() {
  const bar = $('seed-bar');
  bar.innerHTML = '';
  for (const def of Object.values(CROPS)) {
    const locked = game.level < def.level;
    const item = document.createElement('button');
    item.className = 'seed-item' + (def.id === state.selectedSeed ? ' selected' : '') + (locked ? ' locked' : '');
    item.disabled = locked;
    item.innerHTML = `
      <span class="seed-icon">${def.icon}</span>
      <span class="seed-name">${t('c_' + def.id)}</span>
      <span class="seed-info">🪙 ${def.seedCost} · ${def.growTime}s</span>
      ${locked ? `<span class="seed-locked">🔒 ${def.level}</span>` : ''}
    `;
    item.onclick = () => { state.selectedSeed = def.id; buildSeedBar(); playSound('click'); };
    bar.appendChild(item);
  }
  bar.classList.remove('hidden');
}

function hideSeedBar() { $('seed-bar').classList.add('hidden'); }

/* ---------- Ligação dos botões ---------- */
/* ---------- Multiplayer ---------- */
function updateVisitBanner() {
  const banner = $('visit-banner');
  if (!banner) return;
  if (game.visiting) {
    banner.classList.remove('hidden');
    $('visit-label').textContent = t('visit.banner', { name: game.farmName });
  } else {
    banner.classList.add('hidden');
  }
}

function openMultiplayer() {
  openModal(t('mp.title'), body => {
    const code = ensureFarmCode();
    const codeRow = document.createElement('div');
    codeRow.className = 'mp-code-row';
    const codeLbl = document.createElement('div');
    codeLbl.className = 'mp-label';
    codeLbl.textContent = t('mp.myCode');
    const codeBtn = document.createElement('button');
    codeBtn.className = 'mp-code';
    codeBtn.textContent = code;
    codeBtn.onclick = () => {
      if (navigator.clipboard) navigator.clipboard.writeText(code);
      showToast(t('toast.mpCodeCopied'));
    };
    codeRow.appendChild(codeLbl);
    codeRow.appendChild(codeBtn);
    body.appendChild(codeRow);

    const hostBtn = document.createElement('button');
    hostBtn.className = 'mp-big-btn';
    hostBtn.textContent = mpStatus === 'hosting' ? t('mp.stop') : t('mp.host');
    hostBtn.onclick = () => {
      if (mpStatus === 'hosting') { stopHosting(); closeModal(); return; }
      hostBtn.disabled = true;
      hostFarm(err => {
        hostBtn.disabled = false;
        if (err) { showToast(t('toast.mpError', { err: err.message || err.type || 'erro' })); return; }
        openMultiplayer();
      });
    };
    body.appendChild(hostBtn);
    if (mpStatus === 'hosting') {
      const st = document.createElement('div');
      st.className = 'mp-status';
      st.textContent = t('mp.hosting');
      body.appendChild(st);
    }

    const hr = document.createElement('hr');
    hr.className = 'mp-hr';
    body.appendChild(hr);

    if (game.visiting) {
      const leave = document.createElement('button');
      leave.className = 'mp-big-btn mp-danger';
      leave.textContent = t('mp.leave');
      leave.onclick = () => { closeModal(); leaveVisitMode(); };
      body.appendChild(leave);
      const gt = document.createElement('div');
      gt.className = 'mp-label';
      gt.textContent = t('mp.gift');
      body.appendChild(gt);
      buildGiftUi(body);
      return;
    }

    const visitLbl = document.createElement('div');
    visitLbl.className = 'mp-label';
    visitLbl.textContent = t('mp.visit');
    body.appendChild(visitLbl);
    const visitRow = document.createElement('div');
    visitRow.className = 'mp-visit-row';
    const input = document.createElement('input');
    input.className = 'mp-input';
    input.placeholder = 'F3D-AB12';
    input.maxLength = 8;
    const go = document.createElement('button');
    go.className = 'mp-big-btn';
    go.textContent = t('mp.visitBtn');
    go.onclick = () => {
      const code2 = input.value.trim().toUpperCase();
      if (!/^F3D-[A-Z2-9]{4}$/.test(code2)) { showToast(t('toast.mpError', { err: code2 })); return; }
      go.disabled = true;
      visitFarm(code2, err => {
        go.disabled = false;
        if (err) { showToast(t('toast.mpError', { err: err.message || err.type || 'erro' })); return; }
        closeModal();
      });
    };
    visitRow.appendChild(input);
    visitRow.appendChild(go);
    body.appendChild(visitRow);

    const hint = document.createElement('div');
    hint.className = 'mp-status';
    hint.textContent = t('mp.hint');
    body.appendChild(hint);
  });
}

function buildGiftUi(body) {
  const kindRow = document.createElement('div');
  kindRow.className = 'farmer-roles';
  let kind = 'coins';
  for (const k of ['coins', 'seed', 'animal']) {
    const b = document.createElement('button');
    b.className = 'farmer-role-btn' + (k === kind ? ' active' : '');
    b.textContent = t('mp.gift' + (k === 'coins' ? 'Coins' : k === 'seed' ? 'Seeds' : 'Animal'));
    b.onclick = () => { kind = k; buildGiftUiRefresh(body); };
    kindRow.appendChild(b);
  }
  body.appendChild(kindRow);
  buildGiftPicker(body, kind);
}

function buildGiftUiRefresh(body) {
  while (body.lastChild) body.removeChild(body.lastChild);
  buildGiftUi(body);
}

function buildGiftPicker(body, kind) {
  const qtyLbl = document.createElement('div');
  qtyLbl.className = 'mp-label';
  qtyLbl.textContent = t('mp.qty');
  body.appendChild(qtyLbl);
  const qty = document.createElement('input');
  qty.className = 'mp-input';
  qty.type = 'number';
  qty.min = '1';
  qty.value = kind === 'coins' ? '100' : '1';
  body.appendChild(qty);
  let itemId = null;
  if (kind !== 'coins') {
    const sel = document.createElement('select');
    sel.className = 'mp-input';
    const src = kind === 'seed' ? CROPS : ANIMALS;
    for (const id of Object.keys(src)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = (src[id].icon || '') + ' ' + t((kind === 'seed' ? 'c_' : 'an_') + id);
      sel.appendChild(opt);
    }
    itemId = sel.value;
    sel.onchange = () => { itemId = sel.value; };
    body.appendChild(sel);
  }
  const send = document.createElement('button');
  send.className = 'mp-big-btn';
  send.textContent = t('mp.giftSend');
  send.onclick = () => {
    const gift = { kind, id: itemId, n: Math.max(1, Math.floor(Number(qty.value) || 1)) };
    if (!sendGift(gift)) { showToast(t('toast.giftFailed')); return; }
    closeModal();
  };
  body.appendChild(send);
}

function setupWheel(el) {
  if (!el || !el.addEventListener) return;
  let lastTop = 0;
  el.addEventListener('scroll', () => {
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 8) return;
    const down = el.scrollTop > lastTop;
    if (down && el.scrollTop >= max - 2) el.scrollTop = 0;
    else if (!down && el.scrollTop <= 2) el.scrollTop = max;
    lastTop = el.scrollTop;
  }, { passive: true });
}

function bindUi(handlers) {
  $('btn-settings').onclick = openSettings;
  $('btn-add-coins').onclick = openCoinShop;
  $('btn-add-gems').onclick = openGemShop;
  $('btn-build').onclick = () => handlers.build();
  $('btn-shovel').onclick = () => handlers.shovel();
  $('btn-till').onclick = () => handlers.till();
  $('btn-plant').onclick = () => handlers.plant();
  $('btn-water').onclick = () => handlers.water();
  $('btn-harvestall').onclick = () => handlers.harvestAll();
  $('btn-collectall').onclick = () => handlers.collectAll();
  $('btn-pen').onclick = () => handlers.pen();
  $('btn-dog').onclick = () => handlers.dog();
  $('btn-move').onclick = () => handlers.move();
  $('btn-remove').onclick = () => handlers.remove();
  $('btn-rotate').onclick = () => handlers.rotate();
  $('btn-zoom-in').onclick = () => zoomHandlers.zoomIn();
  $('btn-zoom-out').onclick = () => zoomHandlers.zoomOut();
  $('btn-zoom-reset').onclick = () => zoomHandlers.zoomReset();
  $('btn-buy').onclick = openBuyMenu;
  $('btn-leave-visit').onclick = () => { if (mpStatus === 'visiting') leaveVisitMode(); };

  $('btn-collapse-left').onclick = () => {
    document.body.classList.toggle('tools-left-hidden');
    playSound('click');
  };
  $('btn-collapse-right').onclick = () => {
    document.body.classList.toggle('tools-right-hidden');
    playSound('click');
  };

  for (const btn of document.querySelectorAll('.side-btn')) {
    btn.onclick = () => {
      const panel = btn.dataset.panel;
      if (panel === 'missions') openMissions();
      else if (panel === 'shop') openShop();
      else if (panel === 'achievements') openAchievements();
      else if (panel === 'friends') openFriends();
      else if (panel === 'farmers') openFarmersPanel();
      else if (panel === 'multiplayer') openMultiplayer();
    };
  }

  setupWheel($('build-bar'));
  setupWheel($('side-menu'));

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

  // música só pode iniciar após um gesto do usuário (política de autoplay)
  document.addEventListener('pointerdown', () => {
    if (game.settings.music) startMusic();
  }, { once: true });
}
