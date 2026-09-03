# 4. Discord e lobby

**Fase: MVP**

## Contexto

Sala de partida dentro do jogo é sempre criada **manualmente** pelo host, dentro do console — a plataforma não tem como automatizar isso (EA não expõe API pra criar sala). Por isso a plataforma vira central de **coordenação**, não de execução da partida em si.

**Atenção**: essa premissa (host cria sala avulsa pra 22 estranhos) ainda não foi verificada contra o mecanismo real do jogo — ver [Mecânica real do EA FC Pro Clubs](00-mecanica-pro-clubs.md), pesquisa aponta que pode não existir esse tipo de sala e o fluxo de host/lobby pode precisar mudar.

Estrutura do servidor (cargos, canais, permissões do bot) documentada à parte, fora do dossiê de produto — ver [docs/discord/](../../../discord/README.md).

## Vínculo obrigatório

- Vínculo de conta Discord **não é obrigatório pra criar conta** — jogador pode navegar a plataforma (perfil, histórico, ranking) sem vincular. É **obrigatório só pra entrar na fila**, porque a coordenação do lobby (criar canal, pingar os 22, gerenciar cargo Verificado) depende do bot. Ninguém é obrigado a usar chamada de voz — vincular é sobre o bot ter como te alcançar/coordenar, não sobre entrar em call.

## Fluxo do bot

Ao lobby fechar (22 confirmados), o bot de Discord cria **3 canais temporários**:
- **2 de voz, privados por time** (Time A / Time B) — cada um só pros próprios 11. Partida é 11x11 competitivo, times não compartilham voz.
- **1 de texto, compartilhado pelos 22** — onde o bot posta host + gamertag/PSN ID de **todos** (visível só dentro do lobby, não público no perfil geral) e pinga os 22. Precisa ser compartilhado (não por time): o host cria uma sala só no jogo e precisa localizar/convidar os outros 21 — sem essa informação cruzando os times, o time B não sabe quem é o host nem como entrar na mesma partida.
- Dispara timer pra todos entrarem (ausência afeta reputação — ver [Ranking, reputação e punição](../02-jogador/06-ranking-reputacao-e-punicao.md))

## Escolha do host

- Critério: **reputação + histórico de conexão estável** (não aleatório) — evita host com lag/ping ruim estragando o jogo pra todo mundo.
- Se o host escolhido não confirma entrada ou desconecta, papel é **reatribuído automaticamente** pro próximo melhor candidato entre os 21 restantes, mesmo critério — lobby nunca fica sem host formal.
- **Cascata completa**: se o próximo candidato também falhar, reaplica o mesmo critério recursivamente até alguém confirmar — sem caso especial, mesma regra repetida quantas vezes precisar.

## Notificação

- Canal ativo de aviso (fila fechou, lobby formado, disputa resolvida, punição aplicada) é **Discord (DM do bot) + notificação in-app na própria plataforma web** — sem e-mail. Reaproveita o vínculo Discord já obrigatório, evita sistema de notificação paralelo.
- **Fallback se a DM falhar** (usuário bloqueou DM de membro do servidor): nenhum tratamento especial — notificação in-app recebe o mesmo evento independente da DM funcionar. DM é conveniência, in-app é a garantia.
