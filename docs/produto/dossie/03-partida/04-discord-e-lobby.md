# 4. Discord e lobby

**Fase: MVP**

## Contexto

Sala/partida dentro do jogo não é criada pela plataforma diretamente (EA não expõe API pra isso) — a plataforma vira central de **coordenação**, não de execução da partida em si. O mecanismo exato de como os 22 confirmados viram uma partida real dentro do EA FC ainda não foi verificado na prática — ver [Mecânica real do EA FC Pro Clubs](00-mecanica-pro-clubs.md) (hipótese de trabalho: pool de "clubes-casa" administrados pela plataforma).

**Não existe mais o conceito de "host" escolhido por reputação/conexão** — Pro Clubs usa servidor dedicado da EA (Game Data Centers), não conexão P2P entre jogadores, então não há papel técnico de host de rede pra escolher (ping de cada um depende só da própria distância ao servidor da EA, não de outro jogador). E o poder de admin dentro do jogo (convidar pro clube-casa, ajustar tática, iniciar amistoso) é da **conta de serviço da plataforma**, não de um jogador selecionado — ver [Mecânica real do EA FC Pro Clubs](00-mecanica-pro-clubs.md).

Estrutura do servidor (cargos, canais, permissões do bot) documentada à parte, fora do dossiê de produto — ver [docs/discord/](../../../discord/README.md).

## Vínculo obrigatório

- Vínculo de conta Discord **não é obrigatório pra criar conta** — jogador pode navegar a plataforma (perfil, histórico, ranking) sem vincular. É **obrigatório só pra entrar na fila**, porque a coordenação do lobby (criar canal, pingar os 22, gerenciar cargo Verificado) depende do bot. Ninguém é obrigado a usar chamada de voz — vincular é sobre o bot ter como te alcançar/coordenar, não sobre entrar em call.

## Fluxo do bot

Ao lobby fechar (22 confirmados), o bot de Discord cria **3 canais temporários**:
- **2 de voz, privados por time** (Time A / Time B) — cada um só pros próprios 11. Partida é 11x11 competitivo, times não compartilham voz.
- **1 de texto, compartilhado pelos 22** — bot posta o que for necessário pros 22 saberem como a partida vai acontecer (ex.: qual clube-casa cada time foi convidado a entrar, avisos operacionais). Conteúdo exato depende do mecanismo confirmado em [Mecânica real do EA FC Pro Clubs](00-mecanica-pro-clubs.md) — precisa ser compartilhado entre os 2 times (não só dentro de cada canal de voz), já que a coordenação entre lados é o ponto desse canal.
- Dispara timer pra todos entrarem (ausência afeta reputação — ver [Ranking, reputação e punição](../02-jogador/06-ranking-reputacao-e-punicao.md))

## Notificação

- Canal ativo de aviso (fila fechou, lobby formado, disputa resolvida, punição aplicada) é **Discord (DM do bot) + notificação in-app na própria plataforma web** — sem e-mail. Reaproveita o vínculo Discord já obrigatório, evita sistema de notificação paralelo.
- **Fallback se a DM falhar** (usuário bloqueou DM de membro do servidor): nenhum tratamento especial — notificação in-app recebe o mesmo evento independente da DM funcionar. DM é conveniência, in-app é a garantia.
