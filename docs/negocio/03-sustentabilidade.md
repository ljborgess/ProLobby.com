# Sustentabilidade — como a plataforma se paga

Uso interno dos 4. Responde uma pergunta específica: **quem paga a conta de manter a plataforma em pé, e a partir de quando ela se paga sozinha.** Complementa o custo operacional levantado na [tese de mercado](01-mercado.md) e substitui o item genérico de "monetização" que vivia no [backlog](../produto/05-produto/03-backlog.md).

**Objetivo definido pelo time**: zero desembolso pessoal desde o dia 1.

## O custo real é menor do que parecia

O dossiê tratava o custo como não estimado, e o OCR como "o item mais imprevisível". Estimado:

| Item | Custo mensal no MVP | Observação |
|---|---|---|
| Hospedagem (app + bot + banco no mesmo host) | R$ 30–80 | ou **R$ 0** em free tier — ver abaixo |
| Storage de prints (90 dias de retenção) | R$ 0–5 | volume irrelevante nessa escala |
| OCR | **R$ 0** | Google Vision dá 1000 unidades/mês grátis |
| Domínio `.com.br` | R$ 4 | R$ 40/ano, o único custo inescapável |
| **Total** | **R$ 50–90** | |

**Por que o OCR é R$ 0**: na meta de 10 partidas/semana ([métricas de sucesso](01-mercado.md)), o volume é de ~80 a 100 prints/mês contando cadastro e resultado — cabe folgado no free tier. O dilema "OCR pago por chamada vs. Tesseract local" só passa a ter consequência financeira por volta de **250 partidas/semana**. Até lá é decisão técnica, não de custo.

## Dia 1: zerar por engenharia, não por receita

**Cobrança não resolve o dia 1, e a matemática é direta**: o DAS do MEI em serviços está em torno de **R$ 76/mês** — mais que a plataforma inteira custa. Formalizar pra poder cobrar dobra o custo que se quer eliminar. Só fecha a conta quando a receita cobre a plataforma **e** o custo de existir formalmente.

Então o dia 1 vem de custo, não de renda:

- **Stack em free tier**: VM permanentemente gratuita (Oracle Cloud Free Tier dá 4 OCPU / 24 GB ARM, folgado pra app + bot + Postgres juntos), CDN/proxy grátis, OCR no free tier. Sobra o domínio, ~R$ 3/mês — ou zero, usando subdomínio gratuito no começo.
- **Consequência pra decisão de stack** (deliberadamente adiada, ver [backlog](../produto/05-produto/03-backlog.md)): o teto de custo mensal a combinar entre os 4 é, na prática, **R$ 0 no MVP** — o que favorece stack que roda inteira num host só, sem serviço gerenciado pago.
- **Apoio voluntário** (PIX, cargo de Apoiador no Discord) entra quando houver comunidade de verdade, não no lançamento — pedir dinheiro antes de entregar partida boa queima credibilidade. Cobre o domínio com folga.

## A linha vermelha — regra fixa, sem exceção

**Nada que altere fila, elo, escolha de capitão ou resultado de partida é vendável.** Nunca, em nenhum plano, a nenhum preço.

Motivo: o único ativo do produto é a percepção de que a partida é justa. Verificação por print, equilíbrio por elo e reputação com consequência real só valem algo se ninguém puder comprar vantagem. Vendido o primeiro milímetro de prioridade competitiva, o resto do dossiê perde sentido.

Dois casos concretos que essa regra mata de saída:

- **Prioridade de fila paga** — colide de frente com a [escada de punição](../produto/02-jogador/02-ranking.md), que já usa prioridade de fila como moeda de bom comportamento (reputação abaixo de 55 perde prioridade). Não dá pra vender a mesma coisa em duas moedas que se contradizem: um assinante de reputação 50 passando na frente de quem se comportou bem destrói a escada inteira. Além disso é inútil na escala atual — numa fila de 8 pessoas, todo mundo entra; prioridade só tem valor com fila lotada.
- **Prioridade de ser capitão** — seria vender poder de admin dentro do jogo (convidar, remover, ajustar tática). O critério continua sendo reputação entre quem tem clube com vaga ([Discord e lobby](../produto/03-partida/03-lobby.md)).

Registrado como **decisão fixa, não revisável por volume** — justamente pra encerrar a discussão de "só um pouquinho de prioridade" quando a receita apertar.

## O plano

Um plano só. Base pequena não sustenta escada de três níveis.

**ProLobby Apoiador — R$ 9,90/mês**

| O que entra | Por que é seguro |
|---|---|
| Badge no perfil, cor e cargo no Discord, destaque no ranking | status puro, não toca em nada competitivo |
| Estatística estendida — evolução no tempo, comparação por categoria | o OCR **já captura** gols/assistências/nota e o histórico já guarda ([Perfil](../produto/02-jogador/03-perfil.md)); custo marginal zero |
| Inscrição antecipada em torneio e liga | escassez de um evento separado, não da fila principal |
| Criar liga ou torneio privado na plataforma | vantagem organizacional, não competitiva — conecta com a fila por time pré-formado da Fase 2 ([Fila](../produto/03-partida/02-fila.md)) |

**"Zero vantagem dentro da partida" fica escrito na própria página de venda** — é o que faz quem não paga continuar jogando, e quem não joga não existe pra fechar lobby de ninguém.

### Por que assinatura não entra no MVP

Num produto de matchmaking, **usuário não é só cliente, é estoque**: cada pessoa barrada num paywall é uma pessoa que falta no lobby de outra. Com liquidez sendo o risco nº 1 ([cold start](01-mercado.md)), cobrar entrada é imposto sobre a única coisa insubstituível. E assinatura é promessa de valor contínuo — fila que não fecha gera cancelamento e boca-a-boca negativo, exatamente o que o dossiê já identificou como fatal.

Plano de teste/trial não se aplica: trial pressupõe que o estado pago é o normal. Entrar na fila é sempre grátis, então não há o que testar.

### Gatilho de ativação

R$ 9,90/mês precisa cobrir MEI (~R$ 76) + hospedagem, uns R$ 126/mês — **13 assinantes**. Com conversão típica de 2–5% em plano de status, isso pede **300 a 650 contas ativas**, ~10x a meta de MVP.

**Ativa quando**: 300+ contas ativas, **ou** o custo mensal estourar o free tier — o que vier primeiro.

## Por onde começar (horas, não semanas — e nada de cobrança)

1. **A linha vermelha registrada** — este arquivo. É a decisão difícil de reverter depois.
2. **Schema nasce preparado**: campo de plano na conta e tabela de evento de pagamento, junto do aceite versionado de Termos que já está desenhado ([Onboarding](../produto/05-produto/01-onboarding.md)). Fazer isso como migração retroativa é o que custa caro.
3. **Cargo Apoiador** já entra na estrutura de cargos ([Cargos e verificação](../discord/01-cargos.md)), mesmo sem ninguém pra receber.
4. **Gateway, MEI e obrigação fiscal só no gatilho.** Antes disso, é semana de trabalho pra atender talvez 2 assinantes.

## Aposta em dinheiro — fora de alcance, não é questão de escala

O [backlog](../produto/05-produto/03-backlog.md) trazia "aposta em dinheiro por jogador/lobby" como ideia futura. **Não é viável, e o obstáculo não é tamanho:**

- A **Lei 14.790/2023** regulamentou apostas de quota fixa no Brasil, esports incluído. Operar exige autorização federal com **outorga de R$ 30 milhões** por cinco anos.
- Não existe versão pequena: não há enquadramento em MEI, nem caminho de "começa informal e formaliza depois". Operar sem autorização é atividade ilegal com **exposição criminal pessoal**, não só multa de empresa.

**Substituto legal e usual no esports brasileiro**: **torneio com taxa de inscrição e premiação** — competição por habilidade, tratamento jurídico distinto de aposta de quota fixa. É caminho real de receita e encaixa direto no que a assinatura já vende (criar e organizar liga privada). Ainda assim exige CNPJ e orientação contábil antes do primeiro real recebido.

> Nada aqui substitui assessoria jurídica. Vale junto com a pendência de entidade legal e a de [LGPD para 16-17 anos](../produto/04-governanca/03-termos.md).
