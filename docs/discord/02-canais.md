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

- **Voz temporária por lobby — 2 canais, não 1**: bot cria um canal de voz por time (Time A / Time B) quando o lobby fecha (22 confirmados), cada um privado só pros seus 11 (11x11 competitivo, times não compartilham voz). Ambos deletados quando a partida acaba. Mesmo fluxo já descrito em [Discord e lobby](../produto/dossie/03-partida/04-discord-e-lobby.md).
