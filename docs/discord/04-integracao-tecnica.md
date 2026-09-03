# 4. Integração técnica plataforma ↔ bot

Decisões de arquitetura (não implementação/stack — ver [Bot: permissões e integração com moderação](03-bot-e-moderacao.md) pra responsabilidade, e [Backlog](../produto/dossie/05-produto/10-backlog-fases-futuras.md) pra stack, deliberadamente não decidida).

## Como o bot sabe que um evento aconteceu

- **Plataforma dispara pro bot via webhook/API interna** — toda vez que um evento relevante acontece no backend (verificação aprovada, lobby fechou, resultado processado, punição aplicada), a plataforma chama um endpoint do bot. Bot não fica consultando/verificando por conta própria (polling) — reage ao que a plataforma manda.
- **Decisão de negócio fica na plataforma, execução no bot**: quem decide o quê (ex.: qual é o capitão daquele lobby, critério de reputação) é sempre a plataforma — bot só executa a ação técnica no Discord (criar canal, conceder cargo, postar mensagem). Bot não toma decisão de regra de produto.

## Vínculo Discord ↔ conta da plataforma

- **OAuth2 padrão do Discord** — jogador clica "vincular Discord" na plataforma, é redirecionado pro Discord, autoriza, Discord retorna o Discord ID pra plataforma vincular à conta. Sem digitação manual de ID (evita erro de digitação, confirma que a pessoa é dona daquele Discord de fato).

## Falha de comunicação (bot fora do ar)

- **Fila de retry simples**: se o bot não responder/confirmar recebimento de um evento, plataforma tenta reenviar algumas vezes (ex.: 3 tentativas, intervalo crescente) antes de desistir e registrar como caso de erro/suporte. Evita perda silenciosa de evento por queda momentânea do bot — não exige infraestrutura de fila pesada (Kafka/RabbitMQ) pro MVP, só retry simples.

## Aplicação do bot no Discord

- Aplicação criada no Discord Developer Portal, token do bot, link de convite OAuth2 com os escopos/permissões necessários (ver [Bot: permissões e integração com moderação](03-bot-e-moderacao.md) pra permissão total já decidida) — tudo isso fica sob a **mesma conta separada, não pessoal, que já é dona do servidor** (ver [Propriedade e convite do servidor](README.md)). Mesma lógica de continuidade: token/credencial não fica preso à conta pessoal de nenhum dos 4.
