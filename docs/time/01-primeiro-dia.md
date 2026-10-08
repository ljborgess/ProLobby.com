# 1 · Primeiro dia

Uma vez só, antes da primeira issue.

## Máquina

Precisa de Node 22 (fixado em `.nvmrc`), pnpm, Docker e `gh` (GitHub CLI) logado.

```bash
git clone git@github.com:ljborgess/ProLobby.com.git
cd ProLobby.com
git checkout dev
pnpm install
docker compose up -d postgres
```

### Porta 5432 ocupada

Se outro projeto na sua máquina já usa a 5432, **não edite o `docker-compose.yml`** — suba em outra porta:

```bash
POSTGRES_PORT=5442 docker compose up -d postgres
# no apps/api/.env (vale pra pnpm dev e pnpm --filter @prolobby/api mikro-orm):
# DATABASE_URL=postgres://prolobby:prolobby@localhost:5442/prolobby
# testes e e2e não leem o .env: passe DATABASE_URL no comando, como abaixo
```

Nunca pare nem apague container de outro projeto pra liberar a porta.

## `.env` da API

Crie `apps/api/.env` a partir de `apps/api/.env.example`.

- `JWT_SECRET` **não pode ser** `changeme`, vazio nem ter menos de 32 caracteres — a API se recusa a subir, de propósito. Gere um com `openssl rand -base64 48`.
- `WEBHOOK_SECRET` segue a mesma regra no bot (e na API quando ela dispara evento). Placeholder no `.env.example`, nunca um valor real.
- `.env` **nunca** vai pro git. Segredo nenhum (token de bot, chave, senha) vai pra commit, issue, PR, log ou chat — nem "só pra testar".

## Confere que está tudo de pé

```bash
pnpm format:check
DATABASE_URL=postgres://prolobby:prolobby@localhost:5432/prolobby_e2e \
JWT_SECRET=qualquer-coisa-que-nao-seja-changeme \
WEBHOOK_SECRET=qualquer-coisa-que-nao-seja-changeme \
pnpm turbo lint type-check test build e2e
```

Tudo verde em `dev` limpo. Se não ficar, é problema de ambiente — resolva antes de pegar issue, ou avise o Luciano.

## Leitura obrigatória (uns 30 minutos, economiza dias)

| Arquivo | Por quê |
|---|---|
| [`CONTRIBUTING.md`](../../CONTRIBUTING.md) | fluxo oficial, estrutura de pastas, padrão de PR, glossário pt → en |
| [Checklist de segurança](../requisitos/08-seguranca-checklist.md) | toda mudança de backend, auth, banco ou upload passa por ele |
| [ADR-007 — sessão JWT](../adr/007-sessao-jwt.md) | como sessão e autorização funcionam; por que o guard nasce fechado |
| [Auditoria de 2026-09-11](../research/auditoria-2026-09-11.md) | várias regras de negócio mudaram de comportamento, não só de texto |

Próximo: [Fluxo de uma issue](02-fluxo-da-issue.md).
