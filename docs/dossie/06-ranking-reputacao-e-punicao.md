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
