# 3 · Regras que já pegaram bug

Cada regra aqui é curta, e o motivo vem junto. Se uma parecer exagero, leia o motivo antes de pular.

## Código em inglês, projeto em português

Identificador, comentário, nome de teste, coluna de banco, valor de enum: **inglês**. Issue, PR, commit, dossiê: **português**. A fronteira é o arquivo, nunca a linha — nada de `contaVerificada` ao lado de `findAccount`.

Termo do dossiê vira termo de código pelo [glossário](../../CONTRIBUTING.md#glossário--dossiê-pt--código-en) (Conta → `Account`, CasoModeracao → `ModerationCase`). Termo que não está lá: escolha um, e acrescente no glossário no mesmo PR.

## O guard é fechado por padrão

Rota sem decorator exige **sessão válida + conta `ACTIVE` + aceite dos Termos em dia**.

| Quero | Uso |
|---|---|
| rota sem sessão nenhuma | `@Public()` |
| aceitar outro estado de conta | `@AllowStates(AccountState.X, ...)` |
| pular a checagem de Termos | **não use** — `@SkipTermsCheck()` é da rota de aceite, e só dela |

Conta recém-cadastrada é `UNVERIFIED` e não alcança nada por omissão. Isso é certo. `DELETED` nunca passa, mesmo se alguém listar por engano. Detalhes no [ADR-007](../adr/007-sessao-jwt.md).

**Por quê:** rota aberta por esquecimento é o furo que ninguém vê no review. Fechado por padrão, esquecer o decorator dá 403 no teste, não vazamento em produção.

## Segurança mora no módulo, não no bootstrap

`ValidationPipe` (`whitelist` + `forbidNonWhitelisted`), helmet, cookie parser e rate limit estão no `AppModule`. **Não mova nada disso pro `main.ts`.**

**Por quê:** os testes montam o `AppModule`, não rodam o `main.ts`. O que vive só no bootstrap some dos testes — e teste que passa contra app sem proteção não prova nada. Aconteceu.

## GET nunca muda estado

Não há token anti-CSRF. Quem fecha o vetor é o cookie `SameSite: lax` — **com a condição** de que nenhuma rota GET tenha efeito colateral (item 9b do [checklist](../requisitos/08-seguranca-checklist.md)).

**Por quê:** `lax` deixa o cookie ir junto em navegação GET vinda de outro site. Um GET que muda estado vira ação disparada por qualquer link. Pelo mesmo motivo a verificação de e-mail é `POST`: scanner de e-mail corporativo segue todo link antes do humano.

## A resposta nunca revela se uma conta existe (RF-070)

Cadastro, login, recuperação: os dois caminhos (conta existe / não existe) devolvem **mesmo status, mesmo corpo e mesmo custo de trabalho**.

- Custo igual = mesma quantidade de hash de senha nos dois caminhos (existe um hash "isca" pra isso).
- **Prove contando chamadas com spy** (`jest.spyOn(hashService, 'hash')`), **não medindo tempo**. Teste de relógio virou flaky duas vezes neste projeto.

**Por quê:** status diferente vaza na hora; tempo diferente vaza com um script de mil requisições.

## I/O de terceiro fora do caminho da resposta

E-mail, webhook, provedor externo: dispare sem esperar (`void trySend(...)`) e trate a falha dentro dele.

**Por quê:** esperar vira oráculo de timing (conta nova demora mais, porque manda e-mail) e faz falha do provedor derrubar uma operação que já foi gravada.

## Idempotência pelo banco, não por "checa e insere"

Operação que pode chegar duas vezes (duplo clique, retry) se garante com **índice único** e o erro de unicidade tratado como sucesso. E se prova com requisições **simultâneas** (`Promise.all`), não uma depois da outra.

**Por quê:** `findOne` → `insert` deixa duas requisições simultâneas passarem juntas pela checagem. Teste sequencial nunca exercita essa corrida.

## Migration: sempre de banco limpo

```bash
cd apps/api
pnpm mikro-orm schema:drop --run --drop-migrations-table
pnpm mikro-orm migration:up
pnpm mikro-orm migration:create
```

- Confira que a migration tem `down()` simétrico.
- Decida o `deleteRule` de cada relação e escreva o porquê na entidade (log de evento é `set null`, nunca cascade).

**Por quê:** `migration:create` diffa contra **o banco**, não contra os arquivos. Banco sujo de teste gera migration parcial que só quebra em banco novo — ou seja, no deploy.

## Banco na Neon: o que funciona local e quebra em produção

Localmente o banco é um Postgres em Docker, sempre ligado e com conexão direta. Em produção é a Neon ([ADR-009](../adr/009-neon-cloudflare-vm.md)): **hiberna depois de 5 minutos parado** e a app conecta **por um pooler (PgBouncer)**. Por isso:

- **Nada consulta o banco em ciclo com o sistema parado.** Nada de `setInterval` batendo no banco; tick de fila só com gente na fila, retry só com entrega pendente, job agendado uma vez por dia. **Por quê:** um único ciclo esquecido mantém a Neon acordada 24 horas e estoura as horas grátis do mês em silêncio.
- **Nada preso a sessão do Postgres**: sem `SET` de sessão, sem `LISTEN/NOTIFY`, sem advisory lock de sessão. **Por quê:** o pooler divide a mesma conexão entre requisições diferentes. Passa no teste local e falha em produção.
- **Imagem nunca vai pro banco.** Print fica no storage; o banco guarda só a referência. **Por quê:** a Neon grátis tem 0,5 GB, e o backup do banco não pode virar cópia eterna de print.
- **A API conecta com uma role sem DDL.** Migration roda com outra role, pela URL direta. Tabela nova precisa estar coberta pelas permissões padrão.

## Atrás da Cloudflare: IP, cache e endereço

Em produção a Cloudflare fica na frente e o tráfego chega à VM por um túnel, sem porta aberta ([ADR-009](../adr/009-neon-cloudflare-vm.md)).

- **Nenhum `ports:` nos serviços de produção do `docker-compose`.** **Por quê:** o IP real vem do cabeçalho `CF-Connecting-IP`, e ele só é confiável enquanto a API for alcançável apenas pelo túnel. Publicar a porta não dá erro nenhum — só deixa qualquer um forjar o IP e anula o rate limit.
- **No `apps/web`, chamada feita no servidor repassa o `CF-Connecting-IP`.** **Por quê:** senão toda renderização no servidor chega com o mesmo IP e divide um único limite de requisições.
- **Página ou resposta com sessão sai com `Cache-Control: private, no-store`.** **Por quê:** a borda da Cloudflare não pode guardar HTML de pessoa logada — seria entregar a página de uma pessoa pra outra.
- **Web e API no mesmo endereço**: em produção a API responde em `/api/*`. **Um cliente de API só no `apps/web`**, com a base configurável; nenhuma URL de API espalhada pelos componentes.

## Teste que não pega linha do vizinho

A suíte e2e roda com um worker só, contra o mesmo banco. Filtre sempre pelo que o teste criou (e-mail único por teste, `account: account.id`), nunca "a última linha da tabela".

**Por quê:** teste que passa sozinho e falha na suíte é o flaky mais caro de achar.

Próximo: [Trabalhando com IA: Claude Code ou Cursor](04-trabalhando-com-ia.md).
