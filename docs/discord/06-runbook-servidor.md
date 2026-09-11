# 6. Runbook — montar o servidor do zero

**Status: executado em 2026-09-11** ([#70](https://github.com/ljborgess/ProLobby.com/issues/70), Fase 1 — fechada). O servidor existe, com conta separada, 2FA, modo Comunidade, cargos, canais, onboarding e bot convidado.

Fica aqui como **procedimento**, não como pendência: serve pra reconstruir o servidor se ele for perdido, pra montar um servidor de teste separado do de produção, e pra conferir contra o real quando algo parecer configurado errado.

Passo a passo pra sair de "nada existe" até "bot convidado e pronto pra receber evento". É configuração manual: **nenhuma etapa aqui é feita pelo bot**, por decisão registrada em [Integração técnica](04-integracao.md) — a API do Discord permitiria criar servidor via `POST /guilds`, mas o bot viraria dono, contra a propriedade por conta separada.

Consolida o que está decidido em [Cargos](01-cargos.md), [Canais](02-canais.md), [Bot](03-bot.md) e [Integração técnica](04-integracao.md). Quando divergir, o arquivo de origem manda.

## 1 · Conta dona do servidor

Criar uma conta Discord **separada e não pessoal** (ex.: `prolobby.oficial@...`), com 2FA ligado, e usar ela pra criar o servidor.

Motivo: a propriedade do servidor e o token do bot não podem ficar presos à conta pessoal de nenhum dos 4 — se a pessoa sair do projeto, perde acesso ou tem a conta banida, o servidor vai junto. Credencial guardada onde os 4 alcancem, fora do repositório.

> 2FA na conta dona é pré-requisito pra ativar exigência de 2FA em ações de moderação no servidor. Se algum dia ligarem essa exigência sem 2FA na dona, a própria conta perde as ações.

## 2 · Servidor

Criar o servidor pela conta acima. Região/idioma não importam pro funcionamento (o Discord roteia voz automaticamente).

Nome e ícone seguem a identidade visual da [visão](../produto/01-visao/01-visao.md).

## 3 · Cargos

Criar nesta ordem — **hierarquia importa**: o bot só gerencia cargo e nickname de quem está **abaixo** dele na lista.

| Ordem (topo → base) | Cargo | Quem tem | Para que serve |
|---|---|---|---|
| 1 | **Admin** | os 4 sócios | acesso total ao servidor e ao bot |
| 2 | **Bot** (criado sozinho ao convidar) | o bot | precisa ficar **acima** de Verificado, Beta, Fundador, Apoiador e dos sociais |
| 3 | **Moderador** | os mesmos 4 no MVP | painel e ações de moderação; separado de Admin desde já, pra entrada de moderador comunitário não exigir migração ([Moderação](../produto/04-governanca/01-moderacao.md)) |
| 4 | **Verificado** | concedido **só pelo bot** | é o gate funcional: libera os canais de fila/lobby ([RF-055](../requisitos/05-funcionais.md)) |
| 5 | **Beta** | convidados do beta fechado | reconhecimento permanente **e** trava de entrada na fila enquanto o beta durar ([RF-076](../requisitos/05-funcionais.md)) |
| 6 | **Fundador** / **Apoiador** | quem apoiou | só reconhecimento visual — não libera canal nem permissão ([Sustentabilidade](../negocio/03-sustentabilidade.md)) |
| 7 | sociais (plataforma, objetivo) | auto-selecionados no onboarding | organização social, **nenhum acesso funcional** ([Cargos](01-cargos.md)) |

**Armadilha**: se o cargo do bot ficar abaixo de Verificado, a concessão falha em silêncio — o bot roda, não dá erro visível, e ninguém nunca fica Verificado.

## 4 · Canais fixos

Sete, com as permissões de [Canais](02-canais.md):

| Canal | Quem lê | Quem escreve | Observação |
|---|---|---|---|
| `#regras-e-onboarding` | todos | só Admin | regras + link do onboarding da plataforma |
| `#anuncios` | todos | só Admin | — |
| `#geral` | cargos sociais | cargos sociais | chat livre; **não** exige Verificado |
| `#fila-status` | todos | só o bot | feed público de lobby fechado, sem dado sensível |
| `#suporte-e-denuncia` | todos | todos | mensagem aqui **abre caso na plataforma** automaticamente ([RF-061](../requisitos/05-funcionais.md)) |
| `#log-moderacao` | **privado** — Admin e Moderador | só o bot | kick, ban, concessão/revogação de Verificado, ativação de plano |
| `#status-sistema` | **privado** — Admin e Moderador | só o bot | bot caiu/voltou, alerta de 400+ canais |

Canais de lobby são **temporários** e criados pelo bot em tempo de execução (3 por lobby) — não criar à mão.

Categoria separada pros temporários ajuda a enxergar o teto de 500 canais, mas não é obrigatória.

## 5 · Onboarding nativo

**Pré-requisito**: o menu de onboarding (em português, **Integração**) só existe depois de **Ativar Comunidade** (Configurações do Servidor → Ativar Comunidade), que pede e-mail verificado obrigatório, filtro de conteúdo explícito, canal de regras e canal de novidades. Sem isso o menu não aparece — e o que aparece com nome parecido, **Integrações**, é a tela de webhooks, outra coisa.

Usar **Onboarding/Screening do próprio Discord** (zero código) pra perguntar plataforma (PS5 / Xbox Series / PC) e objetivo, concedendo cargo social por botão.

Os cargos sociais **não liberam canal funcional** — quem libera fila/lobby é o Verificado, concedido pelo bot. Misturar os dois é o erro que transformaria o onboarding social em porta de entrada da fila.

## 6 · Aplicação do bot

No [Developer Portal](https://discord.com/developers/applications), logado na conta dona:

O portal é traduzido: os nomes em português vão entre parênteses.

1. **New Application** (*Novo aplicativo*) → nome do projeto.
2. Aba **Bot** → **Reset Token** (*Redefinir token*) → copiar **direto pro gerenciador de senhas**; não é exibido de novo, e não passa por chat, mensagem ou arquivo do repo.
3. Aba **Bot** → **Privileged Gateway Intents** (*Intenções privilegiadas do gateway*) → ligar **Server Members Intent** (*Intenção de membros do servidor*). Desligar **Public Bot** (*Bot público*) na mesma tela.
4. Aba **OAuth2** → gerar a URL de convite com escopos `bot` e `applications.commands`.

### Server Members Intent — a armadilha que custa um dia

**Não vem ligado por padrão.** Sem ele o bot não enxerga membro, não gerencia cargo nem nickname, e a falha é **silenciosa**: o processo sobe, os eventos chegam, e o cargo Verificado simplesmente nunca é concedido ([RF-062](../requisitos/05-funcionais.md)). Conferir que está ligado **antes** de debugar qualquer coisa de cargo.

### Permissões do convite

[Bot](03-bot.md) descreve "permissão total no servidor". Na hora de gerar o convite, vale usar o **conjunto explícito** em vez de Administrator — o efeito é o mesmo hoje e evita que um token vazado seja poder irrestrito (item 7 do [checklist de segurança](../requisitos/08-seguranca-checklist.md)):

| Permissão | Por que o bot precisa |
|---|---|
| Manage Roles | conceder/revogar Verificado, Beta, Fundador, Apoiador |
| Manage Channels | criar e apagar os 3 canais temporários por lobby |
| Manage Nicknames | sincronizar nickname com o gamertag ([RF-056](../requisitos/05-funcionais.md)) |
| Kick Members / Ban Members | só por comando de Admin/Moderador ([RF-048](../requisitos/05-funcionais.md)), nunca automático |
| View Channels, Send Messages, Embed Links, Read Message History | postar aviso, ler `#suporte-e-denuncia` |
| Manage Messages | limpeza em canal de bot |
| Connect | enxergar quem está nas calls, pra medir os 10 min de call vazia ([Canais](02-canais.md)) |

Soma dessas permissões: **`403794966`** — dá pra colar direto na URL (`&permissions=403794966`) ou marcar na calculadora do próprio portal, que mostra o mesmo número.

**Move Members fica de fora de propósito**: o bot posta o link do canal e nunca arrasta ninguém ([RF-050](../requisitos/05-funcionais.md)). Pedir a permissão seria contradizer a decisão de voz opcional.

## 7 · Convite e verificação final

Abrir a URL de convite pela conta dona, escolher o servidor, autorizar. Depois conferir:

- [ ] Cargo do bot **acima** de Verificado, Beta, Fundador, Apoiador e dos sociais
- [ ] Server Members Intent ligado no portal
- [ ] Os 7 canais fixos existem, com os dois privados realmente privados
- [ ] Onboarding concede cargo social por botão
- [ ] Token guardado fora do repositório, alcançável pelos 4 ([RNF-013](../requisitos/07-nao-funcionais.md))
- [ ] Link fixo de convite do servidor gerado, **sem expiração** — é por ele que quem sai volta e destrava a fila ([RF-060](../requisitos/05-funcionais.md))

## 8 · O que **não** fazer agora

- Não criar canal de lobby à mão — são temporários, criados pelo bot.
- Não segmentar canal por plataforma ou posição: comunidade pequena com canal segmentado vira canal morto ([Canais](02-canais.md)).
- Não criar canal separado por idioma — a comunidade é unificada, e mensagem em canal compartilhado sai bilíngue ([RF-049](../requisitos/05-funcionais.md)).
- Não dar Administrator ao bot se o conjunto acima funcionar.

## Lições da execução (2026-09-11)

Três coisas que o runbook não previa e apareceram na hora:

- **Onboarding exige modo Comunidade.** O menu "Integração" simplesmente não existe até ativar Comunidade (Configurações do Servidor → Ativar Comunidade), que por sua vez pede e-mail verificado, filtro de conteúdo, canal de regras e canal de novidades. Quem procura o menu antes disso acha "Integrações" (webhooks), que é outra coisa.
- **O Developer Portal também é traduzido.** "Redefinir token", "Intenções privilegiadas do gateway", "Inserir links" (que é o `Embed Links`) — a lista de permissões do gerador de URL sai em português.
- **Token vazou em canal de conversa durante o setup e foi regenerado antes do primeiro uso**, sem impacto. Reforça o que [Integração técnica](04-integracao.md) já mandava: regenerar é barato e imediato, e o custo real só existe se o bot já estiver agindo em algum servidor. Regra prática que vale repetir: **Application ID é público e pode circular; token é senha e só existe em gerenciador de senhas e em `.env` local**.

## Depois deste runbook

O servidor existir não liga nada sozinho: o bot só age quando a plataforma manda evento, e o endpoint que recebe esse evento ainda precisa de autenticação (Fase 2.1). O vínculo OAuth2 da conta com o Discord é a Fase 2.3.
