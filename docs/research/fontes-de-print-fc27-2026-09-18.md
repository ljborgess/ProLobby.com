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
