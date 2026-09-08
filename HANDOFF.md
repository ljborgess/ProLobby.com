# Handoff — ProLobby

Pra quem (Claude Code, outra sessão/máquina) for continuar este projeto a partir daqui.

## O que é

Ver [`README.md`](README.md). Origem: ideia nasceu numa sessão sobre o projeto `escalacao-brasileirao` (Django, escalação de Brasileirão via API), mas ProLobby é **projeto novo e independente** — só a identidade visual (design system) foi herdada de lá, nada de backend/dados.

## Estado atual (2026-09-04)

- **Fase**: design de produto **e requisitos**, ambos fechados. Zero código de aplicação.
- **Branches**: só `main` e `dev`. Trabalho corre em `dev`; `main` só recebe merge quando o time decidir promover.
- Todo o conteúdo abaixo está commitado em `dev`.

## Os dois bloqueadores — leia isto antes de qualquer coisa

**Nenhum dos dois é escrever plataforma.** Foram identificados ranqueando os cinco riscos do projeto por probabilidade e dano, e o achado foi que **quatro dos cinco não se resolvem com engenharia**:

1. **[Checklist no jogo](docs/produto/03-partida/05-checklist.md)** — 8 testes, custa minutos e nenhum dinheiro. Valida o mecanismo de capitão/clube em que todo o fluxo de partida se apoia. O teste 6 é o mais crítico do projeto: se o Amistoso Online **não** aceitar a IA cobrindo vaga, o piso de 8 humanos cai e a solução de cold start inteira vai com ele.
2. **[Piloto de OCR](docs/requisitos/06-piloto-ocr.md)** — um script sobre 50 prints reais **de estranhos**, sem conta, sem banco, sem tela. É o único risco grande que exige código pra ser medido, e decide de quebra a escolha entre OCR pago e local.

Os dois rodam em paralelo. **Stack técnica só depois** — o retorno deles muda três parâmetros marcados como "a calibrar" (os 5 min de confirmação de convite, os 60 min de silêncio total, e se o modelo de 5 personagens sobrevive ao que o jogo oferece).

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
│   ├── 05-funcionais       RF-001 a RF-071
│   ├── 06-piloto-ocr       bloqueador nº 2
│   ├── 07-nao-funcionais   RNF-001 a RNF-020
│   └── 08-seguranca-checklist   18 itens, aplicar desde a 1ª linha de código de backend
├── adr/          decisão técnica difícil de reverter (001 a 004; stack entra aqui)
├── discord/      01-cargos · 02-canais · 03-bot · 04-integracao
└── negocio/      01-mercado · 02-implementacao · 03-sustentabilidade · 04-lancamento
```

**A divisão produto x requisitos é intencional**: quem implementa segue `requisitos/` e consulta `produto/` quando quer entender a razão de algo. Todo RF aponta pra onde foi decidido — requisito sem origem é requisito que alguém inventou.

Numeração de arquivo indica **ordem de leitura** dentro da pasta.

## Decisões que mais moldam o produto

Se você só puder ler cinco coisas, leia estas:

1. **Não existe sala privada em Pro Clubs.** O jogo só tem liga, Drop-In e Amistoso Online entre clubes. O mecanismo decidido é **Amistoso entre o clube pessoal de um capitão** — um dos jogadores humanos de cada lado, escolhido por reputação entre quem declarou clube com vaga. Não é conta de serviço da plataforma. Ver `produto/03-partida/01-mecanica.md`.
2. **A IA do próprio jogo cobre vaga vazia.** É o achado de maior impacto: sem ele, uma partida exigiria 22 pessoas simultâneas; com ele, a meta cai pra **8** (piso de 4 por lado, simetria obrigatória **por categoria**). É o que torna o cold start viável — e é o que o teste 6 valida.
3. **A linha vermelha da monetização**: nada que altere fila, elo, escolha de capitão ou resultado é vendável. Decisão fixa, não revisável por volume. Ver `negocio/03-sustentabilidade.md`.
4. **Reputação é recuperável e recusa não a afeta.** Partida limpa devolve +1 até o teto de 70; acima disso só por joinha. Recusar partida gera **timeout progressivo de fila** (5/15/30 min, 2 h), não perda de reputação.
5. **O rollback exige log de evento.** Elo e reputação guardam cada alteração com motivo, partida e data. Sem isso, o rollback de disputa é inimplementável e os contadores de janela móvel não são contáveis. Ver `requisitos/03-dados.md`.

## Ferramentas do repo

- **`scripts/check-docs-links.sh`** — valida links cruzados e cobertura de índice de `docs/`. Roda automaticamente por um hook `PreToolUse` (`.claude/settings.json`) antes de qualquer `git commit`, e **bloqueia o commit** se achar link quebrado ou arquivo órfão fora do índice.
- **`.claude/settings.json`** — registra o marketplace de plugins B2ML, habilita o plugin `grill-me`, e configura o hook acima. Abrindo este repo no Claude Code, isso carrega sozinho.

## Como continuar

1. **Rodar os dois bloqueadores acima.** Nada mais tem prioridade sobre isso.
2. Anotar os resultados **no próprio checklist** e atualizar `produto/03-partida/01-mecanica.md`, trocando as premissas presumidas pelo que foi confirmado.
3. Só então: decidir stack e começar pela ordem de `negocio/02-implementacao.md`.
4. Se for seguir levantando requisito: use a skill `grill-me`. As lacunas abertas estão tabeladas em `produto/05-produto/03-backlog.md` — não regrilar item já marcado como adiado de propósito sem motivo novo.
5. Front-end: design system em `produto/01-visao/01-visao.md`.

## Pendências abertas, com dono claro

Tabela completa em `produto/05-produto/03-backlog.md`. Nenhuma é de requisito:

| Aberto | Natureza |
|---|---|
| Os dois bloqueadores acima | execução |
| Stack técnica | adiada de propósito, depende dos bloqueadores. Rascunho de hipótese pro bot (não decidido) em [docs/discord/05-arquitetura-bot.md](docs/discord/05-arquitetura-bot.md) |
| MEI aceita a atividade de software? | pergunta pra contador — muda o gatilho de preço |
| Titular das contas e rateio entre os 4 | acordo entre sócios, antes do 1º gasto recorrente |
| Consulta jurídica | três assuntos numa consulta: redação de apoio/CDC, LGPD 16-17, entidade legal |
| Desenho de torneio/liga | adiado por decisão: validar o núcleo primeiro |

## Riscos aceitos conscientemente — não são lacunas

- **Conluio de resultado**: dois lados combinando placar não gera disputa, porque os prints batem. Risco aceito, com gatilho de revisão definido (tratar ao primeiro sinal de grupo fechado, sem esperar volume).
- **Smurf com investimento**: conta EA nova + Discord novo + console novo passa. O vínculo pega recriação preguiçosa, não quem investe.
- **Dependência da mecânica da EA**: sem API nem contrato, qualquer patch pode mudar a base do produto. Mitigação é disciplina operacional, não engenharia.
- **Sem reembolso** no apoio de Fundador, se houver cobrança.
- **Região de hospedagem**: Oracle Cloud Free Tier, São Paulo ou Vinhedo — dado nunca sai do Brasil, sem precisar de cláusula padrão/adequação ANPD pra LGPD. Capacidade Always Free ARM foi cortada de 4 OCPU/24GB pra 2 OCPU/12GB em junho/2026, revisar de novo quando a stack for decidida (ver [Sustentabilidade](docs/negocio/03-sustentabilidade.md)).
- **[RF-033](docs/requisitos/05-funcionais.md#rf-033--clube-em-uso-não-é-candidato-em-outro-lobby)**: trava a conta inteira quando 1 dos até 3 clubes simultâneos (FC26) está em uso, mesmo os outros 2 livres. Mudar exigiria cadastro/OCR de 3 clubes por conta — escopo grande demais pro ganho.
- **Rotação de token do bot**: sem agenda periódica, só sob suspeita de vazamento (ver [RNF-013](docs/requisitos/07-nao-funcionais.md#rnf-013--token-do-bot-só-em-variável-de-ambiente)) — custo operacional desproporcional pra 4 sócios part-time.

## Decidido: sem divisão de papéis

Os 4 (Luciano, Rafael, João, Felipe) trabalham em conjunto, sem papel fixo por disciplina. Não é pendência, é decisão tomada.
