# 5. Resultado de partida

**Fase: MVP**

## Contexto

Sem API da EA, resultado depende de **report manual com print** — mesma limitação estrutural do cadastro de personagem (ver [Personagens e verificação](../02-jogador/02-personagens-e-verificacao.md)).

## Quem reporta

- **Qualquer um dos 22** (não precisa ser o host) pode mandar o print do placar final.

## Validação anti-fraude do print

Gatilho de validade do print (evita fraude/troll terminando partida cedo, sem depender de botão manual de "partida terminou"):
1. **Piso de tempo mínimo** desde o lobby fechado — print enviado antes disso é rejeitado automaticamente.
2. **OCR valida que é a tela de "fim de partida"** (placar final + estatísticas), não HUD de jogo em andamento.
3. **OCR valida o nome dos 2 clubes na tela** contra o par de clube-casa atribuído àquele lobby (ver [Mecânica real do EA FC Pro Clubs](00-mecanica-pro-clubs.md)) — evita reportar print de partida qualquer fora do ProLobby como se fosse a do lobby.

## Validação cruzada

- **Placar bate** entre os dois lados + **timestamps de envio próximos** entre si.
- **ID da partida = o próprio lobby** gerado pela plataforma — não depende de nada lido do jogo (EA FC não expõe ID de partida legível via OCR).

## Casos de borda

- Se só um lado mandar dentro da janela (15 min): aceita como válido com flag "não confirmado", sujeito a contestação por prazo curto (ex.: 48h) — depois disso vira definitivo, evita passivo indefinido de disputa antiga pros 4 moderadores.
- Se os dois lados mandarem placares divergentes: cai em **disputa/moderação** (ver [Moderação](../04-governanca/07-moderacao.md)).
- Se **nenhum dos 22** reportar dentro dos 15 min: fica pendente — depois de um prazo bem maior (ex.: 24-48h) sem nenhum report, sistema expira automaticamente e libera as 22 contas. **Não fica sem custo**: aplica penalidade leve de reputação pros 22 (mesma métrica de `06`, rateada — não dá pra saber quem "devia" ter reportado, e escala só em reincidência, igual ao padrão já usado em não-confirmar-lobby de `03`). Sem isso, o time perdedor teria incentivo estrutural de torcer pra ninguém reportar e escapar de graça — número exato de reincidência/threshold é provisório, ajusta com dado real.
- **Desconexão / rage quit**: reportado dentro do mesmo fluxo (campo "reportar ausência" na tela de report do placar) — não é fluxo separado. Confirmada pelo outro lado, gera penalidade de reputação maior que perder a partida normalmente.

## Incentivo estrutural

- **Conta fica bloqueada de nova fila até a partida anterior ser reportada e resolvida** — tira da plataforma a responsabilidade de "garantir" que alguém reporte; quem quer jogar de novo resolve o pendente por interesse próprio.
- Esse bloqueio **também vale durante disputa/moderação pendente** (mesmo com prints divergentes já enviados) — decisão deliberada pro MVP dado baixo volume de casos com só 4 moderadores; revisar se o volume crescer e virar gargalo real (jogador inocente preso esperando resolução).
