# Product

<!-- impeccable:product-schema 1 -->

Escrito na raiz, não em `apps/web`: a verdade de produto abaixo vale igual para a
API, o bot e o front-end. Decisão visual não mora aqui — ver `DESIGN.md` quando
existir, e o dossiê em [`docs/`](docs/) para o detalhamento de cada regra.

## Platform

web

## Users

**Primário: o jogador solo de EA FC Pro Clubs, sem time fixo.** Quer partida
11v11 séria e não tem (ou não quer depender de) um grupo de amigos que feche
onze. Cadastra seu personagem, entra na fila pela posição que joga e é pareado
com desconhecidos verificados. É para ele que o produto abre.

**Secundário, aditivo: o clube já formado**, procurando adversário equilibrado.
Entra depois do solo, não junto — confirmado em 2026-09-22. A entidade
`ClubeDeclarado` e a auto-declaração de vagas livres já existem no modelo, mas a
fila individual é o caso que define o produto.

Região do MVP: Brasil e América do Sul. Idade mínima 16 anos.

## Product Purpose

Plataforma de matchmaking e comunidade para EA FC Pro Clubs. O jogador cadastra
personagem(ns) verificado(s), entra numa fila automatizada por posição, e a
plataforma monta dois times equilibrados — 4 a 11 humanos por lado, a IA do jogo
cobre o resto — e coordena o encontro.

**A partida em si acontece dentro do console/jogo, fora da plataforma.** O
trabalho do produto começa no cadastro e termina na coordenação; ele nunca vê a
bola rolar.

**Sucesso é partida completada por semana** (confirmado em 2026-09-22): a fila
fechou lobby, os dois lados confirmaram, e o jogo aconteceu até o fim. Volume de
cadastro sem partida no fim não conta.

## Positioning

O que um concorrente não copia sem refazer a base:

- **Identidade verificada antes da fila.** Cada personagem prova de quem é
  (print in-game processado por OCR) antes de poder entrar. Não é perfil
  auto-declarado.
- **Elo por categoria de posição, reputação por conta.** Desempenho de goleiro
  não vira elo de atacante; comportamento é da pessoa e atravessa todos os
  personagens dela. Separar as duas coisas é o que impede subir elo fácil numa
  categoria e usar em outra.
- **Vínculo de Discord obrigatório para a fila**, porque é por lá que o convite
  de partida chega e o lobby é coordenado.

## Operating Context

- **A partida roda no console/jogo.** A plataforma coordena; não hospeda
  servidor de jogo nem observa a partida.
- **Discord é infraestrutura, não integração opcional**: convite de partida,
  canais dinâmicos do lobby, cargo de Verificado.
- **Crossplay unificado** PS5 / Xbox Series / PC, sem separar fila por
  plataforma. Geração antiga (PS4, Xbox One) está fora de escopo.
- **Edição do jogo**: personagem fica vinculado à edição em que foi verificado.
  Edição nova arquiva os personagens antigos e exige reverificação — atributos e
  overall mudam entre edições, então é dado novo. Elo e reputação atravessam;
  overall e atributos não.
- **Janela de 30 s** para confirmar a fila; recusa ou estouro gera timeout
  progressivo (5 min, 15, 30, 2 h).
- **Português e espanhol desde o MVP**, na interface, nas mensagens do bot e nos
  Termos de Uso.

## Capabilities and Constraints

- **1 conta, até 5 personagens** — um por categoria de posição (goleiro, zaga,
  meio, ponta, ataque). Um personagem = uma posição fixa. Troca de categoria só
  enquanto o personagem tiver zero partida.
- **Ressalva conhecida do modelo**: os 5 personagens são abstração da
  plataforma. O EA FC trabalha com uma Virtual Pro por conta EA, reconfigurável
  — então são, na prática, 5 snapshots verificados da mesma Pro. A plataforma
  não consegue verificar que a pessoa entrou em campo na configuração em que
  entrou na fila.
- **Infra de custo zero** (ADR-009): Neon free tier em São Paulo, Cloudflare
  Tunnel e uma VM Oracle. O cold start da Neon consome 0,5 a 1 s antes de
  qualquer código do cliente, e a RNF-001 pede ação comum abaixo de 1 s no p95 —
  o orçamento de front-end que sobra é pequeno e precisa ser medido, não
  estimado.
- **Modelo de negócio: indefinido** (confirmado em 2026-09-22). Nenhuma
  superfície pública promete preço, gratuidade ou "para sempre". Não é lacuna a
  preencher por conta própria; é decisão em aberto.

### Bloqueadores em aberto

Dois, e ambos travam requisito, não código:

1. **Checklist de teste dentro do jogo** (8 testes) — nunca rodado.
2. **Piloto de OCR** — taxa de acerto não medida, sem corpus de prints.
   Evidência de 2026-09-18: a aba `Attributes` do FC 27 **não prova posse** do
   personagem (não traz gamertag nem overall), então print daquela tela não
   ancora identidade. A verificação da Fase 2.2 depende de resolver isso.

## Brand Commitments

- Nome: **ProLobby**.
- **Design system herdado do projeto `escalacao-brasileirao`** — reaproveitamento
  aprovado e restrito à identidade visual, não ao backend nem aos dados. É
  restrição binding, não sugestão.
- Interface, bot e Termos falam português e espanhol. Código, identificador e
  nome de teste em inglês; dossiê, issue, PR e commit em português.

## Evidence on Hand

- **Não existe tração, e nada pode fingir que existe.** O produto está na Fase
  2.3: a fila não foi construída. Não há jogador online, partida jogada,
  campeonato realizado nem usuário externo. Número de prova social em qualquer
  superfície pública seria inventado.
- **Não há imagem licenciada do EA FC.** Print e footage do jogo são da EA;
  nenhuma arte de jogo pode ser publicada a partir do repositório. Toda a
  ilustração hoje é desenhada (SVG/CSS).
- **Formato de escalação reutilizável**: `docs/assets/demo-campo.png` do
  `escalacao-brasileirao` — material do próprio time, apontado em 2026-09-22
  como o formato que a tela de fila da Fase 2.5 deve ter.
- **Dossiê extenso e vivo** em [`docs/`](docs/): requisitos funcionais e não
  funcionais, decisões de produto datadas, e ADRs. É a fonte de verdade sobre
  regra de negócio, acima de qualquer resumo.

## Product Principles

1. **Solo primeiro, clube depois.** Toda decisão de fila resolve o jogador
   sozinho antes de resolver o time montado.
2. **Identidade é a porta.** Verificação acontece antes da fila, não depois do
   problema. É o que separa este produto de um grupo de WhatsApp organizado.
3. **Desempenho é da posição, comportamento é da pessoa.** Elo por categoria,
   reputação por conta — e as duas coisas nunca se misturam.
4. **Nunca afirmar tração que não existe.** Enquanto não houver partida jogada,
   nenhuma superfície inventa número, depoimento ou marco.
5. **A plataforma para onde o jogo começa.** Coordenar bem é o produto; simular
   ou substituir o que acontece dentro do jogo não é.

## Accessibility & Inclusion

- **RNF-015** é piso, não recurso: rótulo acessível, estado de erro anunciável e
  `prefers-reduced-motion` respeitado em qualquer movimento.
- **RNF-016**: português e espanhol com paridade, sem tela que só exista em um
  idioma.
- Idade mínima **16 anos**, verificada no cadastro.
