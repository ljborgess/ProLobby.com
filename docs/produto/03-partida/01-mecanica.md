# 0. Mecânica real do EA FC Pro Clubs

**Fase: pesquisa — verificação prática pendente, não é decisão fechada**

## Por que este arquivo existe

O dossiê originalmente assumia um mecanismo do jogo: "host cria uma sala manualmente e convida os outros 21, dois times de 11 se formam ali". Pesquisa em fontes públicas (fórum EA, wikis, guias — ver Fontes) mostra que **esse mecanismo não existe** — Pro Clubs não tem sala privada avulsa. Isso obrigou a redesenhar como o lobby do ProLobby vira uma partida real dentro do jogo. Este arquivo documenta o que a pesquisa confirma e o mecanismo de reconciliação decidido.

## Como Pro Clubs funciona (pesquisa pública, não testado em campo pelo time ainda)

**Clube é entidade persistente**, não algo criado por partida. Até 11 vagas humanas, dono/gerente aprova entrada (busca+aplica, ou convite direto por EA ID/gamertag/PSN). Desde FC 26, um jogador pode ser membro de **até 3 clubes simultâneos** (antes só 1) — não precisa abandonar o clube pessoal pra participar de outro.

Só existem 3 jeitos de jogar 11v11 dentro do modo Clubes:

1. **Liga/divisão** — matchmaking acha **outro clube inteiro** pra enfrentar (não indivíduos avulsos).
2. **Drop-In** — fila pública própria da EA, sorteia posição/lado pra uma sessão única, time se desfaz depois. Ninguém fora da EA controla quem entra ou o pareamento — não serve pro ProLobby (quebra a premissa de matchmaking por elo/categoria).
3. **Amistoso online (Online Friendlies)** — você convida um **clube específico** (por EA ID) pra uma partida marcada. Sempre clube contra clube. **É o mecanismo que o ProLobby usa.**

## Achados confirmados (pesquisa pública)

- **O arquétipo do Virtual Pro pertence ao jogador, não ao clube** — trocar de clube não reseta nem esconde o arquétipo. (Achado original falava de overall/atributos; overall saiu do produto em 2026-09-24.) A premissa de OCR/verificação em [Personagens e verificação](../02-jogador/01-verificacao.md) continua de pé.
- **Amistoso Online exige coordenação manual dos dois gerentes** (busca o clube rival, cada lado clica "pronto" separadamente) — não é automático nem instantâneo. Sincronização real que o bot Discord não alcança (fora do jogo).
- **Crossplay**: clube EA suporta membro de PS5/Xbox/PC misturado (mesma geração — coerente com [Escopo de plataforma, jogo e região](../05-produto/02-escopo.md)).
- **Servidor dedicado, não P2P**: Pro Clubs roda em servidor dedicado da EA (Game Data Centers) — não existe "host de rede" cujo ping afeta os outros. Por isso o dossiê não tem mais conceito de "host" escolhido por conexão (ver [Discord e lobby](03-lobby.md)).
- **IA preenche vaga vazia** quando o clube não tem os 11 humanos completos — recurso padrão do modo, não gambiarra. **É o achado de maior impacto no produto**: sem ele, uma partida exigiria 22 pessoas simultâneas na fila (inviável numa base nova); com ele, a meta cai pra 8 (ver [Fila e matchmaking](02-fila.md) e [tese de mercado](../../negocio/01-mercado.md)). O preenchimento é decisão do **jogo**, não da plataforma — a plataforma só escolhe quando fechar o lobby e com quantos humanos.

## Mecanismo decidido: capitão dinâmico, jogador real

Cada lado do lobby precisa de um clube (Amistoso é sempre clube x clube). Em vez da plataforma manter clubes-casa próprios administrados pelos 4 sócios, **o clube usado é o clube pessoal de um dos próprios jogadores reais daquele lado** — não precisa ser dedicado ao ProLobby, só precisa ter vaga sobrando.

- **Capitão** = 1 dos jogadores reais já pareados pela fila (com elo/reputação normal, matchmaking igual a qualquer outro — ver [Fila e matchmaking](02-fila.md)), que **também** acumula a função de dono/gerente do clube usado naquela partida. Não é vaga extra fora do matchmaking — é um papel a mais em cima de um dos humanos já escalados.
- **Critério de escolha**: maior reputação **entre quem tem clube com vaga sobrando pros outros humanos do lado** — se o de maior reputação não tiver clube (ou não tiver vaga), passa pro próximo, cascata igual ao padrão já usado noutras decisões do dossiê (reatribuição de host antigo, agora aplicado aqui).
- **Fluxo**: capitão convida os outros humanos do próprio lado pro clube dele (por EA ID/gamertag — já coletado no cadastro, ver [Personagens e verificação](../02-jogador/01-verificacao.md)). Aplica a formação votada (ver [Fila e matchmaking](02-fila.md)). Os 2 capitães (um por lado) coordenam Amistoso Online entre os clubes.
- **Depois da partida**: capitão remove os convidados do próprio clube (limpeza pós-jogo). Se travar (não remove, dá erro), vira **caso de moderação** — mesmo fluxo já existente ([Moderação](../04-governanca/01-moderacao.md)).
- **Sem depender dos 4 sócios jogando**: os 4 só sustentam a operação da plataforma (moderação, backlog, decisão de produto) — não precisam estar presentes em nenhuma partida. Resolve a tensão que existia no modelo antigo (clube-casa fixo administrado pelos 4, gargalo de 1 par só).
- **Escala naturalmente**: como cada lobby usa o clube de um jogador diferente (não um recurso fixo da plataforma), múltiplos lobbies rodam em paralelo sem esperar um "clube-casa" liberar — não existe mais o gargalo serial do modelo antigo.

## OCR de resultado precisa ser dinâmico

No modelo antigo (clube-casa fixo), o OCR validava o nome do clube contra uma ficha pré-cadastrada (sempre o mesmo par). Agora o clube usado muda a cada lobby (é o clube do capitão escolhido daquela vez) — o nome do clube já vem da **auto-declaração de cadastro** (mesmo campo que diz se o jogador tem clube com vaga, ver [Discord e lobby](03-lobby.md) "Escolha do capitão") e é guardado como o "par esperado" daquele lobby no momento em que os capitães são confirmados — OCR de fim de partida (ver [Resultado de partida](04-resultado.md)) cruza contra esse par dinâmico.

## Risco novo: capitão é jogador comum, não conta controlada pela plataforma

Diferente do modelo antigo (conta de serviço, sempre confiável), o capitão agora é um jogador comum com poder real dentro do jogo (aceitar/recusar convite, mexer em tática, remover gente). Escolha por maior reputação mitiga risco, mas não elimina — abuso de capitão (recusa convidar sem motivo, remove alguém no meio da formação, etc.) cai no mesmo fluxo de denúncia já existente ([Moderação](../04-governanca/01-moderacao.md)), sem mecanismo novo necessário.

## Compliance com Termos de Serviço da EA (pesquisado, alívio confirmado)

EA proíbe explicitamente "robô, spider ou dispositivo automatizado acessando serviços da EA" e software não-autorizado (macro, hack, cheat) pra ganhar vantagem injusta no jogo. **Nada no desenho do ProLobby esbarra nisso**, por decisão de arquitetura, não por sorte:

- OCR roda em cima de **print que o próprio jogador tira e sobe manualmente** — processamento acontece no servidor do ProLobby, nunca é acesso automatizado a um serviço da EA.
- Toda ação dentro do jogo (convidar pro clube, ajustar tática, iniciar Amistoso) é feita **manualmente pelo capitão humano** — nunca por bot/script controlando o cliente do jogo ou a conta EA.
- Bot Discord só toca o servidor Discord — nunca se conecta a serviço da EA.
- ProLobby não dá vantagem competitiva **dentro** da partida (sem macro, sem cheat) — é ferramenta de coordenação externa, mesma categoria de outras já existentes no mercado (Pro Clubs Hub, Pro Clubs Finder, servidores com bot Disporty — ver [tese de mercado](../../negocio/01-mercado.md)) sem ação de enforcement conhecida contra elas.

Fontes: [EA Terms of Service](https://tos.ea.com/legalapp/webterms/US/en/PC/09042012), [EA Account bans/suspensions](https://help.ea.com/en/help/account/information-about-locked-or-banned-or-suspended-accounts/).

## Pendência crítica

**Ninguém do time testou isso na prática ainda.** [Discord e lobby](03-lobby.md) já reflete esse mecanismo, mas os detalhes exatos (tempo de convite, se há cooldown de saída, fricção do Amistoso) continuam em aberto até o teste prático confirmar.

## Checklist de teste

O passo a passo completo do teste prático vive em arquivo próprio: **[05-checklist.md](05-checklist.md)** — 8 testes, o que medir em cada um, e o que fazer com cada resultado possível.

## Fontes (pesquisa pública, EA FC 25/26 — mecânica pode mudar por edição/patch)

- [EA FC Pro Clubs Complete Guide for New Players (2026)](https://proclubs.io/blog/ea-fc-pro-clubs-complete-guide)
- [How to Create a Club in EA FC Pro Clubs: Step-by-Step Guide](https://proclubs.io/blog/how-to-create-club-ea-fc-pro-clubs)
- [EA SPORTS FC™ 26 Clubs — site oficial](https://www.ea.com/games/ea-sports-fc/clubs)
- [EA SPORTS FC 25 | Clubs Deep Dive](https://www.ea.com/en/games/ea-sports-fc/fc-25/news/pitch-notes-fc-25-clubs-deep-dive)
- [Suggestion: Add Private/Friendly Matchmaking to Rush Clubs like the league — EA Forums](https://forums.ea.com/discussions/fc-26-feedback-en/suggestion-add-privatefriendly-matchmaking-to-rush-clubs-like-the-league/13059910)
- [Pro Clubs (Friendlies) — EA Forums](https://forums.ea.com/discussions/fc-26-game-modes-en/pro-clubs-friendlies/13615191)
- [Online Pro Clubs — EA Sports FC wiki (Fandom)](https://easportsfc.fandom.com/wiki/Online_Pro_Clubs)
- [Drop-In Match — FIFPlay](https://www.fifplay.com/encyclopedia/drop-in-match/)
- [Huge Issue with Clubs (AI players missing Roles and tactics not saving) — EA Forums](https://forums.ea.com/idea/fc-25-bug-reports-en/huge-issue-with-clubs-ai-players-missing-roles-and-tactics-not-saving/12106046) — confirma que IA preenche vaga vazia quando clube não tem os 11 humanos
- [EA FC 26 Pro Clubs Introduces Multi-Club Support — Insider Gaming](https://insider-gaming.com/ea-fc-26-pro-clubs-introduces-multi-club-support-major-ai-player-upgrades/) — confirma até 3 clubes simultâneos por jogador
