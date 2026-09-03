# 2. Canais

## Estrutura unificada (MVP)

Servidor **não fragmenta por plataforma/posição no MVP** — decisão deliberada: comunidade pequena precisa se sentir unificada, canal segmentado demais com pouca gente vira canal morto. Segmentação (se fizer sentido) é aditiva pra quando o volume justificar, mesmo racional já usado em [Escopo de plataforma, jogo e região](../produto/dossie/05-produto/08-escopo-plataforma-jogo-regiao.md) pra expansão de região.

## Canais fixos

- **#regras-e-onboarding** — regras do servidor + link/instrução do onboarding da plataforma.
- **#anuncios** — só Admin posta.
- **#geral** — chat livre, acesso liberado só pelos cargos sociais (não pelo Verificado).
- **#fila-status** — bot posta quando um lobby fecha (feed público, sem dado sensível).
- **#suporte-e-denuncia** — canal de entrada pra denúncia/dúvida, integrado com a fila de moderação da plataforma (ver [Bot: permissões e integração com moderação](03-bot-e-moderacao.md)).
- **#log-moderacao** — privado, só Admin/Moderador. Bot posta automaticamente toda ação sensível (kick, ban, concessão/revogação de cargo Verificado) — histórico auditável sem depender de abrir o audit log nativo do Discord.

## Canais dinâmicos

- **3 canais temporários por lobby** (criados quando o lobby fecha, deletados quando a partida acaba): 2 de voz privados por time (Time A / Time B, 11x11 competitivo não compartilha voz) + 1 de texto compartilhado pelos 20 jogadores reais (avisos operacionais de como a partida vai acontecer, logística cross-time — não é vinculado a um "host", ver [Discord e lobby](../produto/dossie/03-partida/04-discord-e-lobby.md)). Os 2 gerentes das contas de serviço (11ª vaga de cada lado em campo) operam fora do Discord. Mesmo fluxo já descrito lá.
