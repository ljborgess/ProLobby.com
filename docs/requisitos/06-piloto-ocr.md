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

## Quando o piloto roda (decidido em 2026-09-15)

O piloto foi **adiado, não descartado**, por um motivo simples: os prints de estranhos ainda não existem, e não dá pra medir sem dado. Adiar sem gatilho é esquecer, então ficam três:

- **Gatilho duro — o piloto tem que ter rodado antes de a Fase 2.2 começar.** Antes de *começar*, não de terminar. É o último ponto em que a resposta ainda muda o que se constrói, em vez de invalidar o que já foi construído.
- **Gatilho macio — 20 prints já bastam pra primeira rodada.** Não espera os 50. Com 20 já dá pra ver se está em 90% ou em 40%, e é essa diferença que decide o projeto, não a terceira casa decimal. Os 50 refinam.
- **Alarme — três semanas sem print nenhum** significa que a coleta não está acontecendo e precisa virar tarefa com hora marcada, não intenção.

**Rodar com prints dos sócios não fecha este bloqueador.** Serve pra validar que o script funciona, e o relatório sai carimbado como amostra interna. O número do risco nº 2 só existe com print de estranho.

**A coleta não compete com issue nenhuma.** É mensagem em servidor de Discord, não é engenharia, e roda em paralelo a tudo — e é exatamente por isso que ela nunca é a coisa mais urgente e nunca acontece.

## De onde vêm os prints (decidido em 2026-09-16)

Pedir em servidor de Discord tem fricção social alta e, na prática, não andou. **Os primeiros 20 vêm de fonte pública**, sem depender de ninguém responder:

| Fonte | O que tirar |
|---|---|
| YouTube / Twitch (VODs de Pro Clubs) | vídeo pausado na tela do Virtual Pro |
| Reddit (r/EASportsFC, r/proclubs) | posts de build do Virtual Pro |
| X / TikTok | foto de tela tirada com celular — o pior caso |

É a mesma população que o piloto precisa medir: gente que ninguém orientou, enquadrando do jeito que deu, em vários idiomas e plataformas.

**Ressalva que importa:** print tirado de vídeo carrega compressão de vídeo que o print original não tem. Isso deixa o teste **mais duro que a realidade** — se o motor acertar 80% em frame de YouTube, acerta mais em print nativo. O piloto passa a medir o piso, não o teto, que é o lado certo de errar.

Anotar a **origem** de cada imagem no gabarito (`publico-video`, `publico-post`, `pedido`), pra separar a taxa por fonte — se o resultado ficar perto de 80%, é essa quebra que diz se o número real é melhor.

**Pedir nos servidores continua valendo, em paralelo** — print nativo sem compressão é o dado mais limpo. Só deixou de ser o caminho único e bloqueante.

As regras abaixo (nunca no git, apagar ao fim, gabarito versionado) valem igual pra print de fonte pública.

## Como pedir, e o que pode ser feito com o print

Print de tela de Virtual Pro tem **gamertag**, que identifica pessoa real. Sem autorização no ato do pedido, o projeto junta 50 imagens identificáveis de estranhos sem base pra tratar nenhuma delas — e entra em contradição com a própria seção de LGPD no primeiro dado que coleta.

Três regras:

1. **A autorização vai no próprio pedido**, em uma linha, sem juridiquês. Quem manda o print consente ao mandar.
2. **Imagem nunca entra no git.** Nem em branch, nem em PR, nem "temporariamente" — git não esquece, e print commitado e removido depois continua no histórico. Pasta local, `.gitignore` desde o primeiro commit do script.
3. **O gabarito é versionado, as imagens não.** As imagens são apagadas quando o piloto fecha.

Mensagem pra mandar:

> Fala, pessoal. Tô construindo uma plataforma de amistosos de Pro Clubs e preciso testar uma parada antes: um leitor automático da tela do Virtual Pro.
>
> Se puderem me mandar **um print da tela do seu Virtual Pro** (aquela com overall, posição e atributos), ajuda demais. Serve print de console e foto da TV com o celular — na real, **foto torta ajuda mais**, porque é o caso difícil que eu preciso medir.
>
> Uso só pra medir a taxa de acerto do leitor, **apago tudo quando terminar o teste**, não cadastro ninguém e não publico print de ninguém. Se topar, é só mandar aqui ou no direct.

**Pedir foto torta é proposital.** Sem isso todo mundo manda screenshot nativo limpo, o número vem lindo, e a descoberta de que foto de celular quebra acontece em produção. Print ruim é o dado mais valioso do piloto.

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
