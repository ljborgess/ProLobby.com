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

**Alívio confirmado**: overall/atributos do Virtual Pro pertencem ao **jogador/arquétipo**, não ao clube — trocar de clube (entrar num clube-casa temporário) não reseta nem esconde o overall real. A premissa de OCR/verificação em [Personagens e verificação](../02-jogador/02-personagens-e-verificacao.md) continua de pé mesmo com o mecanismo de clube-casa.

**Fricção nova confirmada**: Amistoso Online exige **coordenação manual dos dois gerentes** (busca o clube rival, cada lado clica "pronto" separadamente) — não é automático nem instantâneo. Isso é uma sincronização real que o bot Discord não alcança (fora do jogo).

**Alívio confirmado — crossplay**: clube EA suporta membro de **PS5/Xbox/PC misturado** (mesma geração — PS4/Xbox One não entram, coerente com o que já foi fechado em [Escopo de plataforma, jogo e região](../05-produto/08-escopo-plataforma-jogo-regiao.md)). Clube-casa não precisa ser um por plataforma — 1 clube-casa serve lobby misto normalmente.

## Mecanismo proposto pra reconciliar (dedução, não confirmada em campo)

ProLobby manteria um **pool de "clubes-casa" próprios**, já criados dentro do jogo (ex.: pares fixos tipo Clube Alpha / Clube Beta, quantos pares forem necessários pra rodar lobbies em paralelo). Quando o lobby fecha:

1. O operador da conta de serviço (gerente do clube-casa) convida os **10 jogadores reais** de cada time pro clube-casa correspondente, por EA ID/gamertag — o gerente já ocupa a 11ª vaga com o próprio Virtual Pro, jogando junto (confirmado: gerente é um dos jogadores em campo, sem restrição de posição). Não depende de nenhum jogador específico virar "host" (conceito removido do desenho, ver [Discord e lobby](04-discord-e-lobby.md): Pro Clubs usa servidor dedicado, sem papel de host de rede).
2. Um clube-casa desafia o outro via Amistoso Online.
3. Depois da partida, todo mundo sai do clube-casa de novo — fica "vazio", pronto pro próximo lobby reusar.

**Consequência**: [Discord e lobby](04-discord-e-lobby.md) não tem mais conceito de "host" — removido do desenho porque Pro Clubs usa servidor dedicado (sem host de rede) e o poder de admin dentro do jogo é da conta de serviço, não de um jogador escolhido. A plataforma passa a precisar manter/administrar N clubes dentro do próprio EA FC — isso é operação nova, fora do que já foi desenhado antes desse achado.

## Decisões já fechadas sobre a operação (independente do resultado do teste)

- **Escala no MVP**: **1 par de clube-casa só**, base pequena de usuário no início — mesmo racional já usado noutras decisões (não superdimensionar cedo). Escala pra mais pares em Fase 2/Futuro quando volume de lobby simultâneo justificar.
- **Gargalo serial aceito no MVP**: com 1 par só, o próximo lobby só fecha depois do anterior esvaziar (convite → jogo → limpeza manual, tudo dentro do jogo). Fila **não precisa** de mensagem/estado especial distinguindo "esperando jogador" de "esperando clube-casa liberar" — aceito como limitação conhecida do MVP, revisar se virar gargalo real com volume maior.
- **Limpeza pós-partida é manual, dentro do jogo, fora do alcance do bot**: bot Discord não tem como mexer em clube EA (sem API). Gerente da conta de serviço entra no jogo e remove os 20 convidados depois de cada partida reportada — mesmo gatilho de tempo já usado pra deletar canal de voz do lobby (ver [Resultado de partida](05-resultado-de-partida.md)). Se alguém travar a remoção (não sai, dá erro), vira **caso de moderação** — mesmo fluxo já existente ([Moderação](../04-governanca/07-moderacao.md)), não mecanismo novo.
- **Mecânica de "estar no clube"**: conta de serviço já é dona/gerente do clube-casa desde a criação — quem opera só loga direto nessa conta compartilhada, não existe passo separado de "entrar no clube" (sem convite, sem aprovação, é a própria identidade do clube).
- **Quem entre os 4 opera a conta de serviço**: **deliberadamente adiado** — decide quando rodar o teste prático (ver checklist abaixo), não precisa fechar antes disso.
- **Formação tática aplicada pelo gerente**: o voto de formação pós-lobby (ver [Fila e matchmaking](03-fila-e-matchmaking.md)) precisa ser aplicado no menu de tática do clube-casa por quem tem permissão de gerente — mais um passo do mesmo ciclo já documentado (convite → formação → iniciar amistoso), não mecanismo novo.
- **OCR valida também o nome do clube-casa**: tela de fim de partida mostra placar entre clubes ("Clube A x Clube B"), não entre jogadores individuais. OCR (já desenhado em [Resultado de partida](05-resultado-de-partida.md)) passa a extrair e cruzar o **nome dos 2 clubes** contra o par de clube-casa atribuído àquele lobby, além do placar — fecha uma brecha real (sem isso, nada impede alguém de reportar print de partida qualquer fora do ProLobby como se fosse a do lobby).
- **Registro interno dos clubes-casa**: ficha administrativa (não cadastro de jogador, não tela pública) mantida pelos 4 — nome do clube, plataforma, EA ID/gamertag da conta de serviço, status livre/ocupado. MVP tem 1 linha (o único par); Fase 2+ adiciona linha por par novo. Vive junto com o painel de moderação já documentado em [Moderação](../04-governanca/07-moderacao.md), não precisa de tela nova.
- **Composição real da partida**: confirmado que o gerente da conta de serviço **ocupa 1 das 11 vagas em campo, jogando** (não é só administrativo) — sem restrição de posição do jogo, livre escolha de quem opera. Isso muda a conta do matchmaking: **20 jogadores reais** (10 por lado, pareados por elo/categoria), não 22 — a 11ª vaga de cada lado é do gerente, fora do matchmaking, sem elo/reputação rastreados. Distribuição de categoria pros 10 reais: **1 GK + 3 Zaga/Lateral + 2 Meio + 2 Ponta + 2 Ataque** (ver [Fila e matchmaking](03-fila-e-matchmaking.md)). Posição do gerente em campo fica livre, sem regra fixa da plataforma.

**Resolvido (alívio forte, ainda pendente de confirmação prática exata)**: Pro Clubs tem como **recurso padrão do próprio modo** a IA preencher vaga vazia quando o clube não tem os 11 humanos completos (confirmado em fontes públicas — ver Fontes). Isso significa que o gerente **não precisa jogar ativamente** — ele é dono/administrador do clube-casa (convida, ajusta tática, inicia o amistoso), mas a própria vaga dele em campo pode ficar com a IA controlando, já que o clube roda com só 10 humanos reais + a vaga do gerente vazia/AFK. Alinha com a visão do time: os 4 sócios só sustentam a operação da plataforma, não precisam jogar partida nenhuma pessoalmente. Fica como item do checklist (item 8 abaixo) só pra confirmar comportamento exato dentro de Amistoso Online especificamente (a maior parte da documentação pública fala de Liga/Drop-In, não testado ainda se Amistoso se comporta igual) — mas deixa de ser bloqueio estrutural, vira detalhe a confirmar.

## Pendência crítica

**Ninguém do time testou isso na prática ainda.** [Discord e lobby](04-discord-e-lobby.md) já foi atualizado pra remover a premissa antiga (sala manual criada por host — não existe mais, ver achado sobre servidor dedicado abaixo), mas os detalhes exatos do mecanismo de clube-casa (quem convida, como, conteúdo do canal de texto compartilhado) continuam em aberto até o teste prático confirmar.

## Checklist de teste — o que precisa

Escopo do teste: **validar o mecanismo**, não simular um lobby cheio. 4 contas (os 4 sócios) bastam — não precisa dos 22. Um dos 4 já tem clube criado; o teste real fica pra quando o time decidir rodar (esta seção documenta o passo a passo pra quando isso acontecer, não bloqueia o resto do dossiê).

**Pré-requisito**: 2 clubes existentes (1 já tem — criar o segundo, ou usar um clube de teste dos outros 3 sócios).

**Passo a passo**:

1. **Convite pra dentro do clube** — dono/gerente do Clube A convida uma conta que NÃO é membro (por EA ID/gamertag/PSN, sem ela ter aplicado antes). Cronometra quanto tempo leva do convite até a pessoa estar jogável no clube.
2. **Saída do clube** — a pessoa convidada sai do clube (ou é removida pelo gerente). Confirma que sai limpo, sem cooldown pra entrar em outro clube depois (crítico: se tiver cooldown de saída, o mecanismo de "clube-casa reciclável por partida" morre).
3. **Permissão de convite** — confirma se **só o dono/gerente** consegue convidar, ou se qualquer membro consegue. Já decidido: gerente é sempre a conta de serviço fixa da plataforma (sem conceito de "host" jogador — ver acima).
4. **Amistoso Online entre os 2 clubes** — com os times minimamente povoados (não precisa 11, testa com o que tiver), dispara um Amistoso Online do Clube A contra o Clube B. Confirma: dá pra marcar/iniciar em poucos minutos, ou tem fricção (agendamento, aprovação do outro lado, etc)?
5. **Operação de 2 sessões separadas** — cada sessão do jogo é 1 conta logada por vez; não dá pra uma sessão controlar os 2 clubes ao mesmo tempo. Confirma se dá pra 1 pessoa **alternar entre 2 perfis/dispositivos** (2 consoles, ou 2 contas em 2 devices) com fluidez suficiente pra não travar o lobby — uma sessão logada no clube-casa A convida/confirma, outra logada no B faz o mesmo, os dois clicam "pronto" pra iniciar o amistoso.
6. **Tempo total do ciclo** — soma passos 1+3+4+5: do convite até a bola rolar, quanto tempo passa? Compara com a janela de confirmação de lobby já definida (~30s pra aceitar + tempo de entrar na call/sala — ver [Fila e matchmaking](03-fila-e-matchmaking.md) e [Discord e lobby](04-discord-e-lobby.md)). Se o ciclo de clube for mais lento que a paciência de 22 pessoas esperando, o mecanismo não serve como está, mesmo que funcione tecnicamente.
7. **Automação** — existe alguma ferramenta (API não-oficial, addon, o que for) pra automatizar convite/remoção, ou é 100% clique manual dentro do menu do jogo pra cada uma das 21 pessoas (11 por lado, o gerente já é a conta de serviço)? Se for manual, quem opera a conta de serviço tem trabalho braçal considerável a cada partida.
8. **Confirma cobertura de IA na vaga do gerente, especificamente em Amistoso Online** — recurso de IA preenchendo vaga vazia já é confirmado como padrão do modo Clubes (ver Fontes), mas ainda não testado se funciona igual dentro de Amistoso (não só Liga/Drop-In). Depois de iniciar o amistoso, confirma que o gerente pode largar o controle (não jogar) e a IA assume a vaga dele sem quebrar a partida, prejudicar excessivamente o time, ou gerar penalidade de AFK.

**Critério de decisão pós-teste**:
- Se os passos 1-5 funcionam rápido (minutos), sem cooldown de saída, **e o item 8 confirma que IA cobre bem a vaga do gerente em Amistoso** → mecanismo de clube-casa é viável e escala: operação nova (plataforma administra o clube-casa), sem depender de jogador humano presente durante a partida.
- Se tem cooldown de saída, ou convite/coordenação dos 2 gerentes é lento/tem fricção, ou só funciona sem automação nenhuma, **ou o item 8 mostra que a IA não cobre bem em Amistoso** (precisa de controle humano ativo) → mecanismo de clube-casa não escala pro produto como pensado, precisa reabrir a discussão (ex.: usar Drop-In aceitando que a EA decide o pareamento, ou repensar o que "partida coordenada pela plataforma" significa).

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
