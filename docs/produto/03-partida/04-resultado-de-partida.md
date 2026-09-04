# 5. Resultado de partida

**Fase: MVP**

## Contexto

Sem API da EA, resultado depende de **report manual com print** — mesma limitação estrutural do cadastro de personagem (ver [Personagens e verificação](../02-jogador/01-personagens-e-verificacao.md)), incluindo os dois caminhos aceitos de envio (screenshot do console ou foto de tela pelo celular, com requisito de legibilidade) e o fluxo de upload mobile-first.

## Quem reporta

- **Qualquer um dos humanos da partida** (não precisa ser o capitão) pode mandar o print do placar final.

## Validação anti-fraude do print

Gatilho de validade do print (evita fraude/troll terminando partida cedo, sem depender de botão manual de "partida terminou"):
1. **Piso de tempo mínimo de 5 minutos** desde o lobby fechado — print enviado antes disso é rejeitado automaticamente. Número conservador (partida real de Pro Clubs dificilmente termina antes disso, mesmo com desistência precoce de um lado) — ajusta com dado real depois do teste prático confirmar duração típica.
2. **OCR valida que é a tela de "fim de partida"** (placar final + estatísticas), não HUD de jogo em andamento.
3. **OCR valida o nome dos 2 clubes na tela** contra o par capturado no momento em que os capitães foram escolhidos naquele lobby (dinâmico, não uma lista fixa — ver [Mecânica real do EA FC Pro Clubs](01-mecanica-pro-clubs.md)) — evita reportar print de partida qualquer fora do ProLobby como se fosse a do lobby.
4. **Placar validado como número inteiro entre 0 e 20 por lado** — fora dessa faixa, OCR marca como confiança baixa e pede reenvio ou abre exceção de moderação (placar real de Pro Clubs não passa disso; protege contra erro de leitura do OCR virando gol fantasma).
5. **Hash do arquivo, contra reuso de print**: plataforma guarda o hash de todo print aceito — arquivo idêntico reenviado é rejeitado na hora. Sem isso existe brecha real: as outras validações (nome dos clubes, placar, piso de tempo) **não distinguem duas partidas do mesmo par de clubes**, já que o ID do lobby é interno da plataforma e não aparece na tela do jogo. Se os mesmos dois capitães jogam de novo, o print da partida anterior passaria como se fosse da nova.
   - Cobre o reuso preguiçoso (mesmo arquivo). Reuso sofisticado (fotografar de novo a tela antiga) continua possível, mas cai em disputa assim que o outro lado reportar o placar real.

## Validação cruzada

- **Placar bate** entre os dois lados + **timestamps de envio a até 10 minutos um do outro** — janela generosa o bastante pra cobrir alguém demorando pra tirar o print, curta o suficiente pra pegar tentativa de report fora de contexto.
- **ID da partida = o próprio lobby** gerado pela plataforma — não depende de nada lido do jogo (EA FC não expõe ID de partida legível via OCR).

## Casos de borda

- Se só um lado mandar dentro da janela (15 min): aceita como válido com flag "não confirmado", sujeito a contestação por **48 horas** — depois disso vira definitivo, evita passivo indefinido de disputa antiga pros 4 moderadores.
- Se os dois lados mandarem placares divergentes: cai em **disputa/moderação** (ver [Moderação](../04-governanca/01-moderacao.md)).
- Se **nenhum humano da partida** reportar dentro dos 15 min: fica pendente — depois de **36 horas** sem nenhum report, sistema expira automaticamente e libera as contas envolvidas. **Não fica sem custo**: aplica **-3 pontos de reputação** pra todos eles (mesma métrica/valor de `03`, rateada — não dá pra saber quem "devia" ter reportado). Escala só em reincidência: **3 zero-reports em 30 dias** — igual ao threshold usado em não-confirmar-lobby de `03`, mesma métrica, mesmo padrão de escalada. Sem isso, o time perdedor teria incentivo estrutural de torcer pra ninguém reportar e escapar de graça.
- **Desconexão / rage quit**: reportado dentro do mesmo fluxo (campo "reportar ausência" na tela de report do placar) — não é fluxo separado. Confirmada pelo outro lado, gera **-8 pontos de reputação** (maior que a penalidade de zero-report, coerente com ser abandono ativo confirmado, não negligência coletiva).
  - Presume-se que a **IA assume a posição de quem sai no meio da partida** (mesma mecânica de preencher vaga vazia — ver [Mecânica real do EA FC Pro Clubs](01-mecanica-pro-clubs.md)), mas isso ainda **não foi confirmado em fonte nem em teste** — entra no checklist junto com o resto.
- **Proteção contra bug de perda de controle**: existe bug conhecido no EA FC onde o jogador **perde o controle do próprio Virtual Pro sem ter desconectado** (a IA assume, a nota individual vai a **0.0**). Companheiros veem alguém parado e reportam como ausência — punição injusta por falha do jogo. Mitigação, usando dado que o OCR **já captura**: se a nota do jogador no print de fim de partida for **0.0**, a plataforma **não aplica a penalidade automaticamente** — marca como "possível falha do jogo" e manda pra [Moderação](../04-governanca/01-moderacao.md) decidir.
  - Não abre brecha real de abuso: pra forjar isso, o jogador teria que sabotar a própria nota até 0.0 (não encostar na bola a partida inteira) — e isso continua caindo em avaliação por pares e denúncia.
  - Fonte do bug: [FC26 Pro Clubs — My Player Turns AI-Controlled](https://forums.ea.com/discussions/fc-26-technical-issues-en/fc26-pro-clubs-bug-%E2%80%93-my-player-turns-ai-controlled-after-update/13391079) (EA lançou hotfix na Title Update 1.5.6, mas relatos continuam).

## Incentivo estrutural

- **Conta fica bloqueada de nova fila até a partida anterior ser reportada e resolvida** — tira da plataforma a responsabilidade de "garantir" que alguém reporte; quem quer jogar de novo resolve o pendente por interesse próprio.
- Esse bloqueio **também vale durante disputa/moderação pendente** (mesmo com prints divergentes já enviados) — decisão deliberada pro MVP dado baixo volume de casos com só 4 moderadores; revisar se o volume crescer e virar gargalo real (jogador inocente preso esperando resolução).
