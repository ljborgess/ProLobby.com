# 1. Visão geral e identidade visual

**Fase: MVP**

## Conceito

Plataforma de matchmaking/comunidade pra EA FC Pro Clubs: player cadastra seu(s) personagem(ns) do jogo, entra numa fila automatizada por posição, é pareado com outros jogadores pra formar 2 times equilibrados (4 a 11 humanos por lado, a IA do jogo cobre o resto), e coordena a partida (que acontece dentro do console/jogo, fora da plataforma).

## Relação com o projeto `escalacao-brasileirao`

Projeto novo e independente — domínios diferentes (um é dado real de campeonato via API, o outro é matchmaking/comunidade de Pro Clubs). Stack decidida em 2026-09-08 — Next.js/TypeScript no frontend, NestJS no backend, ver [ADR-005](../../adr/005-stack-tecnica.md) e [ADR-006](../../adr/006-backend-separado-e-tooling.md).

Reaproveitamento aprovado: **identidade visual (design system) do front-end atual** — não o backend/dados.

### O visual atual é base provisória — o front-end será redesenhado (decidido em 2026-09-17)

**O layout das telas vai ser redesenhado depois.** O que existe hoje em `apps/web` (home, cadastro, login) **não é o desenho final** — é a base funcional sobre a qual o produto está sendo construído.

Até o redesenho, a regra é **manter o padrão que está sendo produzido**:

- Toda tela nova segue o mesmo design system abaixo (tokens, fontes, paleta) e o mesmo jeito de montar formulário e texto traduzido que as telas atuais já usam.
- **Não vale a pena polir visual agora**: esforço de layout, animação ou refinamento estético é retrabalho garantido. O esforço vai em comportamento — acessibilidade (RNF-015), i18n (RNF-016), segurança e estados de erro.
- O que **sobrevive** ao redesenho, e por isso precisa estar certo desde já: os textos no dicionário de `src/content/`, a separação entre componente e regra, os rótulos acessíveis, e os tokens do design system concentrados num lugar só — é isso que deixa o redesenho barato.

#### O gatilho do redesenho é o fim da Fase 2.5 (decidido em 2026-09-18)

A decisão acima dizia "depois" e não dizia depois de quê — o mesmo formato que deixou os [dois bloqueadores](../../../HANDOFF.md) parados por semanas. Passa a ter condição: **o redesenho começa quando a fila existir**, no fim da [Fase 2.5](../../negocio/02-implementacao.md).

Por que a fila e não antes: é a **primeira tela em que movimento faz trabalho**, não enfeite. Espera sem fim previsível, pareamento acontecendo, convite com 30 s correndo ([RF-009](../../requisitos/05-funcionais.md#rf-009--recusar-ou-não-confirmar-gera-timeout-progressivo-de-fila)), lobby fechando — tudo isso é estado que a pessoa precisa entender sem ler texto. Animar cadastro e login antes disso é decorar formulário que vai ser jogado fora.

Por que não mais tarde (antes do beta): acumularia o redesenho inteiro no momento mais tenso do projeto, e as telas de fila e lobby são justamente as que mais ganham em ser desenhadas com o comportamento já pronto ao lado.

#### A landing pública sai do gatilho acima e é redesenhada já (decidido em 2026-09-22)

O gatilho de 2026-09-18 continua valendo pras telas de fluxo (cadastro, login, fila, lobby) — nenhuma delas ganha polimento antes da Fase 2.5. A home (`/`) é diferente: não é fluxo, é a página pública que qualquer visitante vê antes de decidir se cria conta, e referência visual (gamersclub.com.br) foi levantada a pedido do Luciano pra guiar o redesenho dela especificamente.

Escopo desta exceção: hero, seção de destaques, rodapé — tudo dentro de `(public)/page.tsx` e dos componentes que só ela usa. Continua sem número inventado (jogadores online, campeonatos, etc. da referência): a plataforma está na Fase 2.3, sem fila e sem tração real ainda, e forjar prova social seria enganoso. A paleta e as fontes seguem o design system herdado acima — a referência informa estrutura (hero cheio, faixa de métricas, grade de destaques com ícone, rodapé com status), não cor.

**Estendido no mesmo dia para cadastro e login.** As duas telas ficam coladas na landing no funil — quem clica em "Criar conta" sai de uma página desenhada e cai na próxima no mesmo segundo, e o degrau entre as duas era visível. Elas ganham o mesmo enquadramento (formulário de um lado, painel de arte do outro, feito das mesmas camadas desenhadas), sem tocar em campo, validação ou mensagem de erro: o que muda é a moldura, não o formulário. O gatilho de 2026-09-18 **continua valendo para fila e lobby**, que são as telas cujo comportamento ainda não existe e cujo desenho depende dele.

#### Animação: nativo primeiro, biblioteca por necessidade demonstrada (decidido em 2026-09-18)

Vale a partir do redesenho — antes dele a regra acima (não polir) continua valendo, animação incluída.

- **Default é a plataforma**: CSS (transição, `@starting-style`, keyframes) e View Transitions entre rotas. Custo zero de bundle, zero dependência, nada pra manter.
- **Biblioteca entra quando a interação exigir**, e a interação precisa ser nomeada antes de instalar. Os três casos que CSS não resolve bem: **elemento compartilhado entre telas** (o card do lobby que transiciona de posição em vez de piscar), **gesto com física** (arrastar com mola e inércia) e **stagger orquestrado por estado**. Nenhum dos três aparece em formulário; todos podem aparecer em fila e lobby.
- **Não é proibição de biblioteca** — é o critério que ela precisa vencer. Motion (o antigo Framer Motion) é a escolha madura pros três casos acima, e a conversa sobre ela acontece com a tela real na mão.

**Restrições que qualquer escolha vai ter que caber**, registradas pra a decisão não travar depois:

- **CSP com nonce e `strict-dynamic`** (`apps/web/src/proxy.ts`): biblioteca que injeta `style` inline passa, porque `style-src` já permite; qualquer coisa que dependa de `eval` não passa, e a política não vai ser afrouxada por animação.
- **Orçamento de bundle contra a [RNF-001](../../requisitos/07-nao-funcionais.md#rnf-001--ação-comum-responde-em-menos-de-1-s)** (p95 abaixo de 1 s): o cold start da Neon já consome 0,5 a 1 s antes de qualquer JavaScript do cliente ([ADR-009](../../adr/009-neon-cloudflare-vm.md)), então o que sobra é pouco e precisa ser medido, não estimado.
- **Compatível com RSC do Next 16**: animação vive em componente de cliente, e a fronteira precisa ser explícita — não é motivo pra transformar árvore inteira em cliente.
- **Respeitar `prefers-reduced-motion` é pré-requisito, não recurso** — [RNF-015](../../requisitos/07-nao-funcionais.md#rnf-015--piso-de-acessibilidade). Biblioteca que não oferece caminho pra isso está fora por acessibilidade, antes de qualquer critério técnico.

### Design system herdado (`futebol/static/futebol/css/app.css`)
- Fontes: `Sora` (display/headings), `Inter` (texto)
- Paleta escura: fundo `#070b14` / `#0c1322`, superfícies translúcidas brancas (4.5%–8% opacidade)
- Cores de destaque: verde `#22c55e` (+ `#15803d` escuro), dourado `#f5b841`, vermelho `#f26d6d`
- Texto: `#e8edf7` (principal), `#9aa8bf` (suave), `#6b7a94` (fraco)
- Raios de borda: 10px / 16px / 22px (sm / padrão / lg)
- Sombras: duas escalas (padrão e sm), pretas translúcidas
