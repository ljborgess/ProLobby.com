# Handoff — bot do Discord

Registro de retomada. Decisão de arquitetura fechada em 2026-09-04 (ver [05-arquitetura-bot.md](05-arquitetura-bot.md)); nenhum código escrito ainda por decisão explícita ("depois continuo").

## Já decidido (não reabrir sem motivo novo)

- Monorepo, pnpm workspaces: `apps/web` (Next.js/React), `apps/bot` (Node.js + TypeScript + discord.js), `packages/shared`.
- `apps/bot` implementado primeiro e isolado; `apps/web` fica stub até piloto OCR destravar.
- Testar `apps/bot` com evento fake (curl) simulando webhook da plataforma, que ainda não existe.
- Sharding não necessário (1 servidor só). Rate limit resolvido por execução sequencial (RF-059, já no requisito). Fila de retry em memória no início, Redis/BullMQ só se volume exigir.

## Ainda em aberto (backlog, não bloqueia início do bot)

- Piloto de OCR (bloqueador n2, commits recentes) — não bloqueia `apps/bot`, bloqueia `apps/web`.
- Rotação de token do bot / segundo fator no ambiente de hospedagem — não endereçado.
- Região de hospedagem / transferência internacional de dado — não verificado.

## Próximos passos concretos (quando retomar)

1. Criar servidor Discord manualmente (não pelo bot — RF-062), ativar Server Members Intent no Developer Portal.
2. Criar aplicação/bot em discord.com/developers com conta separada não-pessoal (ver [README](README.md)).
3. Scaffold do monorepo: `pnpm init`, workspaces, `apps/bot` com discord.js + TypeScript, `packages/shared` com schema zod do evento webhook.
4. Implementar login do bot + endpoint webhook recebendo evento (mesmo que fake por enquanto).
5. Implementar RF-047 a RF-062 incrementalmente, cada um testável isolado via evento fake.

## Referências

- [Arquitetura do bot](05-arquitetura-bot.md)
- [Bot: permissões e integração com moderação](03-bot.md)
- [Integração técnica plataforma ↔ bot](04-integracao.md)
- `docs/requisitos/05-funcionais.md` (RF-047 a RF-062)
- `docs/requisitos/07-nao-funcionais.md` (RNF-008, RNF-013)
- `docs/adr/003-webhook-nao-polling.md`
