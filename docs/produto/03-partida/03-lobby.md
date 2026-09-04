# 4. Discord e lobby

**Fase: MVP**

## Contexto

Sala/partida dentro do jogo não é criada pela plataforma diretamente (EA não expõe API pra isso) — a plataforma vira central de **coordenação**, não de execução da partida em si. O mecanismo de como os humanos confirmados viram uma partida real de 11v11 (com IA cobrindo as vagas restantes) dentro do EA FC ainda não foi verificado na prática — ver [Mecânica real do EA FC Pro Clubs](01-mecanica.md) (mecanismo decidido: cada lado usa o clube pessoal de um dos próprios 11, o "capitão", escolhido por reputação).

**Não existe mais o conceito de "host" escolhido por conexão de rede** — Pro Clubs usa servidor dedicado da EA (Game Data Centers), não conexão P2P entre jogadores, então não há papel técnico de host de rede (ping de cada um depende só da própria distância ao servidor da EA, não de outro jogador). Existe, sim, um papel de **capitão** — mas com motivo diferente do host antigo: é quem tem o clube usado naquela partida, com poder de admin real dentro do jogo (convidar, ajustar tática, iniciar amistoso) — ver "Escolha do capitão" abaixo.

Estrutura do servidor (cargos, canais, permissões do bot) documentada à parte, fora do dossiê de produto — ver [docs/discord/](../../discord/README.md).

## Vínculo obrigatório

- Vínculo de conta Discord **não é obrigatório pra criar conta** — jogador pode navegar a plataforma (perfil, histórico, ranking) sem vincular. É **obrigatório só pra entrar na fila**, porque a coordenação do lobby (criar canal, pingar os jogadores, gerenciar cargo Verificado) depende do bot. Ninguém é obrigado a usar chamada de voz — vincular é sobre o bot ter como te alcançar/coordenar, não sobre entrar em call.

## Fluxo do bot

Lobby fecha quando todos os humanos confirmam entrada — mas os canais só nascem depois: primeiro roda a janela separada de confirmação de capitão (ver "Escolha do capitão" abaixo), só então o bot cria os **3 canais temporários** (cascata esgotada nunca chega a criar canal, ver [Bot: permissões e integração com moderação](../../discord/03-bot.md)):
- **2 de voz, privados por time** (Time A / Time B) — cada um só pros próprios 11 do lado. Partida é 11x11 competitivo, times não compartilham voz.
- **1 de texto, compartilhado por todos os humanos do lobby** — bot posta o nome do capitão de cada lado (escolhido por reputação — ver [Mecânica real do EA FC Pro Clubs](01-mecanica.md) e "Escolha do capitão" abaixo) + avisos operacionais de como a partida vai acontecer. Compartilhado entre os 2 times (não só dentro de cada canal de voz), já que a coordenação entre lados é o ponto desse canal.
- Dispara timer pra todos entrarem (ausência afeta reputação — ver [Ranking, reputação e punição](../02-jogador/02-ranking.md))

## Escolha do capitão

- **Dado usado pra decidir**: sem API da EA, a plataforma não consegue consultar automaticamente quem tem clube com vaga — depende de **auto-declaração no cadastro/perfil** ("tenho clube EA com vaga disponível?" sim/não + nome do clube, jogador atualiza quando quiser). Esse dado filtra quem é candidato plausível.
- Critério: **maior reputação entre os candidatos que se declararam com clube/vaga**. Se o de maior reputação não tiver clube/vaga (segundo a declaração), passa pro próximo — cascata.
- **Confirmação no momento do lobby**: como a auto-declaração pode estar desatualizada (clube encheu depois da última atualização), o candidato escolhido recebe confirmação rápida ("ainda tem vaga?") numa **janela separada, de 30s, logo depois** que os humanos já confirmaram entrada — não é simultânea nem reaproveita a mesma janela (só dá pra saber quem é candidato depois que o roster fecha). A mesma tela **mostra o nome do clube cadastrado**, pro capitão confirmar visualmente que ainda é o mesmo (evita nome desatualizado, usado depois pro OCR validar o resultado — ver [Mecânica real do EA FC Pro Clubs](01-mecanica.md)). Se recusar (inclusive por não querer ceder o clube pessoal a estranhos, escolha legítima) ou não responder, cai na cascata pro próximo.
- **Empate de reputação entre candidatos**: sorteio — mesmo padrão já usado no desempate de formação tática.
- **Se a cascata esgotar** (nenhum dos 11 do lado tem clube/vaga confirmados): lobby desfaz, todos voltam pra fila sem penalidade de reputação — caso raro, sem culpa de comportamento, é falta de recurso disponível. Diferente de zero-report (ver [Resultado de partida](04-resultado.md)): aqui a partida nem chegou a existir, não há o que reportar.
- **Consentimento**: declarar clube com vaga é coberto pelos [Termos de Uso](../04-governanca/03-termos.md) — jogador é avisado explicitamente que, ao declarar, autoriza até 10 jogadores de outro lobby serem convidados temporariamente pro clube quando ele for escolhido capitão.
- Capitão convida os outros humanos do próprio lado pro clube dele, aplica a formação votada, coordena o Amistoso Online com o capitão do outro lado.
- **Confirmação de convite recebido**: cada jogador marca na plataforma se recebeu o convite pro clube. Sem isso, o capitão poderia **excluir alguém invisivelmente** — convidar menos gente de propósito e deixar a IA cobrir a vaga, com a partida acontecendo normalmente e o excluído sem prova nenhuma (problema que só existe porque a IA preenche vaga vazia — antes, faltar gente deixava o time incompleto e visível). Quem não recebeu sinaliza ali mesmo, e isso vira caso de **abuso de capitão** ([Moderação](../04-governanca/01-moderacao.md)).
- Depois da partida, capitão remove os 10 convidados do próprio clube. Se travar, vira **caso de moderação** (ver [Moderação](../04-governanca/01-moderacao.md)). Bot manda DM lembrando o capitão de fazer a limpeza (bot não alcança o clube EA diretamente, sem API, mas pode lembrar via Discord).
- Capitão continua sendo um jogador normal do lobby — tem elo/reputação normal, o papel de capitão é só uma função extra, não uma vaga separada.

## Notificação

- Canal ativo de aviso (fila fechou, lobby formado, disputa resolvida, punição aplicada) é **Discord (DM do bot) + notificação in-app na própria plataforma web** — sem e-mail. Reaproveita o vínculo Discord já obrigatório, evita sistema de notificação paralelo.
- **Fallback se a DM falhar** (usuário bloqueou DM de membro do servidor): nenhum tratamento especial — notificação in-app recebe o mesmo evento independente da DM funcionar. DM é conveniência, in-app é a garantia.
