# Piloto de OCR — teste isolado, antes da plataforma

**Status: pendente. É o bloqueador nº 2 do projeto**, ao lado do [checklist de teste no jogo](../produto/03-partida/05-checklist.md).

Não é feature nem etapa de produto: é um experimento que responde se o produto de **identidade verificada** é viável, e roda **sem conta, sem banco, sem tela**.

## Por que este é o primeiro trabalho de engenharia

Os cinco riscos do projeto, ranqueados por probabilidade e dano:

| # | Risco | Chance | Dano | Como se elimina |
|---|---|---|---|---|
| 1 | Amistoso não aceita IA cobrindo vaga | média | **fatal** | **jogando** — [checklist](../produto/03-partida/05-checklist.md), teste 6 |
| 2 | **OCR não lê print de estranho** | **alta** | severo | **construindo** — este arquivo |
| 3 | Ciclo de capitão é lento demais | média | severo | **jogando** — checklist, testes 1, 3, 4, 5 |
| 4 | Liquidez / cold start | **alta** | fatal | com **gente**, não com código |
| 5 | Virtual Pro é uma só, reconfigurável | alta | moderado | **jogando** — checklist, teste 7 |

**Quatro dos cinco não são desbloqueados por engenharia.** O OCR é o único risco grande que exige código pra ser medido — e por isso é o primeiro a ser construído, antes de conta, de fila e de qualquer tela.

A ordem por dependência ([ordem de implementação](../negocio/02-implementacao.md)) continua correta pra responder *o que dá pra construir*. Ela só não responde *o que construir primeiro*, que é ordenado por risco.

## O que construir

Um script. Recebe uma pasta de prints e devolve um relatório.

**Não precisa de**: conta, autenticação, banco, upload, interface, Discord, nada de produto.

**Precisa medir, por print**:
- Campos extraídos corretamente (nome, posição, overall, atributos, gamertag) contra o valor real anotado à mão.
- Confiança reportada pelo motor.
- Idioma detectado (PT, ES, EN — ver [Personagens](../produto/02-jogador/01-verificacao.md)).
- Origem: screenshot de console ou foto de tela.

**Precisa agregar**:
- Taxa de aceite de primeira (confiança ≥85% **e** campos corretos).
- Taxa quebrada **por idioma** e **por origem** — é onde a diferença deve aparecer.
- Quais das [5 causas de rejeição](04-notificacoes.md) apareceram, e em que proporção.

## Como conseguir os 50 prints

Nos servidores BR de Pro Clubs, pedindo: *"manda um print da tela do seu Virtual Pro"*. Sem plataforma envolvida, sem cadastro.

- **Mínimo de 50**, com variedade proposital: celular e screenshot de console, os três idiomas, PS5/Xbox/PC, gente com TV boa e TV ruim.
- **Print de estranho é o ponto todo.** Print dos 4 sócios não serve pra medir isso: sócio sabe enquadrar a tela, e o risco é justamente quem não sabe.
- Roda em paralelo ao recrutamento do beta ([Lançamento](../negocio/04-lancamento.md)) — é conversa nos mesmos servidores, com os mesmos contatos.
- **Prints do piloto não são dado de produção**: usados só pra medir, apagados no fim, e ninguém é cadastrado por causa deles. Vale pedir autorização de uso na própria mensagem.

## Critério de aprovação

**80% dos prints aceitos de primeira** — confiança ≥85% sem reenvio, com os campos corretos.

Mesmo número já fixado como critério de saída do beta ([Lançamento](../negocio/04-lancamento.md)), agora medido antes de existir plataforma. Abaixo de 80%, o cadastro vira fila de suporte manual na **primeira tela do produto** — que é o modo de falha silencioso que a decisão de reconhecer três idiomas tentou evitar.

## O que cada resultado decide

| Resultado | Consequência |
|---|---|
| **80%+ com motor local** (Tesseract ou similar) | Viável e de graça. Decide a pendência de OCR pago vs. local ([Sustentabilidade](../negocio/03-sustentabilidade.md)) com dado em vez de palpite |
| **80%+ só com serviço pago** | Viável, com custo por chamada. Ainda cabe no free tier no volume do MVP, mas passa a ter teto de escala conhecido |
| **60% a 80%** | Fluxo precisa de camada de confirmação manual mais forte que a atual — a tela de conferência deixa de ser formalidade e vira etapa de verdade |
| **Abaixo de 60%** | **Repensar a premissa de verificação.** Alternativas a avaliar: overall autodeclarado com print só por amostragem, ou verificação assistida por moderação no cadastro. Não mata o produto, mas muda o que ele promete |

Nos dois últimos casos, o elo perde a âncora de overall verificado no seed ([Ranking](../produto/02-jogador/02-ranking.md)) — o que importa menos do que parece, já que o seed decai a zero na 9ª partida.

## Depois deste piloto

Com o checklist e o piloto rodados, os dois riscos que exigiam descoberta estão medidos. Só então faz sentido decidir stack e construir a plataforma na ordem por dependência já desenhada — e os RFs das fatias seguintes são escritos pouco antes de cada uma virar código, não todos agora: três parâmetros do dossiê estão marcados como "a calibrar" e vão mudar com o que estes dois testes retornarem.
