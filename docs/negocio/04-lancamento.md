# Lançamento — beta fechado e abertura

Uso interno dos 4. Define **como** a plataforma sai pro mundo, e em que momento a cobrança entra. Depende de [Sustentabilidade](03-sustentabilidade.md) (o que se vende) e da [ordem de implementação](02-implementacao.md) (o que precisa estar pronto antes).

## Produto completo, público limitado — não são a mesma coisa

Decisão já registrada: a plataforma sai **completa, sem features cortadas** ([tese de mercado](01-mercado.md)) — nada é simplificado pro lançamento. Isso **não** foi reaberto.

O que se limita é o **público**, não o produto. Produto inteiro no ar, para um grupo convidado, antes de abrir pra todos. Beta de audiência, não beta de funcionalidade.

## Fase 1 — beta fechado, gratuito (com pré-venda no fim)

**Gratuito durante o beta.** Nenhum plano cobrado, nenhuma janela de Fundador aberta enquanto o produto está sendo validado:

- Cobrar antes de saber se o OCR aceita print de estranho e se a fila fecha sozinha é vender promessa sem lastro.
- **O Fundador é um ativo de um tiro só** — a janela de 30 dias / 50 pessoas vale porque só existe uma vez. Gastá-la inteira num beta de 25 convidados queima a escassez com quem apoiaria de qualquer forma.

### Pré-venda na última semana — o único jeito de não apostar às cegas

Revisão consciente do "zero cobrança": **na última semana do beta, o Fundador abre pros 24 convidados, a R$ 49, sem desconto nenhum.**

Motivo: sem isso você chega na abertura pública apostando um preço que ninguém nunca validou, e descobre que R$ 49 não converte **depois** de a janela estar queimada. Intenção declarada em formulário não serve — gente diz que pagaria e não paga; só o PIX enviado é sinal.

- Quem compra vira **taxa de conversão real** pra projetar na abertura. 5 de 24 é 21%, e isso dimensiona o quanto esperar das 50 vagas.
- **Preço cheio, sem desconto** — coerente com a decisão de não dar Fundador de graça nem barato a quem testou ([recompensa do beta](#o-que-o-grupo-recebe)). O que o beta ganha é o cargo Beta; o Fundador ele compra como qualquer um.
- Gasta ~5 das 50 vagas. Barato pelo que informa.
- Exige **MEI/entidade legal e Termos já prontos** antes dessa semana — não é o fim do beta, é o fim menos sete dias. Isso antecipa a formalização no cronograma.

### Por que o beta existe

Três coisas só falham **com estranho**, e nenhuma aparece em teste entre os 4:

1. **OCR em print de quem ninguém orientou** — sócio sabe enquadrar a tela; estranho manda foto torta com reflexo. É o número que decide se o upload é fluido ou se vira fila de suporte manual.
2. **Ciclo de capitão com quem você não conhece** — emprestar o clube pessoal a 3 desconhecidos tem fricção social que amigo não sente.
3. **Fila fechando sem ninguém empurrando** — se um dos 4 precisa organizar no WhatsApp pra fechar lobby, o matchmaking não está funcionando, está sendo simulado.

### O beta é onde os números estimados ganham valor real

Três parâmetros estão marcados como estimativa no dossiê e só o beta resolve:

| Parâmetro | Valor atual | O que o beta mede |
|---|---|---|
| Confirmação de convite recebido — 5 min | estimado | quanto tempo o capitão leva de fato pra convidar todo mundo ([Lobby](../produto/03-partida/03-lobby.md)) |
| Cancelamento por silêncio total — 60 min | estimado | ciclo real do convite até o resultado reportado |
| Simetria por categoria | decidido, não medido | se a fila consegue fechar exigindo par de mesma categoria com base pequena ([Fila](../produto/03-partida/02-fila.md)) |

Se a simetria por categoria travar a fila no beta, é decisão de produto pra reabrir — com dado, não com achismo.

### Quem participa: metade conhecido, metade estranho

- **~12 da rede pessoal dos 4** — garante que a fila alcança o piso de 8 humanos em qualquer noite. Sem isso o beta não arranca, e beta que não fecha fila não mede nada.
- **~12 estranhos**, recrutados em servidores Discord BR de Pro Clubs — é o que torna o teste válido.

Por que os dois: só conhecido aprova um produto que o público reprovaria (amigo avisado tira print do jeito certo, perdoa fricção e volta mesmo insatisfeito). Só estranho arrisca o beta nunca alcançar 8 pessoas simultâneas.

### O que o grupo recebe

**Cargo Beta permanente no Discord, e nada além.** Reconhecimento perpétuo, posicionado como mais antigo que Fundador na hierarquia visual.

Sem Fundador grátis nem com desconto, por um motivo contra-intuitivo: **quem testou de graça e gostou é a base mais quente pra comprar Fundador na abertura.** Dar de graça converte a melhor lista de compradores em não-compradores, e 25 testadores nas 50 vagas cortariam a janela pela metade.

### Critério de saída — medido, sem prazo fixo

O beta termina quando **todos** estes forem verdade:

- **10 partidas completas de ponta a ponta** — fila, lobby, partida, resultado confirmado pelos dois lados.
- **Fila fechando sozinha em pelo menos metade delas**, sem nenhum dos 4 organizando por fora.
- **OCR aceitando 80%+ dos prints de primeira** (confiança ≥85%, sem reenvio). Abaixo disso o gargalo é o upload, e vira suporte manual em escala.
- **Zero lobby cancelado por bug.** Cancelamento por regra não conta — convite não confirmado em 5 min é a regra funcionando como desenhada ([Lobby](../produto/03-partida/03-lobby.md)).

### Como esses números são medidos

Critério numérico sem instrumentação não é critério, é opinião. **Os 4 números derivam de dado que a plataforma já vai gravar de qualquer forma** — tabela de partida, de lobby e de evento de OCR:

- Uma **tela de contagem no painel de moderação** (o mesmo painel com 2FA e log de auditoria, ver [Moderação](../produto/04-governanca/01-moderacao.md)) exibe os 4 números direto do banco.
- **Nenhuma ferramenta de terceiro** (PostHog, Plausible e afins): mandar dado de comportamento pra fora abre capítulo novo de LGPD e transferência internacional — caro demais pra medir 4 números.
- **Nada de planilha manual**: depende de alguém lembrar de anotar, e falha justo quando o volume cresce e os números passam a importar.

Vale também pras [métricas de sucesso](01-mercado.md) dos 90 dias, que precisam da mesma tela.

**Sem prazo fixo, de propósito.** Se o critério não bater, o beta continua: o problema é real, não é pressa. Prazo fixo abriria com o OCR rejeitando metade dos prints — exatamente a fricção que faz a pessoa não voltar, e o boca-a-boca negativo que a [tese de mercado](01-mercado.md) aponta como fatal.

Critério escrito **antes** de existir apego ao que foi construído — mesmo princípio do [critério de desistir](01-mercado.md).

## Fase 2 — abertura pública

Dispara quando o critério de saída fecha. Tudo ao mesmo tempo:

1. **Link do Discord divulgado** nos servidores BR de Pro Clubs, sem restrição de entrada.
2. **Janela de Fundador abre** — R$ 49, 30 dias ou 50 pessoas ([Sustentabilidade](03-sustentabilidade.md)). Aproveita o pico de atenção do anúncio, que é quando a conversão é maior.
3. **Apoiador de R$ 9,90 disponível**, sem paywall e sem insistência.
4. **Sem torneio.** Adiado por decisão do time ([Sustentabilidade](03-sustentabilidade.md)): valida primeiro o núcleo — fila, lobby, Amistoso Online, resultado — antes de empilhar liga/torneio. Liquidez no início continua vindo da **largada coordenada** no Discord, que custa zero.
5. **Entidade legal já aberta** e a página de venda com a redação revisada ([Termos](../produto/04-governanca/03-termos.md)) — na prática isso precisa estar pronto uma semana antes do fim do beta, por causa da pré-venda.

**Largada coordenada** ([tese de mercado](01-mercado.md)) continua valendo: horários de concentração anunciados no Discord enquanto a base for pequena.

## Sequência completa

| Etapa | Custa | Bloqueia o quê |
|---|---|---|
| Teste no jogo ([checklist](../produto/03-partida/05-checklist.md)) | minutos, zero código | **tudo** — é o bloqueador nº 1 |
| Servidor Discord montado | horas, configuração manual | beta |
| Núcleo da plataforma + lobby + resultado | o desenvolvimento em si | beta |
| Recrutamento dos ~24 convidados | trabalho de comunidade, paralelo ao desenvolvimento | beta |
| **Beta fechado, gratuito** | tempo indeterminado, até o critério bater | abertura |
| Consulta com contador (MEI serve? ver [Sustentabilidade](03-sustentabilidade.md)) | uma conversa | entidade legal, e o modelo de preço |
| Entidade legal + página de venda + Termos revisados | dias | **pré-venda**, que é o fim do beta menos 7 dias |
| **Pré-venda do Fundador aos 24 do beta** | última semana do beta | dimensionar a abertura |
| **Abertura pública + janela de Fundador** | — | — |

O recrutamento dos convidados roda **em paralelo** ao desenvolvimento, não depois — é a única etapa que não depende de código e costuma ser a esquecida.
