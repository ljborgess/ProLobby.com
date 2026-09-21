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
- Campos extraídos corretamente contra o valor real anotado à mão. A lista era "nome, posição, overall, atributos, gamertag" — **e a evidência de 2026-09-18 mostrou que gamertag e overall não estão na aba `Attributes` do FC 27**. Ver [a seção de evidência](#primeira-evidência-real-de-fc-27-2026-09-18) antes de fixar a lista de campos.
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

## Edição do jogo: medir em FC 27 (decidido em 2026-09-16)

**O EA FC 27 sai em 25/09/2026**, com acesso antecipado em 18/09. O beta roda inteiro em FC 27, e edição nova arquiva personagem e exige reverificação ([Escopo](../produto/05-produto/02-escopo.md)).

- **Print de FC 26 serve só pra desenvolver o script.** A taxa de acerto que decide a Fase 2.2 é medida em **FC 27**.
- **O Clubs muda de lugar**: passa a ficar dentro do hub "The Grounds", só em PS5, Xbox Series, Switch 2 e PC. Tela do Virtual Pro, overall, arquétipo e categorias podem ter mudado — os campos que o OCR lê só se confirmam no jogo.
- **A semana de lançamento é a melhor janela de coleta**: YouTube e Twitch lotam de conteúdo de Clubs.
- **Coleta automática não é viável.** Testado em 2026-09-16: Reddit e X bloqueiam acesso automatizado, e busca web devolve site de montar build, não print de jogador. A fonte pública precisa de uma pessoa abrindo o vídeo e tirando o print.

## Primeira evidência real de FC 27 (2026-09-18)

Quatro capturas da tela do Virtual Pro foram olhadas: **três de FC 27** (aba `Attributes`, dois Pros diferentes, de VOD público) e **uma de layout anterior**, provavelmente FC 26. Não é medição de OCR — é leitura do que a tela contém. Muda o escopo do piloto em dois pontos de premissa.

### A aba `Attributes` não tem gamertag nem overall

Nenhuma das três capturas de FC 27 mostra texto que identifique a pessoa. O topo traz nível, AP e moeda; não traz gamertag. E o overall, que aparecia no canto superior direito no layout anterior, **não aparece** nessa aba no FC 27.

Consequências, as duas graves:

- **O print da aba `Attributes` não prova posse de nada.** A frase acima, de que o OCR extrai "nome, posição, overall, atributos, gamertag", assume campos que não estão ali. Sem gamertag na tela, qualquer pessoa cadastra o Pro de um streamer pausando um VOD — foi exatamente assim que estas capturas foram obtidas. O caso que [Verificação](../produto/02-jogador/01-verificacao.md) tratava como raro ("alguém verifica com print falsificado antes do dono real") deixa de exigir falsificação.
- **O seed do elo perde a âncora nesta tela.** O overall verificado é a âncora do seed ([Ranking](../produto/02-jogador/02-ranking.md)). Onde ele vive no FC 27 — `Home`, HUD, outra aba — **não está confirmado**.

**O que falta ver**: a aba `Home` do FC 27. É ela que decide se existe alguma tela do Virtual Pro com gamertag e overall juntos, ou se a verificação precisa de outro caminho.

### O número na tela é configuração, não característica

O mesmo modificador de **altura e peso** aparece com sinais opostos em atributos diferentes do mesmo Pro: **−5** em Acceleration e **+5** em Jumping. Cada atributo tem MIN/MAX próprios (Acceleration 70–90; Jumping 75–96), e o valor sobe com AP gasto (`Next Upgrade Cost`, com desconto em "Key Attribute of this Archetype"). No layout anterior, `Specializations` empurrava atributo acima disso (`Magician+ ACC 92 BAL 90 FIN 90`).

Então o atributo lido é **valor derivado** de arquétipo + corpo + boosts + pontos gastos — e no FC 27 o reset de arquétipo não custa moeda nem consumível. Medir "o OCR leu 75 corretamente" continua válido como métrica de extração; **tratar 75 como característica do personagem, não.**

### Detalhes que o script precisa encarar

- **Rótulo truncado com reticências**, nas duas versões: `Interceptio…`, `Heading A…`, `Stand Tack…`, `Sprint Spe…`. O nome completo não está na tela, e o corte deve mudar com o idioma.
- **Cabeçalho de grupo mudou entre versões**: `Ball Control`/`Scoring` no FC 27, `Dribbling`/`Shooting` no layout anterior. Extração ancorada em cabeçalho quebra na troca de edição — a prova visual de por que print de FC 26 não mede nada.
- **Rótulo de aba varia** no próprio FC 27: a segunda aba apareceu como `Customise` num Pro e como `Finisher` (o nome do arquétipo) noutro. Âncora de aba é frágil.
- **Skill Moves e Weak Foot são estrela**, não número. Contar estrela é extração de forma, não de texto — decidir se entram no escopo.
- **Ruído real**: as capturas de VOD vêm com facecam cobrindo o canto e compressão de stream. É o caso difícil que o piloto quer medir; não descartar por isso.

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

Com o checklist e o piloto rodados, os dois riscos que exigiam descoberta estão medidos. Só então faz sentido decidir stack e construir a plataforma na ordem por dependência já desenhada — e os RFs das fatias seguintes são escritos pouco antes de cada uma virar código, não todos agora: quatro parâmetros do dossiê estão marcados como "a calibrar" e vão mudar com o que estes dois testes retornarem.
