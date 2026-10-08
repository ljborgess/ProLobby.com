# ProLobby — instruções pro Claude Code

Ver [HANDOFF.md](HANDOFF.md) pro estado do projeto e [CONTRIBUTING.md](CONTRIBUTING.md) pro fluxo de código.

**Antes de pegar trabalho, leia [`docs/time/05-recados.md`](docs/time/05-recados.md)**: é onde fica registrado o que mudou pra cada pessoa do time (regra nova, prazo, dependência, correção de documento). Se a sessão for do Rafael ou do Felipe, comece pela seção com o nome dele.

**Repo tem dossiê (`docs/`) e código (`apps/`, `packages/`).** A stack foi decidida em [ADR-005](docs/adr/005-stack-tecnica.md)/[ADR-006](docs/adr/006-backend-separado-e-tooling.md) e o monorepo está no ar (Next.js + NestJS + discord.js, Turborepo/pnpm). A regra de negócio está sendo construída fase a fase: Fases 1, 2.1 e 2.3 concluídas; 2.2 em `dev` menos o OCR (#199, espera o piloto #191); 2.4 em `dev` menos a #209; **2.5 (fila) em andamento**, com os PRs #238 a #241 empilhados. Estado detalhado em [HANDOFF.md](HANDOFF.md#estado-atual-2026-10-08). Time de código: Luciano, Rafael (Cursor) e Felipe; quem entra começa por [`docs/time/`](docs/time/README.md). Os [dois bloqueadores](HANDOFF.md#os-dois-bloqueadores--leia-isto-antes-de-qualquer-coisa) continuam pendentes, mas **não travam mais o código**: travam RF-051/052/055 e três parâmetros marcados como "a calibrar". Não recusar trabalho de implementação por causa deles.

## Regra permanente: checklist de segurança

Antes de escrever ou revisar qualquer código de backend, autenticação, banco ou upload, consultar [docs/requisitos/08-seguranca-checklist.md](docs/requisitos/08-seguranca-checklist.md) — 18 itens (API keys, RLS, hash de senha, rate limit, validação de input, etc.). Não é fase do dossiê, é prática de toda mudança que toque essas áreas, desde a primeira linha de código.

## Antes de commitar mudança em `docs/`

`scripts/check-docs-links.sh` já roda via hook `PreToolUse` antes de `git commit` e bloqueia link quebrado ou arquivo órfão fora do índice — mas rodar manualmente antes de propor a mudança evita ida e volta.

## Regra permanente: idioma

**Código em inglês, projeto em português.** Identificador, comentário, nome de teste, coluna de banco e valor de enum: inglês, sempre. Dossiê, issue, PR e commit: português. A fronteira é o artefato, nunca a linha — nada de `contaVerificada` ao lado de `findAccount`.

Glossário dossiê → código (Conta → `Account`, CasoModeracao → `ModerationCase`, etc.) em [CONTRIBUTING.md](CONTRIBUTING.md#idioma-código-em-inglês-projeto-em-português).
