# 6. Ranking, reputação e punição

**Fase: MVP**

## Dois eixos separados

- **Reputação** — mede comportamento: reportou certo, não sumiu, print bateu, entrou no lobby a tempo, não desconectou/rage quit. Afeta prioridade/acesso à fila.
- **Elo/rating** — mede desempenho competitivo (vitória/derrota real). Usado no equilíbrio de times (ver [Fila e matchmaking](03-fila-e-matchmaking.md)), pesa mais que overall.

Motivo de separar: um jogador pode ser ótimo competidor com reputação ruim (sempre atrasado pra reportar), ou reputação impecável mas fraco tecnicamente. Misturar os dois num score só distorce as duas funções.

## Escada de punição

1. Reputação baixa → fila mais lenta / prioridade pior (fricção, sem bloqueio).
2. Abaixo de piso crítico → suspensão temporária (ex.: 7 dias sem fila).
3. Reincidência ou fraude grave (ex.: print falso comprovado) → banimento permanente.

Apelação disponível em qualquer degrau, via chamado pra moderação (ver [Moderação](07-moderacao.md)).

## Multi-conta / smurfing

- Banimento vinculado à combinação **Discord ID + gamertag/PSN** (a mesma identidade registrada em [Personagens e verificação](02-personagens-e-verificacao.md)) — bloqueia os dois de recriarem conta pra escapar de punição.
- Não é anti-fraude perfeito (detecção mais forte tipo device fingerprint/IP fica pra quando o volume de abuso justificar o investimento) — deliberadamente não superdimensionado pro MVP.

## Conluio de resultado (Futuro)

- Placar combinado entre os dois lados (ambos "confirmam" o mesmo resultado falso) não gera disputa hoje, porque os prints batem — não é coberto pelo fluxo de report atual.
- Detecção por **padrão** (não por print individual), fica pra quando houver volume de dado histórico suficiente: sinalizar pra moderação (não bloqueio automático) casos como mesmo grupo de contas se enfrentando repetidamente com resultado sempre no mesmo sentido, ou elo subindo fora da curva normal.
