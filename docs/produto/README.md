# Produto — ProLobby

Levantamento de requisitos e design de produto, separado por domínio. Cada arquivo marca em que fase a decisão se aplica (**MVP** / **Fase 2** / **Futuro**).

Numeração indica **ordem de leitura** dentro de cada pasta — as pastas também estão em ordem, então ler de cima pra baixo dá o fluxo completo do produto.

Time: Luciano, Rafael, João, Felipe — sem divisão fixa de papéis (decisão registrada, ver backlog).

Status: design de produto, sem código de aplicação. Stack técnica deliberadamente não decidida.

## 01 · Visão

Do que se trata e de onde veio a identidade visual.

- [01 — Visão geral e identidade visual](01-visao/01-visao.md)

## 02 · Jogador

Quem é o usuário, como ele é verificado, e como é medido.

- [01 — Personagens e verificação](02-jogador/01-verificacao.md) — OCR, identidade, clube declarado
- [02 — Ranking, reputação e punição](02-jogador/02-ranking.md) — elo, reputação, avaliação por pares, escada de punição
- [03 — Perfil e visibilidade social](02-jogador/03-perfil.md) — o que é público, o que é privado

## 03 · Partida

O ciclo completo, da fila ao resultado. **Núcleo do produto.**

- [01 — Mecânica](03-partida/01-mecanica.md) — como o Pro Clubs funciona de fato, e o mecanismo de capitão/clube que sai disso
- [02 — Fila](03-partida/02-fila.md) — composição, equilíbrio por elo, IA preenchendo vaga
- [03 — Lobby](03-partida/03-lobby.md) — capitão, canais temporários, notificação
- [04 — Resultado](03-partida/04-resultado.md) — report, OCR, disputa, zero-report
- [05 — Checklist de teste no jogo](03-partida/05-checklist.md) — **bloqueador nº 1**, pendente de alguém rodar

## 04 · Governança

Regras, dados e obrigações legais.

- [01 — Moderação](04-governanca/01-moderacao.md) — casos, metas de resposta, escala futura
- [02 — Dados pessoais e LGPD](04-governanca/02-lgpd.md) — retenção, exclusão, requisitos de segurança
- [03 — Termos de uso e idade mínima](04-governanca/03-termos.md)

## 05 · Escopo e evolução

Limites do MVP e o que ficou pra depois.

- [01 — Onboarding](05-produto/01-onboarding.md) — fluxo de entrada, autenticação, recuperação de conta
- [02 — Escopo de plataforma, jogo e região](05-produto/02-escopo.md) — crossplay, edições, região, idioma
- [03 — Backlog e fases futuras](05-produto/03-backlog.md) — o que foi deliberadamente adiado

## 06 · Requisitos transversais

O que atravessa o produto inteiro e não pertence a um fluxo só.

- [01 — Requisitos transversais](06-requisitos/01-transversais.md) — fuso, janela de 30 dias, papéis da plataforma, não-funcionais, idempotência, acessibilidade, inventário de telas
- [02 — Estados do lobby e da partida](06-requisitos/02-estados.md) — os 12 estados, o que prende a fila, efeitos por transição

## Referência rápida

- [Parâmetros do sistema](parametros.md) — todos os números do produto num lugar só (elo, reputação, prazos, limites)
- [Checklist de teste no jogo](03-partida/05-checklist.md) — o que precisa ser validado antes de escrever código
