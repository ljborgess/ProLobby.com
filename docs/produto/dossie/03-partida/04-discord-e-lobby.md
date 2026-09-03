# 4. Discord e lobby

**Fase: MVP**

## Contexto

Sala de partida dentro do jogo é sempre criada **manualmente** pelo host, dentro do console — a plataforma não tem como automatizar isso (EA não expõe API pra criar sala). Por isso a plataforma vira central de **coordenação**, não de execução da partida em si.

Estrutura do servidor (cargos, canais, permissões do bot) documentada à parte, fora do dossiê de produto — ver [docs/discord/](../../../discord/README.md).

## Vínculo obrigatório

- Vínculo de conta Discord **não é obrigatório pra criar conta** — jogador pode navegar a plataforma (perfil, histórico, ranking) sem vincular. É **obrigatório só pra entrar na fila**, porque a coordenação do lobby (criar canal, pingar os 22, gerenciar cargo Verificado) depende do bot. Ninguém é obrigado a usar chamada de voz — vincular é sobre o bot ter como te alcançar/coordenar, não sobre entrar em call.

## Fluxo do bot

Ao lobby fechar (22 confirmados), o bot de Discord:
- Cria canal de voz temporário do lobby
- Posta host + gamertag/PSN ID de todos (visível só dentro do lobby, não público no perfil geral)
- Pinga os 22 automaticamente
- Dispara timer pra todos entrarem (ausência afeta reputação — ver [Ranking, reputação e punição](../02-jogador/06-ranking-reputacao-e-punicao.md))

## Escolha do host

- Critério: **reputação + histórico de conexão estável** (não aleatório) — evita host com lag/ping ruim estragando o jogo pra todo mundo.
- Se o host escolhido não confirma entrada ou desconecta, papel é **reatribuído automaticamente** pro próximo melhor candidato entre os 21 restantes, mesmo critério — lobby nunca fica sem host formal.

## Notificação

- Canal ativo de aviso (fila fechou, lobby formado, disputa resolvida, punição aplicada) é **Discord (DM do bot) + notificação in-app na própria plataforma web** — sem e-mail. Reaproveita o vínculo Discord já obrigatório, evita sistema de notificação paralelo.
