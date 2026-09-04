# 4. Discord e lobby

**Fase: MVP**

## Contexto

Sala/partida dentro do jogo não é criada pela plataforma diretamente (EA não expõe API pra isso) — a plataforma vira central de **coordenação**, não de execução da partida em si. O mecanismo de como os humanos confirmados viram uma partida real de 11v11 (com IA cobrindo as vagas restantes) dentro do EA FC ainda não foi verificado na prática — ver [Mecânica real do EA FC Pro Clubs](01-mecanica.md) (mecanismo decidido: cada lado usa o clube pessoal de um dos próprios humanos do lado, o "capitão", escolhido por reputação).

**Não existe mais o conceito de "host" escolhido por conexão de rede** — Pro Clubs usa servidor dedicado da EA (Game Data Centers), não conexão P2P entre jogadores, então não há papel técnico de host de rede (ping de cada um depende só da própria distância ao servidor da EA, não de outro jogador). Existe, sim, um papel de **capitão** — mas com motivo diferente do host antigo: é quem tem o clube usado naquela partida, com poder de admin real dentro do jogo (convidar, ajustar tática, iniciar amistoso) — ver "Escolha do capitão" abaixo.

Estrutura do servidor (cargos, canais, permissões do bot) documentada à parte, fora do dossiê de produto — ver [docs/discord/](../../discord/README.md).

## Vínculo obrigatório

- **1 Discord = 1 conta da plataforma, exclusivo.** Um Discord ID já vinculado não vincula a uma segunda conta. Motivo: o banimento é vinculado à combinação Discord ID + gamertag (ver [Ranking, reputação e punição](../02-jogador/02-ranking.md)) — se um Discord servisse pra várias contas, o vínculo viraria decoração e o smurfing ficaria trivial. Custo: quem joga em dois consoles de verdade precisa de dois Discords — caso raro, e os 5 personagens por conta já cobrem a necessidade de posições diferentes.
- **Sair do servidor Discord derruba o acesso à fila.** O vínculo existe porque o bot precisa alcançar a pessoa; quem não está mais no servidor não pode ser coordenado. Bot detecta a saída (evento nativo do Discord), avisa por notificação in-app, e a conta volta a poder entrar na fila assim que retornar pelo link fixo — o vínculo OAuth2 em si não é desfeito, só o acesso à fila é bloqueado enquanto ela estiver fora.
- Vínculo de conta Discord **não é obrigatório pra criar conta** — jogador pode navegar a plataforma (perfil, histórico, ranking) sem vincular. É **obrigatório só pra entrar na fila**, porque a coordenação do lobby (criar canal, pingar os jogadores, gerenciar cargo Verificado) depende do bot. Ninguém é obrigado a usar chamada de voz — vincular é sobre o bot ter como te alcançar/coordenar, não sobre entrar em call.

## Fluxo do bot

Lobby fecha quando todos os humanos confirmam entrada — mas os canais só nascem depois: primeiro roda a janela separada de confirmação de capitão (ver "Escolha do capitão" abaixo), só então o bot cria os **3 canais temporários** (cascata esgotada nunca chega a criar canal, ver [Bot: permissões e integração com moderação](../../discord/03-bot.md)):
- **2 de voz, privados por time** (Time A / Time B) — cada um só pros humanos do próprio lado. Partida é 11x11 competitivo, times não compartilham voz.
- **1 de texto, compartilhado por todos os humanos do lobby** — bot posta o nome do capitão de cada lado (escolhido por reputação — ver [Mecânica real do EA FC Pro Clubs](01-mecanica.md) e "Escolha do capitão" abaixo) + avisos operacionais de como a partida vai acontecer. Compartilhado entre os 2 times (não só dentro de cada canal de voz), já que a coordenação entre lados é o ponto desse canal.
- Dispara timer pra todos entrarem (ausência afeta reputação — ver [Ranking, reputação e punição](../02-jogador/02-ranking.md))

## Escolha do capitão

- **Dado usado pra decidir**: sem API da EA, a plataforma não consegue consultar automaticamente quem tem clube com vaga — depende de **auto-declaração no cadastro/perfil** ("tenho clube EA com vaga disponível?" sim/não + nome do clube, jogador atualiza quando quiser). Esse dado filtra quem é candidato plausível.
- Critério: **maior reputação entre os candidatos que se declararam com clube/vaga**. Se o de maior reputação não tiver clube/vaga (segundo a declaração), passa pro próximo — cascata.
- **Confirmação no momento do lobby**: como a auto-declaração pode estar desatualizada (clube encheu depois da última atualização), o candidato escolhido recebe confirmação rápida ("ainda tem vaga?") numa **janela separada, de 30s, logo depois** que os humanos já confirmaram entrada — não é simultânea nem reaproveita a mesma janela (só dá pra saber quem é candidato depois que o roster fecha). A mesma tela **mostra o nome do clube cadastrado**, pro capitão confirmar visualmente que ainda é o mesmo (evita nome desatualizado, usado depois pro OCR validar o resultado — ver [Mecânica real do EA FC Pro Clubs](01-mecanica.md)). Se recusar (inclusive por não querer ceder o clube pessoal a estranhos, escolha legítima) ou não responder, cai na cascata pro próximo.
- **Empate de reputação entre candidatos**: sorteio — mesmo padrão já usado no desempate de formação tática.
- **Desistir depois de já ter confirmado cai na cascata, sem penalidade.** Passa o papel pro próximo candidato do lado; se não houver, o lobby desfaz sem culpa. Emprestar o clube pessoal a estranhos é escolha legítima, e punir a desistência faria gente **parar de declarar clube com vaga** — secando justamente o recurso mais escasso do fluxo. Quem confirma e depois não convida ninguém cai no cancelamento de 5 min por convite não recebido, que já trata o caso com caso de abuso.
- **Clube ocupado sai da cascata.** Enquanto um lobby ativo usa o clube de alguém, essa pessoa não é candidata a capitão em outro lobby. Dois motivos concretos: o clube tem **11 vagas físicas** no jogo, e dois lobbies convidando pro mesmo clube brigariam pelas mesmas vagas; e o OCR de resultado valida **pelo nome dos dois clubes** ([Mecânica](01-mecanica.md)), então duas partidas simultâneas com o mesmo par de nomes seriam indistinguíveis — o hash de arquivo cobre reuso do mesmo print, não duas partidas legítimas e paralelas. A trava cai quando o lobby encerra.
- **Se a cascata esgotar** (nenhum dos humanos do lado tem clube/vaga confirmados): lobby desfaz, todos voltam pra fila sem penalidade de reputação — caso raro, sem culpa de comportamento, é falta de recurso disponível. **É raro por desenho**: o lobby só fecha se cada lado já tiver ao menos 1 candidato com clube declarado com vaga (ver [Fila e matchmaking](02-fila.md)) — a cascata só esgota se essa declaração estiver desatualizada e o candidato recusar na confirmação de 30s. Diferente de zero-report (ver [Resultado de partida](04-resultado.md)): aqui a partida nem chegou a existir, não há o que reportar.
- **Consentimento**: declarar clube com vaga é coberto pelos [Termos de Uso](../04-governanca/03-termos.md) — jogador é avisado explicitamente que, ao declarar, autoriza até 10 jogadores de outro lobby serem convidados temporariamente pro clube quando ele for escolhido capitão.
- Capitão convida os outros humanos do próprio lado pro clube dele, aplica a formação votada, coordena o Amistoso Online com o capitão do outro lado.
- **Confirmação de convite recebido**: cada jogador marca na plataforma se recebeu o convite pro clube, dentro de uma janela de **5 minutos** desde o lobby fechar (convidar leva ~2 min; o número exato sai do teste 1 do [checklist](05-checklist.md)). Se ao fim da janela alguém do lado ainda não recebeu, **o lobby é cancelado**: fila liberada na hora, **sem penalidade nenhuma** pra quem esperou, e o capitão cai em caso de abuso ([Moderação](../04-governanca/01-moderacao.md)). Sem isso, o capitão poderia **excluir alguém invisivelmente** — convidar menos gente de propósito e deixar a IA cobrir a vaga, com a partida acontecendo normalmente e o excluído sem prova nenhuma (problema que só existe porque a IA preenche vaga vazia — antes, faltar gente deixava o time incompleto e visível). Quem não recebeu sinaliza ali mesmo, e isso vira caso de **abuso de capitão** ([Moderação](../04-governanca/01-moderacao.md)).
- Depois da partida, capitão remove os convidados do próprio clube. Se travar, vira **caso de moderação** (ver [Moderação](../04-governanca/01-moderacao.md)). Bot manda DM lembrando o capitão de fazer a limpeza (bot não alcança o clube EA diretamente, sem API, mas pode lembrar via Discord).
- Capitão continua sendo um jogador normal do lobby — tem elo/reputação normal, o papel de capitão é só uma função extra, não uma vaga separada.

## Lobby que nunca vira partida

Toda etapa antes daqui tem prazo (30s de confirmação do jogador, 30s do capitão, 10 min de fila). Entre "lobby fechado" e "partida aconteceu" não havia nenhum — e o vácuo tinha consequência séria: se a partida não acontecesse, ninguém teria print pra reportar, e o zero-report de 36 h ([Resultado de partida](04-resultado.md)) manteria **as 8 pessoas bloqueadas de nova fila esse tempo inteiro, com −3 de reputação cada**, por algo que não fizeram.

Dois gatilhos, porque são dois problemas diferentes:

1. **Convite não chegou (5 min)** — trata o capitão que confirma e não convida. Coberto na janela de confirmação de convite acima: cancela rápido, sem penalidade, porque o sinal é explícito e não exige esperar nada.
2. **Silêncio total (60 min)** — rede de segurança pro resto (o Amistoso não engatou, o jogo caiu, o grupo desistiu no meio). Se **todos** confirmaram convite recebido mas **nenhum print** chegou em 60 minutos desde o lobby fechar, o lobby é encerrado e a fila liberada **sem penalidade**.
   - Por que 60 e não menos: a partida em si consome ~15-18 min de relógio real (2 tempos de 6 min, mais intervalo e cutscene), e o ciclo de convite/Amistoso vem antes. Prazo curto cancelaria partida legitimamente em andamento. **Número a calibrar com o teste 5** do [checklist](05-checklist.md), que mede exatamente o ciclo do convite até a bola rolar.

**O zero-report de 36 h continua existindo, pra outro caso**: partida que *aconteceu* (convites confirmados, tempo compatível) e ninguém reportou. Aí a penalidade de −3 se justifica — houve negligência coletiva. Se a partida nunca começou, não houve.

## Notificação

- Canal ativo de aviso (fila fechou, lobby formado, disputa resolvida, punição aplicada) é **Discord (DM do bot) + notificação in-app na própria plataforma web** — sem e-mail. Reaproveita o vínculo Discord já obrigatório, evita sistema de notificação paralelo.
- **Fallback se a DM falhar** (usuário bloqueou DM de membro do servidor): nenhum tratamento especial — notificação in-app recebe o mesmo evento independente da DM funcionar. DM é conveniência, in-app é a garantia.
