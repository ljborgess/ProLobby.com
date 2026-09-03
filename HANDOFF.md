# Handoff — ProLobby

Pra quem (Claude Code, outra sessão/máquina) for continuar este projeto a partir daqui.

## O que é

Ver [`README.md`](README.md). Origem: ideia nasceu numa sessão sobre o projeto `escalacao-brasileirao` (Django, escalação de Brasileirão via API), mas ProLobby é **projeto novo e independente** — só a identidade visual (design system) foi herdada de lá, nada de backend/dados.

## Estado atual (2026-09-03)

- **Fase**: design de produto / levantamento de requisitos. Zero código de aplicação.
- **Branches**: só `main` e `dev` (sem branch de feature por item). Trabalho corre em `dev`; `main` só recebe merge quando o time decidir promover. Nada vai direto pra `main`.
- Todo o conteúdo abaixo já está commitado e pushed em `dev`.

## Onde está tudo

- **`docs/produto/dossie/`** — o dossiê completo, separado por nicho e organizado em seções no índice (13 arquivos + índice em `README.md`). Foi construído em várias rodadas de entrevista (skill `grill-me`), cobrindo: visão geral, personagens/verificação (OCR, identidade, troca de gamertag), fila/matchmaking (composição de time + voto de formação, equilíbrio categoria contra categoria), Discord/lobby (notificação, reatribuição de host em cascata), resultado de partida (zero report com penalidade, janela de contestação, bloqueio em disputa), ranking/reputação/punição (elo por categoria, seed inicial, rollback retroativo, smurfing/conluio), moderação (conflito de interesse sem regra formal), escopo (plataforma/edição/região), LGPD, backlog (monetização — ideia validada, não decidida), onboarding, ToS/idade (verificação por autodeclaração), perfil e visibilidade social.
- **`docs/discord/`** — domínio à parte (não é produto, é infraestrutura de comunidade): cargos (Admin/Moderador fixos + tags sociais nativas do Discord + cargo funcional Verificado, gatilho duplo verificação+vínculo), canais (estrutura unificada, sem fragmentar), bot central (permissão total, kick/ban sempre manual).
- **`scripts/check-docs-links.sh`** — valida links cruzados e cobertura de índice de `docs/`. Rodado automaticamente por um hook `PreToolUse` (`.claude/settings.json`) antes de qualquer `git commit` — bloqueia o commit se achar link quebrado ou arquivo órfão fora do índice.
- **`.claude/settings.json`** — registra o marketplace de plugins B2ML (`https://gitlab.b2ml.com.br/.../b2ml-agentes-e-skills`) como `extraKnownMarketplaces`, habilita o plugin `grill-me`, e configura o hook de checagem de docs acima — abrindo este repo no Claude Code, isso já carrega sozinho.

## Como continuar

1. Se for seguir levantando requisito/design: use a skill `grill-me` (já habilitada via `.claude/settings.json`) pra continuar entrevistando e resolvendo lacunas. O dossiê em `docs/produto/dossie/05-produto/10-backlog-fases-futuras.md` lista o que já foi deliberadamente adiado — não regrilar esses itens sem motivo novo.
2. Quando for hora de decidir stack técnica: isso foi **deliberadamente não decidido ainda** (ver item em `10-backlog-fases-futuras.md`) — é a próxima decisão grande em aberto.
3. Front-end: reaproveitar o design system documentado em `docs/produto/dossie/01-visao/01-visao-geral.md` (cores, fontes, raios, sombras — extraído de `futebol/static/futebol/css/app.css` do repo `escalacao-brasileirao`).

## Itens conhecidos como não resolvidos (de propósito)

- Aposta em dinheiro por jogador/lobby (ideia embrionária, futuro)
- Monetização — assinatura/prioridade/cosmético (ideia validada pelo time, MVP é gratuito)
- Moderador comunitário (só entra quando volume de casos justificar)
- Fila por time pré-formado (Fase 2)
- Stack técnica completa
- Divisão de papéis entre os 4
