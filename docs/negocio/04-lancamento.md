# Lançamento — beta fechado e abertura

Uso interno dos 4. Define **como** a plataforma sai pro mundo, e em que momento a cobrança entra. Depende de [Sustentabilidade](03-sustentabilidade.md) (o que se vende) e da [ordem de implementação](02-implementacao.md) (o que precisa estar pronto antes).

## Produto completo, público limitado — não são a mesma coisa

Decisão já registrada: a plataforma sai **completa, sem features cortadas** ([tese de mercado](01-mercado.md)) — nada é simplificado pro lançamento. Isso **não** foi reaberto.

O que se limita é o **público**, não o produto. Produto inteiro no ar, para um grupo convidado, antes de abrir pra todos. Beta de audiência, não beta de funcionalidade.

## Fase 1 — beta fechado, gratuito

**Zero cobrança.** Nenhum plano, nenhuma janela de Fundador, nenhum torneio pago. Motivo em duas partes:

- Cobrar antes de saber se o OCR aceita print de estranho e se a fila fecha sozinha é vender promessa sem lastro.
- **O Fundador é um ativo de um tiro só** — a janela de 30 dias / 50 pessoas vale porque só existe uma vez. Gastá-la num beta de 25 convidados queima a escassez com quem apoiaria de qualquer forma.

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

**Sem prazo fixo, de propósito.** Se o critério não bater, o beta continua: o problema é real, não é pressa. Prazo fixo abriria com o OCR rejeitando metade dos prints — exatamente a fricção que faz a pessoa não voltar, e o boca-a-boca negativo que a [tese de mercado](01-mercado.md) aponta como fatal.

Critério escrito **antes** de existir apego ao que foi construído — mesmo princípio do [critério de desistir](01-mercado.md).

## Fase 2 — abertura pública

Dispara quando o critério de saída fecha. Tudo ao mesmo tempo:

1. **Link do Discord divulgado** nos servidores BR de Pro Clubs, sem restrição de entrada.
2. **Janela de Fundador abre** — R$ 49, 30 dias ou 50 pessoas ([Sustentabilidade](03-sustentabilidade.md)). Aproveita o pico de atenção do anúncio, que é quando a conversão é maior.
3. **Apoiador de R$ 9,90 disponível**, sem paywall e sem insistência.
4. **Primeiro torneio pago anunciado** com data — concentra gente numa janela, o que resolve liquidez e fatura no mesmo movimento.
5. **MEI já aberto** e a página de venda com a redação revisada ([Termos](../produto/04-governanca/03-termos.md)) — nada de receber antes disso.

**Largada coordenada** ([tese de mercado](01-mercado.md)) continua valendo: horários de concentração anunciados no Discord enquanto a base for pequena.

## Sequência completa

| Etapa | Custa | Bloqueia o quê |
|---|---|---|
| Teste no jogo ([checklist](../produto/03-partida/05-checklist.md)) | minutos, zero código | **tudo** — é o bloqueador nº 1 |
| Servidor Discord montado | horas, configuração manual | beta |
| Núcleo da plataforma + lobby + resultado | o desenvolvimento em si | beta |
| Recrutamento dos ~24 convidados | trabalho de comunidade, paralelo ao desenvolvimento | beta |
| **Beta fechado, gratuito** | tempo indeterminado, até o critério bater | abertura |
| MEI + página de venda + Termos revisados | dias | receber dinheiro |
| **Abertura pública + Fundador + torneio** | — | — |

O recrutamento dos convidados roda **em paralelo** ao desenvolvimento, não depois — é a única etapa que não depende de código e costuma ser a esquecida.
