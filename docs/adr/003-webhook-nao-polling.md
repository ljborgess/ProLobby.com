# ADR-003 · Plataforma empurra evento pro bot via webhook, com retry

**Status**: aceita
**Data**: 2026-09-04

## Contexto

O bot do Discord precisa reagir a evento que acontece na plataforma: verificação aprovada, lobby fechado, capitão confirmado, resultado processado, punição aplicada. Duas formas de ele saber: consultar a plataforma periodicamente, ou ser chamado quando acontece.

Prazos apertados no fluxo tornam isso relevante — 30 s de confirmação de jogador, 30 s de capitão, criação de canal imediatamente após.

## Decisão

**A plataforma chama um endpoint do bot** quando o evento acontece. Sem confirmação em 10 s, reenvia 3 vezes, em 10 s, 20 s e 40 s (4 tentativas contando o envio original). Esgotado, abre caso de moderação e a fila pausa.

Junto vem a divisão de responsabilidade: **decisão de regra fica na plataforma, execução no Discord fica no bot.** O bot nunca decide quem é capitão, quem é punido ou quando o lobby fecha.

## Alternativas descartadas

**Polling do bot.** Simples e tolerante a queda momentânea da plataforma. Caiu pelo atraso: com prazo de 30 s no fluxo, um intervalo de polling curto o bastante pra ser útil equivale a chamar o tempo todo — e a maioria das chamadas voltaria vazia.

**Fila de mensagem (Kafka, RabbitMQ, SQS).** Entrega garantida e desacoplamento real. Caiu por desproporção: infraestrutura pesada pra 10 lobbies simultâneos, e conflita com o teto de custo de R$ 0 no MVP ([Sustentabilidade](../negocio/03-sustentabilidade.md)). Retry simples cobre o caso real, que é queda momentânea.

**Bot com lógica de negócio própria.** Reduziria chamadas, deixando o bot decidir coisas localmente. Caiu porque duplicaria regra em dois lugares — a mesma razão de o bot [não ter comando de jogador](../discord/03-bot.md).

## Consequências

- **O bot é substituível**: não guarda regra, então reescrevê-lo em outra linguagem não mexe em produto.
- **Queda do bot pausa a fila**, não derruba a plataforma ([RNF-008](../requisitos/07-nao-funcionais.md)). Perfil, histórico e report de resultado continuam funcionando.
- **Retry esgotado é caso de moderação**, não alerta separado — reusa a esteira que já existe.
- Ações do mesmo evento rodam **em sequência**, não em paralelo, pra respeitar o rate limit do Discord sem throttling próprio.
- Custo aceito: sem fila durável, um evento pode ser perdido se o bot ficar fora além dos 3 reenvios. O caso vira moderação manual em vez de silêncio.
