# Produto — ProLobby

Levantamento de requisitos e design de produto, separado por domínio. Cada arquivo marca em que fase a decisão se aplica (**MVP** / **Fase 2** / **Futuro**).

Numeração indica **ordem de leitura** dentro de cada pasta — as pastas também estão em ordem, então ler de cima pra baixo dá o fluxo completo do produto.

Time: Luciano, Rafael, João, Felipe — sem divisão fixa de papéis (decisão registrada, ver backlog).

Status: design de produto, sem código de aplicação. Stack técnica deliberadamente não decidida.

## 01 · Visão

Do que se trata e de onde veio a identidade visual.

- [01 — Visão geral e identidade visual](01-visao/01-visao-geral.md)

## 02 · Jogador

Quem é o usuário, como ele é verificado, e como é medido.

- [01 — Personagens e verificação](02-jogador/01-personagens-e-verificacao.md) — OCR, identidade, clube declarado
- [02 — Ranking, reputação e punição](02-jogador/02-ranking-reputacao-e-punicao.md) — elo, reputação, avaliação por pares, escada de punição
- [03 — Perfil e visibilidade social](02-jogador/03-perfil-e-visibilidade.md) — o que é público, o que é privado

## 03 · Partida

O ciclo completo, da fila ao resultado. **Núcleo do produto.**

- [01 — Mecânica real do EA FC Pro Clubs](03-partida/01-mecanica-pro-clubs.md) — como o jogo funciona de fato + checklist de teste prático
- [02 — Fila e matchmaking](03-partida/02-fila-e-matchmaking.md) — composição, equilíbrio por elo, IA preenchendo vaga
- [03 — Discord e lobby](03-partida/03-discord-e-lobby.md) — capitão, canais temporários, notificação
- [04 — Resultado de partida](03-partida/04-resultado-de-partida.md) — report, OCR, disputa, zero-report

## 04 · Governança

Regras, dados e obrigações legais.

- [01 — Moderação](04-governanca/01-moderacao.md) — casos, metas de resposta, escala futura
- [02 — Dados pessoais e LGPD](04-governanca/02-dados-pessoais-lgpd.md) — retenção, exclusão, requisitos de segurança
- [03 — Termos de uso e idade mínima](04-governanca/03-termos-de-uso-e-idade.md)

## 05 · Escopo e evolução

Limites do MVP e o que ficou pra depois.

- [01 — Onboarding](05-produto/01-onboarding.md) — fluxo de entrada, autenticação, recuperação de conta
- [02 — Escopo de plataforma, jogo e região](05-produto/02-escopo-plataforma-jogo-regiao.md) — crossplay, edições, região, idioma
- [03 — Backlog e fases futuras](05-produto/03-backlog-fases-futuras.md) — o que foi deliberadamente adiado

## Referência rápida

- [Parâmetros do sistema](parametros.md) — todos os números do produto num lugar só (elo, reputação, prazos, limites)
