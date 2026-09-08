# Contribuindo — fluxo de código do ProLobby

Referência rápida do fluxo decidido no [ADR-006](docs/adr/006-backend-separado-e-tooling.md). Se algo aqui divergir do ADR, o ADR manda.

## Time

Luciano, Rafael e Felipe codam. Luciano lidera de fato (contexto completo do dossiê): atribui issue, revisa e aprova PR de Rafael/Felipe. Ver [HANDOFF.md](HANDOFF.md#decidido-sem-divisão-de-papéis).

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
   - PR do Rafael ou do Felipe → precisa de **1 approval do Luciano** antes de mergear (branch protection em `dev`).
   - PR do Luciano → mergeia direto após CI verde.
6. CI (`.github/workflows/ci.yml`) precisa estar verde: lint, test, build.

## Labels

- **Área**: `area:conta`, `area:fila`, `area:lobby`, `area:bot`, `area:ocr`, `area:moderacao`, `area:ranking`, `area:governanca`, `area:seguranca`, `area:i18n`, `area:infra`.
- **Tipo**: `tipo:feat`, `tipo:fix`, `tipo:chore`, `tipo:test`, `tipo:docs` (espelha o Conventional Commits).
- **Milestone**: uma por fase de [`docs/negocio/02-implementacao.md`](docs/negocio/02-implementacao.md).

## Exceção: piloto de OCR

O [piloto de OCR](docs/requisitos/06-piloto-ocr.md) (bloqueador nº 2) não segue este fluxo — é script de medição isolado, sem conta/banco/upload/tela, rodado direto pelo Luciano, sem issue nem PR. O resultado (Tesseract vs. Google Vision) vira input pra issue de "OCR de personagem" (item 2.2 de `02-implementacao.md`), essa sim no fluxo normal.
