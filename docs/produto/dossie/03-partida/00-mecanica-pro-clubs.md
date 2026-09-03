# 0. Mecânica real do EA FC Pro Clubs

**Fase: pesquisa — verificação prática pendente, não é decisão fechada**

## Por que este arquivo existe

Vários pontos do dossiê (fila/matchmaking, Discord/lobby, resultado) assumem um mecanismo do jogo: "host cria uma sala manualmente e convida os outros 21, dois times de 11 se formam ali". Pesquisa em fontes públicas (fórum EA, wikis, guias — ver fontes no fim) indica que **esse mecanismo pode não existir do jeito que o dossiê assume**. Isso é uma peça técnica que decide como o lobby vira partida de verdade — vale mais que qualquer outro buraco levantado até agora, porque se estiver errado, quebra o fluxo central do produto.

## Como Pro Clubs funciona (segundo pesquisa pública, não testado em campo pelo time ainda)

**Clube é entidade persistente**, não algo criado por partida. Até 11 vagas humanas, dono/gerente aprova entrada (busca+aplica, ou convite direto por EA ID/gamertag/PSN).

Só existem 3 jeitos de jogar 11v11 dentro do modo Clubes:

1. **Liga/divisão** — matchmaking acha **outro clube inteiro** pra enfrentar (não indivíduos avulsos).
2. **Drop-In** — fila pública própria da EA, sorteia posição/lado pra uma sessão única, time se desfaz depois. Ninguém fora da EA controla quem entra ou o pareamento.
3. **Amistoso online (Online Friendlies)** — você convida um **clube específico** (por EA ID) pra uma partida marcada. Ainda é clube contra clube, não indivíduo contra indivíduo.

**Não foi encontrado nenhum mecanismo oficial de "sala privada avulsa"** onde um host junta 21 estranhos sem vínculo de clube numa partida 11v11 só daquela vez. O mais próximo é o Drop-In, mas aí o pareamento é decidido pela EA, não pelo ProLobby — quebra a premissa de matchmaking por elo/categoria que já foi fechada no dossiê.

## Mecanismo proposto pra reconciliar (dedução, não confirmada em campo)

ProLobby manteria um **pool de "clubes-casa" próprios**, já criados dentro do jogo (ex.: pares fixos tipo Clube Alpha / Clube Beta, quantos pares forem necessários pra rodar lobbies em paralelo). Quando o lobby fecha:

1. O host de cada lado (ou uma conta de gerente controlada pela plataforma) convida os outros 10 do próprio time pro clube-casa correspondente, por EA ID/gamertag.
2. Um clube-casa desafia o outro via Amistoso Online.
3. Depois da partida, todo mundo sai do clube-casa de novo — fica "vazio", pronto pro próximo lobby reusar.

**Consequência se isso for confirmado**: muda peça real de [Discord e lobby](04-discord-e-lobby.md) — "escolha do host" deixa de ser só "quem cria a sala", vira também "quem tem/recebe permissão de gerente daquele clube-casa específico pra aquela partida". E a plataforma passa a precisar manter/administrar N clubes dentro do próprio EA FC — isso é operação nova, fora do que já foi desenhado.

## Pendência crítica

**Ninguém do time testou isso na prática ainda.** Antes de fechar qualquer decisão de fluxo de lobby/host em cima disso, alguém precisa:
- Criar 2 clubes de teste.
- Convidar contas de teste pra dentro via EA ID.
- Rodar um Amistoso Online entre os dois.
- Confirmar: dá pra fazer isso rápido o bastante pra não travar a janela de entrada no lobby (hoje ~timer curto pós-confirmação)? Dá pra automatizar convite/remoção via alguma ferramenta, ou é 100% manual dentro do jogo?

Enquanto isso não for testado, [Discord e lobby](04-discord-e-lobby.md) continua descrevendo o fluxo antigo (sala manual) como premissa — não foi alterado ainda de propósito, até essa verificação acontecer.

## Fontes (pesquisa pública, EA FC 25/26 — mecânica pode mudar por edição/patch)

- [EA FC Pro Clubs Complete Guide for New Players (2026)](https://proclubs.io/blog/ea-fc-pro-clubs-complete-guide)
- [How to Create a Club in EA FC Pro Clubs: Step-by-Step Guide](https://proclubs.io/blog/how-to-create-club-ea-fc-pro-clubs)
- [EA SPORTS FC™ 26 Clubs — site oficial](https://www.ea.com/games/ea-sports-fc/clubs)
- [EA SPORTS FC 25 | Clubs Deep Dive](https://www.ea.com/en/games/ea-sports-fc/fc-25/news/pitch-notes-fc-25-clubs-deep-dive)
- [Suggestion: Add Private/Friendly Matchmaking to Rush Clubs like the league — EA Forums](https://forums.ea.com/discussions/fc-26-feedback-en/suggestion-add-privatefriendly-matchmaking-to-rush-clubs-like-the-league/13059910)
- [Pro Clubs (Friendlies) — EA Forums](https://forums.ea.com/discussions/fc-26-game-modes-en/pro-clubs-friendlies/13615191)
- [Online Pro Clubs — EA Sports FC wiki (Fandom)](https://easportsfc.fandom.com/wiki/Online_Pro_Clubs)
- [Drop-In Match — FIFPlay](https://www.fifplay.com/encyclopedia/drop-in-match/)
