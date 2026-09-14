# 4 · Trabalhando com IA: Claude Code ou Cursor

No time, **um usa Claude Code e outro usa Cursor**. A ferramenta é escolha de cada um. **O padrão de entrega é o mesmo:** mesmo fluxo, mesmas regras, mesmo PR e o mesmo review publicado. O revisor não pode conseguir adivinhar, olhando o PR, qual ferramenta foi usada.

## Como cada ferramenta conhece o projeto

| | Claude Code | Cursor |
|---|---|---|
| Carrega sozinho ao abrir o repo | `CLAUDE.md` (que aponta pro `CONTRIBUTING.md` e pro `HANDOFF.md`) e `.claude/settings.json` (hook que valida links de `docs/` antes do commit) | `.cursor/rules/prolobby.mdc` (`alwaysApply`), que aponta pros mesmos arquivos |
| Modo pra usar | sessão normal no terminal | **Agent** (não Ask), pra poder rodar comando, `gh` e testes |
| Hook de links de `docs/` | roda sozinho antes do `git commit` | **não roda.** Se mexer em `docs/`, rode `bash scripts/check-docs-links.sh` antes do commit |

As regras valem igual pros dois: código em inglês, checklist de segurança, guard fechado, e o resto do [guia 3](03-regras-que-ja-pegaram-bug.md). A regra do Cursor não repete nada disso de propósito. Ela manda ler a fonte, e fica sem duas cópias que um dia discordam.

Mudou regra de fluxo? Mude no `CONTRIBUTING.md` ou aqui em `docs/time/`, **nunca** só no `CLAUDE.md` ou só no `.mdc`. Senão uma ferramenta passa a seguir uma regra que a outra não conhece.

## Prompt de abertura: cole no início de toda sessão (serve pros dois)

```text
Vou trabalhar a issue #<NÚMERO> do ProLobby. Antes de codar:

1. Leia a issue inteira (gh issue view <NÚMERO>), o RF de origem em
   docs/requisitos/05-funcionais.md e o doc de produto linkado nele.
2. Confira no GitHub se ela está atribuída a mim e se não está Blocked.
3. Leia docs/time/ inteiro, CONTRIBUTING.md e
   docs/requisitos/08-seguranca-checklist.md.
4. Se houver decisão que o dossiê não fecha, me pergunte com opções e
   recomendação antes de implementar. Não invente regra de produto.

Depois:
- Crie a branch a partir de origin/dev atualizado.
- Implemente com código 100% em inglês e teste e2e contra Postgres real
  provando o critério de aceite. Invariante de segurança se prova
  contando trabalho (spy), não medindo tempo.
- Rode o pipeline completo (format:check, audit --prod, turbo lint
  type-check test build e2e). Se envolver tempo ou banco compartilhado,
  rode o e2e três vezes. Se mexer em docs/, rode também
  bash scripts/check-docs-links.sh.
- Commit em Conventional Commits, em português, assunto minúsculo.
- Abra PR contra dev com as 7 seções do template, todas preenchidas.
- Faça code review e security review intensos do próprio diff e publique
  como comentário no PR, com achados classificados (🔴/🟡/🟢). Corrija
  🔴 e 🟡 no próprio PR, com teste. Achado que não cabe no PR vira issue
  com dependência registrada.
- Não faça merge. O PR fica aberto esperando a aprovação do Luciano.
```

Se a sessão ou o chat cair no meio, abra outro e cole de novo dizendo onde parou (por exemplo: "a branch já existe, falta o review").

**No Cursor:** o agente precisa do `gh` logado no terminal integrado (`gh auth status`) pra ler a issue e publicar o review. Se ele não conseguir rodar um comando, rode você mesmo e cole a saída no chat. Não pule o passo.

## O review antes de pedir aprovação

A IA revisa o próprio diff **como adversário**, não como autor. Num chat longo ela tende a defender o que acabou de escrever, então peça o review numa **sessão/chat novo**, só com o diff (`git diff origin/dev...HEAD`) e o checklist de segurança.

O comentário no PR segue este formato:

```markdown
## Code review + security review — #<PR>

Diff lido: <arquivos>. Pipeline local: <resultado, quantos testes, quantas rodadas>.

### 🔴 / 🟡 Corrigido neste PR

<achado, por que é problema, o que mudou, commit>

### 🟢 Sem ação (registrado)

<achado e por que não vale código agora>

### Security review

| Ponto                      | Resultado                  |
| -------------------------- | -------------------------- |
| <item do checklist tocado> | ✅ <como foi conferido>    |
```

| Severidade | Significa | O que fazer |
|---|---|---|
| 🔴 | bug, furo de segurança, dado perdido | corrige no PR, com teste; não peça aprovação antes |
| 🟡 | teste que não prova o que diz, risco real mas improvável, contrato frágil | corrige no PR, com teste |
| 🟢 | observação, custo aceito, melhoria futura | registra no comentário; se merecer, vira issue |

**Se você discordar de um achado**, deixe escrito no PR com o motivo da recusa. Discordância registrada vale mais que achado ignorado em silêncio.

## O que a IA não decide por você

- **Regra de produto:** número, prazo, quem pode o quê. Isso vem do dossiê ou do Luciano.
- **Merge:** nunca.
- **Segredo:** nunca cole token, senha ou `.env` no chat. As duas ferramentas mandam o que você cola pro provedor do modelo. Se colou por engano, **revogue na hora** (gere outro no painel do serviço) e avise o Luciano.
- **Container ou arquivo de outro projeto** na sua máquina: não deixe o agente parar, apagar ou "liberar a porta".
- **Auto-run de comando destrutivo:** no Cursor, não libere auto-run pra `rm`, `docker rm`, `git push --force` ou `git reset --hard`. No Claude Code, não aprove esses comandos sem ler.

## Checklist rápido antes de pedir review do Luciano

- [ ] Issue atribuída a mim e não bloqueada
- [ ] Código só em inglês; PR e commit em português
- [ ] Teste prova o critério de aceite; e2e verde (3 vezes se tem tempo ou concorrência)
- [ ] `format:check`, `audit`, `turbo lint type-check test build e2e` verdes
- [ ] Mexeu em `docs/`: `bash scripts/check-docs-links.sh` verde
- [ ] Migration gerada de banco limpo, com `down()` (se tiver)
- [ ] PR com as 7 seções preenchidas e `Closes #N`
- [ ] Comentário de code review + security review publicado; 🔴 e 🟡 corrigidos
- [ ] CI verde
