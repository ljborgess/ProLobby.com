# ADR-005 · Stack técnica: Next.js/TypeScript, Postgres self-hosted, Oracle Free Tier

**Status**: aceita
**Data**: 2026-09-08

## Contexto

Stack técnica estava deliberadamente adiada até os [dois bloqueadores](../../HANDOFF.md#os-dois-bloqueadores--leia-isto-antes-de-qualquer-coisa) (checklist no jogo + piloto de OCR) rodarem — decisão registrada em `produto/05-produto/03-backlog.md` e repetida em 5+ documentos. Nesta rodada, o time decidiu seguir com a definição de stack mesmo sem os bloqueadores terem rodado, porque o checklist não tem previsão de acontecer no curto prazo e travar toda decisão técnica por tempo indefinido tem custo maior que o risco identificado.

**Risco aceito conscientemente**: RF-051, RF-052 e RF-055 (canais do lobby, prazos de deleção, gatilho do cargo Verificado) dependem do resultado dos testes 5, 6 e 7 do [checklist](../produto/03-partida/05-checklist.md) e do critério de aprovação do [piloto de OCR](../requisitos/06-piloto-ocr.md) — são requisitos de **produto** (tamanho de lobby, premissa de verificação), não de tecnologia. A stack abaixo (linguagem, framework, banco) não muda dependendo do resultado desses testes; o que pode precisar de retrabalho é a implementação desses 3 RFs específicos, não a escolha de tecnologia.

## Decisão

| Camada | Escolha |
|---|---|
| Núcleo da plataforma (web) | **Next.js + TypeScript** — frontend e API routes no mesmo framework, roda inteiro numa VM só |
| Bot do Discord | **Node.js + TypeScript + discord.js** — mesma linguagem do núcleo, processo próprio (mantém conexão persistente com o gateway do Discord, não roda em serverless/edge) |
| Banco de dados | **Postgres, self-hosted na mesma VM** — sem serviço gerenciado pago, sem RLS; autorização decidida no código da aplicação (Next.js), não em política de linha do banco |
| ORM | **Prisma** — migration automática, tipagem gerada do schema, queries parametrizadas por padrão |
| Autenticação | **Auth.js (NextAuth)** — e-mail+senha e OAuth2 Discord no mesmo lugar, cobre sessão/cookie/hash de senha |
| OCR (piloto) | **Tesseract local** — script do piloto testa primeiro com motor gratuito; compara com Google Vision (free tier) nos mesmos 50 prints só se a taxa vier baixa |
| Hospedagem | **Oracle Cloud Free Tier, região São Paulo ou Vinhedo** — dado nunca sai do Brasil (ver [Sustentabilidade](../negocio/03-sustentabilidade.md)) |
| Estrutura de repositório | **Monorepo, pnpm workspaces** — `apps/web`, `apps/bot`, `packages/shared` (tipos do contrato de evento webhook) |

## Alternativas descartadas

**Supabase (Postgres gerenciado + Auth + RLS)**. Daria Auth pronto e RLS nativo — o [checklist de segurança](../requisitos/08-seguranca-checklist.md) foi desenhado originalmente pensando nisso. Descartado porque depende de um segundo provedor de free tier além da Oracle, e RLS decide autorização em duas camadas (banco + aplicação), superfície maior de erro pra um time de 4 part-time sem experiência prévia em RLS. Autorização centralizada só no código do Next.js é mais simples de raciocinar.

**Drizzle no lugar de Prisma**. Mais leve e mais perto de SQL puro. Descartado por ser padrão de mercado menos consolidado com Next.js — Prisma tem mais documentação e resolve o mesmo problema (queries parametrizadas, tipagem) com curva de aprendizado menor.

**Auth escrita do zero (bcrypt + sessão manual)**. Controle total, zero dependência externa. Descartado por reimplementar hash de senha, cookie seguro e fluxo OAuth2 do zero — mais chance de errar item de segurança (9 e 10 do [checklist](../requisitos/08-seguranca-checklist.md)) sem necessidade real.

**Google Vision direto no piloto, sem testar Tesseract primeiro**. Pularia a comparação e amarraria a decisão final a uma API paga antes de saber se o motor gratuito já resolve. Descartado — o próprio piloto existe pra medir isso.

## Consequências

- **Checklist de segurança precisa de ajuste**: itens 3 (public key do banco) e 4 (RLS) eram específicos de Supabase/RLS — com Postgres self-hosted sem RLS, autorização (item 7, restringir acessos) e auth server-side (item 6) carregam esse peso sozinhos. Atualizar `docs/requisitos/08-seguranca-checklist.md`.
- **`docs/discord/05-arquitetura-bot.md` e `HANDOFF-bot.md`** deixam de ser hipótese bloqueada e viram implementação decidida, com a ressalva de que RF-051/052/055 podem exigir retrabalho quando o checklist rodar.
- **Todo documento que dizia "stack adiada de propósito"** precisa apontar pra este ADR em vez de tratar como pendência — propagação mecânica em `HANDOFF.md`, `produto/05-produto/03-backlog.md`, `produto/01-visao/01-visao.md`, `negocio/02-implementacao.md`, `docs/discord/03-bot.md`, `docs/adr/README.md`.
- **Custo continua R$0** no MVP — Next.js + Postgres + bot cabem na mesma VM Oracle Free Tier (2 OCPU/12GB), sem serviço gerenciado pago. Estimativa de capacidade (2026-09-08, ver [RNF-004](../requisitos/07-nao-funcionais.md#rnf-004--10-lobbies-simultâneos)): os 3 processos somam ~1.2-2.5GB de RAM em carga leve, folga de 4-6x sobre os 12GB disponíveis; CPU (2 OCPU) é o recurso mais apertado mas ainda folgado na escala-alvo. Baseado em benchmarks públicos, não medição real — confirmar com monitoramento assim que estiver no ar.
