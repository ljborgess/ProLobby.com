# Fontes públicas de print de FC 27 (2026-09-18)

## Pergunta investigada

Onde encontrar, em fonte pública, material de **EA FC 27** que mostre as duas telas que o produto precisa ler por OCR — pra coletar as primeiras amostras do [piloto de OCR](https://github.com/ljborgess/ProLobby.com/issues/50) sem depender de ninguém do time ter o jogo.

O caminho não é novo: o [`06-piloto-ocr.md`](../requisitos/06-piloto-ocr.md) já define "vídeo pausado na tela do Virtual Pro" como fonte, porque coleta automática não funciona (Reddit e X bloqueiam, e busca web devolve site de montar build).

## As duas telas, que são propósitos diferentes

| Tela | Para quê | Fase | O que o OCR lê |
|---|---|---|---|
| **Virtual Pro** | print de **cadastro** | 2.2 | nome, posição, overall, atributos, gamertag |
| **Fim de partida** | print de **resultado** | 4.1 | placar, nome e nota de cada jogador ([RF-066](../requisitos/05-funcionais.md)) |

O piloto mede a primeira. A segunda é o que decide se a RF-066 é implementável como escrita — e depende da pergunta sem resposta do teste 6 do [checklist](../produto/03-partida/05-checklist.md): se nome de IA é distinguível de gamertag humano.

## Fontes encontradas

**Aviso de método, que vale pra tudo abaixo**: selecionei por **título e data**, e **não abri os vídeos** pra confirmar quadro a quadro que cada um mostra a tela. São candidatos, não confirmações. Quem for coletar confirma ao pausar.

### Candidatos à tela do Virtual Pro (build, arquétipo, atributos)

- [The FC 27 Clubs Archetype System…](https://www.youtube.com/watch?v=ZIFK1UZb7ZU) — sobre o sistema de arquétipo, que é a tela em questão
- [FC 27 The Grounds & Clubs: Amps, Masteries & More!](https://www.youtube.com/watch?v=bMJR0TTtC1k)
- [EAFC 27: First Look at Pro Clubs!](https://www.youtube.com/watch?v=LzJDTSnZyzg)
- [EAFC 27 Pro Clubs: Tips to Start!](https://www.youtube.com/watch?v=01_fzI7kLaU)
- [EAFC 27: Pro Clubs & The Grounds Early Access!](https://www.youtube.com/watch?v=zSsGKaCpMpI)
- [My First Look at The Grounds in FC 27!](https://www.youtube.com/watch?v=-9lnHXZ8Ca0)

### Candidatos à tela de fim de partida

- [EAFC 27 Pro Clubs: My First Game!](https://www.youtube.com/watch?v=lqK9gLe6gc4) — partida completa, então tende a terminar na tela final
- [EA FC 27: NEW Additions, Full Gameplay & Guide](https://www.youtube.com/watch?v=gtUOwpZX6yY)

### Twitch, pra volume

- [Categoria EA Sports FC 27 — VODs](https://www.twitch.tv/directory/category/ea-sports-fc-27/videos/all) — é onde o volume está, e cresce agora com o acesso antecipado
- [Canal oficial da EA](https://www.twitch.tv/easportsfc/videos) — a livestream oficial de gameplay foi em **15/09/2026**, 17:00 UTC

### Fonte da EA, pra conferir o que a tela deve conter

- [The Grounds & Clubs Deep Dive](https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-the-grounds-deep-dive) — arquétipos todos desbloqueados por padrão, reset sem custo, **ajuste de atributo individual**
- [Launch Update](https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-launch-update)

## O que isso muda no piloto

- **Tem material de FC 27 de verdade**, com vídeos de dias atrás. A coleta não precisa esperar alguém comprar o jogo.
- **Print de VOD é caso difícil, e isso é vantagem**: compressão, escala e legenda queimada sujam a imagem. O piloto quer justamente medir o caso difícil — o pedido escrito no `06-piloto-ocr.md` diz que "foto torta ajuda mais".
- **O que print de VOD não resolve**: o teste 7 do checklist (um Virtual Pro ou vários builds salvos) exige navegar o menu, não olhar um quadro. E o nome do jogador de IA na tela final só aparece em partida que tenha IA em campo — não dá pra garantir num VOD qualquer.

## Ressalvas

- **Gamertag é dado pessoal.** Print de VOD carrega gamertag de gente real, e o `06-piloto-ocr.md` já levanta isso pro caso de pedir print a estranhos. Pra amostra de VOD público a exposição é menor, mas a imagem **não deve ser publicada** em issue nem em PR — fica no diretório de trabalho do piloto.
- **Nenhum link foi verificado quadro a quadro.** Se ao abrir não mostrar a tela, descarta e anota — a lista é ponto de partida, não inventário validado.
- **Contagem**: a primeira rodada do piloto é de **20 prints**, não 50 ([recado de 2026-09-16](../time/05-recados.md)).

## Lista de candidatos pra rodada 1 do piloto (2026-09-24)

**Limitação de método**: WebFetch não renderiza página de vídeo do YouTube (só devolve rodapé legal), então não dá pra confirmar por automação em que timestamp — ou se — a tela do Virtual Pro aparece em cada vídeo abaixo. Esta tabela veio de busca por **título, canal e data**, sem abrir nenhum vídeo. São **candidatos, não confirmações**: quem for coletar o print abre o link, avança até achar a tela (perfil do Pro, criação/edição de arquétipo, atributos) e descarta o que não servir. Onde a data de publicação não veio confirmada na busca, marquei "não confirmada" — não inventei data pra preencher a coluna.

Prioridade foi conteúdo publicado a partir do acesso antecipado (18/09/2026); alguns têm indício de recência (a busca devolveu "X dias atrás" relativo a hoje) mas não uma data exata, e isso está anotado. Variedade buscada: idioma (PT, EN, ES, DE, FR) e plataforma (PS5, Xbox, PC, Switch 2) — canal do criador não veio nos resultados de busca na maioria dos casos, então a coluna Canal fica "não capturado" onde a busca não devolveu o nome.

| # | URL | Título | Canal | Data | Por que é candidato |
|---|---|---|---|---|---|
| 1 | https://www.youtube.com/watch?v=hkJTfKaU3zs | How to Join Pro Clubs in EA Sports FC 27 (Full Guide) \| How to Create Pro Clubs Team in FC27 | não capturado | ~18/09/2026 (busca indicou "6 dias atrás") | Guia de criação de time/Pro em Clubs, título sugere passar pela tela de criação do Pro |
| 2 | https://www.youtube.com/watch?v=dBudLgLeKwA | EA FC27 Gameplay & Career Mode LIVE \| TFHD | TFHD | 18/09/2026 (confirmada pela busca) | Live de Career Mode no dia do acesso antecipado, chance de passar pela tela do Virtual Pro no Player Career |
| 3 | https://www.youtube.com/watch?v=Pe09hQqJubs | I PLAYED FC27 ULTIMATE TEAM EARLY!! FUT GALLERY / SBCS / EVOLUTIONS! | não capturado | não confirmada (acesso antecipado, pós-18/09) | Gameplay de acesso antecipado; menor chance (foco é Ultimate Team, não Clubs/Career), mas dá volume |
| 4 | https://www.youtube.com/watch?v=e8veDvfepnA | EA SPORTS FC 27 \| COMEÇANDO NO PRO CLUBS \| DE NOVO | não capturado | não confirmada | Português; "começando" sugere passar pela criação/edição do Pro |
| 5 | https://www.youtube.com/watch?v=1QiFAZ402rw | Guia de Clubes Pro FC27 - The Grounds | não capturado | não confirmada (busca indicou "5 dias atrás") | Português; guia de Clubes/Pro costuma mostrar a tela de arquétipo/atributos |
| 6 | https://www.youtube.com/watch?v=a6V8Y-ZgG1g | MI PRIMER PARTIDO ONLINE en FC 27 🔥 Division Rivals - Gameplay en Español | não capturado | não confirmada (busca indicou "6 dias atrás") | Espanhol; "primeiro jogo online" pode passar por tela de perfil do Pro antes da partida |
| 7 | https://www.youtube.com/watch?v=c_5QMZrZrCs | YA TENGO EL FC 27!! ¿TRAE ALGO NUEVO? PRIMER GAMEPLAY COMPLETO! | não capturado | não confirmada (busca indicou "1 semana atrás") | Espanhol; gameplay completo logo após lançamento/acesso antecipado |
| 8 | https://www.youtube.com/watch?v=5d8WM55omCo | Tengo el EA Sports FC27 para Nintendo Switch 2 ¿Funciona bien? | não capturado | não confirmada | Espanhol, plataforma Switch 2; vídeo de teste geral, pode passar por menus incluindo Pro |
| 9 | https://www.youtube.com/watch?v=0Du87f5dja4 | This is Pro Clubs in FC 27… | não capturado | não confirmada | Inglês; foco direto em Pro Clubs |
| 10 | https://www.youtube.com/watch?v=waFFONizPC8 | HOW TO PLAY CLUBS IN FC 27 | não capturado | não confirmada | Inglês; guia de Clubs, tende a mostrar criação/edição do Pro |
| 11 | https://www.youtube.com/watch?v=N3AcOVNaxEs | FC 27: EA PLAY EARLY ACCESS ERKLÄRUNG! 😍✅ SO SPIELST DU FC 27 FRÜHER! \| FC 27 Ultimate Team | não capturado | não confirmada (pós-acesso antecipado, 18/09) | Alemão; explica acesso antecipado, pode navegar menus do jogo ao vivo |
| 12 | https://www.youtube.com/watch?v=6Ys4qDlwf8U | J'ai joué à FC 27 (Avis Gameplay, The Grounds, Ultimate Team, Carrière...) | não capturado | não confirmada | Francês; título cita "Carrière" e "The Grounds" — ambos podem mostrar a tela do Pro |
| 13 | https://www.youtube.com/watch?v=AizEMD_GZco | EAFC 27 Pro Clubs: Most Asked Questions! (Levels, Face Scan & More!) | não capturado | não confirmada | Inglês; "Face Scan" e "Levels" sugerem tela de criação/perfil do Pro |
| 14 | https://www.youtube.com/watch?v=G_i4itucNjE | EA Sports FC 27 on Nintendo Switch 2 Gameplay | não capturado | não confirmada | Plataforma Switch 2, gameplay geral que pode passar por Clubs/Career |
| 15 | https://www.youtube.com/watch?v=6ldfYXAPfKA | FC 27 The Grounds Mode is INSANE! 🔥 Nintendo Switch 2 Gameplay | não capturado | não confirmada (busca indicou "1 semana atrás") | Plataforma Switch 2; foco em The Grounds, onde fica o Clubhouse/Pro |
| 16 | https://www.youtube.com/watch?v=spGOb9jfFc0 | EA Sports FC 27 on Nintendo Switch 2 Handheld – Gameplay & Performance #eapartner | não capturado | não confirmada (busca indicou "1 semana atrás") | Plataforma Switch 2 (modo portátil); gameplay geral, parceria EA sugere cobertura ampla de menus |
| 17 | https://www.youtube.com/watch?v=qZyKq53YOSQ | 🔴PRO CLUBS GRIND!! part 5 | não capturado | não confirmada | Live/VOD de sessão de Pro Clubs, parte 5 sugere sessões após lançamento, chance de reabrir tela do Pro pra ajustar build |
| 18 | https://www.youtube.com/watch?v=KCH8TXOyGl4 | 🔴PRO CLUBS GRIND!! part 2 | não capturado | não confirmada | Mesma série do #17, canal diferente de outros candidatos da lista |
| 19 | https://www.youtube.com/watch?v=1LoAiw1s294 | Best Archetypes for Each Position in FC 27 Clubs! | não capturado | não confirmada | Inglês; conteúdo de arquétipo tende a mostrar a tela de atributos do Pro |
| 20 | https://www.youtube.com/watch?v=PDCA5ThGkKU | New Archetype Objectives in FC 27 Clubs & The Grounds | não capturado | não confirmada | Inglês; objetivos de arquétipo, mesma tela-alvo do #19 |

**Nota**: excluí da lista vídeos que a busca datou claramente de antes do acesso antecipado (julho/agosto de 2026, ex.: "Pro Clubs & The Grounds Official Reveal", "Pro Clubs Is Changing Forever...", "Everything We Know About Pro Clubs") — são conteúdo de anúncio/preview, não gameplay real, então não servem de fonte de print mesmo como candidato.
