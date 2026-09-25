# Overall do Virtual Pro no Clubs do FC 27

Pesquisa de 24/09/2026. O FC 27 está em acesso antecipado desde 18/09 e o lançamento é em 25/09.

## Pergunta

No EA SPORTS FC 27, modo Clubs, o Virtual Pro ainda tem um overall (OVR) numérico único? Se tiver, em qual tela ele aparece?

Contexto: o piloto de OCR juntou 20 prints reais do menu do Pro no FC 27 (abas Attributes, Archetypes e PlayStyles) e nenhum mostrava overall. Apareciam só os atributos (0-99), o nível do arquétipo ("LEVEL 40"), AP e moedas.

## Achados

### 1. EA, Pitch Notes: Clubs Deep Dive do FC 26 (fonte primária, FC 26)

- URL: https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-clubs-deep-dive
- Data: 31/07/2025
- Seção "Role Fit and OVR":
  - "You can check how well your Archetype selection fits the position & role of each vacant position in your club's chosen tactic. Simply highlight any vacant position on the lobby pitch to observe your Role Fit."
  - "Similarly, when navigating vacant positions on the lobby pitch, you can observe your Archetype's OVR value for the highlighted position."
- Mesma página: "Match Rating in Clubs has been redefined as Role Rating for FC 26". A nota que aparece durante a partida é de desempenho no papel, não o overall.
- Mesma página: "At launch, each Archetype can be progressed from level 1 up to level 50."
- Conclusão: desde o FC 26, o OVR **é do arquétipo em uma posição**. Não é um número fixo do Pro. Aparece no **campinho do lobby** quando o jogador destaca uma posição vaga.

### 2. EA, Pitch Notes: The Grounds Deep Dive do FC 27 (fonte primária, FC 27)

- URL: https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-the-grounds-deep-dive
- Data: 04/08/2026
- A página não fala em OVR, overall, lobby, Role Fit nem Role Rating. Fala de Archetypes, Masteries ("permanent Attribute boosts that carry across all of your builds"), Amps e consumíveis.
- Conclusão: a EA não anunciou mudança no OVR do FC 27. A página também não confirma que ele continua.

### 3. EA, Pitch Notes: Launch Update do FC 27 (fonte primária, FC 27)

- URL: https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-launch-update
- Data: 14/09/2026
- Quando fala em OVR, é sempre de item do Ultimate Team. Sobre o Clubs diz só "Archetypes remain at the heart of how you build and master your Pro" e fala de ganho de AXP. Nada sobre o overall do Pro.

### 4. FCClub.gg: "Player Ratings & OVR Explained" (guia especializado, diz tratar do FC 27)

- URL: https://fcclub.gg/en/ratings
- Data: página diz "updated September 16, 2026" e "Everything here reflects how Clubs works in FC 27". No resultado de busca, o título ainda aparece como "EA FC 26 Player Ratings", então é um texto do FC 26 atualizado.
- "Your Overall Rating (OVR) is built from the attributes you grow over time, and it shifts depending on the position and archetype you play."
- "When you pick a vacant spot in the lobby you can see your archetype's OVR for that specific position."
- Diz também que a mesma build tem nota diferente como atacante, ponta ou meia.
- Conclusão: o mecanismo do FC 26 teria continuado no FC 27. É indício de imprensa, não fonte EA, e a frase é quase igual à Pitch Notes do FC 26.

### 5. Skycoach: guia do Clubs do FC 27 (guia especializado, FC 27)

- URL: https://skycoach.gg/blog/ea-fc/articles/fc-27-clubs-guide
- Data: 22/09/2026
- Explica Archetypes, AXP, Masteries e distribuição de pontos. Não fala de OVR.

### 6. Outras fontes que não consegui ler

- Tópico no fórum da EA, "FC26 - Pro Clubs - Player Overall Reduced Bug" (https://forums.ea.com/idea/fc-26-bug-reports-en/fc26---pro-clubs---player-overall-reduced-bug/13193424). Deu HTTP 403, só vi o título. O título mostra que jogadores do FC 26 acompanham um "overall" do Pro.
- Vídeo "FC 26 Clubs Overall Rating & Role Fit | How Does It Work?" (https://www.youtube.com/watch?v=PLur9bYITWk). Não consegui pegar o conteúdo.
- Guia de arquétipos no help.ea.com (https://help.ea.com/en/articles/ea-sports-fc/archetypes/). Deu timeout.

## Resposta

**Não existe mais um overall único do Pro.** Desde o FC 26, o OVR depende de dois fatores: o arquétipo equipado e a posição. A mesma build tem um OVR diferente em cada posição.

**Onde aparece:** no **lobby do Clubs, no campinho da escalação**, quando o jogador destaca uma posição vaga. Ali aparecem o Role Fit e o OVR do arquétipo naquela posição. As abas Attributes, Archetypes e PlayStyles do menu do Pro não mostram esse número, e isso bate com os 20 prints do piloto. A nota que aparece na partida e no pós-jogo é o Role Rating, que mede o desempenho no jogo e não é o overall.

**Grau de certeza:**
- FC 26: **confirmado por fonte EA** (Pitch Notes do Clubs Deep Dive, 31/07/2025).
- FC 27: **indício de imprensa**. O FCClub.gg afirma que o mecanismo é o mesmo no FC 27, e nenhuma Pitch Notes do FC 27 anuncia mudança. Nenhuma fonte EA do FC 27 confirma de forma explícita.

**Consequência para o projeto:** um print do menu do Pro não tem overall para o OCR ler. Para ter OVR, o print precisa ser do lobby com uma posição vaga destacada. Esse número muda com a posição e o arquétipo escolhidos, então sozinho não é uma âncora estável. A âncora teria que fixar a posição e o arquétipo, ou usar outra medida, como os atributos lidos direto ou o nível do arquétipo.

## Lacunas

- Nenhuma fonte EA do FC 27 fala do OVR do Pro. A continuidade vem de um guia de terceiros.
- Não sei se o FC 27 mostra o OVR em outra tela além do lobby, como a Clubhouse, o card do Pro ou The Grounds. Nenhuma fonte cita outra tela.
- Não confirmei se o OVR do lobby conta os bônus de Masteries e Amps do FC 27.
- O fórum da EA, o vídeo e a página de ajuda da EA não abriram.
- Validação direta: um print do lobby do FC 27 com uma posição vaga destacada resolve a dúvida. Vale incluir isso na próxima rodada do piloto de OCR.
