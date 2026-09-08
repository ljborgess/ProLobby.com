# ProLobby — instruções pro Claude Code

Ver [HANDOFF.md](HANDOFF.md) pro estado do projeto. Repo hoje é só documentação — os [dois bloqueadores](HANDOFF.md#os-dois-bloqueadores--leia-isto-antes-de-qualquer-coisa) rodam antes de qualquer código de plataforma.

## Regra permanente: checklist de segurança

Antes de escrever ou revisar qualquer código de backend, autenticação, banco ou upload, consultar [docs/requisitos/08-seguranca-checklist.md](docs/requisitos/08-seguranca-checklist.md) — 18 itens (API keys, RLS, hash de senha, rate limit, validação de input, etc.). Não é fase do dossiê, é prática de toda mudança que toque essas áreas, desde a primeira linha de código.

## Antes de commitar mudança em `docs/`

`scripts/check-docs-links.sh` já roda via hook `PreToolUse` antes de `git commit` e bloqueia link quebrado ou arquivo órfão fora do índice — mas rodar manualmente antes de propor a mudança evita ida e volta.
