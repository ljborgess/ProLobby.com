# 6. Ranking, reputação e punição

**Fase: MVP**

## Dois eixos separados

- **Reputação** — mede comportamento: reportou certo, não sumiu, print bateu, entrou no lobby a tempo, não desconectou/rage quit. Afeta prioridade/acesso à fila.
- **Elo/rating** — mede desempenho competitivo (vitória/derrota real). Usado no equilíbrio de times (ver [Fila e matchmaking](../03-partida/03-fila-e-matchmaking.md)), pesa mais que overall.

Motivo de separar: um jogador pode ser ótimo competidor com reputação ruim (sempre atrasado pra reportar), ou reputação impecável mas fraco tecnicamente. Misturar os dois num score só distorce as duas funções.

## Cálculo do elo

- Elo sobe/desce **só pelo resultado do time** (vitória/derrota) — estatística individual extraída do OCR de fim de partida (gols, assistências, nota) fica **registrada no histórico do personagem** (perfil, flavor), mas não pesa no elo. Evita depender de OCR confiável linha-a-linha de 22 jogadores por partida (superfície grande de erro/fraude) e mantém critério simples e difícil de contestar.
- **Elo é por personagem/categoria, não por conta** — goleiro, zaga, meio, ponta e ataque têm elo próprio cada. Desempenho numa posição não se transfere pra outra; evita abuso de subir elo fácil numa categoria e usar em outra. Reputação continua **por conta** (comportamento é da pessoa, não da posição).
- **Elo inicial (personagem novo numa categoria)**: seed calibrado pelo overall extraído do print, com peso decaindo rápido nas primeiras partidas (~5-10) até o elo real (resultado) dominar sozinho. Motivo: em base pequena de usuários, elo puro neutro demora a convergir (poucas partidas rodando) e deixa os primeiros equilíbrios de time ruins; overall serve só de chute inicial, nunca de peso permanente.
- **Correção/atualização de personagem** (reenviar print, corrigir dado — mesmo slot/categoria) **mantém o elo** — é a mesma pessoa jogando a mesma posição, não reset.
- **Rollback retroativo**: elo/reputação aplicados por um report "não confirmado" (ver [Resultado de partida](../03-partida/05-resultado-de-partida.md)) são provisórios até fechar a janela de contestação (48h). Se a moderação resolve uma disputa e o resultado final diverge do que já foi aplicado, sistema **recalcula e corrige elo/reputação dos 22 envolvidos** — sem isso, a confiabilidade do elo (motivo documentado acima, por que pesa mais que overall) quebra em qualquer disputa revertida.
  - Rollback inclui **contadores de reincidência** (os usados pra escalar penalidade de zero-report e de não-confirmar-lobby, ver [Fila e matchmaking](../03-partida/03-fila-e-matchmaking.md) e [Resultado de partida](../03-partida/05-resultado-de-partida.md)) — uma penalidade revertida não pode deixar rastro permanente no histórico de reincidência de quem não fez nada errado.

## Escada de punição

1. Reputação baixa → fila mais lenta / prioridade pior (fricção, sem bloqueio).
2. Abaixo de piso crítico → suspensão temporária (ex.: 7 dias sem fila).
3. Reincidência ou fraude grave (ex.: print falso comprovado) → banimento permanente.

Apelação disponível em qualquer degrau, via chamado pra moderação (ver [Moderação](../04-governanca/07-moderacao.md)).

- **Suspensão aplicada durante lobby confirmado/partida em andamento**: não expulsa a pessoa no meio do jogo (prejudicaria os outros 21 inocentes que dependem dela pra fechar 11v11) — suspensão só bloqueia a **próxima** tentativa de entrar na fila, partida em curso termina normalmente.

- Suspensão/banimento afeta **só o acesso à fila/matchmaking dentro da plataforma** — não expulsa automaticamente do servidor Discord da comunidade (pessoa punida ainda pode ver avisos, discutir, apelar). Kick do Discord fica reservado a caso extremo, decisão manual da moderação, não automática. Consequência no Discord (revogação de cargo, log) documentada em [docs/discord/](../../../discord/README.md).

## Multi-conta / smurfing

- Banimento vinculado à combinação **Discord ID + gamertag/PSN** (a mesma identidade registrada em [Personagens e verificação](02-personagens-e-verificacao.md)) — bloqueia os dois de recriarem conta pra escapar de punição.
- Não é anti-fraude perfeito (detecção mais forte tipo device fingerprint/IP fica pra quando o volume de abuso justificar o investimento) — deliberadamente não superdimensionado pro MVP.

## Conluio de resultado (Futuro)

- Placar combinado entre os dois lados (ambos "confirmam" o mesmo resultado falso) não gera disputa hoje, porque os prints batem — não é coberto pelo fluxo de report atual.
- Detecção por **padrão** (não por print individual), fica pra quando houver volume de dado histórico suficiente: sinalizar pra moderação (não bloqueio automático) casos como mesmo grupo de contas se enfrentando repetidamente com resultado sempre no mesmo sentido, ou elo subindo fora da curva normal.
