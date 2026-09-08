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

> ### Verificação pendente que muda esta conta — a de maior alavancagem hoje
>
> **MEI provavelmente não aceita a atividade.** A lista de ocupações permitidas ao MEI exclui desenvolvimento e licenciamento de software, e uma plataforma de matchmaking com assinatura tende a cair aí — não em prestação de serviço genérica.
>
> Se confirmar, a formalização não custa R$ 76/mês: vira **ME no Simples Nacional, com contador, algo entre R$ 200 e R$ 300/mês**. O efeito em cascata:
>
> | | MEI (R$ 76) | ME (R$ 250) |
> |---|---|---|
> | Assinantes pra fechar a conta | 13 | ~30 |
> | Contas ativas necessárias (2–5% de conversão) | ~300 | ~700 |
> | Fôlego que R$ 980 de Fundador compram | mais de 1 ano | ~4 meses |
>
> **Não é afirmação, é pergunta pra contador** — e é a verificação de maior alavancagem que existe agora, porque decide se o modelo de receita fecha como desenhado. Custa uma conversa e vem antes de qualquer decisão de preço.

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

## Receita no lançamento — cobrança única, não assinatura

Decisão do time: gerar receita já no lançamento. O modelo muda, porque **assinatura é o pior formato pra lançamento e cobrança única é o melhor** — assinatura promete valor contínuo, e com fila magra o assinante cancela em semanas; cobrança única não tem churn, a escassez é verdadeira, e o dinheiro entra quando mais falta.

### 1 · Fundador — R$ 49, pagamento único

Janela limitada: **primeiros 30 dias ou primeiras 50 pessoas**, o que vier primeiro. Depois nunca mais — é o que faz a escassez ser real em vez de encenada.

Recebe cargo Fundador permanente no Discord, badge no perfil, e os benefícios de Apoiador **sem mensalidade**. Tudo do lado de fora da [linha vermelha](#a-linha-vermelha--regra-fixa-sem-exceção).

**O pacote de lançamento é mais fino do que a primeira versão deste arquivo, de propósito** — só entra o que existe de fato no MVP:

| Benefício | Entra no lançamento? |
|---|---|
| Cargo Fundador + badge no perfil + destaque no ranking | **sim** |
| Estatística estendida (evolução no tempo, comparação por categoria) | **sim** — sobre dado que o OCR já captura |
| Inscrição antecipada em torneio | **não** — torneio saiu do lançamento (ver abaixo) |
| Criar liga ou torneio privado | **não** — depende da fila por time pré-formado, que é Fase 2 ([Fila](../produto/03-partida/02-fila.md)) |

Motivo de cortar os dois: vender benefício que não existe é o jeito mais rápido de perder a confiança de quem pagou — e são exatamente as 20 pessoas que mais acreditaram. Entram como benefício **novo** pra quem já apoiava, quando a Fase 2 chegar.

**Consequência a checar**: com o pacote reduzido a cargo mais estatística, R$ 49 pode parecer caro. Fundador vende apoio, escassez e identidade — não um pacote de features — e por isso a recomendação é manter o preço. Mas se o time achar fino, R$ 39 é o ajuste, não adicionar feature que não existe.

**20 pessoas × R$ 49 = R$ 980.**

**Correção de uma conta que este arquivo fazia errado**: a versão anterior dizia "mais de um ano de fôlego", comparando os R$ 980 com o custo de ~R$ 3/mês do free tier. Isso é impossível, porque **o próprio ato de vender Fundador cria o custo que invalida a comparação** — receber dinheiro exige entidade legal aberta, e aí o custo mensal deixa de ser R$ 3.

O fôlego real depende do enquadramento, que é a [verificação pendente com o contador](#dia-1-zerar-por-engenharia-não-por-receita):

| Enquadramento | Custo mensal | Fôlego de R$ 980 |
|---|---|---|
| MEI (se aceitar a atividade) | ~R$ 79 | ~12 meses |
| ME no Simples, com contador | R$ 200–300 | ~4 meses |

Ou seja: entre 4 e 12 meses, não "mais de um ano". E os R$ 3/mês de free tier só valem no cenário **sem cobrança nenhuma** — que é uma escolha legítima, mas não é este.

### 2 · Torneio mensal com inscrição — adiado, não descartado

**Decisão do time: fora do lançamento.** Primeiro validar o núcleo — fila, lobby, Amistoso Online, resultado — antes de empilhar uma camada de liga/torneio em cima. O torneio não tem nenhum desenho hoje (formato de chave, no-show de time, arbitragem, como o prêmio é pago), e desenhar isso antes de existir um único usuário é escopo grande no caminho crítico.

Entra quando o núcleo estiver rodando de fato, e aí vale a grelha completa. O que segue registrado, porque é o motivo de o torneio valer a pena depois:

**É o único modelo de receita que melhora o cold start em vez de piorar.** Torneio tem data marcada, e data marcada concentra gente numa janela — exatamente a "largada coordenada" que a [tese de mercado](01-mercado.md) já prescreve como organização social. Cobra e gera liquidez no mesmo movimento, ao contrário de assinatura, que taxa a liquidez.

**Estimativa de viabilidade, não decisão** (rebaixado em 2026-09-08 — o torneio não tem desenho completo, ver acima): 4 times × 8 humanos = 32 inscritos × R$ 10 = **R$ 320**. Premiação 70% (R$ 224), plataforma retém 30% (R$ 96). Se a conta fechar assim, cobre MEI e hospedagem sozinho — mas R$ 10 e o split 70/30 travam só quando o resto do desenho (chave, no-show, arbitragem) estiver pronto.

Competição por habilidade com inscrição e premiação — regime jurídico distinto de aposta de quota fixa (ver seção final), mas exige CNPJ e orientação contábil.

### 3 · Apoiador mensal de R$ 9,90 — disponível, não empurrado

Existe desde o lançamento, sem paywall e sem insistência. Converte de verdade no gatilho de ~300 contas ativas; antes disso é troco.

### Como cobrar: PIX manual, sem gateway

**Não integrar gateway de pagamento.** Pra 25 pagamentos, Mercado Pago ou Stripe custa semanas de integração, taxa por transação e webhook pra manter no ar. PIX com confirmação manual entrega o mesmo resultado com zero código de pagamento.

1. **Chave PIX + comprovante.** Pessoa paga, envia comprovante, um dos 4 confirma.
2. **Painel de moderação ganha a ação "ativar plano"** — reusa o painel já desenhado com 2FA e log de auditoria ([Moderação](../produto/04-governanca/01-moderacao.md)), então rastreabilidade de dinheiro sai de graça, no mesmo log das outras ações sensíveis.
3. **Schema**: campo de plano na conta + tabela de evento de pagamento (já previsto na [ordem de implementação](02-implementacao.md)).
4. **Bot concede o cargo** no evento de plano ativado — a esteira plataforma → webhook → bot já existe inteira ([Bot](../discord/03-bot.md)), é só mais uma linha na tabela de responsabilidades.
5. **Uma página** com o que é, o PIX, o que a pessoa recebe, e "zero vantagem dentro da partida" em destaque.
6. **MEI aberto antes do primeiro real recebido** — a receita de Fundador paga com folga, e sem ele é receita recebida como PF sem nota.

Gateway de verdade entra junto com o gatilho de volume, não antes.

### Sem reembolso — enquadrado como apoio, e a redação é que sustenta isso

**Decisão do time**: não há reembolso se o projeto parar pelo [critério de desistir](01-mercado.md) dos 90 dias. Fundador é vendido como **apoio ao projeto**, não como compra de serviço com continuidade garantida, e o risco fica dito na própria página de venda.

Risco assumido consciente: se o projeto parar, 20 pessoas pagaram por um cargo numa plataforma morta — e são justamente as que mais acreditaram. O desgaste cai numa comunidade BR de Pro Clubs pequena, onde reputação circula rápido.

**O que faz esse enquadramento sobreviver é a redação, não a intenção.** Três exigências:

- **Nunca usar a palavra "vitalício"** — implica serviço perpétuo, o que é promessa de continuidade e destrói o enquadramento de apoio. A formulação correta é **"acesso de Fundador enquanto a plataforma existir"**.
- **Risco explícito antes do pagamento**, na mesma tela e não em link de rodapé: projeto em fase inicial, sem garantia de continuidade, sem reembolso.
- **Nada de linguagem de benefício futuro garantido** na venda ("você terá", "sempre terá"). Descreve o que existe hoje.

Ressalva factual, não reabertura da decisão: mesmo enquadrado como apoio, apoio **com contrapartida** pode ser lido como contrato de serviço sob o Código de Defesa do Consumidor — o CDC não desaparece porque o vendedor chamou de doação. Entra na mesma consulta jurídica das outras pendências ([entidade legal](01-mercado.md), [LGPD 16-17](../produto/04-governanca/03-termos.md)), e a redação da página deve ser revisada junto.

## Por onde começar (horas, não semanas — e nada de cobrança)

Vale pra monetização de volume (assinatura no gatilho de 300). O que entra **no lançamento** está na seção acima.

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
