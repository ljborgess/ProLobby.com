# 6. Ranking, reputação e punição

**Fase: MVP**

## Dois eixos separados

- **Reputação** — mede comportamento: reportou certo, não sumiu, print bateu, entrou no lobby a tempo, não desconectou/rage quit. Afeta prioridade/acesso à fila. **Escala 0-100, começa em 70** (neutro-alto, dá benefício da dúvida pra conta nova em vez de partir de zero como se já fosse suspeita).
- **Elo/rating** — mede desempenho competitivo (vitória/derrota real). Usado no equilíbrio de times (ver [Fila e matchmaking](../03-partida/02-fila.md)), pesa mais que overall. **Escala numérica livre, baseline 1000** (convenção clássica de sistema Elo, familiar pra quem já jogou qualquer coisa com rating competitivo).

Motivo de separar: um jogador pode ser ótimo competidor com reputação ruim (sempre atrasado pra reportar), ou reputação impecável mas fraco tecnicamente. Misturar os dois num score só distorce as duas funções.

## Cálculo do elo

- Elo sobe/desce **só pelo resultado do time** (vitória/derrota) — estatística individual extraída do OCR de fim de partida (gols, assistências, nota) fica **registrada no histórico do personagem** (perfil, flavor), mas não pesa no elo. Evita depender de OCR confiável linha-a-linha de todos os jogadores da partida (superfície grande de erro/fraude) e mantém critério simples e difícil de contestar.
- **Elo é por personagem/categoria, não por conta** — goleiro, zaga, meio, ponta e ataque têm elo próprio cada. Desempenho numa posição não se transfere pra outra; evita abuso de subir elo fácil numa categoria e usar em outra. Reputação continua **por conta** (comportamento é da pessoa, não da posição).
- **Elo inicial (personagem novo numa categoria)**: seed calculado a partir do overall extraído do print, com **piso em overall 50** (overall abaixo disso ainda ancora em 50, evita elo inicial baixo/negativo pra Virtual Pro recém-criado com atributo bem baixo) — overall 99 → elo próximo de 1400; overall 50 → elo próximo de 600, escala linear entre esses pontos. Esse seed pesa **100% na primeira partida, decaindo 12,5 pontos percentuais por partida** até chegar a 0% na 9ª partida — a partir daí é elo puramente real (resultado), sem influência de overall. Motivo: em base pequena de usuários, elo puro neutro demora a convergir (poucas partidas rodando) e deixa os primeiros equilíbrios de time ruins; overall serve só de chute inicial, nunca de peso permanente.
- **Variação de elo por partida (K-factor)**: **32 pontos** durante as primeiras **9 partidas** do personagem na categoria (mesma janela de decaimento do seed acima — elo ainda calibrando, varia mais rápido), **20 pontos** a partir da 10ª partida (elo já estabilizado, varia mais devagar). Cálculo de ganho/perda dentro desse K-factor segue fórmula Elo padrão (probabilidade esperada de vitória pela diferença de elo entre os dois lados).
- **Decaimento por inatividade**: personagem sem partida por **60 dias** passa a perder **25 pontos de elo por mês** parado, com **piso no seed original** — nunca desce abaixo do elo com que começou.
  - **Motivo corrigido**: a justificativa original era "ranking cheio de número congelado", o que não se sustenta — o [ranking já exclui](03-perfil.md) quem não jogou nos últimos 30 dias, e o decaimento só começa aos 60. Quem está parado saiu da vitrine muito antes de perder ponto.
  - O efeito real, e o único que justifica a regra, é no **matchmaking de quem volta**: elo é estimativa de força, estimativa de 6 meses atrás vale menos que a de ontem, e voltar com número inflado desequilibra a partida de outras 7 pessoas.
  - Não é punição, e a distinção importa: a [recuperação de reputação](#recuperação-de-reputação) rejeitou explicitamente ganho por tempo parado porque reputação mede **conduta**, e ausência não é má conduta. Elo é outra coisa — é estimativa de força, e estimativa velha vale menos.
  - O piso no seed evita espiral: quem some por um ano volta ao ponto de partida, não a zero.
- **Correção/atualização de personagem** (reenviar print, corrigir dado — mesmo slot/categoria) **mantém o elo** — é a mesma pessoa jogando a mesma posição, não reset.
- **Rollback retroativo**: elo/reputação aplicados por um report "não confirmado" (ver [Resultado de partida](../03-partida/04-resultado.md)) são provisórios até fechar a janela de contestação (48h). Se a moderação resolve uma disputa e o resultado final diverge do que já foi aplicado, sistema **recalcula e corrige elo/reputação de todos os humanos envolvidos** — sem isso, a confiabilidade do elo (motivo documentado acima, por que pesa mais que overall) quebra em qualquer disputa revertida.
  - **Exige log de eventos, não só valor atual**: elo e reputação precisam guardar cada alteração com motivo, partida de origem e data ([Modelo de dados](../../requisitos/03-dados.md)) — guardando só o número corrente, não há como desfazer o que não foi registrado, e o rollback decidido aqui seria inimplementável. O mesmo log é o que torna os contadores de janela móvel de 30 dias contáveis e o teto de 70 da recuperação aplicável.
  - Rollback inclui **contadores de reincidência** (os usados pra escalar penalidade de zero-report e de não-confirmar-lobby, ver [Fila e matchmaking](../03-partida/02-fila.md) e [Resultado de partida](../03-partida/04-resultado.md)) — uma penalidade revertida não pode deixar rastro permanente no histórico de reincidência de quem não fez nada errado.

## Avaliação por pares (pós-partida)

Eventos automáticos (não reportar, não confirmar lobby, desconectar) não pegam comportamento tóxico em call nem quem joga mal de propósito. Avaliação entre jogadores cobre esse buraco, desenhada pra não virar arma de vingança:

- **Só avalia quem jogou no próprio time** (os companheiros humanos daquele lado — vagas de IA obviamente não são avaliadas) — nunca o adversário. Elimina de saída o principal vetor de abuso: perder a partida e descer o pau em todo mundo do outro lado.
- **Joinha (positivo)**: **+1 ponto de reputação**, efeito direto e imediato. Baixo risco — reputação só sobe.
- **Não-joinha / report (negativo)**: **não desce reputação na hora**. Vira sinal acumulado. Só quando alguém junta **5 negativos em 30 dias, vindos de pessoas diferentes em partidas diferentes**, abre **caso automático de moderação** (não punição automática — ver [Moderação](../04-governanca/01-moderacao.md)).
- Motivo do negativo não ter efeito direto: uma pessoa irritada sozinha não pune ninguém (efeito zero), e panelinha não funciona porque exige pessoas diferentes em partidas diferentes. Padrão real de toxicidade aparece; ruído isolado não. Punição continua sendo decisão humana.
- Avaliação é **opcional** — não avaliar não gera penalidade nenhuma.

## Recuperação de reputação

A escada de punição abaixo tem degraus de saída, mas até aqui não havia **como subir de volta** — o único ganho era joinha de companheiro, +1 e opcional. Quem caísse a 40 precisaria de 15 joinhas pra voltar aos 55 e sair da fila lenta, estando justamente em prioridade pior no matchmaking. Punição desenhada como temporária virava permanente na prática.

- **+1 por partida limpa**, até o teto de **70** (o valor inicial). Partida limpa = completada, com resultado reportado, sem desconexão e sem denúncia procedente contra você naquela partida.
- **Acima de 70 só se chega por joinha.** Separação deliberada: jogar direito **reabilita**, elogio de companheiro **distingue**. Se partida limpa levasse a 100, a avaliação por pares perderia sentido.
- Não existe recuperação por tempo passado sem jogar — premiaria sumir depois de se comportar mal, que é o sinal oposto ao desejado.

## Escada de punição

1. **Reputação abaixo de 55** → fila mais lenta / prioridade pior na fila (fricção, sem bloqueio) — outros jogadores com reputação normal são priorizados no matchmaking quando há fila.
2. **Reputação abaixo de 40 (piso crítico)** → suspensão temporária de **7 dias sem fila**.
3. **Reputação abaixo de 25**, reincidência de suspensão, ou fraude grave (print falso comprovado) → banimento permanente.

Apelação disponível em qualquer degrau, via chamado pra moderação (ver [Moderação](../04-governanca/01-moderacao.md)).

- **Suspensão aplicada durante lobby confirmado/partida em andamento**: não expulsa a pessoa no meio do jogo (prejudicaria os outros humanos inocentes que dependem dela pra completar o time) — suspensão só bloqueia a **próxima** tentativa de entrar na fila, partida em curso termina normalmente.

- Suspensão/banimento afeta **só o acesso à fila/matchmaking dentro da plataforma** — não expulsa automaticamente do servidor Discord da comunidade (pessoa punida ainda pode ver avisos, discutir, apelar). Kick do Discord fica reservado a caso extremo, decisão manual da moderação, não automática. Consequência no Discord (revogação de cargo, log) documentada em [docs/discord/](../../discord/README.md).

## Multi-conta / smurfing

- Banimento vinculado à combinação **Discord ID + gamertag/PSN** (a mesma identidade registrada em [Personagens e verificação](01-verificacao.md)) — bloqueia os dois de recriarem conta pra escapar de punição.
- Não é anti-fraude perfeito (detecção mais forte tipo device fingerprint/IP fica pra quando o volume de abuso justificar o investimento) — deliberadamente não superdimensionado pro MVP.

## Conluio de resultado (Futuro — risco aceito, severidade aumentada)

- Placar combinado entre os dois lados (ambos "confirmam" o mesmo resultado falso) não gera disputa hoje, porque os prints batem — não é coberto pelo fluxo de report atual.
- **O piso de 8 humanos (ver [Fila e matchmaking](../03-partida/02-fila.md)) aumentou a exposição a isso**: antes exigia coordenar 22 pessoas pra dominar um lobby; agora bastam 8 amigos entrando na fila num horário vazio pra ocupar o lobby inteiro e combinar o resultado. Farm de elo fica viável pra um grupo pequeno e organizado.
- **Decisão: risco aceito por enquanto** — base pequena onde os 4 conhecem quem joga, e detecção sofisticada não se justifica sem volume de dado. Mas o gatilho de revisão mudou: **não esperar "volume grande" pra tratar** — se aparecer qualquer sinal de grupo fechado se enfrentando repetidamente em horário vazio, tratar já, mesmo com base pequena.
- Detecção por **padrão** (não por print individual), quando for implementada: sinalizar pra moderação (não bloqueio automático) casos como mesmo grupo de contas se enfrentando repetidamente, lobby fechando no piso mínimo com os mesmos jogadores, ou elo subindo fora da curva normal.
