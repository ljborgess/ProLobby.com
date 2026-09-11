# Contribuindo — fluxo de código do ProLobby

Referência rápida do fluxo decidido no [ADR-006](docs/adr/006-backend-separado-e-tooling.md). Se algo aqui divergir do ADR, o ADR manda.

## Time

Luciano e Rafael codam. Felipe foi convidado (`LipeLou`), ainda não entrou — quando entrar, mesma função do Rafael. Luciano lidera de fato (contexto completo do dossiê): atribui issue, revisa e aprova PR do Rafael (e do Felipe, quando ativo). Ver [HANDOFF.md](HANDOFF.md#decidido-sem-divisão-de-papéis).

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
2. Branch por issue/RF: `feat/rf-019-cadastro`, `fix/rf-024-link-expira`, etc.
3. Commit no padrão Conventional Commits (`commitlint.config.js` valida via Husky) — `feat:`, `fix:`, `chore:`, `test:`, `docs:`.
4. Abrir PR contra `dev`, referenciando a issue (`Closes #N`), **deixado aberto pra review** — quem coda não faz merge sozinho, exceto Luciano.
5. **Review**:
   - PR do Rafael (ou do Felipe, quando ativo) → precisa de **1 approval do Luciano** antes de mergear. **É convenção, não trava técnica** — repo privado no plano Free não suporta branch protection com review obrigatório (confirmado via API, 2026-09-08). Quem tem `push` consegue mergear sem aprovação; a regra depende de disciplina, não do GitHub bloquear.
   - PR do Luciano → mergeia direto após CI verde.
6. CI (`.github/workflows/ci.yml`) precisa estar verde: lint, test, build.

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
    ├── conta/           # RF-019 a RF-026, RF-070, RF-072, RF-074, RF-078
    ├── personagem/      # RF-027 a RF-031, RF-063 a RF-065, RF-073 (cadastro/ciclo de vida + verificação por OCR)
    ├── fila/            # RF-001 a RF-011, RF-034, RF-076
    ├── lobby/           # RF-032, RF-033, RF-051, RF-052, RF-080
    ├── resultado/       # RF-012, RF-013, RF-041 a RF-046, RF-066, RF-067
    ├── ranking/         # RF-014 a RF-018, RF-071, RF-077
    ├── moderacao/       # RF-035 a RF-040, RF-068, RF-069, RF-075, RF-079
    └── bot-integration/ # RF-058, RF-059 — só entrega de evento (retry, sequência, idempotência)
```

Dentro de um módulo: `*.controller.ts`, `*.service.ts`, `*.module.ts` e `*.spec.ts` ficam **flat na raiz do módulo** (sem pasta `controllers/`, `services/`); DTOs entram em `dto/`. Sub-recurso do próprio domínio ganha subpasta só quando crescer o suficiente pra justificar (mesmo critério do b2ml: `modules/user/collaborator/`).

**Comunicação entre módulos (decidido em 2026-09-09)** — vale pra qualquer módulo, não só os de agora:

- **Comandar outro módulo** (fazer algo acontecer nele): emitir **evento de domínio** (`EventEmitter2` do Nest, ou equivalente), nunca chamar `Service`/`Repository` de outro módulo pra escrever. Ex.: `resultado` não chama `filaService.liberar()` direto — emite `partida.anulada`, e `fila` escuta e reage. Desacopla: mudar `fila` não quebra `resultado` sem aviso.
- **Ler outro módulo**: chamar **método público do `Service`** dele (ex.: `contaService.getPendencias(contaId)`), nunca acessar `Repository`/`Entity` de outro módulo direto.
- **RF-047 a RF-062 (exceto 058/059)**: cada RF é emitida como evento pelo módulo de domínio dono do gatilho (ex.: `lobby` emite quando cria/apaga canal, `moderacao` emite quando aplica punição), e `bot-integration` escuta qualquer evento marcado pra ir pro Discord e entrega via webhook — não decide regra de negócio nenhuma, reforça o que [ADR-003](docs/adr/003-webhook-nao-polling.md) já dizia (bot burro, regra na plataforma). **Qual módulo de domínio é dono de cada RF específica dessa faixa fica pra quando a Fase 3 abrir** — decidir agora seria documentar fase futura em detalhe antes da hora, o mesmo erro que já corrigimos quando as issues #1-#5 foram fechadas e reabertas em PRD/issue/sub-issue.
- **RF-047, RF-048, RF-062 não têm código em `apps/api`** — são ausência de feature (047), checagem nativa do Discord.js (048) ou processo operacional + checagem no boot do bot (062). Não procurar controller/service pra elas na API.

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

Toda fatia de fase (ex.: "Núcleo: Conta e autenticação") nasce em 3 níveis, todos no GitHub (Issue Dependencies + Sub-issues nativos, nada em planilha ou doc externo):

1. **PRD** — 1 issue-mãe por fatia (`tipo:docs`), aberta só quando a fatia vai começar de verdade (mesma disciplina que já vale pra issue: não adiantar fase futura). Contexto, problema, objetivo, **fora de escopo explícito**, RFs cobertos, critério de sucesso da fatia inteira. Título: `PRD: <nome da fatia>`.
2. **Issue** — 1 por peça grande da fatia (schema, cadastro, recuperação de senha, auth do webhook, CI...), sub-issue do PRD. O quê, RFs, checklist de segurança aplicável, critério de aceite, origem — formato já usado em #26, #30, #36, #40 e #45.
3. **Sub-issue** — 1 por entidade/endpoint/arquivo de config, sub-issue da issue. Granularidade pequena o bastante pra virar 1 PR revisável.

**Grafo vivo (fatia 2.1 — Núcleo: Conta e autenticação)** — estado corrente do tracker, conferido em 2026-09-11. As issues #1 a #24 foram fechadas como `not planned` e reabertas nesta numeração; não usar os números antigos como referência:

```
#49 PRD Mestre: roadmap de fases  (PRDs de fase: #50 a #61)
└── #25 PRD: Núcleo — Conta e autenticação
    ├── #26 CI com Postgres e templates de processo
    │   ├── #27 Postgres no CI
    │   ├── #28 Template de PR
    │   └── #29 Template de issue
    ├── #30 Schema base
    │   ├── #31 Entidade Conta          (primeiro — todas as outras dependem dela)
    │   ├── #32 Entidade AceiteTos       ─┐
    │   ├── #33 EventoReputacao/Elo      ─┼─ blocked by #31
    │   ├── #34 EventoPagamento          ─┘
    │   └── #35 Teste de migration e2e   — blocked by #31-#34, #27
    ├── #36 Auth do webhook do bot       — sem dependência, paralelo
    │   ├── #37 Assinatura HMAC
    │   ├── #38 Rate limit               — blocked by #37
    │   └── #39 Contrato de evento tipado
    ├── #40 Cadastro, sessão, Termos
    │   ├── #41 Endpoint de cadastro     — blocked by #31
    │   ├── #42 Login e sessão JWT       — blocked by #41
    │   ├── #43 Aceite de Termos         — blocked by #32, #42
    │   └── #44 Tela de cadastro (web)   — blocked by #41
    └── #45 Recuperação de acesso
        ├── #46 Verificação de e-mail    — blocked by #41
        ├── #47 Link de redefinição      — blocked by #42
        └── #48 Recuperação 2 fatores    — blocked by #33, #41
```

- Dependência é registrada de verdade no GitHub (Issue Dependencies nativo, não só texto/comentário) — a issue/sub-issue bloqueada mostra um selo **"Blocked"** e lista quem bloqueia, na barra lateral direita.
- **Como adicionar uma dependência nova**: na issue que vai ficar bloqueada, barra lateral → **Blocked by** → busca a issue que bloqueia e vincula. Não precisa de CLI. Alternativa via `gh`: `gh api repos/ljborgess/ProLobby.com/issues/<N>/dependencies/blocked_by -X POST -F issue_id=<database id da issue bloqueadora>` — o `issue_id` é o id interno (não o número `#N`); pegar com `gh api repos/ljborgess/ProLobby.com/issues/<N> -q .id`.
- **Como linkar uma sub-issue ao pai**: `gh api repos/ljborgess/ProLobby.com/issues/<pai>/sub_issues -X POST -F sub_issue_id=<database id da sub-issue>`.
- **Regra**: quem abre issue ou sub-issue nova identifica as dependências finas na hora (não só "depende da issue pai" — depende de qual peça específica) e já vincula. Não deixar pra descobrir depois que já começou.
- Fatia de fase futura (2.2 em diante) ganha PRD + issues + sub-issues próprios quando abrir — não documentado agora.

## Labels

- **Área**: `area:conta`, `area:fila`, `area:lobby`, `area:bot`, `area:personagem`, `area:moderacao`, `area:ranking`, `area:governanca`, `area:seguranca`, `area:i18n`, `area:infra`.
- **Tipo**: `tipo:feat`, `tipo:fix`, `tipo:chore`, `tipo:test`, `tipo:docs` (espelha o Conventional Commits).
- **Milestone**: uma por fase de [`docs/negocio/02-implementacao.md`](docs/negocio/02-implementacao.md).

## Exceção: piloto de OCR

O [piloto de OCR](docs/requisitos/06-piloto-ocr.md) (bloqueador nº 2) não segue este fluxo — é script de medição isolado, sem conta/banco/upload/tela, rodado direto pelo Luciano, sem issue nem PR. O resultado (Tesseract vs. Google Vision) vira input pra issue de "OCR de personagem" (item 2.2 de `02-implementacao.md`), essa sim no fluxo normal.
