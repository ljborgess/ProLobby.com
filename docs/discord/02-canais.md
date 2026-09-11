# 2. Canais

## Estrutura unificada (MVP)

Servidor **não fragmenta por plataforma/posição no MVP** — decisão deliberada: comunidade pequena precisa se sentir unificada, canal segmentado demais com pouca gente vira canal morto. Segmentação (se fizer sentido) é aditiva pra quando o volume justificar, mesmo racional já usado em [Escopo de plataforma, jogo e região](../produto/05-produto/02-escopo.md) pra expansão de região.

## Canais fixos

- **#regras-e-onboarding** — regras do servidor + link/instrução do onboarding da plataforma.
- **#anuncios** — só Admin posta.
- **#geral** — chat livre, acesso liberado só pelos cargos sociais (não pelo Verificado).
- **#fila-status** — bot posta quando um lobby fecha (feed público, sem dado sensível).
- **#suporte-e-denuncia** — canal de entrada pra denúncia/dúvida, integrado com a fila de moderação da plataforma (ver [Bot: permissões e integração com moderação](03-bot.md)).
- **#log-moderacao** — privado, só Admin/Moderador. Bot posta automaticamente toda ação sensível (kick, ban, concessão/revogação de cargo Verificado) — histórico auditável sem depender de abrir o audit log nativo do Discord.
- **#status-sistema** — privado, só Admin/Moderador. Bot posta quando ele mesmo cai/volta, ou manutenção planejada — evita jogador achar que a plataforma travou sem explicação. Falhas de evento específico (webhook esgotado, sincronização de nickname) não vão aqui — ver [Bot: permissões e integração com moderação](03-bot.md) e [Integração técnica](04-integracao.md).

## Canais dinâmicos

- **3 canais temporários por lobby**: 2 de voz privados por time (Time A / Time B, 11x11 competitivo não compartilha voz) + 1 de texto compartilhado por todos os humanos do lobby (nome do capitão de cada lado, avisos operacionais, logística cross-time — ver [Discord e lobby](../produto/03-partida/03-lobby.md)).

### Quando os canais são apagados

Os 3 somem juntos. Sinal principal: **as duas calls vazias por 10 minutos seguidos** — call esvaziando é indício real de partida encerrada, melhor que timer cego. Com dois limites cobrindo os casos em que esse sinal sozinho falha:

- **Piso de 15 minutos** desde o lobby fechar — voz é opcional (ver [Discord e lobby](../produto/03-partida/03-lobby.md)), então "call vazia" é verdade desde o começo se ninguém entrar; sem o piso, o canal se apagaria antes de alguém usar.
- **Teto de 3 horas** desde o lobby fechar — cobre quem esqueceu o Discord aberto e nunca "sai" da call.

**Exceção ao piso**: lobby **cancelado ou expirado** (convite não confirmado em 5 min, cascata de capitão esgotada ou estourando o teto de 5 min, 60 min sem nenhum print — ver [Discord e lobby](../produto/03-partida/03-lobby.md)) apaga os 3 canais **imediatamente**, sem esperar os 15 min. O piso existe pra proteger canal de partida que vai acontecer; se o lobby foi desfeito, não há nada pra proteger e o canal só ocuparia espaço do limite de 500.

A vida do canal é **desacoplada do report de resultado**: o canal serve pra coordenar o início da partida; o report acontece na plataforma, não aqui. O teto de 3 h já é folgado sobre os 60 min da expiração por zero-report ([Resultado](../produto/03-partida/04-resultado.md)).

**Os ids dos 3 canais ficam gravados no `Lobby`** ([Modelo de dados](../requisitos/03-dados.md#lobby)), não na memória do bot — é o que permite apagar exatamente os canais daquele lobby e varrer órfão depois de um restart ([RF-054](../requisitos/05-funcionais.md)).

### Faxina periódica (rede de segurança)

Discord limita **500 canais por servidor** — a 3 canais por lobby, ~166 lobbies com limpeza falhando travam a criação de canal no servidor inteiro. Proteção independente do fluxo normal:

- Bot varre de hora em hora e apaga canal temporário órfão (lobby já encerrado, mas canal sobrou por falha).
- Passando de **400 canais**, bot alerta em **#status-sistema** — margem pra agir antes de travar.
- **Atingido o teto de 500, a fila pausa** — mesmo tratamento da queda do Discord ([Integração técnica](04-integracao.md)), porque a situação é a mesma: sem canal disponível, o lobby não pode ser coordenado, e fechá-lo mesmo assim deixaria gente confirmada sem capitão anunciado e sem lugar pra combinar. Sem transbordar pra um segundo servidor: resolveria a escala e fragmentaria a comunidade, contra a decisão de servidor unificado — e é problema de ~166 lobbies simultâneos, contra os 10 pra que o sistema é dimensionado ([RNF-004](../requisitos/07-nao-funcionais.md)).
