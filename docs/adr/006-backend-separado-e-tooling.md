# ADR-006 · Backend separado (NestJS/MikroORM/JWT) e ferramentas de repo

**Status**: aceita — corrige parcialmente [ADR-005](005-stack-tecnica.md)
**Data**: 2026-09-08

## Contexto

Ao planejar o início do código, o desenvolvimento é solo (1 pessoa), com experiência diária em NestJS/MikroORM/Jest/Playwright no projeto de trabalho (`plataforma-b2ml`, monorepo Turborepo com `apps/web` Next.js e `apps/api` NestJS separado). ADR-005 havia decidido Next.js API routes (monolito) e Prisma, sem considerar essa familiaridade nem o padrão de ferramentas já dominado.

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
