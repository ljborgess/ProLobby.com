# Handoff — bot do Discord

**Status: pode começar.** Stack decidida em 2026-09-08 ([ADR-005](../adr/005-stack-tecnica.md)), antes dos [dois bloqueadores](../../HANDOFF.md#os-dois-bloqueadores--leia-isto-antes-de-qualquer-coisa) do projeto rodarem — risco aceito conscientemente: RF-051, RF-052 e RF-055 (canais do lobby, prazos de deleção, gatilho do cargo Verificado) são decisão de **produto**, não de stack, e podem exigir retrabalho quando o checklist rodar (testes 5, 6 e 7) e o [piloto de OCR](../requisitos/06-piloto-ocr.md) medir a premissa de verificação. Implementar com a premissa atual, revisar depois.

## Decidido ([05-arquitetura-bot.md](05-arquitetura-bot.md))

- Monorepo pnpm workspaces: `apps/web` (Next.js/TypeScript), `apps/bot` (Node.js + TypeScript + discord.js), `packages/shared`.
- Postgres self-hosted, Prisma, Auth.js — na mesma VM Oracle Cloud (São Paulo/Vinhedo).
- Escalabilidade: sharding desnecessário (1 servidor só), rate limit resolvido por execução sequencial (RF-059), fila de retry em memória no início.
- Protocolo webhook, não polling — [ADR-003](../adr/003-webhook-nao-polling.md).
- Escopo e permissões do bot — RF-047 a RF-062, [docs/discord/03-bot.md](03-bot.md).
- Servidor criado manualmente, Server Members Intent ativado à mão — RF-062.

## Próximos passos concretos

1. ~~Scaffold do monorepo~~ — **feito (2026-09-08)**: Turborepo + pnpm workspaces, `apps/web` (Next.js), `apps/api` (NestJS+MikroORM), `apps/bot` (Node.js+TypeScript+discord.js) com login stub e endpoint `/events` recebendo evento fake, testado via Jest+Supertest.
2. Criar servidor Discord manualmente (RF-062), ativar Server Members Intent no Developer Portal.
3. Criar aplicação/bot em discord.com/developers com conta separada não-pessoal (ver [README](README.md)).
4. Implementar RF-047 a RF-062 incrementalmente, cada um testável isolado via evento fake — 1 issue do GitHub por RF (ver [ADR-006](../adr/006-backend-separado-e-tooling.md)).
5. **Rodar o [checklist de teste no jogo](../produto/03-partida/05-checklist.md) assim que possível** — não bloqueia mais o início, mas RF-051/052/055 precisam ser revisados com o resultado (especialmente testes 5, 6 e 7).

## Riscos

- Token do bot como ponto único de falha — **decidido (2026-09-08)**: sem rotação periódica agendada, rotaciona só sob suspeita de vazamento (ver [RNF-013](../requisitos/07-nao-funcionais.md#rnf-013--token-do-bot-só-em-variável-de-ambiente)).
- Região de hospedagem — **decidido (2026-09-08)**: Oracle Cloud, São Paulo/Vinhedo (ver [Sustentabilidade](../negocio/03-sustentabilidade.md)).

## Referências

- [Arquitetura do bot](05-arquitetura-bot.md)
- [Bot: permissões e integração com moderação](03-bot.md)
- [Integração técnica plataforma ↔ bot](04-integracao.md)
- `docs/requisitos/05-funcionais.md` (RF-047 a RF-062)
- `docs/requisitos/07-nao-funcionais.md` (RNF-008, RNF-013)
- [ADR-003](../adr/003-webhook-nao-polling.md), [ADR-005](../adr/005-stack-tecnica.md)
