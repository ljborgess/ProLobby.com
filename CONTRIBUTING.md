# Contribuindo — fluxo de código do ProLobby

Referência rápida do fluxo decidido no [ADR-006](docs/adr/006-backend-separado-e-tooling.md). Se algo aqui divergir do ADR, o ADR manda.

## Time

Luciano (`@ljborgess`), Rafael (`@rafaeljs08`) e Felipe (`LipeLou`, entrou em 2026-09-14) codam. Rafael e Felipe dividem o trabalho paralelo. Luciano lidera de fato (contexto completo do dossiê): atribui issue, revisa e aprova PR dos outros. Ver [HANDOFF.md](HANDOFF.md#decidido-sem-divisão-de-papéis).

**Acabou de entrar?** Leia o [guia do time](docs/time/README.md) antes da primeira issue — é este fluxo, em passo a passo, com o motivo de cada regra e o prompt de abertura de sessão. No time, o Rafael usa Cursor, e o Felipe e o Luciano usam Claude Code. A ferramenta é livre, mas o padrão de PR e de review é o mesmo ([guia 4](docs/time/04-trabalhando-com-ia.md)).

A divisão por issue segue **caminho crítico x paralelo** — critério detalhado na [hierarquia de issues](#divisão-de-trabalho--caminho-crítico-x-paralelo) abaixo.

## Antes de codar

- **Backend, autenticação, banco ou upload**: ler [`docs/requisitos/08-seguranca-checklist.md`](docs/requisitos/08-seguranca-checklist.md) (18 itens) antes da primeira linha — não é fase, é prática de toda mudança que toque essas áreas. Marcar no PR quais itens do checklist se aplicam.
- Ler o RF de origem da issue em [`docs/requisitos/05-funcionais.md`](docs/requisitos/05-funcionais.md) e o doc de `produto/` linkado nele (o "por quê" da regra).

## Padrão de código

Sem exceção, em qualquer PR:

- **Sem código tóxico, sem bug conhecido, sem furo de segurança** — se o checklist de segurança se aplica à issue, os 18 itens são critério de aceite, não sugestão.
- **Limpo e sem duplicação** — antes de escrever uma função nova, checar se já existe algo parecido em `apps/*/src` ou `packages/`; extrair pra `packages/` só quando o segundo uso real aparecer, não antes.
- **Organizado e de fácil manutenção** — nomes que dizem o que a coisa é, módulo por domínio (não por tipo de arquivo), sem abstração especulativa pra caso de uso que não existe ainda.
- **Desempenho** — query com índice pensado desde o schema (não retrofit), sem N+1, sem processamento síncrono do que pode ser assíncrono (ex.: OCR, notificação).
- Teste cobrindo o critério de aceite da issue (Jest/Supertest em `apps/api`, Vitest/Testing Library em `apps/web`, Jest em `apps/bot`).

## Fluxo de issue → PR → merge

1. **Luciano atribui a issue** (campo `Assignee` do GitHub, não label/prefixo).
2. Branch por issue/RF: `feat/rf-019-cadastro`, `fix/rf-024-link-expira`, `chore/...`.
3. Commit no padrão Conventional Commits (`commitlint.config.js` valida via Husky) — `feat:`, `fix:`, `chore:`, `test:`, `docs:`.
4. Abrir PR contra `dev` referenciando a issue (`Closes #N`). O template preenche sozinho — PR **sem issue vinculada não entra**.
5. CI verde: format, lint, type-check, test, build, e2e e audit.
6. Mergeado, **fechar a issue à mão** com um comentário dizendo onde foi entregue.

### A base do PR é sempre `dev` — inclusive quando um trabalho depende do outro

**Nenhum PR aponta pra branch de feature de ninguém.** Se o seu trabalho depende de outro que ainda não entrou, a dependência se registra no *Blocked by* da issue e você espera o merge — não empilha PR em cima de PR.

**Por que está escrito**: em 2026-09-15 os PRs [#114](https://github.com/ljborgess/ProLobby.com/pull/114) e [#115](https://github.com/ljborgess/ProLobby.com/pull/115) foram abertos com base numa branch de feature, do jeito que o GitHub sugere pra PR empilhado. Os dois foram aprovados e mergeados — **e nenhum dos dois chegou em `dev`**: o merge foi pra branch de base, que já tinha sido mergeada e abandonada. O botão disse "Merged", o quadro disse entregue, e o código do rate limit e do contrato de evento ficou fora do produto. Só apareceu quando alguém foi conferir o `dev` arquivo por arquivo.

Empilhar PR também mistura as revisões: quando o `#116` corrigiu a rota, ele arrastou junto a feature do PR anterior, e a descrição dele falava de uma coisa só.

### `dev` é onde o produto é construído, `main` é o que vai pra produção

Dois branches, com papéis diferentes e nenhuma ambiguidade:

| Branch | O que é | Quem manda coisa pra lá |
|---|---|---|
| `dev` | onde o produto inteiro é construído e visto funcionando | todo PR, de todo mundo |
| `main` | o que sobe pra produção | **só o Luciano, por decisão explícita** |

- **Nenhum PR aponta pra `main`.** Trabalho entra em `dev`, roda em `dev`, é revisado em `dev`.
- **`dev` → `main` é promoção, não merge de rotina.** Acontece quando o Luciano olha o que está em `dev` e **dá o veredito** de que aquilo pode ir pro ar. Não é automático, não é por PR aprovado, não é porque o CI ficou verde.
- **Ninguém promove por conta própria** — nem o agente, nem o resto do time.
- `dev` é o **branch padrão do repositório** (desde 2026-09-15). É onde o trabalho entra, então é onde o `Closes #N` precisa funcionar; `main` continua sendo o destino de produção, e ser padrão no GitHub não tem nada a ver com isso.

### Trabalho em andamento precisa ser visível (decidido em 2026-09-16)

O fluxo acima só produz sinal quando o trabalho **acabou**: um PR pronto, com as 7 seções e o review. Até lá, silêncio — e silêncio não distingue "lendo o projeto", "travado no Docker" e "não comecei". A auditoria de 2026-09-16 achou uma fase inteira parada 5 dias sem que ninguém pudesse dizer por quê.

Dois sinais, os dois baratos:

1. **Comente na issue quando pegar.** Uma linha: "peguei, começando por X". Transforma silêncio ambíguo em silêncio informativo.
2. **Abra PR como rascunho (draft) no primeiro commit**, mesmo que seja só o esqueleto. Dá pra ver andando, e dá pra ajudar antes do fim em vez de depois. Marque "Ready for review" quando o pipeline local passar.

**Issue atribuída sem nenhum dos dois sinais em 5 dias úteis volta pro caminho crítico.** Não é punição: uma fase inteira não pode ficar parada esperando um sinal que o processo não pedia.

### Fechar issue é passo manual, não automático

O `Closes #N` no PR **não fecha nada neste repo**: o GitHub só fecha issue automaticamente quando o PR entra no **branch padrão**. Por isso o padrão do repositório é `dev` — que é onde o trabalho entra. `main` continua recebendo merge só quando o time decidir promover.

Mesmo com o padrão certo, confira depois do merge: issue entregue e aberta faz o quadro mentir, e foi o que aconteceu com sete issues até 2026-09-15.

### O PR fica aberto até as duas revisões — sem exceção

**Nenhum PR é mergeado no mesmo movimento em que é aberto.** Vale pra todo mundo, inclusive pra quem tem permissão de mergear sozinho e inclusive com o CI verde:

| Revisão | O que olha |
|---|---|
| **Code review** | corretude, aderência ao RF de origem, reuso do que já existe, ausência de abstração especulativa, teste cobrindo o critério de aceite da issue |
| **Security review** | o recorte do [checklist de segurança](docs/requisitos/08-seguranca-checklist.md) marcado no PR foi conferido item a item, não só marcado pelo autor |

As duas são registradas no próprio PR (comentário ou approval), não em conversa paralela — quem for ler o histórico daqui a seis meses precisa ver que aconteceram.

**Por que está escrito com esse peso**: branch protection não é trava técnica neste repo — privado no plano Free, decidido em [#66](https://github.com/ljborgess/ProLobby.com/issues/66) e registrado no [ADR-006](docs/adr/006-backend-separado-e-tooling.md). O GitHub **deixa** mergear sem aprovação. Então a regra só existe enquanto estiver escrita e for seguida: é disciplina declarada, não garantia da ferramenta.

- PR do Rafael ou do Felipe → aprovação do Luciano nas duas dimensões antes do merge.
- PR do Luciano → **também fica aberto** até a revisão, mas **quem revisa é o próprio Luciano** (ver abaixo). Não precisa de aprovação do Rafael nem do Felipe.
- Exceção única: correção de emergência com produção no ar. Ela ainda não existe; quando existir, vira ADR própria.

#### Quem revisa o PR do Luciano (decidido em 2026-09-14)

Em 2026-09-11, com só o Luciano ativo, "outra pessoa revisa" era uma **regra impossível de cumprir**. Foi o que aconteceu no [#71](https://github.com/ljborgess/ProLobby.com/pull/71), mergeado no mesmo dia em que a regra foi escrita. A saída foi o agente revisar. Com o Rafael e o Felipe ativos, a regra previa que a segunda revisão passasse pra eles. O Luciano decidiu que não: **o PR dele é revisado por ele mesmo**, e o time não é acionado.

- **O agente (Claude Code) faz o code review e o security review** e publica os dois **como comentário no próprio PR**, antes do merge. Os achados vêm classificados por severidade, e o recorte do checklist de segurança é conferido item a item.
- **O Luciano lê, contesta ou aceita**, e é ele quem faz o merge. A responsabilidade final continua humana, e nenhum PR entra sem uma leitura adversarial registrada.
- Achado de que o autor discorda **fica escrito no PR com o motivo da recusa**. Discordância registrada vale mais que achado ignorado em silêncio.

**Por que não o Rafael ou o Felipe:** eles estão entrando agora e ainda não têm o contexto do dossiê. Tempo deles gasto revisando o caminho crítico é tempo tirado do trabalho paralelo. Se isso mudar, é decisão do Luciano, registrada aqui.

### Rodando os testes localmente

`pnpm turbo test` não precisa de nada. O **e2e do `apps/api` precisa de Postgres**:

```bash
docker compose up -d postgres
pnpm turbo e2e
```

No CI o banco sobe como `services:` do workflow, com os mesmos usuário, senha e nome de banco do `docker-compose.yml` — é o que evita o "funciona local, quebra no CI".

**Se a porta 5432 já estiver ocupada** por outra stack na máquina (comum em quem toca mais de um projeto), não edite o `docker-compose.yml`:

```bash
POSTGRES_PORT=5442 docker compose up -d postgres
DATABASE_URL=postgres://prolobby:prolobby@localhost:5442/prolobby pnpm turbo e2e
```

O container continua na 5432 por dentro; muda só o mapeamento no host.

## Idioma: código em inglês, projeto em português

**Todo código é em inglês. Sem exceção e sem mistura.** Nome de classe, variável, função, arquivo, coluna de banco, valor de enum, chave de JSON, mensagem de commit interna ao código, comentário e nome de teste — tudo inglês.

**Todo o resto do projeto é em português**: dossiê (`docs/`), issue, PR, mensagem de commit, discussão. É onde a decisão de produto mora, e o time pensa em português.

A fronteira é o artefato, nunca a linha: um arquivo `.ts` é inteiro em inglês, uma issue é inteira em português. O que não pode existir é `const contaVerificada = await findAccount()` — meia frase em cada idioma, que é o que obriga quem lê a traduzir mentalmente a cada linha.

### Por quê

- **Stack inteira é em inglês**: `findOne`, `createdAt`, `@Entity`, `beforeAll`. Código misto produz `contaRepository.findOneByEmail(email)` — três idiomas numa expressão.
- **Plural e acento não sobrevivem a banco e URL**: `personagens`, `notificações`, `avaliação` viram `personagems`, `notificacoes`, `avaliacao`. O acento cai em algum lugar do caminho e o nome deixa de ser a palavra que era.
- **Reverter depois é caro**: renomear coluna exige migration, e renomear classe exige tocar em tudo que importa dela.

### Glossário — dossiê (pt) → código (en)

O dossiê é a fonte da regra; o código traduz o nome, nunca o conceito. Quem implementar uma RF encontra o termo em português no requisito e o equivalente aqui:

| Dossiê | Código | Onde |
|---|---|---|
| Conta | `Account` | `modules/account` |
| Personagem | `Character` | `modules/character` |
| GamertagPlataforma | `PlatformGamertag` | `modules/character` |
| ClubeDeclarado | `DeclaredClub` | `modules/character` |
| EnvioDePrint | `ScreenshotUpload` | `modules/character` |
| EntradaFila | `QueueEntry` | `modules/queue` |
| OcorrenciaRecusaFila | `QueueDeclineOccurrence` | `modules/queue` |
| Lobby | `Lobby` | `modules/lobby` |
| ParticipacaoLobby | `LobbyParticipation` | `modules/lobby` |
| Report (de resultado) | `MatchReport` | `modules/result` |
| EstatisticaPartida | `MatchStatistic` | `modules/result` |
| Avaliacao | `PeerRating` | `modules/result` |
| EventoElo / EventoReputacao | `EloEvent` / `ReputationEvent` | `modules/ranking` |
| CasoModeracao | `ModerationCase` | `modules/moderation` |
| LogAuditoria | `AuditLog` | `modules/moderation` |
| IdentidadeBloqueada | `BlockedIdentity` | `modules/moderation` |
| AceiteTos | `TermsAcceptance` | `modules/account` |
| Notificacao | `Notification` | `modules/notification` |
| EventoPagamento | `PaymentEvent` | `modules/account` |
| EntregaEvento | `EventDelivery` | `modules/bot-integration` |
| Capitão | `captain` | — |
| Reputação / Elo | `reputation` / `elo` | — |
| Categoria (posição) | `category` | — |

Nome de módulo em `apps/api/src/modules/` e em `apps/web/src/modules/` segue o **inglês** da tabela; a label `area:*` da issue segue o **português**, porque issue é comunicação de time.

### Exceção única

Caminho de arquivo do dossiê citado em comentário fica como está (`docs/produto/03-partida/02-fila.md`) — é um caminho real, não texto. Vale também pra `RF-019` e afins: são identificadores, não palavras.

## Estrutura de código

Espelha o `plataforma-b2ml` (mesma empresa, mesmo padrão já validado): **módulo por domínio, não por tipo de arquivo**. Nomes de domínio = mesmos das `area:*` labels.

### `apps/api` (NestJS)

```
src/
├── common/              # transversal, não é regra de negócio de nenhum domínio
│   ├── auth/            # JWT guard, decorators, hash de senha
│   ├── config/
│   ├── database/        # mikro-orm.config.ts, migrations
│   ├── health/          # health.controller.ts
│   └── security/        # ValidationPipe global, throttler, helmet/CORS
└── modules/
    ├── account/         # RF-019 a RF-026, RF-070, RF-072, RF-074, RF-078
    ├── character/       # RF-027 a RF-031, RF-063 a RF-065, RF-073 (cadastro/ciclo de vida + verificação por OCR)
    ├── queue/           # RF-001 a RF-011, RF-034, RF-076
    ├── lobby/           # RF-032, RF-033, RF-051, RF-052, RF-080
    ├── result/          # RF-012, RF-013, RF-041 a RF-046, RF-066, RF-067
    ├── ranking/         # RF-014 a RF-018, RF-071, RF-077
    ├── moderation/      # RF-035 a RF-040, RF-068, RF-069, RF-075, RF-079
    └── bot-integration/ # RF-058, RF-059 — só entrega de evento (retry, sequência, idempotência)
```

Dentro de um módulo: `*.controller.ts`, `*.service.ts`, `*.module.ts` e `*.spec.ts` ficam **flat na raiz do módulo** (sem pasta `controllers/`, `services/`); DTOs entram em `dto/`. Sub-recurso do próprio domínio ganha subpasta só quando crescer o suficiente pra justificar (mesmo critério do b2ml: `modules/user/collaborator/`).

**Comunicação entre módulos (decidido em 2026-09-09)** — vale pra qualquer módulo, não só os de agora:

- **Comandar outro módulo** (fazer algo acontecer nele): emitir **evento de domínio** (`EventEmitter2` do Nest, ou equivalente), nunca chamar `Service`/`Repository` de outro módulo pra escrever. Ex.: `resultado` não chama `filaService.liberar()` direto — emite `partida.anulada`, e `fila` escuta e reage. Desacopla: mudar `fila` não quebra `resultado` sem aviso.
- **Ler outro módulo**: chamar **método público do `Service`** dele (ex.: `contaService.getPendencias(contaId)`), nunca acessar `Repository`/`Entity` de outro módulo direto.
- **RF-047 a RF-062 (exceto 058/059)**: cada RF é emitida como evento pelo módulo de domínio dono do gatilho (ex.: `lobby` emite quando cria/apaga canal, `moderacao` emite quando aplica punição), e `bot-integration` escuta qualquer evento marcado pra ir pro Discord e entrega via webhook — não decide regra de negócio nenhuma, reforça o que [ADR-003](docs/adr/003-webhook-nao-polling.md) já dizia (bot burro, regra na plataforma). **Qual módulo de domínio é dono de cada RF específica dessa faixa fica pra quando a Fase 3 abrir** — decidir agora seria documentar fase futura em detalhe antes da hora, o mesmo erro que já corrigimos quando as issues #1-#5 foram fechadas e reabertas em PRD/issue/sub-issue.
- **RF-047, RF-048, RF-062 não têm código em `apps/api`** — são ausência de feature (047), checagem nativa do Discord.js (048) ou processo operacional + checagem no boot do bot (062). Não procurar controller/service pra elas na API.

**Banco na Neon — regras que o ambiente impõe (decidido em 2026-09-14, [ADR-009](docs/adr/009-neon-cloudflare-vm.md))**. Valem desde já, mesmo com o desenvolvimento local em Docker, porque o erro só aparece em produção:

1. **Nada consulta o banco em ciclo com o sistema parado.** Tick de fila só com gente na fila; retry de evento só com entrega pendente; scheduler diário. Um `setInterval` esquecido mantém a Neon acordada 24 horas e estoura o plano grátis sem ninguém perceber.
2. **O pool começa com zero conexões e reconecta sozinho.** A Neon derruba conexões paradas quando hiberna.
3. **Nada que dependa de sessão do Postgres**: sem `SET` de sessão, sem `LISTEN/NOTIFY`, sem advisory lock de sessão. O PgBouncer em modo transação divide conexões entre requisições — funciona no teste local e falha em produção. **Consequência pra Fase 2.5**: o tempo real da fila ([RNF-003](docs/requisitos/07-nao-funcionais.md#rnf-003--estado-da-fila-atualiza-em-menos-de-3-s)) vai por WebSocket ou SSE na própria API.
4. **A API usa a role `prolobby_app` (sem DDL)**; migration roda com `prolobby_owner` pela URL direta. Tabela nova precisa estar coberta pelo `ALTER DEFAULT PRIVILEGES`.

### `apps/web` (Next.js App Router)

```
src/
├── app/
│   ├── (public)/    # cadastro, login — sem sessão
│   └── (private)/   # fila, perfil, lobby — exige sessão
├── common/
│   ├── api/          # client HTTP pra apps/api
│   ├── auth/          # guarda de rota, contexto de sessão
│   ├── providers/
│   └── ui/            # componente compartilhado entre domínios
├── content/            # texto traduzido pt/es por domínio (RNF-016) — sem lib externa de i18n
├── hooks/
└── modules/            # componente/lógica por domínio, mesmos nomes da api
```

`app/` só tem rota (route groups `(public)`/`(private)` não mudam a URL, só organizam). Lógica de UI/domínio mora em `modules/`, importada pela página.

### `apps/bot` (Node.js + discord.js)

```
src/
├── discord/    # client.ts + ações reutilizáveis (conceder cargo, criar/apagar canal, DM)
└── webhook/
    ├── server.ts
    └── handlers/   # 1 arquivo por área — lobby.ts, moderacao.ts, conta.ts...
```

Mais simples que `modules/` da api de propósito: bot não expõe endpoint próprio nem tem DTO, só reage a evento — handler por área já basta, sem controller/service.

## Hierarquia — PRD → issue → sub-issue

Toda fase nasce em 3 níveis, todos no GitHub (Sub-issues + Issue Dependencies nativos, nada em planilha ou doc externo):

1. **PRD** — 1 issue-mãe por fase (`tipo:docs` + `tipo:epic`), sub-issue do roadmap mestre. Contexto, problema, objetivo, **fora de escopo explícito**, RFs cobertos e critério de sucesso da fase inteira.
2. **Issue** — 1 por peça grande da fase (schema, cadastro, auth do webhook, CI...), sub-issue do PRD. O quê, RFs, checklist de segurança aplicável, critério de aceite, origem no dossiê.
3. **Sub-issue** — 1 por entidade/endpoint/tela/arquivo de config, sub-issue da issue. Granularidade pequena o bastante pra virar 1 PR revisável.

**Índice vivo: [#64 — PRD Mestre](https://github.com/ljborgess/ProLobby.com/issues/64)**, com as 13 fases em ordem de execução e o mapeamento das issues antigas.

### Uma fase por vez — regra de reconstrução

O tracker é reconstruído **fase a fase**, nunca de uma vez:

- A **fase corrente** tem PRD + issues + sub-issues, com dependência fina registrada.
- As **fases seguintes** existem só como **milestone** e como linha da tabela do #64. Nada de issue de fase futura: ela envelhece antes de virar código, e o dossiê muda embaixo dela (a auditoria de 2026-09-11 mudou 8 RFs de uma vez).
- As issues do tracker anterior (#25–#63) são fechadas como `not planned` **no momento em que a fase que as cobre é reconstruída**, com comentário apontando pra substituta. Enquanto a fase não chega, a issue antiga fica aberta e vale como registro.
- Quando uma fase fecha, a próxima é aberta pelo mesmo caminho: PRD primeiro, issues depois, sub-issues por último.

### Divisão de trabalho — caminho crítico x paralelo

- **Luciano (`@ljborgess`)** pega a cadeia que **bloqueia o resto**: schema, autenticação, elo, fila, lobby, resultado, disputa, painel de moderação.
- **Rafael (`@rafaeljs08`)** pega o paralelo do **bot e da infra**: auth do webhook do bot, contrato de evento, testes de migration, pipeline de OCR, notificações.
- **Felipe (`@LipeLou`, entrou em 2026-09-14)** pega o paralelo do **produto visível**: telas do `apps/web`, proteção do cadastro, scheduler, perfil/ranking, LGPD operacional.

Não é "backend vs frontend" — é minimizar espera de um pelo outro. Quando a cadeia crítica trava esperando review, o paralelo continua andando. Rafael e Felipe ficam em áreas separadas pra não disputarem os mesmos arquivos.

### Grafo vivo — Fase 2.1 (núcleo de conta), trabalho aberto em 2026-09-14

Um PR aberto por pessoa; a seta é a ordem, e o *Blocked by* nativo está registrado nas issues.

```
#73 PRD Fase 2.1: núcleo — conta e autenticação
│
├── @ljborgess   (Claude Code)  #90 link de redefinição de senha
│                               → #91 recuperação com dois fatores
│                               → #104 conta suspensa vê o fim da pena
│
├── @rafaeljs08  (Cursor)       #81 teste de migration end-to-end
│                               → #93 HMAC no webhook
│                               → #94 rate limit no webhook      — blocked by #93
│                               → #95 contrato de evento tipado  — blocked by #93
│                               (#92 fecha quando #93, #94 e #95 fecharem)
│                               depois da 2.1 → #50 piloto de OCR → primeiro deploy interno (ADR-009)
│
└── @LipeLou     (Claude Code)  #106 scheduler (sem job de prints — virou lifecycle, ADR-009)
                                → #87 tela de cadastro e login   — requisitos de infra do ADR-009 no corpo
                                → #101 proteção contra bot       — blocked by #87
```

O primeiro deploy interno não tem issue ainda: pela regra "uma fase por vez", as issues dele nascem quando a Fase 2.2 abrir ([ADR-009](docs/adr/009-neon-cloudflare-vm.md), decisão 12).

### Grafo — Fase 1 (infra, processo e Discord) — concluída em 2026-09-11

```
#64 PRD Mestre: roadmap de fases e ordem de execução
└── #65 PRD Fase 1: infra de CI, processo de PR e servidor Discord   @rafaeljs08
    ├── #66 Decisão: repo público vs Pro vs convenção                @ljborgess
    ├── #67 Postgres como service no GitHub Actions                  @rafaeljs08
    ├── #68 Template de Pull Request                                 @rafaeljs08  — blocked by #66
    ├── #69 Template de issue                                        @rafaeljs08
    └── #70 Configurar o servidor Discord                            @ljborgess
```

Fase 0 e fases a partir da 2.2: milestone criado, issues abertas quando a fase começar.

### Como registrar dependência

- Pela interface: na issue que vai ficar bloqueada, barra lateral → **Blocked by** → busca a issue que bloqueia.
- Por CLI: `gh api repos/ljborgess/ProLobby.com/issues/<N>/dependencies/blocked_by -X POST -F issue_id=<id interno da bloqueadora>` — o `issue_id` é o id interno, não o número `#N`; pegar com `gh api repos/ljborgess/ProLobby.com/issues/<N> -q .id`.
- Sub-issue no pai: `gh api repos/ljborgess/ProLobby.com/issues/<pai>/sub_issues -X POST -F sub_issue_id=<id interno da filha>`.
- **Regra**: quem abre issue nova identifica a dependência **fina** na hora (qual peça específica bloqueia, não só "a issue pai") e já vincula.

## Labels

- **Área**: `area:conta`, `area:fila`, `area:lobby`, `area:bot`, `area:personagem`, `area:moderacao`, `area:ranking`, `area:governanca`, `area:seguranca`, `area:i18n`, `area:infra`.
- **Tipo**: `tipo:feat`, `tipo:fix`, `tipo:chore`, `tipo:test`, `tipo:docs` (espelha o Conventional Commits).
- **Milestone**: uma por fase de [`docs/negocio/02-implementacao.md`](docs/negocio/02-implementacao.md).

## Exceção: piloto de OCR

O [piloto de OCR](docs/requisitos/06-piloto-ocr.md) (bloqueador nº 2) não segue este fluxo — é script de medição isolado, sem conta/banco/upload/tela, rodado direto pelo Luciano, sem issue nem PR. O resultado (Tesseract vs. Google Vision) vira input pra Fase 2.2 (personagem e verificação por OCR), essa sim no fluxo normal. **Atualização de 2026-09-11**: o piloto ganhou issues próprias na Fase 0 do roadmap ([#64](https://github.com/ljborgess/ProLobby.com/issues/64)) porque virou trabalho de duas pessoas — a coleta dos 50 prints e o script de medição podem correr em paralelo — mas segue sem PR de produto.
