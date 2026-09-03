# 4. Discord e lobby

**Fase: MVP**

## Contexto

Sala de partida dentro do jogo é sempre criada **manualmente** pelo host, dentro do console — a plataforma não tem como automatizar isso (EA não expõe API pra criar sala). Por isso a plataforma vira central de **coordenação**, não de execução da partida em si.

## Vínculo obrigatório

- Vínculo de conta Discord é **obrigatório** no cadastro (pré-requisito pra fila) — sem isso não tem como coordenar a sala.

## Fluxo do bot

Ao lobby fechar (22 confirmados), o bot de Discord:
- Cria canal de voz temporário do lobby
- Posta host + gamertag/PSN ID de todos (visível só dentro do lobby, não público no perfil geral)
- Pinga os 22 automaticamente
- Dispara timer pra todos entrarem (ausência afeta reputação — ver [Ranking, reputação e punição](06-ranking-reputacao-e-punicao.md))

## Escolha do host

- Critério: **reputação + histórico de conexão estável** (não aleatório) — evita host com lag/ping ruim estragando o jogo pra todo mundo.
