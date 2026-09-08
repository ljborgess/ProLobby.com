# 10. Backlog e fases futuras

Itens explicitamente adiados — mencionados ou identificados, mas sem desenho de fluxo ainda.

## Bloqueador crítico — verificar antes de avançar o fluxo de lobby

- **Mecanismo real de reunir 22 estranhos numa partida 11v11 de Pro Clubs** — ver [Mecânica real do EA FC Pro Clubs](../03-partida/01-mecanica.md). Mecanismo já **decidido** (Amistoso Online entre o clube pessoal de um capitão escolhido por reputação em cada lado, não clube-casa administrado pela plataforma) e já propagado em [Discord e lobby](../03-partida/03-lobby.md) e [Fila e matchmaking](../03-partida/02-fila.md). Falta só **testar na prática** (convite por EA ID, tempo de ciclo, comportamento de IA em Amistoso) — checklist completo no arquivo de mecânica.

## Futuro

- **Moderador comunitário** — ver [Moderação](../04-governanca/01-moderacao.md).
- **Torneio/liga com taxa de inscrição e premiação** — caminho de receita real (competição por habilidade, tratamento jurídico distinto de aposta), exige CNPJ e orientação contábil. Ver [Sustentabilidade](../../negocio/03-sustentabilidade.md).

## Saiu do backlog — já decidido

- **Monetização** — deixou de ser ideia solta: [Sustentabilidade](../../negocio/03-sustentabilidade.md) desenha **Fundador** (R$ 49, pagamento único, janela de 30 dias ou 50 pessoas, no lançamento) e **Apoiador** (R$ 9,90/mês, disponível desde o lançamento, converte de verdade só no gatilho de ~700 contas ativas — ME no Simples, MEI descartado); torneio com inscrição rebaixado a estimativa de viabilidade, sem desenho completo ainda. MVP segue **100% gratuito**, sem paywall. A **linha vermelha** que saiu disso é decisão fixa e não revisável do produto: *nada que altere fila, elo, escolha de capitão ou resultado é vendável* — o que inclui **prioridade de fila paga**, descartada por colidir com a escada de punição ([Ranking, reputação e punição](../02-jogador/02-ranking.md)), que já usa prioridade de fila como moeda de bom comportamento.
- **Stack técnica** — decidida em 2026-09-08, antes dos bloqueadores por decisão do time (checklist sem previsão de acontecer no curto prazo). Ver [ADR-005](../../adr/005-stack-tecnica.md) e [ADR-006](../../adr/006-backend-separado-e-tooling.md), que o corrige: Next.js só frontend + NestJS separado, MikroORM, JWT, Postgres self-hosted, Oracle Cloud (São Paulo/Vinhedo). Risco aceito: RF-051/052/055 podem exigir retrabalho quando o checklist rodar.
- **Aposta em dinheiro por jogador/lobby** — **descartado, não adiado.** A Lei 14.790/2023 exige autorização federal com outorga de R$ 30 milhões pra operar aposta de quota fixa; não existe versão pequena nem caminho informal, e operar sem autorização tem exposição criminal pessoal. Substituído pelo item de torneio com inscrição acima.

## Fase 2

- **Fila por time pré-formado** — ver [Fila e matchmaking](../03-partida/02-fila.md).

## Revisar quando a demanda crescer

- **Bloqueio de conta durante disputa/moderação pendente** — mantido no MVP (baixa demanda, só 4 moderadores). Revisar se virar gargalo real com volume maior de casos (ver [Resultado de partida](../03-partida/04-resultado.md)).

## Lacunas abertas — o que falta decidir ou verificar

Estado da varredura mais recente (2026-09-08): **região do free tier** (Oracle Cloud, São Paulo/Vinhedo) e **MEI** (não aceita a atividade, confirmado por CNAE) saíram da lista — ver [Sustentabilidade](../../negocio/03-sustentabilidade.md). O que resta, com o que cada item bloqueia:

| Aberto | Bloqueia | Natureza |
|---|---|---|
| **Teste no jogo** ([checklist](../03-partida/05-checklist.md)) | escrever código | execução, bloqueador nº 1 |
| **Piloto de OCR** ([06-piloto-ocr.md](../../requisitos/06-piloto-ocr.md)) | a plataforma, e a escolha de OCR | bloqueador nº 2 — único risco grande que exige código pra medir |
| **Titular das contas e rateio entre os 4** ([tese de mercado](../../negocio/01-mercado.md)) | primeiro gasto recorrente | acordo entre sócios |
| **Consulta jurídica** — redação Fundador/CDC, LGPD 16-17, entidade legal | receber dinheiro | três assuntos, uma consulta |
| **Desenho de torneio/liga** — formato, no-show, arbitragem, premiação | receita de torneio (adiada) | grelha própria, depois do núcleo |
| **Preço do Fundador com pacote reduzido** ([Sustentabilidade](../../negocio/03-sustentabilidade.md)) | nada — a pré-venda mede | revisar se R$ 49 sustenta |

Riscos aceitos conscientemente, não lacunas: [conluio de resultado](../02-jogador/02-ranking.md), dependência estrutural da mecânica da EA e ausência de reembolso ([tese de mercado](../../negocio/01-mercado.md)).

## Decidido: sem divisão formal

- **Divisão de papéis** entre Luciano, Rafael, João e Felipe — discutido e decidido continuar **sem papel fixo por disciplina**: os 4 trabalham em conjunto, qualquer um mexe em qualquer parte. Não é pendência, é decisão tomada. Revisitar só se o time sentir necessidade (ex.: atrito de responsabilidade, gargalo de decisão).

