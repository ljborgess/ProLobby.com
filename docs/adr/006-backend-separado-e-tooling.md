# ADR-006 · Backend separado (NestJS/MikroORM/JWT) e ferramentas de repo

**Status**: aceita — corrige parcialmente [ADR-005](005-stack-tecnica.md)
**Data**: 2026-09-08

## Contexto

Ao planejar o início do código, o desenvolvimento era solo (1 pessoa), com experiência diária em NestJS/MikroORM/Jest/Playwright no projeto de trabalho (`plataforma-b2ml`, monorepo Turborepo com `apps/web` Next.js e `apps/api` NestJS separado). ADR-005 havia decidido Next.js API routes (monolito) e Prisma, sem considerar essa familiaridade nem o padrão de ferramentas já dominado.

**Atualização (2026-09-08, mesmo dia)**: Rafael entra como 2º desenvolvedor. Luciano continua líder técnico de fato (mais investido no projeto, dono do contexto completo do dossiê) — isso muda fluxo de git e revisão, não a stack.

**Correção (2026-09-08, mesmo dia)**: Felipe foi convidado pro repo (usuário `LipeLou`), mas **ainda não entrou** — convite pendente. Enquanto isso, é só Luciano e Rafael codando. Se/quando Felipe aceitar, mesma função do Rafael — coda, abre PR, Luciano revisa antes de subir pra `dev`.

Reavaliado: pra 1 pessoa construindo sozinha um domínio complexo (73 RFs, máquina de estado de 12 estados, log de eventos de elo/reputação com rollback, retry com backoff, escada de punição), familiaridade com o stack pesa mais que reduzir de 2 processos pra 1 — Turborepo já orquestra os dois com um comando.

## Decisão

| Item | ADR-005 dizia | Decisão corrigida |
|---|---|---|
| Núcleo/backend | Next.js API routes (monolito) | **Next.js só frontend** (`apps/web`) + **NestJS separado** (`apps/api`) fazendo toda regra de negócio, auth e banco |
| ORM | Prisma | **MikroORM** (`@mikro-orm/nestjs`, `@mikro-orm/postgresql`) |
| Autenticação | Auth.js (NextAuth) no Next.js | **JWT no NestJS** (`@nestjs/jwt`) — Next.js só guarda o token (cookie `HttpOnly`) e repassa pra API |

**Mantido do ADR-005** (não muda): bot Node.js+TypeScript+discord.js, Postgres self-hosted sem RLS, Oracle Cloud Free Tier (São Paulo/Vinhedo), monorepo no mesmo repositório `ProLobby.com`.

**Novo, não coberto pelo ADR-005**:

- **Estrutura de repositório**: mesmo repositório `ProLobby.com` — `docs/` continua onde está, `apps/` e `packages/` entram na raiz, bem separados por pasta.
- **Turborepo** por cima do pnpm workspaces (`turbo dev/build/lint/test/e2e`), espelhando o `plataforma-b2ml`.
- **`packages/eslint-config`, `packages/tsconfig`, `packages/types`** — compartilhados entre `apps/web`, `apps/api` e `apps/bot`, mesmo padrão do projeto de referência.
- **Testes**, espelhando o `plataforma-b2ml`:
  - `apps/web`: Vitest + Testing Library (unit), Playwright (e2e).
  - `apps/api`: Jest + Supertest (unit e e2e).
  - `apps/bot`: Jest (unit) — sem e2e formal, testado via evento fake (curl) como já previsto em [HANDOFF-bot.md](../discord/HANDOFF-bot.md).
- **Lint/format**: ESLint + Prettier + Husky + lint-staged + commitlint (conventional commits), mesmo padrão.
- **CI**: **GitHub Actions** (equivalente ao GitLab CI de lá — o repo está no GitHub, não GitLab), rodando lint/test/e2e a cada push.
- **Escopo npm dos packages internos**: `@prolobby/*` (`@prolobby/eslint-config`, `@prolobby/tsconfig`, `@prolobby/types`).
- **Postgres local**: Docker Compose (`docker-compose.yml` na raiz, mesmo padrão do `plataforma-b2ml`) — isola dado de teste, sem instalar Postgres direto na máquina.
- **Fluxo de git**: feature branch por issue/RF (`feat/rf-019-cadastro`, etc.), merge em `dev` via PR. Histórico fica rastreável por RF.
- **Issues do GitHub**: 1 issue por RF/RNF (ou fatia menor de RF grande), com 3 dimensões de label — **área** (fila, lobby, bot, ocr, moderação...), **tipo** (feat/fix/chore/test/docs, mesma taxonomia do commitlint) — e **milestone** por fase de [`negocio/02-implementacao.md`](../negocio/02-implementacao.md) (0 a 6). Sub-issues (nativo do GitHub) quebram RF grande em tarefa técnica.
- **Atribuição de issue (decidido 2026-09-08, com Rafael entrando; Felipe convidado, ainda não ativo)**: campo `Assignee` nativo do GitHub, não label/prefixo de nome. **Luciano atribui** — tem o contexto completo do dossiê, evita Rafael pegar RF fora de ordem de dependência sem saber do resto.
- **Revisão de PR (decidido 2026-09-08)**: PR do Rafael precisa de aprovação do Luciano (contexto do dossiê pega desvio de regra de negócio que o CI não pega). PR do Luciano **mergeia direto** após CI verde — exigir aprovação de quem não tem contexto suficiente pra avaliar decisão arquitetural aqui seria gargalo.
- **Branch protection é convenção, não trava técnica (confirmado 2026-09-08)**: `gh api repos/.../branches/dev/protection` devolve `403 — Upgrade to GitHub Pro or make this repository public`. Repo privado no plano Free não suporta review obrigatório de verdade — quem tem `push` pode mergear o próprio PR sem aprovação de ninguém. Decisão: repo continua privado, sem GitHub Pro (gasto novo contra [RF-072](../requisitos/05-funcionais.md#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático)) — a regra acima é disciplina, não garantia. Revisitar se alguém mergear sem review de verdade.
- **SonarQube: pulado por enquanto.** SonarCloud é grátis só pra repo público (a confirmar se `ProLobby.com` é/vira público); self-hosted custa infra extra, contra a regra de R$0 ([RF-072](../requisitos/05-funcionais.md#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático)). ESLint + [checklist de segurança](../requisitos/08-seguranca-checklist.md) cobrem boa parte sem custo. Revisitar se o repo abrir pra mais gente.

## Alternativas descartadas

**Manter Next.js API routes.** Faria sentido se a stack fosse nova pra quem desenvolve — reduzir peça em movimento é a jogada certa quando tudo é desconhecido. Não é o caso aqui: é o oposto, é o stack que a pessoa já sabe de cor do trabalho. Descartado porque a familiaridade reduz mais atrito do que a simplicidade operacional de 1 processo só.

**Prisma no lugar de MikroORM.** Funcionaria bem com NestJS, mas seria biblioteca nova pra aprender enquanto já se está relembrando/modelando o domínio inteiro do ProLobby sozinho. Descartado pelo mesmo motivo acima.

**SonarQube self-hosted desde já.** Contradiz a regra de custo zero até validar a ideia ([RF-072](../requisitos/05-funcionais.md#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático)) — não é segurança que falta (ESLint + checklist cobrem o essencial), é ferramenta de qualidade de código que pode esperar.

## Consequências

- **Checklist de segurança** (`08-seguranca-checklist.md`) itens 6 (auth server-side) e 7 (restringir acessos) agora vivem inteiramente no NestJS, não no Next.js — reforça a nota já registrada no ADR-005 de que esses dois itens carregam peso redobrado sem RLS.
- **Capacidade da VM**: estimativa do ADR-005 (~1.2-2.5GB de RAM em carga leve) já contava com Postgres + Next.js + bot; NestJS separado soma mais um processo Node — revisar estimativa antes de ir pra produção, mas a folga de RAM (12GB) deixa margem grande.
- **`docs/discord/05-arquitetura-bot.md` e `HANDOFF-bot.md`** não mudam — o bot continua Node.js+discord.js independente do backend.
- Documentos que citam a stack do ADR-005 precisam apontar também pra este ADR quando falarem de backend/ORM/auth.
