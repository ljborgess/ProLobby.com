# 4. Integração técnica plataforma ↔ bot

Decisões de arquitetura (não implementação/stack — ver [Bot: permissões e integração com moderação](03-bot.md) pra responsabilidade, e [ADR-005](../adr/005-stack-tecnica.md)/[ADR-006](../adr/006-backend-separado-e-tooling.md) pra stack, decidida em 2026-09-08).

## Como o bot sabe que um evento aconteceu

- **Plataforma dispara pro bot via webhook/API interna** — toda vez que um evento relevante acontece no backend (verificação aprovada, lobby fechou, resultado processado, punição aplicada), a plataforma chama um endpoint do bot. Bot não fica consultando/verificando por conta própria (polling) — reage ao que a plataforma manda.
- **Decisão de negócio fica na plataforma, execução no bot**: quem decide o quê (ex.: qual é o capitão daquele lobby, critério de reputação) é sempre a plataforma — bot só executa a ação técnica no Discord (criar canal, conceder cargo, postar mensagem). Bot não toma decisão de regra de produto.

## Como o bot sabe que foi a plataforma que chamou

Decidido em 2026-09-15, junto com a correção do achado abaixo. O contrato de assinatura, por extenso, porque o handler de cada RF da Fase 3 vai depender dele:

- **A plataforma assina `timestamp + "." + corpo cru`** com HMAC-SHA256 e o segredo compartilhado (`WEBHOOK_SECRET`), e manda dois cabeçalhos: `x-webhook-signature` (o HMAC em hex) e `x-webhook-timestamp` (o instante ISO em que **assinou**).
- **O bot recusa com 401** o que não bater: sem assinatura, sem timestamp, segredo errado, corpo alterado depois de assinado, ou timestamp fora de **5 minutos**.
- **O timestamp assinado não é o `occurredAt` do evento.** São coisas diferentes e a distinção é o que faz o retry funcionar:
  - `occurredAt` diz **quando o evento aconteceu** e nunca muda, nem depois de quatro tentativas.
  - `x-webhook-timestamp` diz **quando esta tentativa foi assinada**, e é novo a cada envio.
  - **Por que separar**: uma entrega recuperada do banco depois de um restart pode sair horas depois do evento. Com a janela presa ao `occurredAt`, ou o bot recusa a entrega legítima, ou o remetente precisa reescrever quando o evento aconteceu pra passar — foi o que aconteceu na primeira versão, e destruía a única marca de quando o lobby fechou. A janela protege contra **replay** (coisa de transporte); `occurredAt` é **dado de negócio**.
- **O timestamp tem formato fixo** (`AAAA-MM-DDTHH:MM:SS.sssZ`). Sem isso, como o separador é um ponto e a data já tem um, `("<ts>.<corpo>", "")` e `("<ts>", "<corpo>")` produziriam o mesmo HMAC.
- **Replay dentro dos 5 minutos ainda é possível**, e quem fecha isso é a idempotência do bot descrita acima (checar o estado real no Discord antes de agir), não a assinatura.

## Vínculo Discord ↔ conta da plataforma

- **OAuth2 padrão do Discord** — jogador clica "vincular Discord" na plataforma, é redirecionado pro Discord, autoriza, Discord retorna o Discord ID pra plataforma vincular à conta. Sem digitação manual de ID (evita erro de digitação, confirma que a pessoa é dona daquele Discord de fato).
- **Escopo `identify`, e só.** O Discord ID é o único dado que a plataforma guarda da autorização; o token do Discord não é persistido. Saber se a pessoa está no servidor não precisa de escopo nenhum — quem enxerga membro é o bot, pelo próprio token, com o Server Members Intent, e é assim que a [RF-060](../requisitos/05-funcionais.md#rf-060--sair-do-servidor-discord-bloqueia-a-fila-até-voltar) detecta saída e volta.
- **Não existe "desvincular"** ([RF-082](../requisitos/05-funcionais.md#rf-082--vínculo-de-discord-não-se-desfaz-por-conta-própria), decidido em 2026-09-18). Vinculado é vinculado; trocar é chamado de moderação. Botão de desvincular deixaria qualquer pessoa com reputação baixa zerar os 0–100 numa conta nova com o mesmo Discord, sem nunca ter sido banida — a lista de bloqueio não pega esse caso, porque ela só guarda quem foi banido.
- **O Discord ID não fica legível no banco** ([RNF-009](../requisitos/07-nao-funcionais.md#rnf-009--dado-sensível-criptografado-em-repouso)): hash HMAC pra unicidade, busca e cruzamento com a lista de bloqueio, cifra pro valor exibível. O HMAC usa o **mesmo segredo** de `GamertagPlataforma` e `IdentidadeBloqueada` — segredo por tabela faria o mesmo Discord ID gerar hashes diferentes, e a checagem de ban da [RF-079](../requisitos/05-funcionais.md#rf-079--banimento-sobrevive-à-exclusão-de-conta) nunca casaria.

## Falha de comunicação (bot fora do ar)

- **Fila de retry simples**: se o bot não responder/confirmar recebimento de um evento em **10 segundos**, plataforma reenvia **3 vezes**, com intervalo dobrando a cada uma (10s, 20s, 40s) — **4 tentativas no total** contando o envio original — antes de desistir. Evita perda silenciosa de evento por queda momentânea do bot — não exige infraestrutura de fila pesada (Kafka/RabbitMQ) pro MVP, só retry simples.
- **Onde a fila e o registro de entrega moram (decidido em 2026-09-11)**: na **plataforma**, tabela `EntregaEvento` ([Modelo de dados](../requisitos/03-dados.md#entregaevento)) — é ela quem retenta, e é o único dos dois processos com banco. O bot não guarda fila nem lista de ids processados: **ele é idempotente checando o estado real no Discord antes de agir** (canal já existe, cargo já concedido → não repete). Estado em memória de processo não sobrevive a restart, que é exatamente quando o retry acontece.
- **Retry esgotado**: vira caso automático na fila de moderação da plataforma (mesmo painel já usado pra chamados de OCR/gamertag/apelação, ver [Moderação](../produto/04-governanca/01-moderacao.md)) — sem sistema de alerta separado.

## Discord indisponível (queda do próprio Discord)

Discord sai do ar algumas vezes por ano. Nesse cenário a plataforma web continua funcionando, mas o bot não cria canal, não notifica e não concede cargo — ou seja, **lobby nenhum consegue ser coordenado**.

- **Fila pausa**: plataforma para de fechar lobby novo e mostra aviso in-app ("coordenação indisponível, tente mais tarde"). Fechar lobby sem Discord significaria pessoas confirmando entrada e ficando sem canal, sem capitão anunciado, sem nada — partida que não acontece e reputação penalizada à toa.
- **Partida em andamento segue normal** — ela roda dentro do jogo, não depende do Discord. Report de resultado também é na plataforma, então continua funcionando.
- Gatilho é o mesmo do retry esgotado (bot não responde), só com efeito adicional de pausar a fila em vez de só registrar o caso.
- **Como ficou no código ([#271](https://github.com/ljborgess/ProLobby.com/issues/271), 2026-10-28)**: em vez de esperar um retry esgotar, o bot manda um **sinal de vida** (`bot.status`) a cada minuto, com "conectado ao Discord" e a contagem de canais do servidor. A API guarda o último em memória, sem tocar no banco ([ADR-009](../adr/009-neon-cloudflare-vm.md)), e o job da fila não fecha lobby enquanto: o bot está há mais de 3 min sem falar (só em produção; sem bot, em desenvolvimento, a fila roda), o bot diz que o Discord caiu, ou três canais a mais passariam de 500 ([RF-053](../requisitos/05-funcionais.md)). A pausa sai sozinha no primeiro sinal bom. O mesmo caminho cobre os 9 de 10 lobbies simultâneos ([RNF-008](../requisitos/07-nao-funcionais.md#rnf-008--queda-do-discord-ou-teto-de-canais-pausa-a-fila-não-derruba-a-plataforma)): o job conta os lobbies em andamento e não abre o décimo. Quem está buscando continua na fila com o tempo que tinha, e a tela diz o motivo.

## Rate limit da API do Discord

- **Biblioteca de bot mantida** já respeita o rate limit nativo do Discord automaticamente (comportamento padrão, não construído do zero).
- **Ações do mesmo evento rodam em fila sequencial**, não paralelas soltas — ex.: criar os 3 canais + pingar os jogadores + postar mensagem do lobby fechado disparam um após o outro, não todos de uma vez. Evita estourar limite de requisição sem precisar de infraestrutura de throttling própria.

## Aplicação do bot no Discord

- **Servidor é criado à mão, não pelo bot.** A API do Discord até permite bot criar servidor (`POST /guilds`, para bot em menos de 10 servidores — o nosso estaria em 1), mas nesse caso **o bot vira o dono** — o que quebra a decisão de o servidor pertencer a uma conta separada não-pessoal (ver [Propriedade e convite do servidor](README.md)). Criação manual, uma vez só.
- **Server Members Intent** precisa ser ativado no Developer Portal — não vem ligado por padrão, e sem ele o bot não enxerga membros nem consegue gerenciar cargo/nickname. Falha silenciosa clássica: o bot roda, mas cargo Verificado nunca é concedido.
- Aplicação criada no Discord Developer Portal, token do bot, link de convite OAuth2 com os escopos/permissões necessários (ver [Bot: permissões e integração com moderação](03-bot.md) pra permissão total já decidida) — tudo isso fica sob a **mesma conta separada, não pessoal, que já é dona do servidor** (ver [Propriedade e convite do servidor](README.md)). Mesma lógica de continuidade: token/credencial não fica preso à conta pessoal de nenhum dos 4.

## Segurança do token

O token do bot dá **permissão total no servidor** (kick, ban, cargo, canal) — é a credencial mais sensível do domínio Discord, equivalente ao painel de moderação do lado da plataforma (ver [requisitos de segurança](../produto/04-governanca/02-lgpd.md#requisitos-de-segurança-independentes-de-stack)).

- **Nunca em repositório** — só variável de ambiente. Token commitado, mesmo que removido depois, permanece no histórico do git.
- **Se vazar**: regenerar imediatamente no Developer Portal (invalida o antigo na hora), revisar **#log-moderacao** atrás de ação estranha no período, avisar os 4.
- Procedimento escrito antes de precisar — não durante.
