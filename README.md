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
