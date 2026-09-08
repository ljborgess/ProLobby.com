# ADR — decisões de arquitetura

Registro de decisão **técnica difícil de reverter**. Domínio próprio, ao lado de [`produto/`](../produto/README.md), [`requisitos/`](../requisitos/README.md), [`discord/`](../discord/README.md) e [`negocio/`](../negocio/README.md).

## Por que esta pasta existe, e por que ela é pequena

O dossiê de `produto/` já registra decisão com contexto, alternativa descartada e motivo — em substância, já é um corpo de ADRs organizado por domínio em vez de cronologicamente. **Transcrever tudo aqui criaria ~40 documentos duplicados que passariam a divergir**, e deriva de número já aconteceu neste projeto: foi exatamente o motivo de [`parametros.md`](../produto/parametros.md) existir.

Então aqui entra só o que o dossiê de produto não cobre bem: **escolha técnica que custa refatoração pra desfazer.** As maiores ainda não foram tomadas — stack, banco, framework, motor de OCR, hospedagem — e vêm depois dos [dois bloqueadores](../../HANDOFF.md). Sem lugar definido, elas virariam mensagem de commit, que é onde decisão de arquitetura morre.

## Gatilho: escrever ou não?

**Escreve ADR** quando a decisão é técnica e desfazê-la custa refatoração: linguagem, banco de dados, framework, motor de OCR, hospedagem, formato de API, esquema de autenticação, fila de mensagem.

**Não escreve** quando é regra de produto (vai pro dossiê) ou quando dá pra mudar editando um número (vai pro `parametros.md`).

O corte é esse: **se dá pra reverter mudando um valor, não é ADR.**

## Formato

```markdown
# ADR-00X · Título curto e afirmativo

**Status**: aceita | substituída por ADR-00Y | revogada
**Data**: AAAA-MM-DD

## Contexto
O que forçava uma decisão. Fatos, não opinião.

## Decisão
O que foi decidido, em uma frase afirmativa.

## Alternativas descartadas
Cada uma com o motivo de ter caído — é a parte que mais vale depois.

## Consequências
O que passa a ser verdade, incluindo o que fica pior.
```

**Status é obrigatório e supersessão é explícita**: ADR não é reescrita no lugar. Decisão superada muda o status e aponta pra que a substituiu. É o único ganho real que o formato tem sobre o dossiê, que reescreve.

## Conteúdo

| ADR | Assunto | Status |
|---|---|---|
| [001](001-mecanismo-de-partida.md) | Amistoso Online com clube de capitão | aceita |
| [002](002-log-de-evento.md) | Elo e reputação como log de evento | aceita |
| [003](003-webhook-nao-polling.md) | Plataforma empurra pro bot via webhook | aceita |
| [004](004-utc.md) | UTC internamente, local na exibição | aceita |
| [005](005-stack-tecnica.md) | Stack técnica: Next.js/TypeScript, Postgres self-hosted, Oracle Free Tier | aceita |

**Decidida antes dos bloqueadores retornarem (2026-09-08)**, com risco aceito conscientemente: RF-051/052/055 (produto, não tecnologia) podem exigir retrabalho quando o [checklist](../produto/03-partida/05-checklist.md) rodar. Motor de OCR final (Tesseract vs. pago) ainda depende do [piloto](../requisitos/06-piloto-ocr.md) — o piloto usa Tesseract primeiro.
