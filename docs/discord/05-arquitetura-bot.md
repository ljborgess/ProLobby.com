# Arquitetura do bot — decidida

**Status: decidida em 2026-09-08** ([ADR-005](../adr/005-stack-tecnica.md)), antes dos [dois bloqueadores](../../HANDOFF.md#os-dois-bloqueadores--leia-isto-antes-de-qualquer-coisa) do projeto terem rodado. Risco aceito conscientemente: RF-051, RF-052 e RF-055 (canais do lobby, prazos de deleção, gatilho do cargo Verificado) são decisão de **produto**, não de tecnologia, e dependem do resultado dos testes 5, 6 e 7 do [checklist](../produto/03-partida/05-checklist.md) e do critério de aprovação do [piloto de OCR](../requisitos/06-piloto-ocr.md) — podem exigir retrabalho quando o checklist rodar. A stack abaixo não muda por causa disso.

Complementa [Bot: permissões e integração com moderação](03-bot.md) e [Integração técnica plataforma ↔ bot](04-integracao.md), que definem *o quê* e *o protocolo* (webhook, RF-047 a RF-062, ADR-003).

## Estrutura: monorepo

```
ProLobby.com/
├── apps/
│   ├── web/          # Next.js + TypeScript — só frontend
│   ├── api/          # NestJS + MikroORM + JWT — toda regra de negócio, auth e banco
│   └── bot/          # Node.js + TypeScript + discord.js
├── packages/
│   ├── types/        # tipos TS do contrato de evento webhook (RF-058), enums de cargo/canal
│   ├── eslint-config/
│   └── tsconfig/
```

Gerenciador: pnpm workspaces + Turborepo. A separação `web`/`api` veio do [ADR-006](../adr/006-backend-separado-e-tooling.md), depois deste documento — antes dele o backend morava em API routes do Next.js.

**Por que monorepo:** custo de montar é baixo (workspaces), evita separar depois quando `web` e `bot` precisarem compartilhar o contrato do evento webhook.

**Por que `apps/bot` separado dos outros:** o bot mantém conexão persistente com o gateway do Discord (websocket) — não roda em ambiente serverless/edge. Processo próprio na mesma VM Oracle Cloud (São Paulo) que roda `web` e `api`, no mesmo Docker Compose; o Postgres fica na Neon, em São Paulo ([ADR-009](../adr/009-neon-cloudflare-vm.md)). A chamada `api` → `bot` passa pela rede interna do Docker, sem porta publicada. Quem chama o bot via HTTP (webhook) é a **`api`**, não o `web` — é ela que decide regra de negócio ([ADR-006](../adr/006-backend-separado-e-tooling.md)).

## Ordem de implementação

1. `apps/bot`, isolado e testável via evento fake (curl) simulando o webhook que a plataforma ainda não existe pra mandar. RF-051/052/055 implementados com a premissa atual (revisar quando o checklist rodar).
2. `apps/web` fica stub até o piloto de OCR destravar perfil/fila.
3. `packages/types` nasce como stub (schema do evento com zod) e cresce junto com `bot` e `api`.

**Antes de qualquer handler de RF nascer**, o endpoint `/events` precisa autenticar quem chama (segredo compartilhado/HMAC entre `api` e `bot`) — ele comanda kick/ban ([RF-048](../requisitos/05-funcionais.md#rf-048--kick-e-ban-só-por-comando-de-admin-ou-moderador)) e criação/remoção de canal, e no scaffold aceita qualquer requisição que alcance a porta. Itens 6 e 7 do [checklist de segurança](../requisitos/08-seguranca-checklist.md).

## Escalabilidade e desempenho

- **Sharding do discord.js:** desnecessário. ProLobby opera **um único servidor Discord** (ver [README](README.md) — propriedade do servidor); sharding só é exigido pelo Discord a partir de ~2500 servidores diferentes por bot.
- **Limite real é o próprio Discord, não o código:** RF-053 já capa em 500 canais e pausa a fila de novos lobbies nesse teto — isso é limite da plataforma Discord.
- **Rate limit:** RF-059 (execução sequencial de ações por evento) já existe justamente pra não estourar rate limit quando muitos usuários agem ao mesmo tempo. É o ponto de atenção real em "muita gente simultânea", não CPU/memória do processo.
- **Fila de retry e idempotência (RF-058) — corrigido em 2026-09-11:** não moram no bot. A fila em memória proposta aqui perdia evento em restart (justo quando o retry importa) e a dedup por id de evento perdia a lista junto, reabrindo o duplo efeito que RF-058 existe pra impedir. Quem retenta e registra entrega é a **API**, na tabela `EntregaEvento` ([Modelo de dados](../requisitos/03-dados.md#entregaevento)); o bot é idempotente **checando o estado no Discord antes de agir**. Redis/BullMQ continua fora do MVP.
- **Webhook receiver:** processo **único**, não replicado. O bot mantém conexão persistente com o gateway do Discord e age sobre um servidor só; duas instâncias recebendo o mesmo evento criariam canal e concederiam cargo duas vezes. Escala horizontal aqui seria a causa do bug, não a cura — o gargalo real é o rate limit do Discord (RF-059), não CPU do processo.

## Riscos

- Token do bot como ponto único de falha — **decidido (2026-09-08)**: sem rotação periódica agendada, rotaciona só sob suspeita de vazamento (ver [RNF-013](../requisitos/07-nao-funcionais.md#rnf-013--token-do-bot-só-em-variável-de-ambiente)).
- Região de hospedagem — **decidido (2026-09-08), ajustado em 2026-09-14**: VM Oracle Cloud em São Paulo, banco na Neon em São Paulo, Cloudflare na frente. Dado armazenado nunca sai do Brasil ([ADR-009](../adr/009-neon-cloudflare-vm.md)).
