# Ordem de implementação — por onde começar

Uso interno dos 4. Ordem com base nas dependências já mapeadas no dossiê (o que trava o quê) e, desde 2026-09-14, uma [estimativa de tempo](#capacidade-do-time-e-tempo-estimado-2026-09-14) com faixa e premissas. É estimativa pra planejar, não prazo prometido.

## 0. Stack decidida antes dos bloqueadores — risco aceito conscientemente

**Stack técnica decidida em 2026-09-08** ([ADR-005](../adr/005-stack-tecnica.md), corrigida no mesmo dia pelo [ADR-006](../adr/006-backend-separado-e-tooling.md)): Next.js/TypeScript **só no frontend** (`apps/web`) + **NestJS** (`apps/api`) com toda regra de negócio, **MikroORM**, **JWT** (`@nestjs/jwt`), bot Node.js/TypeScript/discord.js, Postgres self-hosted, Oracle Cloud Free Tier (São Paulo/Vinhedo). Decidido antes do [checklist no jogo](../produto/03-partida/05-checklist.md) rodar, porque o checklist não tinha previsão de acontecer no curto prazo — travar toda decisão técnica indefinidamente custava mais que o risco identificado.

**O que ainda depende do checklist, especificamente**: RF-051, RF-052 e RF-055 (canais do lobby, prazos de deleção, gatilho do cargo Verificado) — são decisão de **produto** (tamanho de lobby, premissa de verificação), não de tecnologia, e podem exigir retrabalho quando o teste 6 (IA cobrindo vaga) ou o teste 7 (Virtual Pro única) rodarem. A stack em si não muda por causa disso.

**O teto de custo já está resolvido**: R$ 0 no MVP, via free tier (ver [Sustentabilidade](03-sustentabilidade.md)) — web, API e bot na VM Oracle, banco na Neon, prints e backups no Object Storage da Oracle, Cloudflare na frente ([ADR-009](../adr/009-neon-cloudflare-vm.md)). E desarma a escolha "OCR pago vs. biblioteca local" no início: o piloto testa primeiro com Tesseract (grátis), comparando com Google Vision (free tier) só se a taxa vier baixa.

**Primeiro trabalho de engenharia: o [piloto de OCR](../requisitos/06-piloto-ocr.md)** — bloqueador nº 2. Continua sendo a única coisa que exige código pra medir um risco real (taxa de acerto do OCR em print de estranho); roda isolado, sem conta, sem banco, sem tela, antes de qualquer parte da plataforma.

> A ordem por dependência abaixo continua correta pra responder *o que dá pra construir*. O checklist no jogo segue valendo a pena rodar assim que possível — não trava mais o começo da engenharia, mas trava a implementação final do item 3 (fechamento do lobby).

## 1. Discord primeiro (configuração, não código) — ✅ feito na Fase 1 (2026-09-11)

Servidor Discord não depende da plataforma existir — é configuração manual, rápida, sem escrever linha de código:

1. Cria a conta separada dona do servidor ([docs/discord/README.md](../discord/README.md)).
2. Cria o servidor, cargos fixos (Admin/Moderador), canais fixos (#regras, #anuncios, #geral, #fila-status, #status-sistema, #suporte-e-denuncia, #log-moderacao — ver [Canais](../discord/02-canais.md)).
3. Configura Onboarding/Screening nativo do Discord pros cargos sociais ([Cargos e verificação](../discord/01-cargos.md)).
4. Cria a aplicação do bot no Discord Developer Portal, gera token, **ativa o Server Members Intent** (não vem ligado por padrão — sem ele o bot não gerencia cargo/nickname, e falha em silêncio) ([Integração técnica](../discord/04-integracao.md)) — ainda sem lógica nenhuma implementada, só existindo.

O servidor é criado **manualmente**, não pelo bot: a API permitiria, mas o bot viraria dono do servidor, contrariando a decisão de propriedade por conta separada.

Motivo de fazer isso cedo: zero dependência de decisão de stack, dá pro time já ter comunidade rodando (mesmo que manual) enquanto a plataforma é construída — e o servidor existir cedo ajuda a validar cargos/canais na prática antes de automatizar.

## 2. Núcleo da plataforma — sem isso nada funciona

**Transversal, desde o primeiro item**: os [requisitos transversais](../requisitos/01-transversais.md) — fuso UTC, janela móvel de 30 dias, papéis da plataforma, idempotência de envio, piso de acessibilidade — não são etapa, são base: retrofit de fuso ou de idempotência depois custa muito mais que nascer com eles. Idem os requisitos de segurança de [Dados pessoais e LGPD](../produto/04-governanca/02-lgpd.md#requisitos-de-segurança-independentes-de-stack) — criptografia de dado sensível em repouso e rate limiting na API própria entram junto com conta/autenticação (item 1), não depois. 2FA no painel e log de auditoria de moderador entram só quando o painel existir (item 5, Governança) — mas o schema de log já deveria contemplar isso desde o design do banco, pra não precisar migração retroativa.

Ordem dentro da plataforma, cada item destrava o próximo:

1. **Conta + autenticação** — o schema nasce com as entidades e atributos de [Modelo de dados](../requisitos/03-dados.md), incluindo o **log de evento de elo e reputação** (sem ele o rollback de disputa é inimplementável) e um gamertag por plataforma. E-mail + senha, verificação de e-mail, recuperação por link (30min), aceite versionado de ToS, pergunta de segurança no cadastro ([Onboarding](../produto/05-produto/01-onboarding.md)). O schema já nasce com **campo de plano na conta e tabela de evento de pagamento** ([Sustentabilidade](03-sustentabilidade.md)) — nada de cobrança implementado, só o espaço reservado, porque fazer isso como migração retroativa é o que custa caro. Interface já nasce em **português e espanhol** ([Escopo](../produto/05-produto/02-escopo.md)) — retrofit de i18n depois custa mais caro que nascer com ele.
2. **OCR de personagem** (cadastro/verificação) — é o mesmo motor de OCR que "Resultado de partida" vai reusar depois, vale construir pensando nos dois usos desde já ([Personagens e verificação](../produto/02-jogador/01-verificacao.md)). Fluxo de upload nasce **mobile-first** — a maioria dos envios vem do celular (foto da tela do console), não do desktop.
3. **Vínculo Discord (OAuth2)** — só depois de já ter conta + personagem funcionando, porque é o terceiro (e último) requisito do onboarding, e depende do bot já existir (etapa 1 acima).
4. **Motor de elo/reputação** — precisa existir antes da fila, porque o equilíbrio da fila depende dele. Nasce com seed pelo overall do personagem verificado (item 2).
5. **Fila e matchmaking** — distribuição por categoria, equilíbrio por elo ([Fila e matchmaking](../produto/03-partida/02-fila.md)). É a primeira peça que só faz sentido depois que personagem e elo existem.

> **Corrigido em 2026-09-14**: este arquivo listava fila (4) antes de elo (5), enquanto a própria justificativa dizia o contrário e o [PRD Mestre](https://github.com/ljborgess/ProLobby.com/issues/64) já tinha fixado elo como Fase 2.4 e fila como 2.5. Os títulos dos PRDs #53 e #55 estavam trocados do mesmo jeito e foram corrigidos.

## 3. Fechamento do lobby (a parte mais arriscada)

Só depois do núcleo funcionando: escolha de capitão, integração com o bot via webhook, canais dinâmicos ([Discord e lobby](../produto/03-partida/03-lobby.md), [Bot: permissões](../discord/03-bot.md)). Essa etapa é onde o resultado do teste prático (item 0) mais importa — se o mecanismo mudar, é aqui que muda o código.

## 4. Resultado, disputa, ranking

1. **Report de resultado + OCR de validação** (reusa o motor OCR do item 2.2) — ([Resultado de partida](../produto/03-partida/04-resultado.md)).
2. **Rollback, zero-report, escada de punição, avaliação por pares** ([Ranking, reputação e punição](../produto/02-jogador/02-ranking.md)).
3. **Perfil público + ranking** ([Perfil e visibilidade](../produto/02-jogador/03-perfil.md)) — depende de já ter dado real de partida rodando.

## 5. Governança (antes do primeiro usuário externo, não antes)

Não bloqueia desenvolvimento interno/teste com os 4, mas bloqueia abrir pra fora:

- Painel de moderação com **2FA obrigatório** e **log de auditoria de toda ação** ([Moderação](../produto/04-governanca/01-moderacao.md)) — maior alvo de risco se comprometido.
- Termos de Uso + Política de Privacidade publicados ([Termos de uso](../produto/04-governanca/03-termos.md)).
- Retenção automática de dados (LGPD, [02-lgpd.md](../produto/04-governanca/02-lgpd.md)).
- Entidade legal aberta **antes da pré-venda** (fim do beta menos 7 dias), não antes da abertura pública. **MEI não aceita a atividade** (confirmado por CNAE, 2026-09-08) — é ME no Simples, custo R$ 200-300/mês em vez de R$ 76, gatilho de assinatura em ~700 contas ativas (ver [Sustentabilidade](03-sustentabilidade.md)).
- **Tela de contagem no painel** com os 4 números do critério de saída do beta e as 3 métricas de sucesso, direto do banco, sem ferramenta de terceiro (ver [Lançamento](04-lancamento.md)).
- **Cobrança de lançamento**, que é dias de trabalho e não semanas, porque não tem gateway: chave PIX com confirmação manual, ação "ativar plano" no painel de moderação (mesmo log de auditoria), cargo Fundador/Apoiador via a esteira de bot já existente, e uma página de venda com o risco dito antes do pagamento. Redação revisada junto com os Termos ([Termos de uso](../produto/04-governanca/03-termos.md)) — o enquadramento de apoio depende dela.

## 6. Beta fechado, depois abertura

Produto pronto não vai direto pro público: roda **beta fechado gratuito** com ~24 convidados (metade rede pessoal, metade estranhos), até o critério de saída medido bater — 10 partidas completas, fila fechando sozinha em metade, OCR aceitando 80% de primeira, zero cancelamento por bug. Na última semana do beta roda a **pré-venda** do Fundador aos convidados, a preço cheio, pra ter taxa de conversão real antes de apostar a janela pública. Só então abre. Torneio não entra no lançamento. Detalhe em [Lançamento](04-lancamento.md).

**O recrutamento dos convidados roda em paralelo ao desenvolvimento**, não depois — é a única etapa que não depende de código, e a que mais costuma ser esquecida até virar bloqueio.

## Capacidade do time e tempo estimado (2026-09-14)

**Estimativa, não prazo.** O [beta continua sem data fixa](04-lancamento.md), por decisão. Esta seção serve pra planejar o que depende de calendário: recrutamento dos convidados, abertura da entidade legal e pré-venda. Não serve pra cobrar entrega.

### Quem coda, em que trilha

| Trilha | Quem | Ferramenta | O que carrega, em ordem |
|---|---|---|---|
| Caminho crítico | Luciano | Claude Code | conta (2.1) → vínculo Discord (2.3) → elo (2.4) → fila (2.5) → lobby (3) → disputa (4.2) → painel (5) |
| Bot e infra | Rafael | Cursor | webhook (2.1) → piloto de OCR (Fase 0) → **primeiro deploy interno** ([ADR-009](../adr/009-neon-cloudflare-vm.md), junto do começo da 2.2) → OCR de personagem (2.2) → handlers de canal do bot (3) → OCR de resultado (4.1) → notificações |
| Produto visível | Felipe | Claude Code | telas e scheduler (2.1) → telas de upload, fila e lobby → perfil e ranking (4.3) → LGPD operacional, Termos e página de venda (5) |

O recrutamento dos ~24 convidados do beta não depende de nenhuma trilha de código e roda em paralelo desde já.

### Premissas

- **Os três são part-time e trabalham com IA.** As faixas assumem algo em torno de 10 a 15 horas por semana de cada um.
- **Rafael e Felipe rendem menos nas primeiras 1–2 semanas**, aprendendo o fluxo e o dossiê. Já está dentro da faixa da 2.1.
- **Review custa tempo do caminho crítico.** Cada PR dos dois passa pelo Luciano; isso também já está nas faixas.
- **O ritmo medido até aqui não serve de base sozinho.** A Fase 1 e 11 issues da 2.1 fecharam em dois dias ativos, mas eram peças sem dependência externa (CI, schema, autenticação). Fila, lobby e disputa não são assim.
- **Os bloqueadores rodam no tempo certo:** piloto de OCR antes da 2.2, checklist no jogo antes da 3.
- **O primeiro deploy interno** ([ADR-009](../adr/009-neon-cloudflare-vm.md)) soma até 1 semana na trilha do Rafael. Ainda não está nas faixas abaixo; entra na primeira recalibração.

### Faixa por fase, com os três

| Fase | Semanas | Trilha | Depende de |
|---|---|---|---|
| 2.1 — o que falta | 1–2 | as três | — |
| 0 — piloto de OCR | 1 | Rafael | webhook da 2.1 |
| 0 — checklist no jogo | minutos, zero código | qualquer um dos 4 | precisa rodar antes da 3 |
| 2.2 — personagem e OCR | 2–3 | Rafael + Felipe (telas) | piloto de OCR |
| 2.3 — vínculo Discord | 1–2 | Luciano | 2.1 |
| 2.4 — elo e reputação | 1–2 | Luciano | 2.2 (seed por overall) e 2.3 |
| 2.5 — fila e matchmaking | 2–3 | Luciano + Felipe (telas) | 2.4 |
| 3 — fechamento do lobby | 2–4 | Luciano + Rafael (bot) | 2.5 e checklist no jogo |
| 4.1 — report de resultado | 2–3 | Luciano + Rafael (OCR) | 3 |
| 4.2 — rollback, disputa e punição | 2–3 | Luciano | 4.1 |
| 4.3 — perfil e ranking | 1–2 | Felipe | dado real da 4.1; corre junto da 4.2 |
| 5 — governança | 2–3 | Luciano (painel) + Felipe (LGPD, Termos, venda) | 4.2 |
| 6 — beta fechado | 3–6, sem teto | todos | 5 |

### Somando o caminho crítico

1. A 2.1 fecha em **1–2 semanas**.
2. A 2.4 só começa quando a 2.2 **e** a 2.3 fecharem. A mais lenta é a 2.2, que espera o piloto de OCR: **4–6 semanas** a partir de 2026-09-14.
3. Da 2.4 até o fim da governança (2.4 + 2.5 + 3 + 4.1 + 4.2 + 5): **11–18 semanas**.

| Marco | A partir de 2026-09-14 | Datas aproximadas |
|---|---|---|
| Fase 2.1 fechada | 1–2 semanas | 21 a 28 de setembro de 2026 |
| Beta pronto pra começar | 15–24 semanas | 28 de dezembro de 2026 a 1º de março de 2027 |
| Abertura pública | 18–30 semanas | 18 de janeiro a 12 de abril de 2027 |

**Dezembro e janeiro caem no meio do caminho.** Com festas de fim de ano num time part-time, o realista é mirar a metade de cima de cada faixa.

> **Estas datas não são prazo, meta nem compromisso** (registrado em 2026-09-15).
>
> Não existe data de beta nem de abertura definida. O projeto anda por **fluxo concluído**, não por calendário: uma fase começa quando a anterior fecha, e nenhuma é apressada pra caber numa data.
>
> O exercício acima serve pra uma coisa só — dar noção de **tamanho** ("isso é trabalho de meses, não de semanas"), o que ajuda a decidir quanta gente entra e o que roda em paralelo. Qualquer decisão que trate a faixa como promessa — comunicar data pra fora, dimensionar custo contra ela, cortar escopo pra alcançá-la — está usando o número pra uma coisa que ele não sustenta.

### Quanto os dois devs novos mudam a conta

Com o Luciano sozinho, as trilhas paralelas entram na fila do caminho crítico: piloto e OCR da 2.2, telas de todas as fases, handlers do bot, perfil e ranking, LGPD e Termos. Isso soma **7 a 12 semanas**, e o beta ficaria pronto em **22 a 36 semanas** (meados de fevereiro a fim de maio de 2027).

**Rafael e Felipe adiantam o beta em cerca de 2 a 3 meses**, desde que a fila de review do Luciano não vire o novo gargalo.

### O que estoura a faixa

- **Checklist no jogo com o teste 6 falhando**: cai o piso de 8 humanos, e a Fase 3 é redesenhada. A estimativa da 3 em diante deixa de valer.
- **Piloto de OCR abaixo do aceitável**: a 2.2 ganha verificação manual ou troca de motor.
- **Review virando gargalo**: PRs das duas trilhas paralelas esperando aprovação param quem está fora do caminho crítico.
- **Beta sem bater o critério de saída**: continua, sem teto, por decisão.

### Recalibrar a cada fase fechada

Ao fechar uma fase, compare as semanas reais com a faixa da tabela. Se passou da ponta de cima em mais de 50%, refaça a estimativa inteira e atualize este arquivo e o [PRD Mestre](https://github.com/ljborgess/ProLobby.com/issues/64).

```bash
gh issue list --state closed --milestone "<nome da milestone>" --json number,closedAt
```

## Resumo — o que fazer agora (2026-09-14)

1. **Fechar a Fase 2.1** pelo grafo do [CONTRIBUTING](../../CONTRIBUTING.md): Luciano #90 → #91 → #104; Rafael #81 → #93 → #94/#95; Felipe #106 → #87 → #101.
2. **Piloto de OCR** ([#50](https://github.com/ljborgess/ProLobby.com/issues/50)) emendado pelo Rafael no fim do webhook, antes da Fase 2.2.
3. **Checklist no jogo** ([#63](https://github.com/ljborgess/ProLobby.com/issues/63)) rodado antes de a Fase 3 começar. São minutos, e qualquer um dos 4 pode fazer.
4. **Recrutamento dos convidados do beta** começando agora, em paralelo.
