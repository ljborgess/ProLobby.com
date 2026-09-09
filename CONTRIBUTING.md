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
    ├── conta/           # RF-019 a RF-026, RF-070, RF-072
    ├── ocr/             # RF-027 a RF-031, RF-063 a RF-065, RF-073
    ├── fila/            # RF-001 a RF-011, RF-034
    ├── lobby/           # RF-032, RF-033, RF-051, RF-052
    ├── resultado/       # RF-012, RF-013, RF-041 a RF-046, RF-066, RF-067
    ├── ranking/         # RF-014 a RF-018, RF-071
    ├── moderacao/       # RF-035 a RF-040, RF-068, RF-069
    └── bot-integration/ # RF-047 a RF-062, RF-058 (webhook outbound pro apps/bot)
```

Dentro de um módulo: `*.controller.ts`, `*.service.ts`, `*.module.ts` e `*.spec.ts` ficam **flat na raiz do módulo** (sem pasta `controllers/`, `services/`); DTOs entram em `dto/`. Sub-recurso do próprio domínio ganha subpasta só quando crescer o suficiente pra justificar (mesmo critério do b2ml: `modules/user/collaborator/`).

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

## Dependência entre issues — regra de destravamento

**Issue bloqueada não começa**, mesmo que pareça simples ou esteja atribuída a você. É a garantia contra pegar RF fora de ordem e ter que refazer.

- Dependência é registrada de verdade no GitHub (Issue Dependencies nativo, não só texto/comentário) — a issue bloqueada mostra um selo **"Blocked"** e lista quem bloqueia, na barra lateral direita da issue (seção "Blocked by").
- **Como adicionar uma dependência nova**: na issue que vai ficar bloqueada, barra lateral → **Blocked by** → busca a issue que bloqueia e vincula. Não precisa de CLI. Alternativa via `gh`: `gh api repos/ljborgess/ProLobby.com/issues/<N>/dependencies/blocked_by -X POST -F issue_id=<database id da issue bloqueadora>` — o `issue_id` é o id interno (não o número `#N`); pegar com `gh api repos/ljborgess/ProLobby.com/issues/<N> -q .id`.
- **Regra**: quem abre uma issue nova identifica as dependências na hora (RF que ela usa, schema que ela precisa) e já vincula. Não deixar pra descobrir depois que já começou.
- **Grafo atual** (fase 2.1 — Núcleo: Conta e autenticação):

  ```
  #5 (CI sobe Postgres)
    └─▶ #1 (schema base)
          ├─▶ #2 (cadastro, sessão, Termos)
          └─▶ #3 (recuperação de senha)

  #4 (auth do webhook do bot) — sem dependência, roda em paralelo
  ```

- Issue de fase futura (2.2 em diante) nasce já com as dependências da fase anterior vinculadas, mesmo que a issue-alvo ainda não exista — cria a issue bloqueadora primeiro, mesmo que "vazia" (título + `## O quê` mínimo), se a ordem exigir.

## Labels

- **Área**: `area:conta`, `area:fila`, `area:lobby`, `area:bot`, `area:ocr`, `area:moderacao`, `area:ranking`, `area:governanca`, `area:seguranca`, `area:i18n`, `area:infra`.
- **Tipo**: `tipo:feat`, `tipo:fix`, `tipo:chore`, `tipo:test`, `tipo:docs` (espelha o Conventional Commits).
- **Milestone**: uma por fase de [`docs/negocio/02-implementacao.md`](docs/negocio/02-implementacao.md).

## Exceção: piloto de OCR

O [piloto de OCR](docs/requisitos/06-piloto-ocr.md) (bloqueador nº 2) não segue este fluxo — é script de medição isolado, sem conta/banco/upload/tela, rodado direto pelo Luciano, sem issue nem PR. O resultado (Tesseract vs. Google Vision) vira input pra issue de "OCR de personagem" (item 2.2 de `02-implementacao.md`), essa sim no fluxo normal.
