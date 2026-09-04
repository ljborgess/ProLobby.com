# ADR-002 · Elo e reputação armazenados como log de evento

**Status**: aceita
**Data**: 2026-09-04

## Contexto

Elo e reputação são o ativo central do produto. Quatro regras já decididas dependem de como esses valores são guardados:

- **Rollback retroativo** — moderação reverte uma disputa e o sistema tem que corrigir elo, reputação e contadores de reincidência de todos os envolvidos.
- **Contadores de janela móvel de 30 dias** — 3 zero-reports, 5 avaliações negativas.
- **Recuperação de +1 por partida limpa com teto em 70** — exige distinguir a origem de cada ganho, porque acima de 70 só se chega por joinha.
- **Disputa sem prova anula a partida**, revertendo o elo de todos.

O desenho original só descrevia o **valor atual** de cada um. Isso torna as quatro inimplementáveis: não há como desfazer o que nunca foi registrado, nem responder "quantos nos últimos 30 dias" a partir de um número corrente.

## Decisão

Elo e reputação são **derivados de um log de eventos**, não campos mutáveis. Cada alteração é uma linha com `delta`, `motivo`, `partida de origem`, `criado_em` e `revertido_em`.

## Alternativas descartadas

**Valor atual mais log de auditoria separado.** Parecia suficiente, mas cria duas fontes de verdade que divergem no primeiro bug — e reverter passaria a ser reconstrução manual em vez de operação normal.

**Recalcular do zero sempre, a partir das partidas.** Elegante e sem estado redundante. Caiu porque a penalidade de reputação não vem só de partida (avaliação por pares, decisão de moderação, denúncia), então não há como derivar tudo do histórico de jogo.

**Snapshot periódico mais reprocessamento.** Complexidade desproporcional pra escala de 10 lobbies simultâneos ([RNF-004](../requisitos/07-nao-funcionais.md)).

## Consequências

- **Rollback deixa de ser caso especial** e vira operação normal: marca o evento como revertido e recompõe. É por isso que anular partida em disputa sem prova ficou barato de implementar.
- O schema **precisa nascer com isso** — retrofit exigiria migração retroativa sem dado histórico pra preencher, ou seja, perda permanente. Registrado na [ordem de implementação](../negocio/02-implementacao.md) como parte do item 1, não como etapa posterior.
- Reverter penalidade **não deixa rastro no histórico de reincidência** de quem não fez nada errado, que era requisito explícito.
- Custo: mais escrita e uma consulta agregada em vez de leitura direta. Irrelevante nessa escala.
