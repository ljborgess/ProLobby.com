# Arquétipos do Virtual Pro no Clubs do FC 27

Pesquisa de 25/09/2026. Os arquétipos entraram no Clubs no FC 26 (2025).

## Pergunta

Qual é a lista completa de arquétipos (Player Archetypes) que o Virtual Pro pode usar no Clubs do EA SPORTS FC 27? Para cada um: (a) o nome exato em inglês na tela `Archetypes`, (b) o grupo em que a tela o coloca, (c) as posições em que ele joga, se houver documentação, (d) se é novo, renomeado ou removido em relação ao FC 26.

Contexto: o código tem 13 arquétipos (`apps/api/src/modules/character/archetype.ts` e `apps/ocr-pilot/src/archetypes.ts`). A dúvida era se o FC 27 tinha mais de 13.

## Achados

### 1. EA, Pitch Notes: The Grounds Deep Dive do FC 27 (fonte primária, FC 27)

- URL: https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-the-grounds-deep-dive
- Data: 04/08/2026
- A tabela de **Masteries** tem uma linha por arquétipo, **13 linhas**, nesta ordem: Shot Stopper (GK Positioning, GK Reflexes), Sweeper Keeper (GK Handling, GK Diving), Progressor (Long Passing, Standing Tackle), Boss (Aggression, Strength), Marauder (Sliding Tackle, Sprint Speed), Disruptor (Stamina, Interceptions), Recycler (Def. Awareness, Short Passing), Maestro (Reactions, Ball Control), Creator (Free Kick Accuracy, Vision), Spark (Crossing, Dribbling), Magician (Curve, Acceleration), Finisher (Composure, Finishing), Target (Balance, Jumping).
- A tabela não mostra rótulo de grupo. A página não usa as palavras "Engine" nem "new Archetype", e não dá contagem total.
- "All Archetypes are now unlocked by default, giving you immediate access to any Archetype right out the gate."
- Conclusão: a EA lista **exatamente 13 arquétipos no FC 27**, e são os 13 nomes que o código já tem. A ordem da tabela é a mesma da fileira de ícones da tela (achado 3).

### 2. EA, Pitch Notes: Launch Update do FC 27 (fonte primária, FC 27)

- URL: https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-launch-update
- Data: 14/09/2026
- Sobre arquétipos diz só "Archetypes remain at the heart of how you build and master your Pro". Não cita nomes nem anuncia arquétipo novo.

### 3. Prints reais do FC 27 no piloto de OCR (evidência direta do jogo)

- Arquivos: `apps/ocr-pilot/prints/arq-*.png`, gabarito em `apps/ocr-pilot/fixtures/gabarito-archetypes.json`. **Os dois ficam fora do git** (têm gamertag de terceiros), então só quem tem a cópia local confere. Contexto em [06-piloto-ocr.md](../requisitos/06-piloto-ocr.md#rodada-2a-2026-09-24-tela-archetypes-56-com-9-prints).
- A fileira de ícones da tela `Archetypes` tem **13 ícones** e **quatro rótulos de grupo, escritos na tela exatamente assim: `Keeper`, `Defender`, `Midfielder`, `Forward`**, com 2, 3, 4 e 4 ícones. Isso aparece em todos os prints que conferi (arq-01, arq-06, arq-12).
- O arquétipo aberto fica sob o triângulo verde. O título dele aparece em caixa alta (`MARAUDER`, `DISRUPTOR`, `SPARK`) com "Inspired by <ICON>" logo abaixo:
  - `MARAUDER`: 3º ícone de `Defender`, "Inspired by Cafu".
  - `DISRUPTOR`: 1º ícone de `Midfielder`, "Inspired by Roy Keane".
  - `SPARK`: 1º ícone de `Forward`, "Inspired by Luís Figo".
- Arquétipos vistos em prints reais do FC 27: **Marauder, Disruptor, Maestro, Creator, Spark, Magician, Target** (gabarito da rodada 2a) e **Finisher** (como rótulo de aba na rodada 1, [06-piloto-ocr.md](../requisitos/06-piloto-ocr.md)). Não apareceram: Shot Stopper, Sweeper Keeper, Progressor, Boss, Recycler. Esses cinco estão confirmados pela tabela da EA (achado 1) e ocupam os ícones que sobram na fileira.
- Conclusão: as posições de Marauder, Disruptor e Spark na fileira batem com a ordem da tabela da EA. Então a ordem da tela é a da tabela, e o grupo de cada arquétipo sai da contagem 2/3/4/4.

### 4. EA, Pitch Notes: Clubs Deep Dive do FC 26 (fonte primária, FC 26)

- URL: https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-clubs-deep-dive
- Data: 31/07/2025
- "You'll be able to unlock, progress, and develop 13 distinct player Archetypes, each inspired by an ICON of world football."
- Os nomes ficam em imagens, sem texto. Os textos alternativos das imagens mostram os quatro grupos do FC 26: "Forward Archetypes", "Midfielder Archetypes", "Defender Archetypes", "Goalkeeper Archetypes". No texto aparecem só Finisher, Maestro, Recycler e Creator.
- Conclusão: o FC 26 também tinha 13. A lista do FC 26 não aparece em texto da EA.

### 5. Dexerto, arquétipos do FC 26 (imprensa especializada, FC 26)

- URL: https://www.dexerto.com/wikis/ea-fc-26-guides-walkthrough-tips/ea-fc-26-archetypes/
- Data: 18/08/2025
- Grupos do FC 26: Goalkeeper (Shot Stopper, Sweeper Keeper), Defender (**Progressor, Boss, Engine, Marauder**), Midfielder (**Recycler, Maestro, Creator, Spark**), Forward (**Magician, Finisher, Target**).
- A divisão 2/4/4/3 do FC 26 se repete em outros guias (SoccerGaming, TheSportBros, na busca). O Engine aparece como "inspired by Park Ji Sung", um defensor de stamina (resultado de busca, não li a página).

### 6. Dexerto, arquétipos do FC 27 (imprensa especializada, FC 27)

- URL: https://www.dexerto.com/wikis/ea-fc-27/all-archetypes-explained/
- Data: 22/09/2026
- Grupos: Goalkeeper (Shot Stopper/Buffon, Sweeper Keeper/Van der Sar), Defenders (Progressor/Hierro, Boss/Vidić, Marauder/Cafu), Midfielders (Disruptor/Roy Keane, Recycler/Makélélé, Maestro/Kroos, Creator/Iniesta), Forwards (Spark/Figo, Magician/Ronaldinho, Finisher/Alex Morgan, Target/Ibrahimović).
- Os grupos e os ICONs de Marauder, Disruptor e Spark batem com os prints (achado 3).

### 7. Pro Clubs HQ, "FC 27 Archetypes: All 13 Explained" (site de fã, baixa confiança)

- URL: https://proclubshq.com/blog/fc27-archetypes/
- Data: publicado em 16/08/2026, atualizado em 21/09/2026
- "Twelve return from FC 26 — every one confirmed by EA — and one is new: Disruptor" e "Engine is out, Disruptor is in".
- Lista os mesmos 13 e os mesmos grupos, mas os ICONs estão errados: diz Finisher/Mbappé, Target/Haaland, Spark/Vinícius Júnior, e esses não são ICONs. O print mostra "Inspired by Luís Figo" no Spark. Serve só como mais um indício de Engine → Disruptor.

### 8. RealSport101, melhores arquétipos por posição (imprensa especializada, FC 27)

- URL: https://realsport101.com/article/fc-27-clubs-the-grounds-best-archetypes-for-every-position
- Data: 22/09/2026
- "All 13 Archetypes are unlocked from the start."
- Recomendações de posição (opinião do guia, não regra do jogo): Finisher e Target em ST; Magician em ponta/LM/RM; Maestro em CAM/CM/CDM; Recycler em CDM; Boss em CB e LB/RB; Marauder em LB/RB; Shot Stopper em GK.

### 9. Fontes que não consegui ler

- Página de ajuda de arquétipos da EA (https://help.ea.com/en/articles/ea-sports-fc/archetypes/): timeout de novo, como na pesquisa de 24/09.

## Tabela

"Posições" é recomendação de guia de terceiros, não regra do jogo. Nenhuma fonte EA lista posições por arquétipo: o jogo mede o encaixe pelo Role Fit no lobby ([pesquisa do overall](overall-pro-clubs-fc27-2026-09-24.md)).

| Grupo (rótulo na tela) | Arquétipo (nome no jogo) | ICON ("Inspired by") | Posições (guia, não EA) | Novo no FC 27? | Fonte |
|---|---|---|---|---|---|
| Keeper | Shot Stopper | Buffon (Dexerto) | GK | Não, veio do FC 26 | EA FC 27 (1), Dexerto (5, 6) |
| Keeper | Sweeper Keeper | Van der Sar (Dexerto) | GK | Não, veio do FC 26 | EA FC 27 (1), Dexerto (5, 6) |
| Defender | Progressor | Hierro (Dexerto) | CB (descrição: zagueiro que sai jogando) | Não, veio do FC 26 | EA FC 27 (1), Dexerto (5, 6) |
| Defender | Boss | Vidić (Dexerto) | CB, LB/RB | Não, veio do FC 26 | EA FC 27 (1), Dexerto (5, 6), RealSport101 (8) |
| Defender | Marauder | Cafu (visto no print) | LB/RB | Não, veio do FC 26 | EA FC 27 (1), print (3) |
| Midfielder | Disruptor | Roy Keane (visto no print) | não confirmado (descrição: pressão e interceptação) | Provável (imprensa). Não aparece nos guias do FC 26; não confirmado se é novo ou o Engine renomeado | EA FC 27 (1), print (3), Dexerto (6), Pro Clubs HQ (7) |
| Midfielder | Recycler | Makélélé (Dexerto) | CDM | Não, veio do FC 26 | EA FC 27 (1), Dexerto (5, 6), RealSport101 (8) |
| Midfielder | Maestro | Kroos (Dexerto) | CAM, CM, CDM | Não, veio do FC 26 | EA FC 27 (1), print (3), RealSport101 (8) |
| Midfielder | Creator | Iniesta (Dexerto) | não confirmado | Não, veio do FC 26 | EA FC 27 (1), print (3), Dexerto (5, 6) |
| Forward | Spark | Luís Figo (visto no print) | ponta (descrição: "getting to the byline") | Não. Provavelmente mudou de grupo, era Midfielder no FC 26 (indício de imprensa, Dexerto) | EA FC 27 (1), print (3), Dexerto (5, 6) |
| Forward | Magician | Ronaldinho (Dexerto) | ponta, LM/RM | Não, veio do FC 26 | EA FC 27 (1), print (3), RealSport101 (8) |
| Forward | Finisher | Alex Morgan (Dexerto) | ST | Não, veio do FC 26 | EA FC 27 (1), EA FC 26 (4), print (3) |
| Forward | Target | Ibrahimović (Dexerto) | ST | Não, veio do FC 26 | EA FC 27 (1), print (3), RealSport101 (8) |
| (removido) | Engine | Park Ji Sung (busca) | CB/lateral, segundo a busca | **Removido no FC 27** | ausente da tabela da EA FC 27 (1); Dexerto (5, 6); Pro Clubs HQ (7) |

## Comparação com os 13 do código

- **Faltando**: nenhum. O FC 27 tem exatamente 13, e são os 13 do código.
- **Sobrando**: nenhum. O Engine, que só existia no FC 26, não está no código, e está certo não estar.
- **Grupo errado**: nenhum. Os grupos 2/3/4/4 do código (Keeper, Defender, Midfielder, Forward) batem com a tela do FC 27. Os guias do FC 26, que põem o Spark em Midfielder e o Engine em Defender, descrevem o jogo anterior. O comentário do código diz que resumos de terceiros "misturam os grupos": a explicação provável é essa mudança de um jogo pro outro.
- **Grafia errada**: nenhuma. A tela mostra os nomes em caixa alta; a tabela da EA usa `Shot Stopper`, `Sweeper Keeper` etc., como o código. O rótulo do grupo na tela é `Keeper`, não `Goalkeeper`. O enum `ArchetypeGroup.KEEPER` está certo pro FC 27, mas a EA escrevia "Goalkeeper Archetypes" no FC 26.
- **Ordem**: a ordem de `ARCHETYPES` no piloto e do enum `Archetype` é a mesma da tabela da EA e da fileira de ícones.

## Grau de certeza

- **Lista de 13 nomes e grafia no FC 27: confirmado por fonte EA** (Pitch Notes do FC 27, tabela de Masteries) e pelos prints de 8 dos 13.
- **Rótulos dos grupos (`Keeper`, `Defender`, `Midfielder`, `Forward`) e contagem 2/3/4/4: confirmado pelo jogo** (prints reais do FC 27). Nenhuma fonte EA do FC 27 escreve esses rótulos em texto.
- **Grupo de cada arquétipo**: confirmado por print para Marauder, Disruptor e Spark. Para os outros 10, é dedução: a ordem da tabela da EA casa com a fileira e com a contagem 2/3/4/4. Dexerto (FC 27) confirma todos. Confiança alta.
- **Disruptor novo e Engine removido: indício de imprensa.** A tabela da EA do FC 27 não tem Engine, e os guias do FC 26 têm Engine e não têm Disruptor. Nenhuma fonte EA diz com todas as letras "novo" ou "removido". Não confirmado se é arquétipo novo ou o Engine renomeado (o Engine era Defender e o Disruptor é Midfielder). Quem afirma a troca é o Pro Clubs HQ, de baixa confiança; a página do Dexerto do FC 27 não fala do Engine.
- **Spark passou de Midfielder para Forward: indício de imprensa.** O grupo do FC 27 está confirmado pelo print. O grupo do FC 26 vem só do Dexerto e de guias de fã.
- **Posições: não confirmado.** Nenhuma fonte EA lista posições por arquétipo.

## Perguntas em aberto

- A EA publicou lista oficial de posições por arquétipo? Não confirmado. A página de ajuda da EA não abriu. Pelo que se sabe do FC 26, o encaixe é medido pelo Role Fit em cada posição, e não existe uma lista fechada.
- O Disruptor é arquétipo novo ou o Engine com outro nome e outro grupo? Não confirmado por fonte EA.
- Os ICONs de Shot Stopper, Sweeper Keeper, Progressor, Boss, Recycler, Maestro, Creator, Magician, Finisher e Target vêm só do Dexerto. Não confirmado por print nem por fonte EA.
- A EA pode lançar arquétipos novos durante a temporada. A Pitch Notes do FC 26 prometia "more changes and updates to Archetypes". A lista fechada do código precisa ser revista a cada Pitch Notes do Clubs.
- Um print do grupo `Keeper` aberto (Shot Stopper ou Sweeper Keeper) confirmaria os dois nomes na tela. Vale pedir na próxima rodada do piloto ([#191](https://github.com/ljborgess/ProLobby.com/issues/191)).
