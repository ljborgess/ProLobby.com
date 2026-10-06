# 2 · Fluxo de uma issue

Do "é minha" ao "fechada". Resumo operacional do [`CONTRIBUTING.md`](../../CONTRIBUTING.md#fluxo-de-issue--pr--merge) — se divergir, ele manda.

## Qual issue pegar

```bash
gh issue list --assignee @me --state open
```

- **Só comece issue atribuída a você** (campo `Assignee`). Quem atribui é o Luciano. É o que evita dois pegando a mesma coisa e alguém pegando algo fora da ordem.
- **Issue com selo _Blocked_ não começa.** A barra lateral diz o que falta antes.
- As issues andam **por fase** (milestone). O que é da próxima fase ainda não existe como issue — de propósito.

## Passo a passo

1. **Ler a issue inteira** e o RF de origem em [`05-funcionais.md`](../requisitos/05-funcionais.md), mais o doc de produto linkado nele. As issues trazem armadilhas conhecidas no corpo — estão ali porque já custaram caro uma vez.
2. **Branch a partir de `dev` atualizado:**
   ```bash
   git fetch origin && git switch -c feat/rf-XXX-descricao origin/dev
   ```
   Prefixos: `feat/`, `fix/`, `chore/`, `docs/`, `test/`.
3. **Decisão que o dossiê não fecha → pergunta antes de codar.** Não invente regra de produto. Decisão de implementação você e sua IA resolvem (com a alternativa descartada escrita no PR); decisão de produto vai pro Luciano, **como comentário na issue**, pra ficar registrada.
4. **Implementar com teste que prova o critério de aceite.** Na API, e2e contra Postgres real — não mock de banco.
5. **Pipeline local completo** (abaixo). Não abra PR vermelho esperando o CI achar.
6. **Commit** em Conventional Commits, **em português, assunto em minúscula** — o commitlint recusa `feat: Adiciona...` e `feat: Postgres...`.
7. **PR contra `dev`** — sempre `dev`, nunca `main`, nunca a branch de feature de outra pessoa, mesmo quando seu trabalho depende do dela. **Pela interface do GitHub, a base vem em `main` (é o branch padrão): troque pra `dev` antes de criar.** Com `Closes #N` e as **7 seções do template todas preenchidas** (abaixo).
8. **Code review e security review** feitos pela sua IA (Claude Code ou Cursor), publicados **como comentário no PR**. Achado 🔴 ou 🟡 se corrige no próprio PR, com teste. Ver [guia 4](04-trabalhando-com-ia.md#o-review-antes-de-pedir-aprovação).
9. **Pedir review do Luciano.** **Não faça merge.** O PR fica aberto até a aprovação, mesmo com CI verde.
10. **Depois do merge**: merge em `dev` **não fecha a issue sozinho**. Feche à mão, com um comentário dizendo em qual PR foi entregue.

## `dev` e `main`

`main` é o que vai pra produção. `dev` é onde o produto é construído e visto
funcionando antes disso. Na prática, pra quem está codando: **você só encosta
em `dev`.** Branch sai de `dev`, PR volta pra `dev`, pronto.

Promover `dev` para `main` é decisão do Luciano, feita quando ele olha o que
está em `dev` e dá o veredito. Não acontece por PR aprovado nem por CI verde.

## Pipeline local

```bash
pnpm format:check
pnpm audit --prod --audit-level=high
DATABASE_URL=postgres://prolobby:prolobby@localhost:5432/prolobby \
JWT_SECRET=qualquer-coisa-que-nao-seja-changeme \
pnpm turbo lint type-check test build e2e
```

- Mudança que envolve **tempo, concorrência ou banco compartilhado**: rode a suíte e2e **três vezes seguidas**. Teste flaky é pior que teste ausente — ensina todo mundo a ignorar CI vermelho.
- **Aviso do `pnpm audit` sem correção.** Quando a única saída é ignorar, o GHSA entra em `pnpm.auditConfig.ignoreGhsas` no `package.json` da raiz, com o motivo escrito aqui. Hoje há um:
  - `GHSA-vfj7-8cjw-p6xm` (`braces`, negação de serviço por padrão de glob muito aninhado), desde 2026-10-06. Não há versão corrigida. Chega pela descoberta de entidades do MikroORM (`globby` → `micromatch`), que só recebe os globs fixos da nossa configuração, nunca entrada de usuário. Revisar quando sair versão corrigida.
- Quando há versão corrigida e a dependência é indireta, a correção é um `pnpm.overrides` na raiz (como `multer`, `proxy-addr` e `source-map-js`).
- **Variável de ambiente nova?** Declare no `turbo.json`. O Turborepo não repassa variável não declarada, e a falha é cruel: o log do CI mostra a variável e o processo jura que ela não existe.

## Descrição do PR — as 7 seções

O template já abre com elas. Todas preenchidas; "nada" é resposta, seção em branco não é.

| Seção | O que vai |
|---|---|
| **O que muda** | o comportamento novo, rota por rota / tela por tela |
| **Por que assim** | a decisão **e a alternativa descartada**, com o motivo |
| **RFs cobertos** | quais RF/RNF, e o que de cada um |
| **Como testar** | comandos exatos e o resultado esperado (quantos testes, que status) |
| **Riscos e o que pode quebrar** | contrato que mudou, quem depende, migration, custo de performance |
| **O que ficou de fora** | cada item com a issue de destino |
| **Checklist de segurança** | só os grupos que o PR toca, cada um conferido |

Referência de como fica bom: os PRs já mergeados em `dev` (ex.: [#103](https://github.com/ljborgess/ProLobby.com/pull/103), [#105](https://github.com/ljborgess/ProLobby.com/pull/105)).

## Quando travar

- **Dúvida de regra de produto** → comentário na issue, pro Luciano.
- **"Por que o código está assim?"** → o comentário no código geralmente responde; decisão grande está em [`docs/adr/`](../adr/README.md).
- **Achou bug fora do escopo da sua issue** → issue nova pelo formulário do repo. Não corrija de carona no PR.

Próximo: [Regras que já pegaram bug](03-regras-que-ja-pegaram-bug.md).
