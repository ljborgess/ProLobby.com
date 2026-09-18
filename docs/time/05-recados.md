# Recados — o que mudou pra cada um

**Leia no começo de toda sessão, antes de pegar trabalho.** O que muda o jeito de trabalhar de alguém entra aqui, com data e o nome de quem é afetado. A IA de cada um (Cursor no Rafael, Claude Code no Felipe) lê este arquivo e já sabe o que mudou desde a última vez.

Recado vale até ser marcado como **resolvido**. Não se apaga: o histórico explica por que a regra existe.

---

## 2026-09-18 · Para todos

### Animação tem gatilho agora, e o gatilho não é hoje

A regra "não polir visual" continua valendo, e animação está dentro dela. O que mudou é que o redesenho deixou de ser "depois" e ganhou condição: **começa quando a fila existir**, no fim da Fase 2.5.

- **Não instale biblioteca de animação** (Motion, GSAP, o que for) antes disso. Quando chegar a hora, o default é CSS e View Transitions; biblioteca entra só se a interação exigir, e a interação precisa ser nomeada antes de instalar — os três casos previstos são elemento compartilhado entre telas, gesto com física e stagger orquestrado por estado.
- **Se você já precisa de transição hoje**, use CSS. É o que sobrevive ao redesenho e não cobra bundle.
- **`prefers-reduced-motion` entrou no piso de acessibilidade** ([RNF-015](../requisitos/07-nao-funcionais.md#rnf-015--piso-de-acessibilidade)): toda animação respeita, e **nada comunica estado só por movimento** — se pulsa pra dizer "esperando", tem texto ou ícone dizendo o mesmo. Vale pra qualquer CSS que você escrever agora, não só pra depois.

Racional completo em [Visão](../produto/01-visao/01-visao.md#o-visual-atual-é-base-provisória--o-front-end-será-redesenhado-decidido-em-2026-09-17).

---

## 2026-09-17 · Para todos

### `pnpm dev` agora lê o `.env` de cada app

Antes, API, bot e CLI de migration **ignoravam** `apps/*/.env`: só funcionavam com variável exportada no shell. Sem ela, a API caía no banco da porta 5432 (o de outro projeto, em quem usa a 5442) e falhava com `auth_failed`. E exportar o `.env` no shell vazava `PORT=3001` pro Next, que roubava a porta da API.

- **`pnpm dev` e `pnpm start` carregam o `.env` do próprio app.** Não exporte `.env` no shell; se já tem alias ou script que faz isso, apague.
- **Migration:** `pnpm --filter @prolobby/api mikro-orm migration:up` (ou `pnpm mikro-orm ...` dentro de `apps/api`). O `pnpm exec mikro-orm` antigo continua sem ler o `.env`.
- **Variável no shell ganha do `.env`.** Um `DATABASE_URL` esquecido no terminal ainda manda.
- **`PORT` saiu da lista do turbo.** Cada app lê a porta do próprio `.env`.
- Testes e e2e não mudaram: continuam recebendo `DATABASE_URL` pelo comando.

### O visual do front-end é provisório

O layout de `apps/web` **vai ser redesenhado depois**. As telas atuais (home, cadastro, login) são base, não desenho final.

- **Tela nova segue o padrão das atuais**: mesmo design system, mesmo jeito de montar formulário e texto traduzido.
- **Não invista em polimento visual** — é retrabalho garantido. O esforço vai em comportamento: acessibilidade, i18n, estados de erro e segurança.
- O que sobrevive ao redesenho e precisa estar certo agora: texto no dicionário de `src/content/`, rótulo acessível e token do design system num lugar só.

Detalhes em [Visão](../produto/01-visao/01-visao.md#o-visual-atual-é-base-provisória--o-front-end-será-redesenhado-decidido-em-2026-09-17).

### `main` virou o branch padrão

- **Ao abrir PR pela interface do GitHub, a base vem em `main`. Troque pra `dev` antes de criar.** Pela linha de comando: `gh pr create --base dev`.
- **`Closes #N` não fecha a issue quando o PR entra em `dev`.** Quem mergeia fecha à mão, com comentário apontando o PR.
- **Branch de PR é apagado sozinho no merge.** Pra continuar trabalhando, crie branch nova a partir de `dev` atualizado.
- Só existem `dev` e `main`. Branches antigos já mergeados foram apagados.

---

## 2026-09-16 · Para todos

### Trabalho em andamento precisa aparecer

Regra nova no [`CONTRIBUTING.md`](../../CONTRIBUTING.md#trabalho-em-andamento-precisa-ser-visível-decidido-em-2026-09-16):

1. **Ao pegar uma issue, comente nela**: "peguei, começando por X".
2. **Abra o PR como rascunho (draft) no primeiro commit**, mesmo que seja só o esqueleto. Marque "Ready for review" quando o pipeline local passar.

Sem nenhum dos dois sinais em 5 dias úteis, a issue volta pro caminho crítico. Não é cobrança: o processo antigo só mostrava trabalho quando ele estava pronto, e uma fase inteira ficou parada sem que ninguém pudesse dizer por quê.

### O EA FC 27 sai em 25/09/2026

Acesso antecipado a partir de 18/09. O Clubs passa a ficar dentro de um hub novo, "The Grounds", só em PS5, Xbox Series, Switch 2 e PC.

- **Nada medido em FC 26 vale pro produto.** O beta roda inteiro em FC 27.
- O checklist no jogo ([#63](https://github.com/ljborgess/ProLobby.com/issues/63)) e o piloto de OCR ([#50](https://github.com/ljborgess/ProLobby.com/issues/50)) rodam em FC 27.
- Tela do Virtual Pro, overall, arquétipo e categorias podem ter mudado. Até alguém confirmar no jogo, não trate nenhum campo como garantido.

### Moderação: são 3

João é sócio com voto e está fora do código e da moderação por ora. Moderam Luciano, Rafael e Felipe, com mínimo de 2 elegíveis pra punir ([RF-075](../requisitos/05-funcionais.md#rf-075--caso-sem-3-moderadores-elegíveis-resolve-em-desfecho-neutro)).

---

## 2026-09-16 · Rafael

### 1. Retry de evento não fica no bot

[`docs/discord/HANDOFF-bot.md`](../discord/HANDOFF-bot.md) mandava "fila de retry em memória no bot". **Estava errado desde 2026-09-11.** Quem guarda a entrega e reagenda é a **API** (`EventDelivery`, [RF-058](../requisitos/05-funcionais.md#rf-058--evento-da-plataforma-pro-bot-tem-retry-e-vira-caso-ao-esgotar)). O bot só precisa ser **idempotente**: checar o estado real no Discord antes de agir. Fila em memória no bot perde evento quando ele reinicia e executa a mesma ação duas vezes.

### 2. Piloto de OCR: print de FC 26 não mede nada

- Print de FC 26 serve **só pra desenvolver o script** ([#120](https://github.com/ljborgess/ProLobby.com/issues/120)). A taxa que decide a Fase 2.2 sai de print de **FC 27**.
- Primeira rodada com **20 prints**, não 50.
- Os prints vêm de **fonte pública** (VOD de YouTube/Twitch pausado na tela do Virtual Pro). Coleta automática não funciona: Reddit e X bloqueiam, busca web só devolve site de montar build.
- **Não espere print pra seguir.** A ordem continua **#99 → #121 → #123 → #120**.

### 3. O deploy depende das contas

[#121](https://github.com/ljborgess/ProLobby.com/issues/121) depende de [#130](https://github.com/ljborgess/ProLobby.com/issues/130): domínio `.com.br` e contas de Neon, Oracle, Cloudflare e Resend no nome do projeto. Isso é com os sócios, puxado pelo Luciano. A [#99](https://github.com/ljborgess/ProLobby.com/issues/99) não depende disso e pode andar agora.

---

## 2026-09-16 · Felipe

### 1. Suas três issues fecham a Fase 2.1

[#106](https://github.com/ljborgess/ProLobby.com/issues/106) (scheduler), [#87](https://github.com/ljborgess/ProLobby.com/issues/87) (tela de cadastro e login) e [#101](https://github.com/ljborgess/ProLobby.com/issues/101) (bot protection) são as últimas abertas da fase. O lado da API está todo em `dev`.

**Se até sexta, 2026-09-18, a #106 e a #87 não tiverem sinal** (comentário ou draft PR), elas passam pro Luciano e a Fase 2.2 abre. A #101 fica com você, porque depende da #87.

Travou no ambiente, no Docker ou em entender alguma parte do projeto? **Pergunte cedo.** O [guia do primeiro dia](01-primeiro-dia.md) tem o setup, e as armadilhas conhecidas estão em [regras que já pegaram bug](03-regras-que-ja-pegaram-bug.md).

### 2. A #106 ganhou um bug no escopo

`EmailVerificationService.deleteExpiredUnverified()` existe, mas **nada chama esse método em produção**, e o projeto não tem scheduler. Sem o job, "conta nunca verificada é apagada em 30 dias" não acontece: quem se cadastra com o e-mail de outra pessoa trava aquele endereço pra sempre. O critério de aceite da #106 já inclui isso.

- **Neon hiberna.** Um job por dia é aceitável; não transforme em keep-alive ([regras que já pegaram bug](03-regras-que-ja-pegaram-bug.md)).

### 3. A #87 depende da #99

A tela precisa repassar o cabeçalho `CF-Connecting-IP` nas chamadas feitas pelo servidor do Next.js. Quem faz a API **confiar** nesse cabeçalho é a [#99](https://github.com/ljborgess/ProLobby.com/issues/99), do Rafael. Dá pra construir a tela antes, mas a proteção de rate limit só funciona com as duas juntas.

### 4. Postgres local na porta 5442?

Se a porta 5432 da sua máquina já estiver ocupada por outro projeto, suba com `POSTGRES_PORT=5442 docker compose up -d postgres` e use `DATABASE_URL=postgres://prolobby:prolobby@localhost:5442/prolobby` no `apps/api/.env` (e no comando dos testes).
