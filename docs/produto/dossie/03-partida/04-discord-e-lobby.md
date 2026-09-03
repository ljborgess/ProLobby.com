# 4. Discord e lobby

**Fase: MVP**

## Contexto

Sala/partida dentro do jogo não é criada pela plataforma diretamente (EA não expõe API pra isso) — a plataforma vira central de **coordenação**, não de execução da partida em si. O mecanismo de como os 22 confirmados viram uma partida real de 11v11 dentro do EA FC ainda não foi verificado na prática — ver [Mecânica real do EA FC Pro Clubs](00-mecanica-pro-clubs.md) (mecanismo decidido: cada lado usa o clube pessoal de um dos próprios 11, o "capitão", escolhido por reputação).

**Não existe mais o conceito de "host" escolhido por conexão de rede** — Pro Clubs usa servidor dedicado da EA (Game Data Centers), não conexão P2P entre jogadores, então não há papel técnico de host de rede (ping de cada um depende só da própria distância ao servidor da EA, não de outro jogador). Existe, sim, um papel de **capitão** — mas com motivo diferente do host antigo: é quem tem o clube usado naquela partida, com poder de admin real dentro do jogo (convidar, ajustar tática, iniciar amistoso) — ver "Escolha do capitão" abaixo.

Estrutura do servidor (cargos, canais, permissões do bot) documentada à parte, fora do dossiê de produto — ver [docs/discord/](../../../discord/README.md).

## Vínculo obrigatório

- Vínculo de conta Discord **não é obrigatório pra criar conta** — jogador pode navegar a plataforma (perfil, histórico, ranking) sem vincular. É **obrigatório só pra entrar na fila**, porque a coordenação do lobby (criar canal, pingar os 22, gerenciar cargo Verificado) depende do bot. Ninguém é obrigado a usar chamada de voz — vincular é sobre o bot ter como te alcançar/coordenar, não sobre entrar em call.

## Fluxo do bot

Ao lobby fechar (22 confirmados), o bot de Discord cria **3 canais temporários**:
- **2 de voz, privados por time** (Time A / Time B) — cada um só pros próprios 11 do lado. Partida é 11x11 competitivo, times não compartilham voz.
- **1 de texto, compartilhado pelos 22** — bot posta o nome do capitão de cada lado (escolhido por reputação — ver [Mecânica real do EA FC Pro Clubs](00-mecanica-pro-clubs.md) e "Escolha do capitão" abaixo) + avisos operacionais de como a partida vai acontecer. Compartilhado entre os 2 times (não só dentro de cada canal de voz), já que a coordenação entre lados é o ponto desse canal.
- Dispara timer pra todos entrarem (ausência afeta reputação — ver [Ranking, reputação e punição](../02-jogador/06-ranking-reputacao-e-punicao.md))

## Escolha do capitão

- **Dado usado pra decidir**: sem API da EA, a plataforma não consegue consultar automaticamente quem tem clube com vaga — depende de **auto-declaração no cadastro/perfil** ("tenho clube EA com vaga disponível?" sim/não + nome do clube, jogador atualiza quando quiser). Esse dado filtra quem é candidato plausível.
- Critério: **maior reputação entre os candidatos que se declararam com clube/vaga**. Se o de maior reputação não tiver clube/vaga (segundo a declaração), passa pro próximo — cascata.
- **Confirmação no momento do lobby**: como a auto-declaração pode estar desatualizada (clube encheu depois da última atualização), o candidato escolhido recebe confirmação rápida ("ainda tem vaga?") dentro da mesma janela de 30s que já usa pra confirmar entrada no lobby — sem passo extra. Se recusar (inclusive por não querer ceder o clube pessoal a estranhos, escolha legítima) ou não responder, cai na cascata pro próximo.
- **Se a cascata esgotar** (nenhum dos 11 do lado tem clube/vaga confirmados): lobby desfaz, os 22 voltam pra fila sem penalidade de reputação — caso raro, sem culpa de comportamento, é falta de recurso disponível. Diferente de zero-report (ver [Resultado de partida](05-resultado-de-partida.md)): aqui a partida nem chegou a existir, não há o que reportar.
- **Consentimento**: declarar clube com vaga é coberto pelos [Termos de Uso](../04-governanca/12-termos-de-uso-e-idade.md) — jogador é avisado explicitamente que, ao declarar, autoriza até 10 jogadores de outro lobby serem convidados temporariamente pro clube quando ele for escolhido capitão.
- Capitão convida os outros 10 do próprio lado pro clube dele, aplica a formação votada, coordena o Amistoso Online com o capitão do outro lado.
- Depois da partida, capitão remove os 10 convidados do próprio clube. Se travar, vira **caso de moderação** (ver [Moderação](../04-governanca/07-moderacao.md)). Bot manda DM lembrando o capitão de fazer a limpeza (bot não alcança o clube EA diretamente, sem API, mas pode lembrar via Discord).
- Capitão continua sendo um jogador normal do lobby — tem elo/reputação normal, o papel de capitão é só uma função extra, não uma vaga separada.

## Notificação

- Canal ativo de aviso (fila fechou, lobby formado, disputa resolvida, punição aplicada) é **Discord (DM do bot) + notificação in-app na própria plataforma web** — sem e-mail. Reaproveita o vínculo Discord já obrigatório, evita sistema de notificação paralelo.
- **Fallback se a DM falhar** (usuário bloqueou DM de membro do servidor): nenhum tratamento especial — notificação in-app recebe o mesmo evento independente da DM funcionar. DM é conveniência, in-app é a garantia.
