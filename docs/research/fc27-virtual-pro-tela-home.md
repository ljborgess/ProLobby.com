# Aba Home do Virtual Pro em FC 27: mostra gamertag, overall e arquétipo? (2026-09-24)

## Pergunta investigada

A [issue #164](https://github.com/ljborgess/ProLobby.com/issues/164) pergunta qual aba do menu do Virtual Pro (em EA FC 27, Career Mode ou Clubs) mostra o quê. A aba **Attributes** já foi conferida por alguém do time e **não tem gamertag**. Falta saber: a aba **Home** mostra gamertag, overall e arquétipo do jogador? Essa resposta decide se a tela Home serve pra verificação de identidade no piloto de OCR ([issue #120](https://github.com/ljborgess/ProLobby.com/issues/120)).

Contexto: FC 27 teve acesso antecipado em 18/09/2026 e lançamento em 25/09/2026 (datas do calendário do projeto; hoje é 24/09/2026). Nada medido em FC 26 vale — o jogo mudou (ver [`fontes-checklist-jogo-2026-09-18.md`](fontes-checklist-jogo-2026-09-18.md)).

## Método e suas limitações

Busca feita via WebSearch e WebFetch, sem acesso ao jogo. Tentativas:

- Busca direta por "Virtual Pro Home tab gamertag overall archetype" e variações.
- Fetch de páginas oficiais da EA (Clubs, Career Deep Dive) e de imprensa/guia especializada (FIFPlay, FCClub.gg, VideoGamesChronicle).
- Busca por vídeos do YouTube publicados desde 18/09/2026 que mostrem o menu do Virtual Pro.

**Limitação relevante**: WebFetch não consegue ler metadados nem descrição de página de vídeo do YouTube (retorna só rodapé/links legais do YouTube, sem o conteúdo renderizado por JS) — então não foi possível confirmar, por descrição ou capítulo de vídeo, se algum VOD mostra especificamente a aba Home com timestamp. Também não foi possível abrir vídeo e assistir quadro a quadro (fora do escopo desta ferramenta). Isso repete a limitação já registrada em [`fontes-de-print-fc27-2026-09-18.md`](fontes-de-print-fc27-2026-09-18.md): os vídeos listados lá são candidatos por título, não confirmações.

## Achados

- **EA, página oficial de Clubs** ([ea.com/games/ea-sports-fc/clubs](https://www.ea.com/games/ea-sports-fc/clubs), consultada em 2026-09-24): descreve Clubs como modo social onde se cria um Virtual Pro, mas **não descreve telas de menu, abas ou onde gamertag/overall/arquétipo aparecem**.
- **EA, Career Mode Deep Dive** ([pitch-notes-fc27-career-mode-deep-dive](https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-career-mode-deep-dive), consultada em 2026-09-24): foca em Manager Career e Player Career (Rivalries, Dynamic OVR); **não menciona tela de perfil do Virtual Pro, aba Home, gamertag nem arquétipo**.
- **FIFPlay, "FC 27 Clubs Mode"** ([fifplay.com/fc-27-clubs-mode](https://www.fifplay.com/fc-27-clubs-mode/), consultada em 2026-09-24, sem data de publicação visível no fetch): descreve Virtual Pro Progression e customização em termos gerais; **não descreve layout de tela nem abas**.
- **FCClub.gg, "Pro Clubs FC 27: How It Works"** ([fcclub.gg/en/pro-clubs](https://fcclub.gg/en/pro-clubs), **atualizado em 16/09/2026** — logo antes do acesso antecipado, então pode não refletir a build final): descreve o Clubhouse como hub de gerenciamento do Pro ("reviewing your Archetype, adjusting attributes, managing your Amps loadout, checking Club objectives"), mas **não nomeia abas "Home"/"Attributes" nem descreve onde gamertag aparece**.
- **Resultado agregado de busca** sobre "Clubs Overview page": menciona que dá pra revisar conquistas e estatísticas do clube (Skill Rating, recorde, gols) e compartilhar a URL do clube — mas isso é a página do **clube**, não do Virtual Pro individual, e não é fonte primária citável (é sumarização de resultado de busca, sem página única atribuível).
- **Vídeos candidatos já listados em pesquisa anterior** ([`fontes-de-print-fc27-2026-09-18.md`](fontes-de-print-fc27-2026-09-18.md)), ex. "EAFC 27: First Look at Pro Clubs!" (youtube.com/watch?v=LzJDTSnZyzg) e "EAFC 27: Pro Clubs & The Grounds Early Access!" (youtube.com/watch?v=zSsGKaCpMpI) — continuam candidatos por título, publicados por volta do acesso antecipado (rótulo de busca "1 month ago" a partir de 2026-09-24, compatível com 18/09/2026). **Não foi possível confirmar conteúdo nem timestamp** por WebFetch não renderizar a página do YouTube.

## Resposta pra "a aba Home do Virtual Pro mostra gamertag/overall/arquétipo?"

**Não foi possível responder.** Nenhuma fonte encontrada — oficial ou de imprensa/guia especializada — descreve o conteúdo específico da aba Home do menu do Virtual Pro em FC 27. As fontes que existem falam do Virtual Pro e do Clubhouse em termos gerais (criação, progressão, arquétipos, atributos), mas nenhuma nomeia as abas do menu nem diz o que cada uma exibe.

## Lacunas e ressalvas

- **A pergunta da #164 continua sem resposta por fonte pública.** Só confirmação dentro do jogo (print ou sessão ao vivo) resolve.
- **WebFetch não lê página de vídeo do YouTube** (conteúdo renderizado por JS não vem no fetch) — pesquisa futura que dependa de timestamp/capítulo de vídeo precisa de outra ferramenta ou abrir o vídeo manualmente.
- **FCClub.gg foi atualizado em 16/09/2026**, dois dias antes do acesso antecipado — tratar como indício, não confirmação da build de lançamento.
- Nenhuma citação acima foi inventada; onde a busca não achou nada, este documento diz isso explicitamente em vez de forçar uma resposta.

## Desdobramento no mesmo dia

- **As 20 capturas da rodada 1 do piloto** (`Attributes`, `Archetypes`, `PlayStyles`) não mostram gamertag nem overall em nenhuma aba. A `Home` não aparece em nenhuma delas.
- **A verificação sai do menu do Pro e passa para a tela do lobby do clube.** O overall do Pro só aparece ali ([pesquisa](https://github.com/ljborgess/ProLobby.com/blob/dev/docs/research/overall-pro-clubs-fc27-2026-09-24.md)), e o lobby pode mostrar o gamertag de cada jogador na posição dele. **Se mostrar, a #164 se resolve pela tela do lobby, e a aba `Home` deixa de importar.** Isso se confirma na rodada 2 do piloto (#190). Registro completo em [Piloto de OCR, rodada 2](../requisitos/06-piloto-ocr.md#rodada-2-tela-do-lobby-decidido-em-2026-09-24).
