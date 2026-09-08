# Arquitetura do bot — hipótese, não decisão

**Status: hipótese registrada, não decidida. Bloqueada pelos [dois bloqueadores](../../HANDOFF.md#os-dois-bloqueadores--leia-isto-antes-de-qualquer-coisa) do projeto** (checklist de mecânica + piloto de OCR) — a mesma regra de "stack só depois" que vale pro resto da plataforma vale aqui: RF-051, RF-052 e RF-055 (canais do lobby, prazos de deleção, gatilho do cargo Verificado) dependem diretamente do resultado dos testes 5, 6 e 7 do [checklist](../produto/03-partida/05-checklist.md) e do critério de aprovação do [piloto de OCR](../requisitos/06-piloto-ocr.md). Decidir stack do bot agora corre o risco de precisar refazer justamente as partes que mais mudam.

Complementa [Bot: permissões e integração com moderação](03-bot.md) e [Integração técnica plataforma ↔ bot](04-integracao.md), que definem *o quê* e *o protocolo* (webhook, RF-047 a RF-062, ADR-003) — essas partes já decididas continuam valendo. Este doc é rascunho de *como*, pra não perder o raciocínio, não uma decisão de stack (essa continua em `docs/discord/03-bot.md` como "fora de escopo, deliberadamente não decidido").

## Estrutura hipotética: monorepo

```
prolobby/
├── apps/
│   ├── web/          # Next.js + React — frontend + API routes
│   └── bot/          # Node.js + TypeScript + discord.js
├── packages/
│   └── shared/       # tipos TS do contrato de evento webhook (RF-058), enums de cargo/canal
```

Gerenciador: pnpm workspaces.

**Por que monorepo:** custo de montar é baixo (workspaces), evita separar depois quando `web` e `bot` precisarem compartilhar o contrato do evento webhook.

**Por que `apps/bot` separado de `apps/web`:** o bot mantém conexão persistente com o gateway do Discord (websocket) — não roda em ambiente serverless/edge do Next.js. Precisa ser processo próprio (VPS, Railway, Fly.io, container). `web` chama o `bot` via HTTP (webhook) quando um evento de negócio acontece.

## Ordem de implementação, se e quando os bloqueadores liberarem

1. `apps/bot`, isolado e testável via evento fake (curl) simulando o webhook que a plataforma ainda não existe pra mandar — só depois de RF-051/052/055 revisados com o resultado do checklist e do piloto de OCR.
2. `apps/web` fica stub até o piloto de OCR destravar perfil/fila.
3. `packages/shared` nasce como stub (schema do evento com zod, por exemplo) e cresce junto com `bot`.

**Não codar nada disto antes dos dois bloqueadores rodarem** — ver [Handoff do bot](HANDOFF-bot.md).

## Escalabilidade e desempenho

- **Sharding do discord.js:** desnecessário. ProLobby opera **um único servidor Discord** (ver [README](README.md) — propriedade do servidor); sharding só é exigido pelo Discord a partir de ~2500 servidores diferentes por bot.
- **Limite real é o próprio Discord, não o código:** RF-053 já capa em 500 canais e pausa a fila de novos lobbies nesse teto — isso é limite da plataforma Discord.
- **Rate limit:** RF-059 (execução sequencial de ações por evento) já existe justamente pra não estourar rate limit quando muitos usuários agem ao mesmo tempo. É o ponto de atenção real em "muita gente simultânea", não CPU/memória do processo.
- **Fila de retry (RF-058):** fila em memória é suficiente no início (volume esperado: dezenas de lobbies simultâneos, não milhares). Migrar pra Redis/BullMQ só se o volume justificar sobreviver a restart do processo sem perder evento — não decidir isso agora (YAGNI).
- **Webhook receiver:** stateless dentro do `apps/bot`, escala horizontal (múltiplas instâncias atrás de load balancer) se necessário — não é necessidade do dia 1.

## Riscos

- Token do bot como ponto único de falha — **decidido (2026-09-08)**: sem rotação periódica agendada, rotaciona só sob suspeita de vazamento (ver [RNF-013](../requisitos/07-nao-funcionais.md#rnf-013--token-do-bot-só-em-variável-de-ambiente)).
- Região de hospedagem — **decidido (2026-09-08)**: Oracle Cloud, São Paulo/Vinhedo, dado nunca sai do Brasil (ver [Sustentabilidade](../negocio/03-sustentabilidade.md)).
