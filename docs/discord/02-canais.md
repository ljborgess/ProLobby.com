# 2. Canais

## Estrutura unificada (MVP)

Servidor **não fragmenta por plataforma/posição no MVP** — decisão deliberada: comunidade pequena precisa se sentir unificada, canal segmentado demais com pouca gente vira canal morto. Segmentação (se fizer sentido) é aditiva pra quando o volume justificar, mesmo racional já usado em [Escopo de plataforma, jogo e região](../produto/05-produto/02-escopo-plataforma-jogo-regiao.md) pra expansão de região.

## Canais fixos

- **#regras-e-onboarding** — regras do servidor + link/instrução do onboarding da plataforma.
- **#anuncios** — só Admin posta.
- **#geral** — chat livre, acesso liberado só pelos cargos sociais (não pelo Verificado).
- **#fila-status** — bot posta quando um lobby fecha (feed público, sem dado sensível).
- **#suporte-e-denuncia** — canal de entrada pra denúncia/dúvida, integrado com a fila de moderação da plataforma (ver [Bot: permissões e integração com moderação](03-bot-e-moderacao.md)).
- **#log-moderacao** — privado, só Admin/Moderador. Bot posta automaticamente toda ação sensível (kick, ban, concessão/revogação de cargo Verificado) — histórico auditável sem depender de abrir o audit log nativo do Discord.
- **#status-sistema** — privado, só Admin/Moderador. Bot posta quando ele mesmo cai/volta, ou manutenção planejada — evita jogador achar que a plataforma travou sem explicação. Falhas de evento específico (webhook esgotado, sincronização de nickname) não vão aqui — ver [Bot: permissões e integração com moderação](03-bot-e-moderacao.md) e [Integração técnica](04-integracao-tecnica.md).

## Canais dinâmicos

- **3 canais temporários por lobby**: 2 de voz privados por time (Time A / Time B, 11x11 competitivo não compartilha voz) + 1 de texto compartilhado por todos os humanos do lobby (nome do capitão de cada lado, avisos operacionais, logística cross-time — ver [Discord e lobby](../produto/03-partida/03-discord-e-lobby.md)).

### Quando os canais são apagados

Os 3 somem juntos. Sinal principal: **as duas calls vazias por 10 minutos seguidos** — call esvaziando é indício real de partida encerrada, melhor que timer cego. Com dois limites cobrindo os casos em que esse sinal sozinho falha:

- **Piso de 15 minutos** desde o lobby fechar — voz é opcional (ver [Discord e lobby](../produto/03-partida/03-discord-e-lobby.md)), então "call vazia" é verdade desde o começo se ninguém entrar; sem o piso, o canal se apagaria antes de alguém usar.
- **Teto de 3 horas** desde o lobby fechar — cobre quem esqueceu o Discord aberto e nunca "sai" da call.

A vida do canal é **desacoplada do report de resultado**: o canal serve pra coordenar o início da partida; o report acontece na plataforma, não aqui. Não faz sentido segurar canal por 36h esperando o zero-report expirar.

### Faxina periódica (rede de segurança)

Discord limita **500 canais por servidor** — a 3 canais por lobby, ~166 lobbies com limpeza falhando travam a criação de canal no servidor inteiro. Proteção independente do fluxo normal:

- Bot varre de hora em hora e apaga canal temporário órfão (lobby já encerrado, mas canal sobrou por falha).
- Passando de **400 canais**, bot alerta em **#status-sistema** — margem pra agir antes de travar.
