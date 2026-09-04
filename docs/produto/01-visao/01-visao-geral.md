# 1. Visão geral e identidade visual

**Fase: MVP**

## Conceito

Plataforma de matchmaking/comunidade pra EA FC Pro Clubs: player cadastra seu(s) personagem(ns) do jogo, entra numa fila automatizada por posição, é pareado com outros 21 jogadores pra formar 2 times equilibrados, e coordena a partida (que acontece dentro do console/jogo, fora da plataforma).

## Relação com o projeto `escalacao-brasileirao`

Projeto novo e independente — domínios diferentes (um é dado real de campeonato via API, o outro é matchmaking/comunidade de Pro Clubs). Nenhuma decisão de stack tomada ainda, deliberadamente adiada (ver [Backlog](../05-produto/03-backlog-fases-futuras.md)).

Reaproveitamento aprovado: **identidade visual (design system) do front-end atual** — não o backend/dados.

### Design system herdado (`futebol/static/futebol/css/app.css`)
- Fontes: `Sora` (display/headings), `Inter` (texto)
- Paleta escura: fundo `#070b14` / `#0c1322`, superfícies translúcidas brancas (4.5%–8% opacidade)
- Cores de destaque: verde `#22c55e` (+ `#15803d` escuro), dourado `#f5b841`, vermelho `#f26d6d`
- Texto: `#e8edf7` (principal), `#9aa8bf` (suave), `#6b7a94` (fraco)
- Raios de borda: 10px / 16px / 22px (sm / padrão / lg)
- Sombras: duas escalas (padrão e sm), pretas translúcidas
