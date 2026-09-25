---
name: ProLobby
description: Cabine de transmissão para EA FC Pro Clubs — instrumento escuro, um verde de gramado, tudo desenhado.
colors:
  bg: "#070b14"
  surface: "#0c1322"
  surface-weak: "rgb(255 255 255 / 4.5%)"
  surface-strong: "rgb(255 255 255 / 8%)"
  accent: "#22c55e"
  accent-strong: "#15803d"
  gold: "#f5b841"
  danger: "#f26d6d"
  text: "#e8edf7"
  text-soft: "#9aa8bf"
  text-weak: "#6b7a94"
typography:
  display:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "clamp(2.35rem, 1.2rem + 4.4vw, 4.5rem)"
    fontWeight: 300
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "clamp(1.65rem, 1.1rem + 1.7vw, 2.4rem)"
    fontWeight: 300
    lineHeight: 1.12
    letterSpacing: "-0.028em"
  title:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.2em"
  micro:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.55rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  sm: "10px"
  md: "16px"
  lg: "22px"
  pill: "999px"
spacing:
  field: "12px"
  stack: "16px"
  grid: "24px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
    typography: "{typography.body}"
  button-ghost:
    textColor: "{colors.text-soft}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
    typography: "{typography.body}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
    typography: "{typography.body}"
  card-surface:
    backgroundColor: "{colors.surface-weak}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "28px 24px"
  chip-position:
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
    typography: "{typography.body}"
---

# Design System: ProLobby

## Overview

**Creative North Star: "A Cabine de Transmissão"**

O espetáculo acontece no gramado, e a plataforma não está no gramado. Ela é a
cabine acima da linha lateral: a mesa de onde se lê a escalação, se acompanha
quem entrou na fila e se confirma que o lobby fechou. Isso resolve a tensão
central do produto — a partida roda dentro do console, fora daqui — dando à
interface um papel que ela pode cumprir com honestidade. Ela não simula o jogo.
Ela instrumenta o que cerca o jogo.

O humor é **técnico, preciso e silencioso**. Uma cabine boa é cheia de
instrumento e mesmo assim calma: nada pisca sem motivo, nada grita para ser
notado, e a informação é a única coisa que aparece. Por isso o display é grande e
de corte leve em vez de pesado, a borda é fio de cabelo em vez de moldura, e a
cor entra por parcimônia. Quando algo se move na tela, é porque aquele movimento
está dizendo alguma coisa — o pulso correndo pela aresta do grafo de pareamento,
a varredura do radar, o lobby enchendo vaga por vaga.

Nada aqui é fotografia. Não por gosto, por restrição: arte e footage do EA FC
pertencem à EA, e este projeto não publica material que não é seu. A
consequência virou a assinatura do sistema — campo, radar, grade em perspectiva,
holofote, grafo e escalação são todos **desenhados em SVG e CSS**, e é isso que
dá à plataforma uma aparência que nenhuma captura de tela daria.

**Key Characteristics:**

- Fundo quase-preto de matiz azul, nunca cinza neutro
- Um acento verde só, fazendo todo o trabalho semântico
- Display de corte leve (300) em tamanho grande, com tracking negativo
- Borda de 1px e tom fazendo a separação; sombra só no que flutua de verdade
- Ilustração autoral em SVG/CSS — zero fotografia, zero asset de terceiro
- Movimento nativo (keyframes, `animation-timeline`), sem biblioteca

## Colors

Uma paleta de instrumento noturno: um chão escuríssimo, três degraus de texto, e
um verde que é a única voz com autoridade.

### Primary

- **Verde Gramado Vivo** (`#22c55e`): o único acento do sistema. Marca estado
  confirmado, caminho principal (botão de criar conta), rótulo de seção, nó ativo
  no grafo de pareamento e vaga preenchida no quadro da fila. É a cor do campo,
  e é por isso que ela pode carregar o produto inteiro sem parecer escolha de
  interface genérica.
- **Verde Gramado Profundo** (`#15803d`): nunca aparece como superfície ou
  texto. Existe para o brilho de fundo — o wash radial atrás do hero e do painel
  de autenticação, sempre em opacidade baixa.

### Secondary

- **Âmbar de Refletor** (`#f5b841`): segunda voz rara, e **só atmosfera**. Vive
  no fim do gradiente da barra de progresso, num trecho do halo cônico e num
  brilho de fundo de baixa opacidade. Nunca em texto, botão ou estado.

### Neutral

- **Azul Quase-Preto** (`#070b14`): o chão de toda tela. A matiz azul é
  deliberada — cinza neutro derruba o verde para um tom de alerta de terminal.
- **Azul de Painel** (`#0c1322`): a superfície opaca. Seção alternada, campo de
  formulário, e o fundo obrigatório de qualquer card com halo girando.
- **Véu Fraco** (`rgb(255 255 255 / 4.5%)`) e **Véu Forte**
  (`rgb(255 255 255 / 8%)`): superfícies translúcidas para card que flutua sobre
  o chão, quando se quer o fundo aparecendo por baixo.
- **Branco Azulado** (`#e8edf7`): texto principal.
- **Cinza Azulado Médio** (`#9aa8bf`): texto de apoio, parágrafo de corpo,
  rótulo de campo.
- **Cinza Azulado Fraco** (`#6b7a94`): dica de campo, contagem incompleta,
  legenda de exemplo. É o degrau que diz "isto é secundário", não "isto está
  desligado".

### Semantic

- **Vermelho Suave** (`#f26d6d`): mensagem de erro de campo. Único vermelho do
  sistema.

### Named Rules

**A Regra da Voz Única.** Um acento só. Verde é caminho, confirmação e estado
positivo; âmbar é atmosfera e nunca significa nada; vermelho é erro e nada mais.
Se uma tela precisa de uma quarta cor para se explicar, o problema é a
hierarquia dela, não a paleta.

**A Regra do Âmbar Mudo.** O âmbar não pode ser lido. Ele aparece em gradiente,
halo e brilho de fundo — nunca em texto, ícone, borda de estado ou preenchimento
de botão. No instante em que ele significar algo, vira um segundo acento e a
regra acima cai.

## Typography

**Display Font:** Sora (com `system-ui, sans-serif`)
**Body Font:** Inter (com `system-ui, sans-serif`)

**Character:** Sora é geométrica com um leve desvio de personalidade nas
diagonais — em corpo grande e peso 300 ela lê como composta e cara, não como
esportiva. Inter abaixo dela desaparece, que é exatamente o que se quer de um
texto que precisa ser lido em dois idiomas sem chamar atenção para si.

### Hierarchy

- **Display** (300, `clamp(2.35rem, 1.2rem + 4.4vw, 4.5rem)`, altura 1.02,
  tracking `-0.035em`): o título do hero, e só ele. Uma curva fluida em vez de
  três breakpoints, para a proporção sobreviver às larguras que ninguém testou.
- **Headline** (300, `clamp(1.65rem, 1.1rem + 1.7vw, 2.4rem)`, altura 1.12,
  tracking `-0.028em`): título de seção e do painel de autenticação.
- **Title** (500, `1.125rem`, tracking apertado): nome de destaque dentro de
  card. É o único lugar onde Sora ganha peso médio.
- **Body** (400, `0.95rem`–`1rem`, altura 1.625): parágrafo. Medida curta —
  `max-w-md` (28rem) no hero, `max-w-xl` (36rem) em seção.
- **Label** (500, `0.7rem`, tracking `0.2em`, caixa alta): sobrancelha de seção,
  rótulo de painel, badge. É o tipo que mais parece instrumento.
- **Micro** (600, `0.55rem`, altura 1, sem tracking): numeral dentro de emblema
  de diâmetro fixo — a camisa do jogador no Quadro da Fila (`size-6`, 24px). O
  único papel abaixo de Label, e só existe porque o círculo que o contém não
  cresce: em `0.7rem` o número esbarra na borda tracejada da vaga em espera.
  Peso mais alto que Label (600 contra 500) compensa a leitura em tamanho tão
  reduzido.

### Named Rules

**A Regra do Corte Leve.** Acima de 1,6rem, Sora entra em peso 300 com tracking
negativo. Bold em tamanho grande lê como grito e derruba o humor silencioso
inteiro; o peso volta a subir só quando o texto encolhe.

**A Regra do Numeral Contido.** Micro existe só dentro de um emblema de
diâmetro fixo — nunca em rótulo solto, nunca em texto corrido. Se o conteúdo
puder crescer (duas linhas, texto localizado mais longo), o papel certo é
Label, não Micro; Micro quebra assim que o texto não couber no espaço que o
motivou.

**A Regra dos Dois Papéis.** Sora nunca desce para texto corrido e Inter nunca
sobe para título. A fronteira é o papel, não o tamanho.

## Layout

Coluna central de no máximo **72rem** (`max-w-6xl`), com calha lateral de 1rem no
telefone e 1,5rem a partir de `sm`. Seção respira **96px** em cima e embaixo
(`py-24`) e se separa da vizinha por uma linha de 1px em branco a 5%, não por
espaço extra — a linha é o que dá ritmo de painel.

O hero ocupa **92svh**, não `vh`: no telefone `vh` ignora a barra do navegador e
empurra a cópia para baixo da dobra. Ele é uma grade de duas colunas
(`1.05fr 0.95fr`) a partir de `lg`, com a arte à direita sumindo abaixo disso —
em tela estreita a cópia vale mais que a ilustração.

As telas de autenticação são o oposto: **uma tela, sem rolagem**. A coluna do
formulário tem altura de viewport e rola dentro de si mesma quando a janela é
baixa; o painel de arte fica `sticky`, porque um painel que rola junto leva a
própria legenda para fora da tela antes de alguém ler.

Ritmo de espaçamento observado: **12px** entre campo e rótulo, **16px** entre
blocos de um formulário, **24px** em grade de card, **96px** entre seções.

Breakpoints: `sm` 640px, `lg` 1024px. O sistema usa dois, não cinco.

## Elevation & Depth

**Camada tonal primeiro, sombra por exceção.** A separação normal entre
superfícies é feita por três coisas empilhadas: um degrau de tom (chão → painel),
uma borda de 1px em branco a 10%, e um realce interno de 1px no topo do card
(`inset 0 1px 0 rgb(255 255 255 / 6%)`) que imita luz caindo de cima. Isso é o
que impede um painel escuro de parecer um buraco recortado na página.

Sombra projetada entra só onde o elemento realmente flutua sobre outro plano: o
card de lobby do hero, o quadro da fila, o botão primário. Em tudo o mais, ela é
ruído.

Há uma terceira camada, usada com parcimônia: **luz**. Glow radial atrás do
hero, halo cônico girando na borda de um card, e o brilho de foco do acento. Luz
nunca substitui a borda — ela se soma a ela.

### Shadow Vocabulary

- **Descolamento leve** (`box-shadow: 0 8px 20px rgb(0 0 0 / 25%)`): elemento
  que subiu um degrau, tipicamente em hover.
- **Flutuação** (`box-shadow: 0 20px 45px rgb(0 0 0 / 35%)`): card que está num
  plano acima do conteúdo, em repouso.

### Named Rules

**A Regra do Fio de Cabelo.** Toda superfície ganha `1px` de borda em branco a
10% antes de considerar sombra. Se a borda já resolve a separação, a sombra não
entra.

**A Regra da Superfície Opaca.** Qualquer card com halo cônico girando precisa
de fundo **opaco** (`--color-surface`). O halo é desenhado atrás da superfície e
aparece só onde sobra pela beirada; baixar a opacidade do fundo faz o gradiente
inundar o conteúdo.

## Shapes

Três raios e um pill. **10px** (`--radius-sm`) para campo de formulário e chip
retangular; **16px** (`--radius-md`) para card; **22px** (`--radius-lg`) para o
painel grande que enquadra uma cena. Botão, chip de posição e badge são **pill**
(`999px`) — é o que separa controle de contêiner à primeira vista.

A geometria desenhada tem vocabulário próprio e ele é sempre **traço, nunca
preenchimento**: retângulo de área e círculo central do campo, anéis
concêntricos do radar, cantos de mira em L nas quatro quinas do painel, grade em
perspectiva com máscara de desvanecimento no horizonte. Peso de traço entre
`0.2` e `0.6` em viewBox pequeno, opacidade entre 16% e 50%. O desenho é
sempre mais fraco do que o texto que ele acompanha.

## Components

### Buttons

- **Shape:** pill (`999px`), em toda variante.
- **Primary:** fundo Verde Gramado Vivo (`#22c55e`) com texto no chão
  (`#070b14`), padding `8px 20px` na barra superior. É o único preenchimento
  sólido de cor no sistema.
- **Ghost:** sem fundo, borda em branco a 15%, texto em Cinza Azulado Médio. No
  hover a borda sobe para 35% e o texto para branco — a borda reage antes do
  texto.
- **Hover / Focus:** escala `1.04` no primário com transição de 200ms, e
  `0.95` no `:active`. Foco visível é contorno de 2px no acento com
  `outline-offset: 3px`, nunca a remoção do contorno nativo.
- **Varredura:** o primário carrega um brilho diagonal que atravessa a
  superfície no hover, só em dispositivo com ponteiro real.

### Chips

- **Style:** pill com borda em branco a 10%, fundo herdado do card, texto em
  branco azulado, padding `6px 16px`.
- **State:** chip de posição não tem estado selecionado hoje — é rótulo, não
  filtro. No quadro da fila, a mesma forma ganha contorno **tracejado** quando a
  vaga ainda espera alguém, e sólido quando confirmou.

### Cards / Containers

- **Corner Style:** 16px (card comum), 22px (painel de cena).
- **Background:** gradiente vertical quase invisível de branco 4% para 1%, sobre
  o chão ou sobre a superfície opaca.
- **Shadow Strategy:** nenhuma em repouso; `--shadow-default` no hover, junto com
  a borda migrando para o acento a 45%.
- **Border:** 1px branco a 10%, mais realce interno no topo.
- **Internal Padding:** `24px` a `36px` conforme a densidade da seção.

### Inputs / Fields

- **Style:** fundo Azul de Painel (`#0c1322`), borda 1px branco a 10%, raio
  10px, padding `10px 14px`, texto em `0.875rem`.
- **Label:** acima do campo, `0.75rem`, em Cinza Azulado Médio — o rótulo é
  apoio, o valor digitado é que é conteúdo.
- **Focus:** borda migra para o acento a 50% e ganha anel de 2px.
- **Error:** mensagem em Vermelho Suave (`#f26d6d`), `0.75rem`, com
  `role="alert"` e `aria-invalid` no campo.
- **Autofill:** o preenchimento do Chrome é reescrito com
  `box-shadow: inset 0 0 0 1000px var(--color-surface)`, porque ele ignora
  `background-color` e deixaria duas lajes claras no formulário escuro.

### Navigation

- **Style:** barra `sticky` no topo, fundo do chão a 70% com `backdrop-blur`,
  borda inferior de 1px, e um fio de progresso de rolagem de 1px correndo do
  acento ao âmbar logo abaixo dela.
- **Conteúdo:** wordmark à esquerda com "Lobby" no acento; à direita, o par
  ghost + primário. **Esse par é o único CTA da página** — o hero não repete.

### Signature: o Quadro da Fila

O componente que define o sistema. Campo em planta com as onze vagas de um
4-3-3, mapeadas nas cinco categorias de posição do produto; ao lado, o elenco
agrupado por categoria com contagem preenchida/total; embaixo, a legenda que diz
que aquilo é exemplo. Vaga confirmada é disco sólido do acento; vaga em espera é
contorno tracejado pulsando. É o formato herdado do `escalacao-brasileirao`,
redesenhado com conteúdo próprio, e é a base da tela de fila da Fase 2.5.

### Signature: o Medidor de Reputação

No painel de próximos passos, a reputação é um **mostrador em meio arco**, de 0
a 100, com traços finos nas linhas da escada: 25, 40 e 55. O número vem grande,
em Sora 300, dentro do arco, com "/100" pequeno ao lado. Uma conta marca onde a
reputação está no arco.

- **Cor:** o arco só leva o acento enquanto a reputação está na faixa boa,
  porque verde é estado positivo. Abaixo de 55 ele fica em Cinza Azulado
  Médio, e o texto ao lado diz a faixa e o que ela muda.
- **Faixa:** quem decide é a API. O desenho só posiciona os traços.
- **Movimento:** o arco se desenha uma vez, do zero, e a conta pousa junto. É
  o único movimento do painel. Sob reduced-motion, o medidor já aparece
  desenhado.
- **Acessibilidade:** é um `role="meter"` com `aria-valuetext` do tipo
  "70 de 100, Boa".

### Signature: o Painel de Instrumento

A arte que acompanha formulário e seção: radar varrendo em gradiente cônico
sobre anéis concêntricos, grade de campo em perspectiva com máscara no
horizonte, feixes de holofote respirando, scanlines derivando, cantos de mira.
Sempre atrás de conteúdo, sempre `aria-hidden`, sempre com no-op sob
`prefers-reduced-motion`.

## Do's and Don'ts

### Do:

- **Do** desenhar a ilustração em SVG/CSS. Campo, radar, grade, grafo e
  escalação são autorais e é isso que dá identidade ao produto.
- **Do** separar superfície com tom + borda de 1px + realce interno no topo
  antes de pensar em sombra.
- **Do** usar peso 300 no display acima de 1,6rem, com tracking negativo.
- **Do** dar fundo opaco (`--color-surface`) a qualquer card com halo girando.
- **Do** escrever todo movimento em CSS nativo (keyframes,
  `animation-timeline`), com um bloco `prefers-reduced-motion` que o desliga
  para o estado final — não para um quadro intermediário.
- **Do** manter o par de CTA só na barra superior, que é `sticky` e por isso
  está ao alcance de qualquer seção.

### Don't:

- **Don't** publicar print, arte ou footage do EA FC. É material da EA; o
  repositório não distribui o que não é dele, e todo slot de imagem espera arte
  licenciada ou própria.
- **Don't** inventar número de tração — jogador online, partida jogada,
  campeonato. A fila é Fase 2.5 e não existe; número forjado numa página pública
  é mentira com boas maneiras. Mock ilustrativo precisa dizer que é exemplo na
  própria interface.
- **Don't** dar significado ao âmbar. Ele é atmosfera; no dia em que virar
  estado, o sistema passa a ter dois acentos.
- **Don't** instalar biblioteca de animação sem nomear antes a interação que o
  CSS não resolve. A CSP usa nonce com `strict-dynamic` e a RNF-001 já gasta
  0,5 a 1s no cold start da Neon antes de qualquer JavaScript.
- **Don't** usar `vh` em tela cheia. É `svh`, ou a cópia começa abaixo da dobra
  no telefone.
- **Don't** repetir o mesmo texto acessível em dois links para o mesmo destino
  na mesma tela — foi o que quebrou o teste da home quando o hero duplicava os
  botões da barra.
