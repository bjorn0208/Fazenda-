# 🌾 Fazenda 3D — Simulador Isométrico

Jogo de fazenda com câmera isométrica, visual 3D estilizado (cartoon) e economia completa, desenvolvido em HTML5 Canvas puro — sem dependências, roda direto no navegador.

## Como rodar

Basta abrir `index.html` em qualquer navegador (desktop ou celular), ou servir a pasta:

```bash
npx serve .
# ou
python3 -m http.server 8000
```

## Fase 1 — Implementada ✅

### Câmera e controles
- Visão isométrica fixa (sem personagem em 3ª pessoa).
- Arrastar para mover a câmera (mouse e toque).
- Zoom com roda do mouse e pinça de dois dedos.
- Seleção de terrenos e construções por clique/toque.

### Terreno em tiles
- Grade de 30×30 tiles; área inicial possuída de 8×8.
- Tiles fora da propriedade aparecem escurecidos.
- Expansão de terreno pelo botão **Comprar** (+2 tiles em toda a borda, preço crescente).

### Sistema de construção (todos os botões funcionais)
| Botão | Função |
|---|---|
| 🪧 Construir | Abre a loja → prévia fantasma no terreno (verde = válido, vermelho = inválido) → confirmação → desconto em moedas |
| ✥ Mover | Seleciona construção, arrasta para novo local com prévia, bloqueia sobreposição/obstáculos, confirmação — **grátis** |
| ✖ Remover | Confirmação antes de remover, devolve 50% do valor investido |
| 🔄 Girar | Prévia da rotação em 90° antes de confirmar |
| 🛒 Comprar | Expansão de terreno e atalhos |

- Nenhuma construção pode sobrepôr outra (grade de ocupação).
- Atalhos: `R` gira o fantasma, `Enter` confirma, `Esc` cancela.

### Economia e progressão
- Moedas descontadas em toda compra; XP ganho ao construir.
- Níveis com barra de XP e desbloqueio por nível.
- Missões com progresso automático e recompensas.
- Conquistas de longo prazo com recompensas.
- Salvamento automático (a cada 15s) + manual nas configurações (`localStorage`).

### Interface (fiel à referência)
- Perfil com avatar, nome da fazenda, nível e barra de XP (canto superior esquerdo).
- Moedas e diamantes com lojas próprias (superior direito).
- Engrenagem: som, música, qualidade gráfica, idioma, salvar, reiniciar.
- Menu lateral: Missões, Loja, Conquistas, Amigos.
- Barra inferior: Construir, Mover, Remover, Girar, Comprar.
- Sons de interação via WebAudio (sem arquivos externos).

## Fase 2 — Plantio e colheita ✅

### Sistema de culturas
- 5 culturas desbloqueadas por nível: Trigo 🌾 (nv.1), Milho 🌽 (nv.2), Cenoura 🥕 (nv.3), Tomate 🍅 (nv.4) e Abóbora 🎃 (nv.5).
- Modo 🌱 Plantar com barra de sementes (custo, tempo de crescimento e bloqueio por nível visíveis).
- Crescimento em tempo real com 4 estágios visuais (broto → maturação) e barra de progresso sobre o canteiro — funciona offline (usa timestamp).
- 💧 Regar acelera o crescimento em 40% do tempo restante (1x por plantação).
- Colheita com um toque quando pronto (ícone saltitante + anel dourado): moedas + XP com textos flutuantes animados.
- Cada cultura ocupa seu tile — construções não podem ser postas sobre plantações.

### Missões e conquistas novas
- Missões: "Primeira horta" (5 sementes) e "Primeira colheita" (10 colheitas).
- Conquistas: "Colheitadeira" (25) e "Granjeiro" (100 colheitas).

### Polimento visual (revisão 3)
- Mapa ampliado: grid 48×48 e expansões de +3 tiles por compra (até 12 expansões — área máxima 36× a original).
- Animais ambientes: galinhas, vacas e porcos caminham livremente pelos tiles livres, com animação de passos e pausas.
- Terreno rico: variação de tons por tile, manchas de terra, flores silvestres e tufos de grama.
- Céu com nuvens à deriva e fundo em gradiente.
- Casa com chaminé soltando fumaça, fundação de pedra, janelas com moldura e arbustos.
- Celeiro com fardos de feno e catavento girando; poço com balde balançando na corda.
- Árvores em camadas com frutas; cercas que se conectam automaticamente às vizinhas; sombras sob todos os objetos.

## Revisão 4 — Animais, lago e zoom livre ✅

- **Loja de Animais:** galinha 🐔 (🪙150), porco 🐖 (🪙350) e vaca 🐄 (🪙600) — comprados na loja, passeiam livres pela fazenda (limite de 15).
- **10 culturas:** alface 🥬, batata 🥔, morango 🍓, uva 🍇 e girassol 🌻 se juntam às 5 originais.
- **Lago** (3×3, 🪙800): margem de areia, água com ondulação animada, pedras, vitórias-régias e taboas balançando.
- **Zoom livre:** pinça de dois dedos reescrita com eventos touch nativos (mais confiável em celular) e faixa ampliada de 0,35x a 3x.

## Roadmap

- **Fase 2 — Agricultura:** tiles de plantio, culturas (milho, tomate, cenoura, alface, trigo) com estágios de crescimento, irrigação pelo poço, timers.
- **Fase 3 — Animais e produção:** vacas e galinhas com comportamento próprio (caminhar, alimentar, descansar), produção de leite/ovos com timers, coleta.
- **Fase 4 — Comércio:** estoque centralizado (celeiro) com limite, barraca de vendas com preços por mercadoria, ciclo PLANTAR → COLHER → ARMAZENAR → VENDER.
- **Fase 5 — Social e monetização:** amigos, presentes, loja de moedas/diamantes reais.

## Estrutura

```
index.html      — estrutura da UI
css/style.css   — estilos da interface
js/data.js      — catálogo de construções, missões, conquistas
js/iso.js       — projeção isométrica e primitivas de desenho
js/game.js      — estado, grade de ocupação, economia, save/load
js/render.js    — renderização do mundo (terreno, construções, fantasma)
js/ui.js        — HUD, painéis, modais, toasts, sons
js/main.js      — inicialização, entrada (mouse/toque/teclado), loop
```

## Correções e melhorias (revisão 2)

- **Visual:** copas de árvores e flores agora escalam corretamente com o zoom (antes ficavam como pontos quase invisíveis).
- **Celular:** `touch-action: none` no canvas (fim do scroll/zoom acidental da página); pinça de zoom não dispara mais cliques fantasma que colocavam construções por acidente; câmera não "salta" ao voltar de 2 dedos para 1; clique direito não interage mais com o mundo.
- **Girar:** a construção original não é mais desenhada sobreposta ao fantasma de rotação; girar durante o modo Mover agora é aplicado na confirmação (antes a rotação era descartada).
- **Progresso:** salvamento também ao fechar/minimizar a aba (antes era só a cada 15s); configurações mescladas com padrões ao carregar saves antigos; contadores de nível e pico de moedas sincronizados (conquistas de nível/riqueza agora registram corretamente).
- **Sem botões decorativos:** toggle de Música toca uma melodia ambiente gerada via WebAudio; opção de Idioma traduz toda a interface (pt-BR/en-US); áudio retomado corretamente no iOS; configurações são salvas ao alterar.
- **Usabilidade:** loja mostra "Sem moedas" quando não pode comprar; novo clique reposiciona o fantasma durante confirmação; `Esc` fecha modais/diálogos; barra de confirmação responsiva em telas pequenas.

## Testes

```bash
node tests/smoke.js
```

Varredura estática de chamadas indefinidas + simulação completa (render de todas as construções/culturas/estágios, zoom, plantio, rega, colheita, animais, save/load).

## Revisão 5 — Ciclo completo de plantio e fazendeiro automático

- **Arar** (⛏️): novo modo; terra arada dá plantio 25% mais rápido
- **Colher Tudo** (🧺): colhe de uma vez todas as plantações prontas
- **Animais**: sem limite global — até **100 de cada espécie**
- **Nuvens removidas**
- **Novas árvores**: Pinheiro 🌲 e Cerejeira 🌸 (com pétalas caindo)
- **Novas culturas**: Café ☕ e Cana 🎋 (12 no total)
- **Lago 3× maior** (5×5 tiles)
- **Caminhada realista dos animais**: velocidade individual, pastagem (cabeça baixa), virada suave
- **Fazendeiro automático** (🧑‍🌾 na aba Ajudantes): toque nele, encha o **baú** com sementes — ele caminha, planta, rega, colhe e vende sozinho. Preço dobra a cada contratação.

## Revisão 6 — Produção animal e fazendeiro em fileiras

- **Ovos 🥚 e Leite 🥛**: galinha produz a cada 40s (🪙15) e vaca a cada 60s (🪙25); até 3 unidades guardadas. Ícone aparece sobre o animal quando pronto — toque no animal para **coletar e vender** na hora.
- **Porco → Bacon 🥓**: aos **5 minutos de vida** o porco pode ser abatido (ícone 🥓 sobre ele) — abate rende **🪙300**. Porco jovem mostra aviso explicativo.
- **Fazendeiro automático**: além de plantar/regar/colher, agora ele também **coleta ovos, leite e abate porcos** prontos automaticamente.
- **Plantio em fileiras**: o fazendeiro planta **um ao lado do outro** (vizinhos de plantações existentes), preferindo formar **clusters da mesma cultura** em vez de espalhar pelo mapa.
- Testes: coleta de ovo/leite, recusa de abate de porco jovem, abate com 5min, e verificação de que todo plantio do fazendeiro fica adjacente a outra plantação.

## Revisão 7 — Orientação 360°, recolher tudo e HUD nas laterais

- **Rabo corrigido**: rabo da vaca, do porco e da cauda da galinha agora viram junto com o corpo (antes ficavam do lado errado ao virar).
- **Orientação 360°**: animais e fazendeiro agora **viram na direção em que caminham** (qualquer ângulo do mapa), com virada suave — não andam mais sempre de lado.
- **Botão Recolher 🥚**: recolhe e vende de uma vez todos os ovos e leites prontos (e abate porcos de 5 min).
- **HUD reorganizado**: ações (Construir, Arar, Plantar, Regar, Colher Tudo, Recolher, Mover, Remover, Girar, Comprar) ficam na **coluna direita**; menus (Missões, Loja, Conquistas, Amigos) na **coluna esquerda**. Em telefone deitado a barra volta ao rodapé.

## Revisão 8 — Gerenciador de fazendeiros e colunas minimizáveis

- **Botão Fazendeiros 🧑‍🌾** (menu esquerdo): painel para gerenciar todos os fazendeiros — ver sementes do baú, abrir o baú, contratar mais.
- **Funções por fazendeiro**: escolha entre **Tudo** (planta, colhe e cuida dos animais), **Plantio** (só planta e colhe plantações) ou **Animais** (só coleta ovos/leite e abate porcos). Ex.: um fazendeiro só para animais, outro só para plantio.
- **Botões de minimizar ▼**: um em cada canto inferior. Esquerdo recolhe o menu (Missões/Loja/Conquistas/Amigos/Fazendeiros); direito recolhe as ferramentas (ações + zoom). A seta vira para cima quando recolhido — toque de novo e as ferramentas descem.

## Revisão 9 — Dinheiro ao vivo e seres mais realistas

- **Correção importante**: o dinheiro das colheitas (e vendas) do fazendeiro agora aparece **na hora no saldo** — antes ele entrava, mas o HUD só atualizava quando você tocava na tela.
- **Vaca**: orelhas, dois chifres, úbere com tetinhas, cascos escuros, sombra na barriga.
- **Porco**: manchas de lama, cascos, sombra na barriga.
- **Galinha**: asa com penas desenhadas, sombra na barriga.
- **Fazendeiro**: botas, avental de couro, camisa xadrez vermelha com mãos, sorriso.
- **Casa**: porta com ripas de madeira e jardineiras com flores sob as janelas.
- **Celeiro**: paredes com tábuas de madeira.

## Revisão 19 — Mais cachorros, casinha, sapos, cavalos finos, animais comendo grama e o Bar da Fazenda

- **Vários cachorros 🐕**: agora dá para ter até **3 cachorros** — cada um custa o **dobro do anterior** (🪙3500, 🪙7000, 🪙14000). O botão 🐕 liga/desliga todos de uma vez, e cada um corre **2× mais rápido** para juntar os animais.
- **Casinha do cachorro 🛖** (loja → Construções, 🪙600, nível 4): quando você desliga o cachorro, ele volta para a casinha, deita e fica **dormindo com 💤** até ser ativado de novo (ou até a noite, quando volta ao trabalho).
- **Bar da Fazenda 🍺** (loja → Construções, 🪙4500, nível 7): balcão, banquinhas, barris e **pisca-pisca** colorido. À noite, cerca de 2 em cada 3 fazendeiros dão uma passada no bar para **tomar cerveja, comer churrasco e ouvir música** (notas 🎵 flutuando) — recuperam energia com frases novas dessa modalidade e depois vão dormir.
- **Sapos no lago**: 3 sapos saltitam entre as vitórias-régias, com olhos saltados e ondas nos pulinhos.
- **Animais comem grama**: ao pastar, aparecem filetes de grama sendo mordidos na boca de galinhas, vacas, porcos e cavalos.
- **Cavalo 🐎 bem mais bonito**: sela de couro com faixa, crina, brida com redeas, lista branca na testa, cascos escuros e rabo cheio.
- **Mais vagalumes**: o dobro de pontos piscando na noite (26).
- **Ciclo agora dura 10 minutos** (era 5).

## Revisão 18 — Check-up geral: bugs e polimento visual

**Bugs corrigidos:**
- **Jogo novo sem casa e sem poço**: a casa e o poço iniciais eram colocados fora da área possuída e a colocação falhava em silêncio — jogadores novos começavam sem casa (e os fazendeiros nunca dormiam). Agora nascem dentro da área inicial.
- **Presente de sementes cobrava moedas**: receber sementes de presente no multiplayer debitava o valor do seu saldo (e falhava se você estivesse sem dinheiro). Agora o presente entra de graça no baú do fazendeiro.
- **Cavalo invisível**: o fazendeiro montado andava 2,5× mais rápido mas o cavalo não aparecia. Agora o cavalo é desenhado sob ele, com sombra maior.
- **Animais atravessavam cercas**: quando a busca de caminho falhava, o animal ia em linha reta pelo portão atravessando cerca/casa. Agora ele recua um passo para um tile livre e tenta de novo.
- **Guarda de visita se acumulava**: cada tecla pressionada adicionava outra camada de verificação nos botões. Agora é registrada uma única vez.
- **Toque duplo fazia duas coisas**: o zoom de toque duplo também acionava a ação do toque (colhia, arava...). Agora só dá zoom.
- **Modo visita não limpava a UI**: entrar numa fazenda visitada não cancelava o modo ativo (plantar, regar...). Agora reseta tudo.

**Melhorias de luz, sombra e vida:**
- **Céu que acompanha o dia**: azul claro de dia, alaranjado no amanhecer e no fim da tarde, azul-escuro à noite.
- **Sombras realistas**: todas as sombras (prédios, árvores, animais, fazendeiros) encolhem e suavizam quando o sol se põe.
- **Janelas acesas à noite**: as janelas da casa brilham em amarelo quente quando escurece.
- **Vagalumes**: à noite, vaga-lumes piscam e flutuam sobre a grama.
- **Galinha bicando**: ao pastar, a galinha agora move a cabeça de verdade.
- **Energia dos fazendeiros**: trabalhar agora cansa de verdade (arar, regar, colher, plantar, cuidar dos animais) — o humor "cansado" finalmente acontece.
- **Responsividade em paisagem**: os controles de zoom não sobrepõem mais a barra de ferramentas em telas baixas; a câmera é reajustada ao girar o aparelho.

## Revisão 17 — Correções de robustez

- **Porta da casa sempre encontrada**: se plantações ou cercas bloquearem todos os pontos de entrada, os fazendeiros agora usam o tile à frente da porta de qualquer forma — antes eles podiam ficar acordados a noite inteira.
- **Teste da reunião determinístico**: o smoke test agora verifica o empréstimo de sementes no exato momento em que a reunião termina (antes os fazendeiros podiam plantar as sementes emprestadas antes da verificação, derrubando o teste aleatoriamente).

## Revisão 16 — Reunião matinal, 100+ falas e roupas únicas

- **Bolha de fala corrigida**: o texto nunca mais sai fora do balão, em qualquer zoom.
- **Ciclo de 5 minutos**: cada dia completo agora dura 300 segundos.
- **Reunião matinal**: no começo do dia, os fazendeiros se juntam na casa para a primeira reunião — decidem em voz alta o que vão plantar, quantas sementes têm no total e, se o baú de um deles estiver zerado, **pedem emprestado** e as sementes são transferidas de verdade. Depois cada um vai para o seu serviço.
- **Mais de 100 frases novas**: pensamentos e conversas muito mais variados (trabalho, colheita, cansaço, noite, animais, fofocas da fazenda).
- **Roupas únicas**: sem avental — cada fazendeiro veste uma camisa de cor própria, com braços no tom mais escuro.
- **Animais se espalham**: ao amanhecer, depois de soltos pelo cachorro, correm para pontos **aleatórios da fazenda inteira** (não ficam na porta do curral).
- **Fazendeiros não se grudam**: arar, regar e colher agora evitam alvos onde outro fazendeiro já está trabalhando.

## Revisão 15 — HUD sem sobreposição, roleta infinita e pá

- **Zoom e centralização para a esquerda**: os controles de zoom agora ficam no canto inferior esquerdo, livres da coluna de ações.
- **Coluna de ações sem sobrepor o HUD**: no celular em pé, a coluna começa abaixo dos cartões de moedas/dia.
- **Roleta infinita**: arrastar a coluna de ações (e o menu lateral) até o fim continua do começo — rolagem sem fim nos dois sentidos.
- **Pá 🪏** na coluna de ações: toque com a pá ativa para **remover qualquer coisa** — plantação, construção, cerca ou terra arada — e a **grama de baixo volta ao normal**. Devolve parte do valor em moedas.

## Revisão 14 — Fazendeiros vivos: personalidade, pensamento e conversa

- Cada fazendeiro agora tem **nome próprio** (João, Maria, Tião...) e uma **personalidade**: Trabalhador, Sonhador, Rabugento, Brincalhão ou Sábio.
- **Personalidade muda o trabalho**: o Trabalhador anda mais rápido, o Brincalhão conversa mais, o Rabugento reclama...
- **Pensam e falam**: bolhas de fala sobre a cabeça mostram o que estão pensando de acordo com o momento (baú vazio, cansaço, amanhecer, colheita, noite).
- **Conversam entre si**: quando dois fazendeiros se encontram, trocam cumprimentos e papo — e a **amizade entre eles cresce**.
- **Energia e humor**: trabalhar cansa (ficam lentos e tristes); dormir na casa à noite recupera a energia e melhora o humor.
- O painel de Fazendeiros mostra nome, personalidade, humor, energia e o **último pensamento** de cada um.

## Revisão 13 — Multiplayer: salas por código, visitas e presentes

- **Botão 🌐 Multiplayer** no menu lateral: cada fazenda tem um **código único** (ex.: F3D-AB12). Toque nele para copiar.
- **Abrir minha fazenda**: sua fazenda vira uma sala — amigos entram com o código e veem tudo em tempo real.
- **Visitar**: digite o código de um amigo e veja a fazenda dele ao vivo (animais andando, fazendeiros trabalhando, ciclo do dia). Modo **somente leitura** — nada do seu save é alterado, e o botão 🏡 Voltar traz tudo de volta.
- **Presentes**: visitando uma fazenda, envie 🪙 moedas, 🌱 sementes (vão para o baú do fazendeiro) ou 🐘 animais — o dono recebe na hora com aviso.
- Conexão direta entre navegadores (WebRTC/PeerJS), sem servidor.

## Revisão 12 — Relógio, caminho pelo portão e fazendeiros dormem na casa

- **Relógio no mapa**: o chip do topo agora mostra a hora (ex.: ☀️ 14:30). Cada ciclo completo dura **3 minutos** (06:00 → 06:00).
- **Latido mais forte**: o cachorro assusta animais num raio de **10 blocos**.
- **Corrida de cavalo**: animais assustados correm na mesma velocidade do cavalo até entrarem no curral.
- **Caminho de verdade**: animais (e o cachorro) não atravessam mais cercas, casas ou plantação — eles **dão a volta pela cerca e entram pelo portão** (busca de caminho no grid).
- **Fazendeiros dormem**: à noite eles entram na casa e só voltam a trabalhar ao amanhecer.

## Revisão 11 — Ciclo dia/noite, gestão dos prédios e cavalos

- **Ciclo dia/noite** (240s por dia completo): chip ☀️/🌙 no topo mostra o período (amanhecer, dia, tarde, noite) e o mapa escurece à noite.
- **Rotina dos fazendeiros**: de dia aram a terra, plantam e regam; à tarde colhem tudo; à noite descansam. As funções (plantio/animais) continuam sendo respeitadas.
- **Cachorro no automático**: à noite ele sozinho junta todos os animais no curral; ao amanhecer ele os solta para pastar pela fazenda.
- **Gestão dos prédios**: toque na casa, celeiro, estábulo ou galinheiro para abrir o painel — quantos animais daquele tipo você tem e quanto vale o ovo 🥚, o leite 🥛 e o bacon 🥩. A casa mostra o resumo geral (moedas, nível, animais, fazendeiros, período).
- **Cavalo 🐎** na loja (Ajudantes → animais, 🪙5000, nível 6): os fazendeiros montam nele nas colheitas distantes e andam 2,5× mais rápido.

## Revisão 10 — Curral com porteiro e cachorro pastor

- **Botão Curral 🚧** (coluna de ações): escolha o tamanho — **8×8** (🪙420), **16×16** (🪙900) ou **36×36** (🪙2100) — e toque no mapa. Prévia verde/vermelha mostra se dá para montar. Cerca de verdade, com **portão** de um lado.
- **Animais presos no curral**: quem está dentro não sai andando; quem está fora não entra por conta própria.
- **Cachorro 🐕** (loja → Ajudantes, 🪙3500, nível 5): depois de comprar, aparece o botão 🐕 na coluna de ações. Toque para **soltá-lo**: ele corre pela fazenda, assusta os animais um a um e eles **entram pelo portão** e ficam no curral. Toque de novo e ele descansa.
- Remover curral devolve 50% do valor (botão 🚧 → Remover).
