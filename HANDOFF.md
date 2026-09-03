# Handoff — ProLobby

Pra quem (Claude Code, outra sessão/máquina) for continuar este projeto a partir daqui.

## O que é

Ver [`README.md`](README.md). Origem: ideia nasceu numa sessão sobre o projeto `escalacao-brasileirao` (Django, escalação de Brasileirão via API), mas ProLobby é **projeto novo e independente** — só a identidade visual (design system) foi herdada de lá, nada de backend/dados.

## Estado atual (2026-09-03)

- **Fase**: design de produto / levantamento de requisitos. Zero código de aplicação.
- **Branch de trabalho**: `dev` (regra do time: nada vai direto pra `main`).
- Todo o conteúdo abaixo já está commitado e pushed em `dev`.

## Onde está tudo

- **`docs/produto/dossie/`** — o dossiê completo, separado por nicho (12 arquivos + índice em `README.md`). Foi construído em várias rodadas de entrevista (skill `grill-me`), cobrindo: visão geral, personagens/verificação (OCR, identidade), fila/matchmaking, Discord/lobby, resultado de partida, ranking/reputação/punição/smurfing/conluio, moderação, escopo (plataforma/edição/região), LGPD, backlog, onboarding, ToS/idade.
- **`.claude/settings.json`** — registra o marketplace de plugins B2ML (`https://gitlab.b2ml.com.br/.../b2ml-agentes-e-skills`) como `extraKnownMarketplaces` e habilita o plugin `grill-me` — abrindo este repo no Claude Code, isso já carrega sozinho.

## Como continuar

1. Se for seguir levantando requisito/design: use a skill `grill-me` (já habilitada via `.claude/settings.json`) pra continuar entrevistando e resolvendo lacunas. O dossiê em `docs/produto/dossie/10-backlog-fases-futuras.md` lista o que já foi deliberadamente adiado — não regrilar esses itens sem motivo novo.
2. Quando for hora de decidir stack técnica: isso foi **deliberadamente não decidido ainda** (ver item em `10-backlog-fases-futuras.md`) — é a próxima decisão grande em aberto.
3. Front-end: reaproveitar o design system documentado em `docs/produto/dossie/01-visao-geral.md` (cores, fontes, raios, sombras — extraído de `futebol/static/futebol/css/app.css` do repo `escalacao-brasileirao`).

## Itens conhecidos como não resolvidos (de propósito)

- Aposta em dinheiro por jogador/lobby (ideia embrionária, futuro)
- Moderador comunitário (só entra quando volume de casos justificar)
- Fila por time pré-formado (Fase 2)
- Stack técnica completa
- Divisão de papéis entre os 4
