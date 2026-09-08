# Handoff — bot do Discord

**Status: bloqueado. Não iniciar código do bot antes dos [dois bloqueadores](../../HANDOFF.md#os-dois-bloqueadores--leia-isto-antes-de-qualquer-coisa) do projeto rodarem** (checklist de mecânica + piloto de OCR) — mesma regra de "stack só depois" que vale pro resto da plataforma. Correção sobre a versão anterior deste doc (2026-09-04): tratava o bot como exceção isolada da regra, o que estava errado — RF-051, RF-052 e RF-055 (canais do lobby, prazos de deleção, gatilho do cargo Verificado) dependem diretamente dos testes 5, 6 e 7 do [checklist](../produto/03-partida/05-checklist.md) e do resultado do [piloto de OCR](../requisitos/06-piloto-ocr.md).

## Hipótese registrada, não decisão (ver [05-arquitetura-bot.md](05-arquitetura-bot.md))

- Monorepo pnpm workspaces: `apps/web` (Next.js/React), `apps/bot` (Node.js + TypeScript + discord.js), `packages/shared` — rascunho, não fechado.
- Raciocínio de escalabilidade que independe do resultado dos bloqueadores (não muda com o teste): sharding desnecessário (1 servidor só), rate limit resolvido por execução sequencial (RF-059), fila de retry em memória no início.

## O que já foi decidido de verdade (não é hipótese)

- Protocolo webhook, não polling — [ADR-003](../adr/003-webhook-nao-polling.md).
- Escopo e permissões do bot — RF-047 a RF-062, [docs/discord/03-bot.md](03-bot.md).
- Servidor criado manualmente, Server Members Intent ativado à mão — RF-062.

## O que falta antes de qualquer linha de código

1. [Checklist de teste no jogo](../produto/03-partida/05-checklist.md) rodado (bloqueador nº 1) — especialmente testes 5, 6 e 7.
2. [Piloto de OCR](../requisitos/06-piloto-ocr.md) rodado e critério de aprovação medido (bloqueador nº 2).
3. `produto/03-partida/01-mecanica.md` atualizado com o resultado, e RF-051/052/055 revisados conforme.
4. Só então: decidir stack de verdade (pode confirmar a hipótese acima ou mudar) e configurar servidor Discord manualmente ([README](README.md), RF-062).

## Riscos ainda sem dono

- Token do bot como ponto único de falha, sem rotação periódica prevista (`docs/research/investigacao-design-2026-09-04.md`).
- Região de hospedagem / transferência internacional de dado — não verificado.

## Referências

- [Arquitetura do bot](05-arquitetura-bot.md)
- [Bot: permissões e integração com moderação](03-bot.md)
- [Integração técnica plataforma ↔ bot](04-integracao.md)
- `docs/requisitos/05-funcionais.md` (RF-047 a RF-062)
- `docs/requisitos/07-nao-funcionais.md` (RNF-008, RNF-013)
- `docs/adr/003-webhook-nao-polling.md`
