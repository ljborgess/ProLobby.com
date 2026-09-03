# 5. Resultado de partida

**Fase: MVP**

## Contexto

Sem API da EA, resultado depende de **report manual com print** — mesma limitação estrutural do cadastro de personagem (ver [Personagens e verificação](02-personagens-e-verificacao.md)).

## Quem reporta

- **Qualquer um dos 22** (não precisa ser o host) pode mandar o print do placar final.

## Validação anti-fraude do print

Gatilho de validade do print (evita fraude/troll terminando partida cedo, sem depender de botão manual de "partida terminou"):
1. **Piso de tempo mínimo** desde o lobby fechado — print enviado antes disso é rejeitado automaticamente.
2. **OCR valida que é a tela de "fim de partida"** (placar final + estatísticas), não HUD de jogo em andamento.

## Validação cruzada

- **Placar bate** entre os dois lados + **timestamps de envio próximos** entre si.
- **ID da partida = o próprio lobby** gerado pela plataforma — não depende de nada lido do jogo (EA FC não expõe ID de partida legível via OCR).

## Casos de borda

- Se só um lado mandar dentro da janela (15 min): aceita como válido com flag "não confirmado", sujeito a contestação.
- Se os dois lados mandarem placares divergentes: cai em **disputa/moderação** (ver [Moderação](07-moderacao.md)).
- **Desconexão / rage quit**: reportado dentro do mesmo fluxo (campo "reportar ausência" na tela de report do placar) — não é fluxo separado. Confirmada pelo outro lado, gera penalidade de reputação maior que perder a partida normalmente.

## Incentivo estrutural

- **Conta fica bloqueada de nova fila até a partida anterior ser reportada e resolvida** — tira da plataforma a responsabilidade de "garantir" que alguém reporte; quem quer jogar de novo resolve o pendente por interesse próprio.
