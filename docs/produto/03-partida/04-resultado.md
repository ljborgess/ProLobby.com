# 5. Resultado de partida

**Fase: MVP**

## Contexto

Sem API da EA, resultado depende de **report manual com print** — mesma limitação estrutural do cadastro de personagem (ver [Personagens e verificação](../02-jogador/01-verificacao.md)), incluindo os dois caminhos aceitos de envio (screenshot do console ou foto de tela pelo celular, com requisito de legibilidade) e o fluxo de upload mobile-first.

## Quem reporta

- **Qualquer um dos humanos da partida** (não precisa ser o capitão) pode mandar o print do placar final.

## Validação anti-fraude do print

Gatilho de validade do print (evita fraude/troll terminando partida cedo, sem depender de botão manual de "partida terminou"):
1. **Piso de tempo mínimo de 5 minutos** desde o lobby fechado — print enviado antes disso é rejeitado automaticamente. Número conservador (partida real de Pro Clubs dificilmente termina antes disso, mesmo com desistência precoce de um lado) — ajusta com dado real depois do teste prático confirmar duração típica.
2. **OCR valida que é a tela de "fim de partida"** (placar final + estatísticas), não HUD de jogo em andamento.
3. **OCR valida o nome dos 2 clubes na tela** contra o par capturado no momento em que os capitães foram escolhidos naquele lobby (dinâmico, não uma lista fixa — ver [Mecânica real do EA FC Pro Clubs](01-mecanica.md)) — evita reportar print de partida qualquer fora do ProLobby como se fosse a do lobby.
4. **OCR confere os gamertags da tela contra o roster do lobby** — fecha o furo mais grave que a revisão adversarial encontrou.
   - **"Clube com vaga" não é "clube sem outros humanos".** O capitão empresta o clube pessoal dele, que pode ter os parceiros de sempre como membros. Na hora da partida o jogo escala quem está disponível, e **membro humano entra antes da IA** — então os jogadores do lobby podem entrar no clube e a partida rodar com amigos do capitão que não estão na plataforma: sem elo, sem reputação, sem verificação.
   - Por que era grave: destruía o produto **silenciosamente**. O convite chegou, a partida aconteceu, o placar bate, e o equilíbrio por elo — que é o produto inteiro — virou ficção sem ninguém perceber.
   - **A tela de fim de partida lista os jogadores**, e o OCR já lê essa tela pra validar placar e clubes. Passa a extrair também os gamertags e comparar com o roster do lobby. **Nome humano que não estava no lobby derruba o resultado e abre caso de abuso de capitão** ([Moderação](../04-governanca/01-moderacao.md)).
   - Fecha com o dado que já está na imagem, sem mecanismo novo. Descartada a alternativa de exigir clube sem outros membros humanos: excluiria quase todo clube real — quem tem clube tem parceiros — secando o recurso mais escasso do fluxo.
   - Serve de reforço pra outra coisa: confere que cada pessoa **jogou na categoria em que entrou na fila**, o furo aberto pela ressalva da Virtual Pro única ([Personagens](../02-jogador/01-verificacao.md), teste 7 do [checklist](05-checklist.md)).
5. **Placar validado como número inteiro entre 0 e 20 por lado** — fora dessa faixa, OCR marca como confiança baixa e pede reenvio ou abre exceção de moderação (placar real de Pro Clubs não passa disso; protege contra erro de leitura do OCR virando gol fantasma).
6. **Hash do arquivo, contra reuso de print** — e é a **primeira** checagem a rodar, antes de qualquer chamada de OCR ([Personagens](../02-jogador/01-verificacao.md)), pra arquivo repetido nunca custar processamento. Plataforma guarda o hash de todo print aceito; arquivo idêntico reenviado é rejeitado na hora. Sem isso existe brecha real: as outras validações (nome dos clubes, placar, piso de tempo) **não distinguem duas partidas do mesmo par de clubes**, já que o ID do lobby é interno da plataforma e não aparece na tela do jogo. Se os mesmos dois capitães jogam de novo, o print da partida anterior passaria como se fosse da nova.
   - Cobre o reuso preguiçoso (mesmo arquivo). Reuso sofisticado (fotografar de novo a tela antiga) continua possível, mas cai em disputa assim que o outro lado reportar o placar real.

## Janela de report — o marco é o primeiro print

O prazo de **15 minutos** conta **desde o primeiro print válido aceito** naquele lobby, não desde o lobby fechar. Motivo: a plataforma não tem como saber que a partida terminou (sem API da EA, o fim de jogo só existe no console) — o primeiro print aceito é o único sinal real de "acabou" que ela recebe. Contar desde o lobby fechar seria impossível de cumprir: a partida ainda estaria rolando.

- Primeiro print válido inicia a contagem; o outro lado tem 15 minutos pra mandar o dele e confirmar.
- **Não existe mais regra separada de "timestamps a até 10 minutos um do outro"** — era redundante com esta janela e, por ser mais curta, tornava os 15 minutos letra morta. Um número só, um marco só.
- Se **ninguém** reportar, a contagem nunca começa — esse caso é coberto pelo zero-report de 36 h desde o lobby fechar (ver Casos de borda).

## O print manda, o campo digitado é conveniência

- **Divergindo o placar lido pelo OCR e o digitado pela pessoa, vale o OCR** — com a tela mostrando "lemos 3×1" antes de salvar, pra ela conferir. Discordando da leitura, reenvia print melhor.
- Motivo: o print é a evidência; o campo digitado existe só pra a pessoa não esperar o OCR pra começar. Se o digitado prevalecesse, o print viraria decoração e placar falso com print verdadeiro passaria.
- **Correção do próprio report é permitida enquanto o outro lado não confirmou** (partida em `aguardando_confirmacao` — ver [Estados](../../requisitos/02-estados.md)). O print é o mesmo, muda só o número digitado. Sem isso, erro de digitação viraria disputa — o caso mais bobo possível consumindo moderação, sendo conferível contra o print que já está lá.
- **Não existe auto-confirmação com um print só.** Os dois lados veem a mesma tela de fim de partida, então um print sozinho não distingue print legítimo de adulterado ou de partida jogada fora do ProLobby. A confirmação cruzada é a única checagem independente que existe, e o hash só pega reuso do mesmo arquivo. Um lado sozinho continua virando "não confirmado" por 48 h.

## Validação cruzada

- **Placar bate** entre os dois lados, com o segundo report dentro da janela de 15 minutos acima.
- **ID da partida = o próprio lobby** gerado pela plataforma — não depende de nada lido do jogo (EA FC não expõe ID de partida legível via OCR).

## Casos de borda

- Se só um lado mandar dentro da janela (15 min): aceita como válido com flag "não confirmado", sujeito a contestação por **48 horas** — depois disso vira definitivo, evita passivo indefinido de disputa antiga pros 4 moderadores.
  - **Quem pode contestar: qualquer humano da partida, uma vez cada.** Não só o lado que não reportou — quem foi prejudicado pode estar no próprio time de quem mandou o print (placar digitado errado pelo companheiro). Limitar ao lado adversário travaria justamente esse caso.
  - **Uma contestação por pessoa por partida**, pra não reabrir o caso em série depois de perder. Contestação abre disputa e a conta volta a ficar bloqueada de fila até resolver (ver Incentivo estrutural abaixo).
- Se os dois lados mandarem placares divergentes: cai em **disputa/moderação** (ver [Moderação](../04-governanca/01-moderacao.md)).
  - **Disputa sem evidência decisiva — os dois prints parecem legítimos e se contradizem: a partida é anulada.** Elo revertido pra todos, nenhuma penalidade de reputação, fila liberada, e a partida sai do histórico competitivo (fica registrada como anulada, não apagada).
  - É o único desfecho que não **inventa** um vencedor. Desempatar por ordem de chegada premiaria velocidade em vez de verdade; desempatar por reputação transformaria reputação em prova de fato e criaria incentivo pra farmá-la como escudo.
  - Mecanicamente é barato: o log de evento de elo que o rollback já exige ([Modelo de dados](../../requisitos/03-dados.md)) torna a reversão uma operação normal, não um caso especial.
- Se **nenhum humano da partida** reportar: o tratamento depende de a partida ter acontecido ou não — os dois casos existiam misturados antes, e penalizavam igual.
  - **Partida nunca começou** (convite não chegou em 5 min, ou silêncio total por 60 min — ver [Discord e lobby](03-lobby.md)): lobby encerrado, fila liberada, **sem penalidade nenhuma**. Não há o que reportar, e a culpa não é de quem esperou.
  - **Partida aconteceu e ninguém reportou** (todos confirmaram convite recebido): fica pendente — depois de **36 horas** sem nenhum report, sistema expira automaticamente e libera as contas envolvidas. **Não fica sem custo**: aplica **-3 pontos de reputação** pra todos eles (mesma métrica/valor de `03`, rateada — não dá pra saber quem "devia" ter reportado). Escala só em reincidência: **3 zero-reports em 30 dias** — igual ao threshold usado em não-confirmar-lobby de `03`, mesma métrica, mesmo padrão de escalada. Sem isso, o time perdedor teria incentivo estrutural de torcer pra ninguém reportar e escapar de graça.
- **Capitão desconecta ou sai no meio da partida**: a partida **segue normalmente** — o clube não deixa de existir porque o dono saiu, e a IA assume a posição dele como assumiria de qualquer um. Penalidade de reputação é a **mesma de qualquer desconexão (−8)**: agravar seria desincentivar gente a aceitar ser capitão, e o dano competitivo é idêntico ao de qualquer jogador que abandona.
  - O que muda é a **limpeza pós-jogo**: sem o capitão pra remover os convidados, eles ficam parados no clube dele. Bot manda a DM de lembrete normalmente; sem resposta, vira **caso de moderação** — mesmo fluxo do capitão que trava a limpeza (ver [Mecânica real do EA FC Pro Clubs](01-mecanica.md) e [Moderação](../04-governanca/01-moderacao.md)), sem mecanismo novo.
- **Desconexão / rage quit**: reportado dentro do mesmo fluxo (campo "reportar ausência" na tela de report do placar) — não é fluxo separado. Confirmada pelo outro lado, gera **-8 pontos de reputação** (maior que a penalidade de zero-report, coerente com ser abandono ativo confirmado, não negligência coletiva).
  - Presume-se que a **IA assume a posição de quem sai no meio da partida** (mesma mecânica de preencher vaga vazia — ver [Mecânica real do EA FC Pro Clubs](01-mecanica.md)), mas isso ainda **não foi confirmado em fonte nem em teste** — entra no checklist junto com o resto.
- **Proteção contra bug de perda de controle**: existe bug conhecido no EA FC onde o jogador **perde o controle do próprio Virtual Pro sem ter desconectado** (a IA assume, a nota individual vai a **0.0**). Companheiros veem alguém parado e reportam como ausência — punição injusta por falha do jogo. Mitigação, usando dado que o OCR **já captura**: se a nota do jogador no print de fim de partida for **0.0**, a plataforma **não aplica a penalidade automaticamente** — marca como "possível falha do jogo" e manda pra [Moderação](../04-governanca/01-moderacao.md) decidir.
  - Não abre brecha real de abuso: pra forjar isso, o jogador teria que sabotar a própria nota até 0.0 (não encostar na bola a partida inteira) — e isso continua caindo em avaliação por pares e denúncia.
  - Fonte do bug: [FC26 Pro Clubs — My Player Turns AI-Controlled](https://forums.ea.com/discussions/fc-26-technical-issues-en/fc26-pro-clubs-bug-%E2%80%93-my-player-turns-ai-controlled-after-update/13391079) (EA lançou hotfix na Title Update 1.5.6, mas relatos continuam).

## Incentivo estrutural

- **Conta fica bloqueada de nova fila até a partida anterior ser reportada e resolvida** — tira da plataforma a responsabilidade de "garantir" que alguém reporte; quem quer jogar de novo resolve o pendente por interesse próprio.
- Esse bloqueio **também vale durante disputa/moderação pendente** (mesmo com prints divergentes já enviados) — decisão deliberada pro MVP dado baixo volume de casos com só 4 moderadores; revisar se o volume crescer e virar gargalo real (jogador inocente preso esperando resolução).
