# Arquitetura do bot — implementação

Complementa [Bot: permissões e integração com moderação](03-bot.md) e [Integração técnica plataforma ↔ bot](04-integracao.md), que definem *o quê* e *o protocolo* (webhook, RF-047 a RF-062, ADR-003). Este doc registra *como* — a decisão de stack e estrutura de projeto, adiada de propósito até aqui (ver `docs/discord/03-bot.md`, `docs/produto/05-produto/03-backlog.md`).

## Estrutura: monorepo

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

## Ordem de implementação

1. **`apps/bot` primeiro**, isolado e testável via evento fake (curl) simulando o webhook que a plataforma ainda não existe pra mandar.
2. **`apps/web` fica stub** até o piloto de OCR (bloqueador n2) destravar perfil/fila — não há o que implementar em `web` antes disso.
3. **`packages/shared`** nasce como stub (schema do evento com zod, por exemplo) e cresce junto com `bot`.

## Escalabilidade e desempenho

- **Sharding do discord.js:** desnecessário. ProLobby opera **um único servidor Discord** (ver [README](README.md) — propriedade do servidor); sharding só é exigido pelo Discord a partir de ~2500 servidores diferentes por bot.
- **Limite real é o próprio Discord, não o código:** RF-053 já capa em 500 canais e pausa a fila de novos lobbies nesse teto — isso é limite da plataforma Discord.
- **Rate limit:** RF-059 (execução sequencial de ações por evento) já existe justamente pra não estourar rate limit quando muitos usuários agem ao mesmo tempo. É o ponto de atenção real em "muita gente simultânea", não CPU/memória do processo.
- **Fila de retry (RF-058):** fila em memória é suficiente no início (volume esperado: dezenas de lobbies simultâneos, não milhares). Migrar pra Redis/BullMQ só se o volume justificar sobreviver a restart do processo sem perder evento — não decidir isso agora (YAGNI).
- **Webhook receiver:** stateless dentro do `apps/bot`, escala horizontal (múltiplas instâncias atrás de load balancer) se necessário — não é necessidade do dia 1.

## Riscos já identificados, sem solução decidida ainda

- Token do bot como ponto único de falha, sem rotação periódica prevista (`docs/research/investigacao-design-2026-09-04.md`).
- Região de hospedagem / transferência internacional de dado ainda não verificada.
