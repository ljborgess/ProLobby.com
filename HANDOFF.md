# Handoff — ProLobby

Pra quem (Claude Code, outra sessão/máquina) for continuar este projeto a partir daqui.

## O que é

Ver [`README.md`](README.md). Origem: ideia nasceu numa sessão sobre o projeto `escalacao-brasileirao` (Django, escalação de Brasileirão via API), mas ProLobby é **projeto novo e independente** — só a identidade visual (design system) foi herdada de lá, nada de backend/dados.

## Estado atual (2026-09-14)

- **Fase**: design de produto e requisitos fechados; **engenharia em andamento**. **Fase 1** (CI, processo de PR, servidor Discord) concluída em 2026-09-11. **Fase 2.1** (núcleo de conta) em andamento, com 11 de 26 issues fechadas: schema base, segurança transversal da API, cadastro, login e sessão ([ADR-007](docs/adr/007-sessao-jwt.md)), verificação de e-mail ([ADR-008](docs/adr/008-provedor-de-email.md)) e aceite de Termos já estão em `dev`.
- **Time de código: três devs ativos desde 2026-09-14.** Luciano no caminho crítico (Claude Code), Rafael no paralelo de bot e infra (Cursor), Felipe no paralelo de produto visível (Claude Code). A ordem de cada um está no [grafo da Fase 2.1](CONTRIBUTING.md#grafo-vivo--fase-21-núcleo-de-conta-trabalho-aberto-em-2026-09-14) e no #64.
- **Review**: PR do Rafael e do Felipe precisa da aprovação do Luciano. PR do Luciano é revisado por ele mesmo, com code review e security review do agente publicados no PR ([CONTRIBUTING](CONTRIBUTING.md#quem-revisa-o-pr-do-luciano-decidido-em-2026-09-14)).
- **Quem entra pra codar** começa por [`docs/time/`](docs/time/README.md): primeiro dia, fluxo de uma issue, regras que já pegaram bug, Claude Code e Cursor.
- **Tempo estimado**: beta pronto entre o fim de dezembro de 2026 e o início de março de 2027; abertura pública entre meados de janeiro e meados de abril de 2027. É estimativa com faixa, não prazo. Premissas, riscos e regra de recalibração em [Ordem de implementação](docs/negocio/02-implementacao.md).
- **Tracker fase a fase**: índice vivo é **[#64 — PRD Mestre](https://github.com/ljborgess/ProLobby.com/issues/64)**, com as 13 fases em ordem, a divisão de trabalho, a estimativa e o mapeamento das issues antigas. **Só a fase corrente tem issue**; fase futura existe como milestone e linha da tabela do #64. As issues #25–#63 são fechadas como `not planned` quando a fase que as cobre é reconstruída.
- **Auditoria de fluxo de 2026-09-11**: varredura ponta a ponta do dossiê fechou **24 achados** — 6 quebras de fluxo (estado `expirada_sem_report` inalcançável, suspensão que virava banimento sozinha, capitão punido por falta de vaga, RF-066 disparando em partida legítima, deadlock de moderação, beta sem trava), 6 lacunas de modelo de dados, 7 ambiguidades e 5 de processo. Nasceram **RF-074 a RF-080** e 4 entidades novas; as 36 h de zero-report e o critério de "qualquer vaga > 0" foram revogados. **Ler [`docs/research/auditoria-2026-09-11.md`](docs/research/auditoria-2026-09-11.md) antes de implementar fila, lobby, resultado ou moderação** — várias regras mudaram de comportamento, não só de texto. Abriu também [#62](https://github.com/ljborgess/ProLobby.com/issues/62) (entidade `CasoModeracao`, sub-issue de #30) e [#63](https://github.com/ljborgess/ProLobby.com/issues/63) (rodar o checklist no jogo, que era o único bloqueador sem issue).
- **Branches**: só `main` e `dev`. Trabalho corre em `dev`; `main` só recebe merge quando o time decidir promover.
- Todo o conteúdo abaixo está commitado em `dev`.

## Retomada concluída (2026-09-08) — issues #1-#5 reabertas

Varredura do dossiê contra o scaffold rodou 4 vezes no total (a de 2026-09-08 achou 20 pontos, 11 corrigidos na hora, 9 fechados na retomada abaixo). Estado final:

> **Nota de 2026-09-10**: os números de issue citados nesta seção (`#1`–`#5`) são os **antigos**, fechados e substituídos na reformulação de 2026-09-10 (ver seção "Estado atual" acima). Mapeamento: #1→#30, #2→#40, #3→#45, #4→#36, #5→#26. O conteúdo/achados abaixo continuam válidos, só a numeração mudou.

### Decisão fechada em 2026-09-11 — branch protection é convenção

O repo continua **privado, no plano Free**, e a regra de "PR de terceiro precisa de 1 approval do Luciano" é **disciplina declarada, não trava técnica** — o GitHub não impede o merge. Repo público (destravaria de graça, mas expõe monetização, rateio e estratégia) e GitHub Pro (primeiro gasto recorrente do projeto) foram avaliados e descartados; racional completo e gatilho de revisão no [ADR-006](docs/adr/006-backend-separado-e-tooling.md). Issue [#66](https://github.com/ljborgess/ProLobby.com/issues/66).

### Aberto no código (já viraram issue)

- **[#4] Webhook do bot sem autenticação** — `apps/bot/src/webhook/server.ts` aceita qualquer requisição em `POST /events`. Inofensivo hoje (nenhum handler faz nada), perigoso no dia do primeiro handler: o endpoint comanda kick/ban ([RF-048](docs/requisitos/05-funcionais.md#rf-048--kick-e-ban-só-por-comando-de-admin-ou-moderador)) e canal de lobby. Itens 6 e 7 do [checklist de segurança](docs/requisitos/08-seguranca-checklist.md). Inclui tipar o `platformEventSchema`, hoje `payload: z.record(z.unknown())`.
- **[#5] CI não sobe Postgres** — `.github/workflows/ci.yml` sem `services:`. Quebra no PR da #1, que é o que fundamenta todo o resto. Mesma issue cobre a falta de template de PR/issue, que é o que faria o checklist de segurança ser olhado na hora certa.

### Aberto no código (ainda sem issue — entram junto da fatia que os usa)

- **`apps/api` não tem `class-validator`/`class-transformer` nem `ValidationPipe` global** com `whitelist`/`forbidNonWhitelisted`. Itens 8 e 14 do checklist ficam sem base. Está escrito no corpo da issue #2, que é onde a peça nasce.
- **`@nestjs/throttler` instalado mas não plugado** no `AppModule` (item 11), e nada de cookie `HttpOnly`/`Secure`/`SameSite` nem CORS (item 9). Também na #2.
- **`apps/web` é boilerplate puro do create-next-app**: fonte Geist onde o design system pede `Sora`/`Inter`, paleta branca onde o design system é escuro (`#070b14`, ver [visão](docs/produto/01-visao/01-visao.md)), `lang="en"` no `layout.tsx` e `<title>Create Next App</title>`. **Decidido em 2026-09-08**: o front segue o artefato de preview em React, e o desenho de view fica pra depois — mas **tokens do design system e i18n pt/es ([RNF-016](docs/requisitos/07-nao-funcionais.md#rnf-016--interface-e-mensagens-em-português-e-espanhol)) são baratos agora e caros como retrofit**, então entram junto da primeira tela real.
- **Nenhuma das 13 telas** do inventário ([transversais](docs/requisitos/01-transversais.md)) existe. Esperado nesta fase, registrado pra não parecer esquecimento.

### Corrigido nesta rodada — não reabrir

- `03-dados.md`: entidade `Conta` ganhou **`papel`** (os 4 papéis existiam em `01-transversais.md` e não tinham onde morar — sem isso o item 7 do checklist não tem base) e **`plano`**; entidade **`EventoPagamento`** criada. Os três eram decisão já tomada em outro documento que nunca chegou ao modelo de dados.
- `03-dados.md` dizia que o esquema "depende da stack, deliberadamente não decidida" — stack decidida desde 2026-09-08.
- `08-seguranca-checklist.md` se contradizia: linhas de topo e os itens 3 e 4 diziam "API do Next.js" enquanto os itens 6 e 7 já apontavam pro NestJS.
- Stack velha (Prisma/Auth.js/API routes) propagada em `negocio/02-implementacao.md`, `produto/05-produto/03-backlog.md`, `discord/HANDOFF-bot.md`, `discord/05-arquitetura-bot.md` (a árvore do monorepo nem tinha `apps/api`) e `produto/01-visao/01-visao.md`.
- `README.md` dizia "desenvolvimento de código é solo".
- Issues #1–#3 tinham erro de conteúdo: a #1 descrevia `Conta` com campos que não batiam com `03-dados.md` e tratava `AceiteTos` como campo em vez de entidade; a #2 não citava a **RF-072**, que é exceção explícita da própria RF-019 que ela implementa.

### Ordem sugerida pra retomar (atualizada em 2026-09-14)

Sequência canônica em **[#64 — PRD Mestre](https://github.com/ljborgess/ProLobby.com/issues/64)**. A Fase 1 inteira (#66–#70) já fechou. Agora:

1. **Fechar a Fase 2.1** pelo grafo: Luciano #90 → #91 → #104; Rafael #81 → #93 → #94/#95; Felipe #106 → #87 → #101.
2. **[#50](https://github.com/ljborgess/ProLobby.com/issues/50) — piloto de OCR**, emendado pelo Rafael no fim do webhook. Precisa sair **antes da Fase 2.2**, porque escolhe o motor de OCR.
3. **Primeiro deploy interno** ([ADR-009](docs/adr/009-neon-cloudflare-vm.md)), pelo Rafael depois do piloto, em paralelo com o começo da 2.2. Fechado pelo Cloudflare Access (só os 4 abrem), com o teste de restauração do backup. Antes dele: comprar o `.com.br`, fechar o acordo escrito de titularidade entre os 4 e criar as contas da Neon, da Oracle e da Cloudflare com e-mail do projeto e segundo fator. As issues nascem quando a 2.2 abrir.
4. **[#63](https://github.com/ljborgess/ProLobby.com/issues/63) — checklist no jogo**, antes de a **Fase 3** começar. São minutos de jogo; a partir da 3, o retrabalho fica caro.
5. Fechada a 2.1, abrir a **2.2** (Rafael + Felipe) e a **2.3** (Luciano) em paralelo, pelo caminho PRD → issues → sub-issues.
6. **João (`jgbriel-io`) tem convite pendente no repo, e o papel dele no código é decisão pra frente** (Luciano, 2026-09-14). Não entra na divisão nem na estimativa até ser decidido. Se aceitar o convite, passam a ser 4 pessoas com `push`, o que dispara o gatilho de revisão de branch protection do [ADR-006](docs/adr/006-backend-separado-e-tooling.md).
7. **Recrutamento dos ~24 convidados do beta** começa agora, em paralelo. É a única etapa que não depende de código ([Lançamento](docs/negocio/04-lancamento.md)).

## Os dois bloqueadores — leia isto antes de qualquer coisa

**Nenhum dos dois é escrever plataforma.** Foram identificados ranqueando os cinco riscos do projeto por probabilidade e dano, e o achado foi que **quatro dos cinco não se resolvem com engenharia**:

1. **[Checklist no jogo](docs/produto/03-partida/05-checklist.md)** — 8 testes, custa minutos e nenhum dinheiro. Valida o mecanismo de capitão/clube em que todo o fluxo de partida se apoia. O teste 6 é o mais crítico do projeto: se o Amistoso Online **não** aceitar a IA cobrindo vaga, o piso de 8 humanos cai e a solução de cold start inteira vai com ele.
2. **[Piloto de OCR](docs/requisitos/06-piloto-ocr.md)** — um script sobre 50 prints reais **de estranhos**, sem conta, sem banco, sem tela. É o único risco grande que exige código pra ser medido, e decide de quebra a escolha entre OCR pago e local.

Os dois rodam em paralelo, mas ainda não rodaram — **stack técnica foi decidida mesmo assim (2026-09-08, [ADR-005](docs/adr/005-stack-tecnica.md))**, risco aceito porque o checklist não tinha previsão de acontecer no curto prazo. O que ainda espera o retorno dos bloqueadores: três parâmetros marcados como "a calibrar" (os 5 min de confirmação de convite, os 60 min de expiração por zero-report, e se o modelo de 5 personagens sobrevive ao que o jogo oferece) e a implementação de RF-051/052/055.

## Estrutura da documentação

```
docs/
├── produto/      POR QUE cada regra é assim — decisão, alternativa descartada, motivo
│   ├── parametros.md          TODOS os números do sistema num lugar só
│   ├── 01-visao/     01-visao
│   ├── 02-jogador/   01-verificacao · 02-ranking · 03-perfil
│   ├── 03-partida/   01-mecanica · 02-fila · 03-lobby · 04-resultado · 05-checklist  ← núcleo
│   ├── 04-governanca/ 01-moderacao · 02-lgpd · 03-termos
│   └── 05-produto/   01-onboarding · 02-escopo · 03-backlog
├── requisitos/   O QUE o sistema faz — comportamento verificável
│   ├── 01-transversais · 02-estados · 03-dados · 04-notificacoes
│   ├── 05-funcionais       RF-001 a RF-081
│   ├── 06-piloto-ocr       bloqueador nº 2
│   ├── 07-nao-funcionais   RNF-001 a RNF-021
│   └── 08-seguranca-checklist   18 itens + 9b, aplicar desde a 1ª linha de código de backend
├── adr/          decisão técnica difícil de reverter (001 a 008; 005/006 stack, 007 sessão, 008 e-mail)
├── research/     auditorias do dossiê (a de 2026-09-11 mudou regra, não só texto)
├── time/         guia de quem coda: primeiro dia · fluxo da issue · regras · Claude Code e Cursor
├── discord/      01-cargos · 02-canais · 03-bot · 04-integracao
└── negocio/      01-mercado · 02-implementacao · 03-sustentabilidade · 04-lancamento
```

**A divisão produto x requisitos é intencional**: quem implementa segue `requisitos/` e consulta `produto/` quando quer entender a razão de algo. Todo RF aponta pra onde foi decidido — requisito sem origem é requisito que alguém inventou.

Numeração de arquivo indica **ordem de leitura** dentro da pasta.

## Decisões que mais moldam o produto

Se você só puder ler cinco coisas, leia estas:

1. **Não existe sala privada em Pro Clubs.** O jogo só tem liga, Drop-In e Amistoso Online entre clubes. O mecanismo decidido é **Amistoso entre o clube pessoal de um capitão** — um dos jogadores humanos de cada lado, escolhido por reputação entre quem declarou vagas suficientes no clube. Não é conta de serviço da plataforma. Ver `produto/03-partida/01-mecanica.md`.
2. **A IA do próprio jogo cobre vaga vazia.** É o achado de maior impacto: sem ele, uma partida exigiria 22 pessoas simultâneas; com ele, a meta cai pra **8** (piso de 4 por lado, simetria obrigatória **por categoria**). É o que torna o cold start viável — e é o que o teste 6 valida.
3. **A linha vermelha da monetização**: nada que altere fila, elo, escolha de capitão ou resultado é vendável. Decisão fixa, não revisável por volume. Ver `negocio/03-sustentabilidade.md`.
4. **Reputação é recuperável e recusa não a afeta.** Partida limpa devolve +1 até o teto de 70; acima disso só por joinha. Recusar partida gera **timeout progressivo de fila** (5/15/30 min, 2 h), não perda de reputação.
5. **O rollback exige log de evento.** Elo e reputação guardam cada alteração com motivo, partida e data. Sem isso, o rollback de disputa é inimplementável e os contadores de janela móvel não são contáveis. Ver `requisitos/03-dados.md`.

## Ferramentas do repo

- **`scripts/check-docs-links.sh`** — valida links cruzados e cobertura de índice de `docs/`. Roda automaticamente por um hook `PreToolUse` (`.claude/settings.json`) antes de qualquer `git commit`, e **bloqueia o commit** se achar link quebrado ou arquivo órfão fora do índice.
- **`.claude/settings.json`** — registra o marketplace de plugins B2ML, habilita o plugin `grill-me`, e configura o hook acima. Abrindo este repo no Claude Code, isso carrega sozinho.

## Como continuar

1. **Stack decidida** ([ADR-005](docs/adr/005-stack-tecnica.md)) — dá pra começar o `apps/bot` e o esqueleto de `apps/web` já, seguindo a ordem de `negocio/02-implementacao.md`.
2. **Rodar os dois bloqueadores continua prioridade pra RF-051/052/055 e pros 3 parâmetros "a calibrar"** — não bloqueiam mais o resto da stack, mas bloqueiam essas partes específicas.
3. Anotar os resultados **no próprio checklist** quando rodar, e atualizar `produto/03-partida/01-mecanica.md`, trocando as premissas presumidas pelo que foi confirmado.
4. Se for seguir levantando requisito: use a skill `grill-me`. As lacunas abertas estão tabeladas em `produto/05-produto/03-backlog.md` — não regrilar item já marcado como adiado de propósito sem motivo novo.
5. Front-end: design system em `produto/01-visao/01-visao.md`.

## Pendências abertas, com dono claro

Tabela completa em `produto/05-produto/03-backlog.md`. Nenhuma é de requisito:

| Aberto | Natureza |
|---|---|
| Os dois bloqueadores acima | execução |
| Stack técnica | **decidida em 2026-09-08**, antes dos bloqueadores (ver [ADR-005](docs/adr/005-stack-tecnica.md)) — risco aceito: RF-051/052/055 podem exigir retrabalho quando o checklist rodar |
| Titular das contas e rateio entre os 4 | acordo entre sócios, antes do 1º gasto recorrente |
| Consulta jurídica | três assuntos numa consulta: redação de apoio/CDC, LGPD 16-17, entidade legal |
| Desenho de torneio/liga | adiado por decisão: validar o núcleo primeiro |

## Riscos aceitos conscientemente — não são lacunas

- **Conluio de resultado**: dois lados combinando placar não gera disputa, porque os prints batem. Risco aceito, com gatilho de revisão definido (tratar ao primeiro sinal de grupo fechado, sem esperar volume).
- **Smurf com investimento**: conta EA nova + Discord novo + console novo passa. O vínculo pega recriação preguiçosa, não quem investe.
- **Dependência da mecânica da EA**: sem API nem contrato, qualquer patch pode mudar a base do produto. Mitigação é disciplina operacional, não engenharia.
- **Sem reembolso** no apoio de Fundador, se houver cobrança.
- **Região de hospedagem (ajustada em 2026-09-14, [ADR-009](docs/adr/009-neon-cloudflare-vm.md))**: banco na Neon em São Paulo; web, API e bot na VM Oracle Free Tier em São Paulo; prints e backups no Oracle Object Storage em São Paulo; Cloudflare na frente via túnel. **Dado armazenado nunca sai do Brasil**; o trânsito das requisições pela rede da Cloudflare e o envio de e-mail são declarados na Política de Privacidade. Riscos aceitos: endereço público do banco (IP Allow só no plano pago, com cinco compensações) e dependência de três free tiers (Neon, Oracle, Cloudflare), com Docker Compose pra migrar de VM em horas.
- **MEI não aceita a atividade** (confirmado por CNAE público, 2026-09-08, sem contador acessível pro projeto) — entidade legal é ME no Simples, ~R$200-300/mês, gatilho de assinatura recorrente sobe pra ~700 contas ativas.
- **[RF-033](docs/requisitos/05-funcionais.md#rf-033--clube-em-uso-não-é-candidato-em-outro-lobby)**: trava a conta inteira quando 1 dos até 3 clubes simultâneos (FC26) está em uso, mesmo os outros 2 livres. Mudar exigiria cadastro/OCR de 3 clubes por conta — escopo grande demais pro ganho.
- **Rotação de token do bot**: sem agenda periódica, só sob suspeita de vazamento (ver [RNF-013](docs/requisitos/07-nao-funcionais.md#rnf-013--token-do-bot-só-em-variável-de-ambiente)) — custo operacional desproporcional pra 4 sócios part-time.

## Decidido: sem divisão de papéis

Os 4 (Luciano, Rafael, João, Felipe) trabalham em conjunto, sem papel fixo por disciplina. Não é pendência, é decisão tomada.

**Recorte de código (atualizado em 2026-09-14)**: dentro do desenvolvimento, **Luciano, Rafael e Felipe codam**. O trabalho é dividido **por área, pra paralelizar**, não por papel fixo: Luciano no caminho crítico, Rafael em bot e infra, Felipe em produto visível. Luciano lidera de fato (dono do contexto completo do dossiê): atribui issue e aprova os PRs do Rafael e do Felipe; o PR dele é revisado por ele mesmo, com review do agente publicado no PR. Isso não reabre a decisão acima sobre papel fixo no projeto como um todo, só descreve como o fluxo de código anda (ver [CONTRIBUTING.md](CONTRIBUTING.md) e [ADR-006](docs/adr/006-backend-separado-e-tooling.md)).
