# 4. Integração técnica plataforma ↔ bot

Decisões de arquitetura (não implementação/stack — ver [Bot: permissões e integração com moderação](03-bot-e-moderacao.md) pra responsabilidade, e [Backlog](../produto/05-produto/03-backlog-fases-futuras.md) pra stack, deliberadamente não decidida).

## Como o bot sabe que um evento aconteceu

- **Plataforma dispara pro bot via webhook/API interna** — toda vez que um evento relevante acontece no backend (verificação aprovada, lobby fechou, resultado processado, punição aplicada), a plataforma chama um endpoint do bot. Bot não fica consultando/verificando por conta própria (polling) — reage ao que a plataforma manda.
- **Decisão de negócio fica na plataforma, execução no bot**: quem decide o quê (ex.: qual é o capitão daquele lobby, critério de reputação) é sempre a plataforma — bot só executa a ação técnica no Discord (criar canal, conceder cargo, postar mensagem). Bot não toma decisão de regra de produto.

## Vínculo Discord ↔ conta da plataforma

- **OAuth2 padrão do Discord** — jogador clica "vincular Discord" na plataforma, é redirecionado pro Discord, autoriza, Discord retorna o Discord ID pra plataforma vincular à conta. Sem digitação manual de ID (evita erro de digitação, confirma que a pessoa é dona daquele Discord de fato).

## Falha de comunicação (bot fora do ar)

- **Fila de retry simples**: se o bot não responder/confirmar recebimento de um evento em **10 segundos**, plataforma reenvia — **3 tentativas no total**, intervalo dobrando a cada uma (10s, 20s, 40s) — antes de desistir. Evita perda silenciosa de evento por queda momentânea do bot — não exige infraestrutura de fila pesada (Kafka/RabbitMQ) pro MVP, só retry simples.
- **Retry esgotado**: vira caso automático na fila de moderação da plataforma (mesmo painel já usado pra chamados de OCR/gamertag/apelação, ver [Moderação](../produto/04-governanca/01-moderacao.md)) — sem sistema de alerta separado.

## Rate limit da API do Discord

- **Biblioteca de bot mantida** já respeita o rate limit nativo do Discord automaticamente (comportamento padrão, não construído do zero).
- **Ações do mesmo evento rodam em fila sequencial**, não paralelas soltas — ex.: criar os 3 canais + pingar os jogadores + postar mensagem do lobby fechado disparam um após o outro, não todos de uma vez. Evita estourar limite de requisição sem precisar de infraestrutura de throttling própria.

## Aplicação do bot no Discord

- **Servidor é criado à mão, não pelo bot.** A API do Discord até permite bot criar servidor (`POST /guilds`, para bot em menos de 10 servidores — o nosso estaria em 1), mas nesse caso **o bot vira o dono** — o que quebra a decisão de o servidor pertencer a uma conta separada não-pessoal (ver [Propriedade e convite do servidor](README.md)). Criação manual, uma vez só.
- **Server Members Intent** precisa ser ativado no Developer Portal — não vem ligado por padrão, e sem ele o bot não enxerga membros nem consegue gerenciar cargo/nickname. Falha silenciosa clássica: o bot roda, mas cargo Verificado nunca é concedido.
- Aplicação criada no Discord Developer Portal, token do bot, link de convite OAuth2 com os escopos/permissões necessários (ver [Bot: permissões e integração com moderação](03-bot-e-moderacao.md) pra permissão total já decidida) — tudo isso fica sob a **mesma conta separada, não pessoal, que já é dona do servidor** (ver [Propriedade e convite do servidor](README.md)). Mesma lógica de continuidade: token/credencial não fica preso à conta pessoal de nenhum dos 4.
