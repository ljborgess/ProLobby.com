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

### Design system herdado (`futebol/static/futebol/css/app.css`)
- Fontes: `Sora` (display/headings), `Inter` (texto)
- Paleta escura: fundo `#070b14` / `#0c1322`, superfícies translúcidas brancas (4.5%–8% opacidade)
- Cores de destaque: verde `#22c55e` (+ `#15803d` escuro), dourado `#f5b841`, vermelho `#f26d6d`
- Texto: `#e8edf7` (principal), `#9aa8bf` (suave), `#6b7a94` (fraco)
- Raios de borda: 10px / 16px / 22px (sm / padrão / lg)
- Sombras: duas escalas (padrão e sm), pretas translúcidas
