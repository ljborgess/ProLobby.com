# Recados — o que mudou pra cada um

**Leia no começo de toda sessão, antes de pegar trabalho.** O que muda o jeito de trabalhar de alguém entra aqui, com data e o nome de quem é afetado. A IA de cada um (Cursor no Rafael, Claude Code no Felipe) lê este arquivo e já sabe o que mudou desde a última vez.

Recado vale até ser marcado como **resolvido**. Não se apaga: o histórico explica por que a regra existe.

---

## 2026-10-20 · Rafael

### A #252 (telas do lobby) passou pro Luciano

- **O que mudou:** o Luciano pegou a #252, porque não tinha branch nem PR dela ainda. A tela da fila agora segue o estado do lobby depois dos 30 s, na mesma cena do gramado: capitão (tenho vaga / não tenho / o clube encheu), quem espera a escolha dos capitães, convite recebido (o capitão tem "o clube encheu"), votação de formação com desempate do capitão e "partida em andamento".
- **API:** `GET /api/queue` ganhou `entry.cancelledLobby` (`{ state, endedAt }` ou `null`). Ele diz por que a busca recomeçou quando o lobby foi cancelado; lobby desfeito nos 30 s não deixa registro, e a tela deduz pelo lobby que sumiu.
- **O que sobra pra você nesse fluxo:** as telas do report, da contestação, da avaliação e da denúncia (fatia E da 4.1 e 4.2), que entram por cima de "partida em andamento". O contrato está nos recados de 2026-10-15 e 2026-10-20.

---

## 2026-10-15 · Rafael

### O report de placar existe na API (4.1, primeira fatia)

- **`POST /api/queue/report`**, multipart: arquivo em `print` (até 10 MB), `scoreA` e `scoreB` (inteiros de 0 a 20). `201` com `{ id, side, scoreA, scoreB }`.
  - Antes dos 5 min do lobby fechar: `409 report_too_early` com `retryAfterSeconds`.
  - Imagem ruim: `400 invalid_format` ou `400 image_too_small` (as mesmas do print de personagem).
  - Arquivo já usado: `409 print_already_used`. Segundo report da mesma pessoa: `409 report_exists`. Partida ainda não começou: `409 report_closed`.
- **`PUT /api/queue/report`** com `{ scoreA, scoreB }`: corrige o placar enquanto ninguém do outro lado reportou. Depois, `409 report_closed`.
- **`GET /api/queue`**: `entry.lobby` ganhou `reportableFrom` (quando o envio libera) e `myReport`. O estado novo `awaiting_confirmation` aparece depois do primeiro report.
- Ainda não tem a confirmação cruzada (15 min) nem contestação; vêm nas próximas fatias.

### A confirmação cruzada do placar existe na API (4.1, fatia B)

- **O primeiro report do outro lado decide.** Placar igual a todos os já enviados: `finished`. Qualquer diferença, inclusive entre colegas do mesmo lado: `in_dispute`, com caso `score_dispute` pra moderação, e a fila continua presa.
- **15 min sem o outro lado:** `not_confirmed` com o placar do primeiro report, e a fila fica livre. Passadas 48 h sem contestação, `finished`.
- **Report ou correção depois dos 15 min:** `409 report_closed`, mesmo antes do job rodar.
- **Em `finished` e `not_confirmed` a entrada da fila some** (a conta sai da fila e o personagem destrava), então o `GET /api/queue` volta com `entry: null`. A tela de resultado depois disso é da fatia E.
- **`GET /api/queue`:** `entry.lobby.reportConfirmBy` diz até quando o outro lado reporta (`null` antes do primeiro report).
- **Contestação (fatia C):** `POST /api/queue/contest` com `{ lobbyId }` (o lobby vai no corpo porque, nas 48 h, a pessoa pode já estar em outra partida). `204`; leva o lobby pra `in_dispute` com caso `score_dispute` aberto por quem contestou. Erros: `404 no_lobby` (não jogou essa partida), `409 contest_exists` (já contestou essa), `409 contest_closed` (fora das 48 h, partida confirmada pelos dois lados ou já em disputa).
- **De onde a tela tira o `lobbyId`:** depois que a partida assenta a `entry` some, e o `GET /api/queue` passa a trazer `lastMatch` no topo: `{ lobbyId, state, scoreA, scoreB, contestUntil }` da última partida com resultado (`not_confirmed`, `finished`, `in_dispute` ou `expired_no_report`). `contestUntil` só vem preenchido enquanto essa conta ainda pode contestar; é o sinal pra mostrar o botão.
- **Partida em disputa prende a fila de todos dela:** `POST /api/queue` responde `409 match_in_dispute`, e quem estava buscando de novo sai da busca. Quem já caiu num lobby novo continua nele.
- **Zero-report (fatia D):** 60 min do `fechado_em` em `in_progress` sem nenhum print levam a `expired_no_report`, terminal, com a fila de todos liberada e −3 de reputação pra cada humano (escala da RF-071 a partir da 3ª vez em 30 dias). Report depois dos 60 min: `409 report_closed`. Lobby que não chegou a `in_progress` nunca expira por aqui.
- **Reputação sim, elo não:** ao virar `finished` (pelos dois caminhos), cada humano ganha o +1 de partida limpa, até 70. O elo é a #209. O ponto de encaixe é a passagem pra `finished` em `match-report.service.ts` (`settle` e o `expire`); `lobby.scoreA`/`scoreB` guardam o placar que vale.


### A #250 fecha mandando `lobby.channels_created` pra API (#249)

- **O que mudou:** a votação de formação (#249) abre quando a API sabe que os canais existem. O evento bot → API já está em `@prolobby/types` (`lobbyChannelsCreatedEventSchema`): `{ lobbyId, textChannelId, voiceAChannelId, voiceBChannelId }`, assinado como os `discord.*`, pro mesmo `POST /api/bot-events`.
- **O que fazer na #250:** depois de criar os 3 canais do `lobby.closed`, mande esse evento. A API guarda os ids (a #251 apaga por eles) e abre os 60 s. Repetir o evento não muda nada; pode reenviar sem medo.
- **Pra #252, no `GET /api/queue`:** `entry.lobby.formation` traz `options`, `voteBy` (`null` até os canais existirem), `myVote`, `chosen` (a do lado, quando decidida) e `captainChoices` (só pro capitão, quando o lado empatou ou ninguém votou).
- **Rotas:** `PUT /api/queue/formation-vote` com `{ formation }` vota ou troca o voto dentro dos 60 s (`409 formation_vote_closed` fora do prazo). `PUT /api/queue/formation` com `{ formation }` é a escolha do capitão: `404 not_a_captain`, `409 formation_not_pending`, `400 formation_not_allowed` se não estiver entre as empatadas.

---

## 2026-10-14 · Rafael

### O que a API do lobby entrega pra #252 (#247 e #248)

- **`GET /api/queue`**: o `entry.lobby` ganhou campos novos.
  - Capitão: `captainOffer` (`{ answerBy, clubName }` enquanto o papel está oferecido a essa conta, senão `null`) e `isCaptain`.
  - Convite: `inviteBy` (fim dos 5 min, `null` antes dos dois capitães confirmarem), `inviteClubName` (o clube do capitão do lado, de onde vem o convite), `inviteReceived` e `clubFullDeclared`.
  - Estados novos em `state`: `waiting_invite`, `in_progress`, `cancelled_no_fault` e `cancelled_by_captain`. Num cancelamento, a `entry` volta com `lobby: null` e a pessoa está buscando de novo.
- **`PUT /api/queue/captaincy`** com `{ answer: 'confirm' | 'decline' | 'full' }`: `204`. Depois dos 30 s, `409 captaincy_closed`; clube já em uso por outro lobby, `409 club_in_use`; sem oferta, `404 no_captaincy_offer`.
- **`DELETE /api/queue/captaincy`**: o capitão confirmado desiste antes do outro lado confirmar. `204`; depois, `409 captaincy_closed`.
- **`PUT /api/queue/invite`** (sem corpo): recebeu o convite. `204`; fora da janela, `409 invite_closed`; fora de lobby, `404 no_lobby`.
- **`PUT /api/queue/club-full`** (sem corpo): só o capitão, durante a janela. `204`; quem não é capitão, `404 not_a_captain`.

---

## 2026-10-09 · Rafael

### A Fase 3 (fechamento do lobby) está dividida com o Luciano

A [#56](https://github.com/ljborgess/ProLobby.com/issues/56) virou 6 issues. A API do lobby fica com o Luciano; o bot e as telas, com você.

| Issue | Quem | O quê | Bloqueada por |
|---|---|---|---|
| [#247](https://github.com/ljborgess/ProLobby.com/issues/247) | Luciano | cascata de capitão (API) | — |
| [#248](https://github.com/ljborgess/ProLobby.com/issues/248) | Luciano | convite recebido em 5 min | #247 |
| [#249](https://github.com/ljborgess/ProLobby.com/issues/249) | Luciano | votação de formação | #247, #250 |
| [#250](https://github.com/ljborgess/ProLobby.com/issues/250) | **Rafael** | canais do lobby no bot | #247 |
| [#251](https://github.com/ljborgess/ProLobby.com/issues/251) | **Rafael** | deleção dos canais, faxina, limites 400/500 | #250 |
| [#252](https://github.com/ljborgess/ProLobby.com/issues/252) | **Rafael** | telas do lobby: capitão, convite, formação | #247, #248, #249 |

- **Sua ordem não muda no começo:** termine a #209, depois a #234 e o formulário da #229. A Fase 3 só destrava pra você quando a #247 entrar.
- **O bot já tem o padrão de handler:** o aviso de caso de moderação (#226, PR #245) criou o `onEvent` no servidor de webhook. O `lobby.closed` da #250 entra do mesmo jeito: handler que falha responde 503 e a API tenta de novo.
- **A tela da fila é a base da #252:** o Túnel do Vestiário (`queue-screen.tsx`) já para no cartão de partida aceita. As etapas do lobby continuam dali, na mesma cena.
- **RF-051/052 seguem "a calibrar"** pelo checklist no jogo (#63): construa com o que está escrito.

---

## 2026-10-08 · Para todos

### `JWT_SECRET` com menos de 32 caracteres derruba a API no boot

- **O que mudou:** a API exige pelo menos 32 caracteres no `JWT_SECRET` (revisão de segurança, PR `fix/sessao-revogavel`). Se o seu `apps/api/.env` tiver um valor curto, a API para de subir com uma mensagem dizendo isso.
- **O que fazer:** gere um novo com `openssl rand -base64 48` e troque no `.env`. Quem estiver logado na sua máquina vai precisar logar de novo.
- **E também:** redefinir a senha agora encerra todas as sessões abertas daquela conta (ADR-007 revisto). Num teste e2e que faz login e depois redefine a senha, o cookie antigo deixa de valer.

---

## 2026-10-07 · Rafael

### A #229 foi dividida: a API fica com o Luciano, a tela continua sua

- **Por quê:** a #231 (a fila cria o lobby) precisa do `freeSlots` de cada pessoa pra achar capitão (RF-006). Sem a declaração de clube, nenhum lobby fecha. O montador (#230) e a entrada na fila (#228) já estão em `dev`.
- **O Luciano faz a API:** tabela `declared_club` e `GET`/`PUT`/`DELETE /api/accounts/me/club`, com a validação (0 a 10 vagas, nome até 20) e o e2e.
- **Você faz o formulário no painel:** pt e es, DESIGN.md e teste do formulário. Começa quando o PR da API entrar em `dev`. O formato da resposta vai estar descrito no PR.
- **A #233 passou pro Luciano** (decidido no mesmo dia, pra ver a fila no visual antes dos merges). A tela `/queue` está no PR #241. **A tela virou o Túnel do Vestiário** (DESIGN.md) e, a pedido do Luciano, **já traz o cartão de Aceitar / Recusar** com o anel dos 30 s (`MatchFound`, em `queue-screen.tsx`, via `PUT /bff/queue/confirmation`) e o mostrador do bloqueio. **Antes de pegar a #234, alinhe com o Luciano o que sobra dela**: provavelmente o aviso do que falta aos 10 min (RF-007) e a repetição a cada 5 min.

### O que a API da fila entrega pras suas telas (#231 e #232, PRs #239 e #240)

- **`GET /api/queue`** agora devolve `{ entry, blockedUntil }`. `blockedUntil` é o fim do bloqueio por recusa, ou `null`. A `entry` ganhou `lobby`: `null` enquanto busca e, depois de escalado, `{ state, confirmBy, confirmed }`. O `confirmBy` é o fim dos 30 s; a contagem da tela sai dele, não do relógio do navegador no momento em que a tela abriu.
- **`PUT /api/queue/confirmation`** com `{ accept: true | false }` responde `204`. Depois dos 30 s, dá `409 confirmation_closed`; sem lobby, `404 no_lobby_to_confirm`.
- **Entrar na fila bloqueado** dá `403 queue_blocked`, com `blockedUntil` e `retryAfterSeconds`.
- **Sair da fila depois de escalado** dá `409 queue_entry_in_lobby`: a saída é recusar.

---

## 2026-10-06 · Rafael

### A Fase 2.5 (fila e matchmaking) está dividida com o Luciano

A [#55](https://github.com/ljborgess/ProLobby.com/issues/55) virou 7 issues. O Felipe não entra nesta fase: as telas ficam com você.

| Issue | Quem | O quê | Bloqueada por |
|---|---|---|---|
| [#228](https://github.com/ljborgess/ProLobby.com/issues/228) | Luciano | entrar e sair da fila, personagem travado | — |
| [#229](https://github.com/ljborgess/ProLobby.com/issues/229) | **Rafael** | clube declarado, API e formulário | — |
| [#230](https://github.com/ljborgess/ProLobby.com/issues/230) | Luciano | montador de partida, função pura | — |
| [#231](https://github.com/ljborgess/ProLobby.com/issues/231) | Luciano | job que cria o lobby | #228, #229, #230 |
| [#232](https://github.com/ljborgess/ProLobby.com/issues/232) | Luciano | confirmação de 30 s e timeout progressivo | #231 |
| [#233](https://github.com/ljborgess/ProLobby.com/issues/233) | **Rafael** | tela da fila, faixa de movimento, medidor | #228 |
| [#234](https://github.com/ljborgess/ProLobby.com/issues/234) | **Rafael** | tela de confirmação, bloqueio e aviso do que falta | #230, #232, #233 |

- **Termine a #209 antes**: a #211 já entrou, mas o resultado de partida ainda não vira elo. Depois, **a #229**: ela não espera ninguém, e a #231 espera por ela.
- **O medidor de reputação está pronto** na branch `feat/painel-medidor` (`reputation-gauge.tsx`). Traga ele pra #233 em vez de desenhar de novo.
- **Nenhuma resposta de API mostra quantas pessoas estão na fila** (RF-008), só a faixa.
- **O cargo Beta na entrada (RF-076) ficou fora**: entra com a Fase 6 ([#61](https://github.com/ljborgess/ProLobby.com/issues/61)).

---

## 2026-10-02 · Rafael

### O #222 entrou, e o restante da #207 ficou com o Luciano

- **O #222 foi mergeado em `dev`.** O `EloService` está disponível, então **a #209 está livre**: ela é sua e continua sendo o gargalo da fase, porque a #211 espera por ela.
- **A #207 não fechou com o #222.** Faltou o critério "o elo aparece na lista de personagens e na tela, em pt e es". A rota `GET /characters` e a tela de elenco já existiam. O Luciano pegou essa parte e trocou o `Closes` por `Parte de` no seu PR.
- **Na #209, leia o elo pelo `EloService`.** O `ofIn(em, ...)` é para quem precisa ver, dentro da transação, o evento que acabou de gravar. Para a lista inteira da conta existe o `byCategory`. Nenhum outro lugar soma `EloEvent`.
- **A resposta de personagem agora traz `elo`** (lista, criação e troca de categoria). Se algum teste seu confere a lista exata de campos da resposta, o `elo` entra nela.
- **Antes de abrir PR, confira um a um os critérios de aceite da issue.** A revisão automática do #222 aprovou sem notar o critério que faltava.

---

## 2026-09-25 · Rafael

### A Fase 2.4 (motor de elo e reputação) está dividida com o Luciano

A [#53](https://github.com/ljborgess/ProLobby.com/issues/53) virou 5 issues. **Não tem decisão pendente**: os parâmetros estão em `parametros.md`, e nenhum é "a calibrar".

| Issue | Quem | O quê | Bloqueada por |
|---|---|---|---|
| [#207](https://github.com/ljborgess/ProLobby.com/issues/207) | **Rafael** | elo da categoria calculado pelos eventos, sem coluna | — (a 2.2 já está em `dev`) |
| [#209](https://github.com/ljborgess/ProLobby.com/issues/209) | **Rafael** | resultado de partida vira evento de elo (RF-077) | #207 |
| [#208](https://github.com/ljborgess/ProLobby.com/issues/208) | Luciano | reputação muda só por evento: partida limpa, desconexão, suspensão cumprida | — |
| [#210](https://github.com/ljborgess/ProLobby.com/issues/210) | Luciano | rollback de partida anulada (RF-044) | #209, #208 |
| [#211](https://github.com/ljborgess/ProLobby.com/issues/211) | Luciano | decaimento por inatividade, piso em 1000 (RF-017) | #209 |

- **Sua trilha é a do elo: #207 e depois #209.** A #210 e a #211 do Luciano esperam a #209, então ela é o gargalo da fase.
- **O elo não tem coluna** (decidido em 2026-09-25): é 1000 mais a soma dos eventos não revertidos de **todos os personagens da conta na categoria e edição**. Personagem substituto herda o elo (RF-027). Ninguém escreve elo direto.
- **Ainda não existe partida** (Fases 3 e 4.1). O motor recebe o resultado como entrada de serviço, sem rota HTTP, e é conferido por teste.
- **Ao pegar, comente na issue**, e o deploy (#121) continua valendo em paralelo.

---

## 2026-09-24 · Para todos

### A Fase 2.2 abriu, e o OCR entra por último

A fase está quebrada em 6 issues, sub-issues da [#52](https://github.com/ljborgess/ProLobby.com/issues/52). Cinco já viraram PR; **só a #199 é trabalho em aberto**:

| Issue | PR | O quê |
|---|---|---|
| [#194](https://github.com/ljborgess/ProLobby.com/issues/194) | [#201](https://github.com/ljborgess/ProLobby.com/pull/201) | personagem: tabela e cadastro com categoria e arquétipo |
| [#195](https://github.com/ljborgess/ProLobby.com/issues/195) | [#202](https://github.com/ljborgess/ProLobby.com/pull/202) | envio de print: upload, hash e checagens antes do OCR |
| [#196](https://github.com/ljborgess/ProLobby.com/issues/196) | [#203](https://github.com/ljborgess/ProLobby.com/pull/203) | tela de envio, com instruções e mensagem por causa de rejeição |
| [#198](https://github.com/ljborgess/ProLobby.com/issues/198) | [#204](https://github.com/ljborgess/ProLobby.com/pull/204) | verificação pela moderação, que faz o fluxo andar sem OCR |
| [#197](https://github.com/ljborgess/ProLobby.com/issues/197) | [#205](https://github.com/ljborgess/ProLobby.com/pull/205) | confirmação do arquétipo ativo e cooldown de 24 h (parte) |
| [#199](https://github.com/ljborgess/ProLobby.com/issues/199) | — | OCR no fluxo, bloqueada pela [#191](https://github.com/ljborgess/ProLobby.com/issues/191) |

**Tudo em `dev` desde 2026-09-25** (#192, #193 e #200 a #205); as issues #194 a #198 foram fechadas à mão, porque merge em `dev` não fecha issue sozinho.

- **Até a #199 entrar, todo print recebido abre caso de moderação** (#204). O moderador digita o arquétipo e o gamertag que vê no print, e o servidor compara com o cadastro. Ninguém verifica o próprio caso.
- **O que a #205 cobre da #197**: caixa de confirmação do arquétipo ativo, cooldown de 24 h contado da aprovação, e um print em análise por personagem. A tela de confirmação com os campos lidos e a confiança foi pra #199, porque só existe com OCR.

### Decidido em 2026-10-06: regra dos 7 dias sai

O `01-verificacao.md` liberava a reivindicação provisória de gamertag depois de 7 dias sem verificação. O #205 não implementou: a provisória não bloqueia ninguém (quem impõe exclusividade é o índice das verificadas), então apagá-la não libera nada, e ainda quebraria o personagem pendente se a moderação passar de 7 dias. **Decisão: a regra saiu do documento**; a provisória não expira.

### O que mudou na verificação, e onde está escrito

- **O print de verificação é a tela `Archetypes`**, com o arquétipo ativo aberto. Não é mais a aba `Attributes`.
- **Os campos lidos são arquétipo e gamertag**; a categoria é escolhida pelo jogador e conferida pelo grupo do arquétipo. O nome embaixo do arquétipo no card **é o gamertag**, com o ícone da plataforma. Isso resolveu a [#164](https://github.com/ljborgess/ProLobby.com/issues/164) sem precisar abrir o jogo.
- **Overall e atributos saíram.** Desde o FC 26, o overall só existe por posição, no lobby do clube. O seed do elo fica neutro.
- **O jogador escolhe a categoria, e o arquétipo tem que ser compatível**: Keeper → Goleiro; Defender → Zaga/Lateral; Midfielder → Meio ou Ponta; Forward → Ponta ou Ataque. A tabela está em `01-verificacao.md` ([PR #193](https://github.com/ljborgess/ProLobby.com/pull/193)).
- **Piloto, rodada 2a** ([PR #192](https://github.com/ljborgess/ProLobby.com/pull/192), em `dev`): 5 de 9 aceitos (56%) e zero falso aceite em 96 checagens, com a conferência pela linha inteira do card; a regra fixa é **0 gamertags de outra pessoa aceitos**. Um número de 78% chegou a circular e estava errado: a conferência aceitava pedaço de gamertag. Por isso o OCR entra por último, e a #199 só anda quando a #191 medir de novo. Detalhes no `06-piloto-ocr.md`.

### Duas regras novas

- **Zero falso aceite.** Nenhum ajuste de OCR aumenta a aprovação afrouxando a conferência do gamertag. O relatório do piloto mede isso em toda rodada (`impostorCheck`).
- **Print e gabarito com gamertag real não entram no git.** Vale pra `apps/ocr-pilot/prints/`, pros relatórios e pro gabarito da tela `Archetypes`. O `.gitignore` da `dev` cobre os três desde o PR #192. Em branch criada antes disso, **não use `git add .` no `ocr-pilot`**.

### O OCR continua local

Google Vision foi descartado por custo. O motor é Tesseract, com a biblioteca de imagem `sharp` (entrou no `ocr-pilot`) pra recortar e ampliar o card antes da leitura.

---

## 2026-09-24 · Rafael

### A #199 é da sua área, mas espera

O OCR no fluxo cai no seu paralelo pelo #64, mas está bloqueado pela #191: o número do piloto precisa se confirmar com prints novos. **Não há o que adiantar antes dela**: #195 a #198 já estão nos PRs #202 a #205. A #199 é o que sobra da 2.2, e é sua (ou de quem estiver livre quando a #191 destravar).

A #199 inclui uma decisão com ADR: **onde o OCR roda**, se no processo da API ou num worker separado. O OCR é pesado pra rodar no mesmo processo que atende requisição.

---

## 2026-09-24 · Felipe

### As telas da 2.2 já viraram PR: revise e abra no navegador

A tela de envio (#196) e a confirmação com cooldown (#197) já estão nos PRs [#203](https://github.com/ljborgess/ProLobby.com/pull/203) e [#205](https://github.com/ljborgess/ProLobby.com/pull/205). O trabalho agora é outro:

- **Revisar o #203 e o #205.**
- **Abrir `/account/character` e `/moderation` no navegador**: nenhuma das duas foi vista rodando, só em teste. Anote no PR o que quebrar ou ficar confuso, em pt e es.
- O visual segue o padrão das telas atuais: o redesenho só começa no fim da 2.5.
- O exemplo da tela de envio é desenho (`archetype-example.tsx`, #203): **não troque por print real**.

Não há issue de código livre na 2.2 além da #199, que espera a #191.

---

## 2026-09-23 · Para todos

### #150 em `dev` — **resolvido** (PR #183 mergeado em 2026-09-23)

A última fatia da Fase 2.3 (RF-060: sair do Discord bloqueia a fila, com aviso in-app pt/es) entrou em `dev` pelo [PR #183](https://github.com/ljborgess/ProLobby.com/pull/183). O recado da manhã dizia que a revisão ainda bloqueava o merge — as falhas foram corrigidas no próprio PR. **Não sobra trabalho de código destravado na Fase 2.3** — o que resta (RF-055, cargo Verificado) depende da Fase 2.2, travada no piloto de OCR (#50) e na confirmação da aba Home ([#164](https://github.com/ljborgess/ProLobby.com/issues/164)).

O script do piloto ([#120](https://github.com/ljborgess/ProLobby.com/issues/120), PR #181) já está em `dev`. A medição nos 20 prints reais é a [#50](https://github.com/ljborgess/ProLobby.com/issues/50).

### #164 precisa de alguém com o FC27 aberto — **resolvido sem abrir o jogo** (2026-09-24)

A aba `Home` deixou de importar: o gamertag aparece no card da tela `Archetypes`. Ver o recado de 2026-09-24. O texto abaixo fica como histórico.

**Não é tarefa de IA**: exige console/PC com o jogo rodando e um Virtual Pro salvo. Quem pegar:

1. Career Mode → Virtual Pro → aba **`Home`** (não a `Attributes`, essa já foi conferida e não tem gamertag).
2. Print e registrar na issue: a aba mostra gamertag? Overall? Arquétipo?
3. Se mostrar os dois, o conserto é só trocar qual tela o cadastro pede — a Fase 2.2 segue quase intacta.
4. Se não mostrar em nenhuma tela do Pro, ver as 5 alternativas já listadas na issue antes de decidir do zero.

Dá pra fazer na mesma sessão do checklist do #63 (mesma natureza: minutos de jogo). **Bloqueia a Fase 2.2** de um jeito que o piloto de OCR sozinho não resolve — mesmo quando o piloto tiver as 20 capturas, sem essa decisão o campo lido pode estar errado.

---

## 2026-09-21 · Para todos

### Antes de rodar e2e: o banco é outro, e ele apaga tudo

As suítes e2e apagam **todas** as tabelas (`refreshDatabase`), e o banco padrão era o mesmo do `pnpm dev` — uma rodada apagou contas que estavam sendo testadas à mão. Agora o e2e **se recusa** a rodar em banco cujo nome não termine em `_e2e`.

- **Uma vez, quem já tem volume local do Postgres:**

  ```bash
  docker compose exec postgres createdb -U prolobby prolobby_e2e
  ```

- **Daqui pra frente:**

  ```bash
  DATABASE_URL=postgres://prolobby:prolobby@localhost:5432/prolobby_e2e pnpm turbo e2e
  ```

  Quem subiu o Postgres na 5442 troca a porta na URL. Volume novo já nasce com o banco (`scripts/postgres-init/`).

- **No CI o banco agora é `prolobby_e2e`.** Se você mexer no workflow, mantenha o nome.

### Dois segredos novos são obrigatórios no boot da API

A API não sobe sem eles, e isso é de propósito: segredo lido na primeira requisição falha em silêncio.

- **`IDENTITY_HMAC_SECRET`** (32 bytes, `openssl rand -base64 32`) — chaveia o hash de Discord ID e gamertag. **Trocar o valor invalida todo hash gravado**, então não é rotação casual.
- **`EVIDENCE_ENCRYPTION_KEY`** já existia, continua obrigatório.
- **`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` e `DISCORD_REDIRECT_URI`** são obrigatórios **só em produção**. Fora dela, a tela de vínculo responde "indisponível" em vez de derrubar o boot. O `DISCORD_CLIENT_SECRET` é do aplicativo, **não é o token do bot**.

Os exemplos estão em `apps/api/.env.example` e `deploy/production.env.example`.

### Rota `/bff` nova que muda estado chama `rejectCrossSite`

A auditoria de 2026-09-21 achou **CSRF de login** confirmado: um POST `text/plain` de qualquer site virava JSON no proxy e recebia o cookie de sessão. O `SameSite: lax` não cobre login nem cadastro, porque eles não dependem de cookie existente.

- Toda rota `/bff` que muda estado chama `rejectCrossSite` (em `apps/web/src/common/api/same-origin.ts`).
- A exceção é o callback do Discord, que é navegação vinda de outro site por definição e é protegido pelo `state` de uso único.
- O item 9b do [checklist de segurança](../requisitos/08-seguranca-checklist.md) foi corrigido: ele dizia que o `SameSite` fechava o CSRF.

### Fase 2.3 andou: o vínculo com o Discord está em `dev`

- **#149 mergeado** (PR #165), testado ponta a ponta com o Discord real: tela em `/account/discord`, recusa de identidade banida e vínculo exclusivo.
- **#150 fatia 1 mergeada** (PR #166): o canal bot → API (`POST /bot-events`, assinado com o mesmo HMAC invertido) e o estado de presença na conta. **Faltam o bot e o aviso na tela.**
- **PR #167** fechou os achados da auditoria. O que sobrou virou issue: [#168](https://github.com/ljborgess/ProLobby.com/issues/168) (robustez do boot do bot) e [#169](https://github.com/ljborgess/ProLobby.com/issues/169) (`qs` vulnerável no bot).
- O README ganhou a seção **Novidades**, com as telas novas. É o lugar mais rápido pra ver o que existe hoje.

---

## 2026-09-21 · Rafael

### 1. O deploy (#121) ganhou três requisitos novos

Nenhum é grande, mas o deploy falha sem eles:

- **`IDENTITY_HMAC_SECRET`** no ambiente de produção (ver o recado acima).
- **As três variáveis do Discord** (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`), com o `redirect_uri` **idêntico** ao cadastrado no portal: `https://prolobby.com.br/bff/discord/callback`.
- **Volume `api-evidence`** no `docker-compose.prod.yml`, já commitado. Ele existe porque a evidência de recuperação de conta era gravada dentro do container: sem permissão de escrita e sem volume, **toda recuperação respondia "recebido" e não abria caso**. Agora a API não sobe se não conseguir gravar na pasta.

### 2. Suas issues pequenas continuam suas

**#156** (rota legada do Nest 11) e **#157** (codemod `middleware-to-proxy` do Next 16) ainda não têm PR. O aviso do `middleware` aparece em todo build do `apps/web`, e o da rota em todo boot da API.

Depois delas, a sua fila é **#155** (tipo de caso de moderação para troca de identidade vinculada).

### 3. Duas issues novas do bot

[#168](https://github.com/ljborgess/ProLobby.com/issues/168) e [#169](https://github.com/ljborgess/ProLobby.com/issues/169) saíram da auditoria e são da sua área. A #169 é uma linha (`express@^4.22.3`, que já traz o `qs` corrigido); a #168 é o boot do bot validando segredo antes de conectar, com log e healthcheck.

---

## 2026-09-21 · Felipe

### O prazo de sexta (18/09) venceu sem sinal

O recado de 2026-09-16 dizia: **se até sexta, 18/09, a #106 e a #87 não tiverem sinal** (comentário ou draft PR), elas passam pro Luciano. A data passou. As duas issues fecharam na Fase 2.1 pelo caminho do Luciano.

**O que isso significa pra você:** nada foi tirado como punição, e não há trabalho seu em curso registrado. Se você voltar a pegar issue, comente nela antes de começar ([regra de 2026-09-16](#trabalho-em-andamento-precisa-aparecer)) — é o que evita dois devs no mesmo arquivo.

**Antes de pegar qualquer coisa**, leia os recados de 2026-09-21 acima: o e2e agora exige o banco `prolobby_e2e`, e a API exige dois segredos novos no boot.

---

## 2026-09-18 · Para todos

### Animação tem gatilho agora, e o gatilho não é hoje

A regra "não polir visual" continua valendo, e animação está dentro dela. O que mudou é que o redesenho deixou de ser "depois" e ganhou condição: **começa quando a fila existir**, no fim da Fase 2.5.

- **Não instale biblioteca de animação** (Motion, GSAP, o que for) antes disso. Quando chegar a hora, o default é CSS e View Transitions; biblioteca entra só se a interação exigir, e a interação precisa ser nomeada antes de instalar — os três casos previstos são elemento compartilhado entre telas, gesto com física e stagger orquestrado por estado.
- **Se você já precisa de transição hoje**, use CSS. É o que sobrevive ao redesenho e não cobra bundle.
- **`prefers-reduced-motion` entrou no piso de acessibilidade** ([RNF-015](../requisitos/07-nao-funcionais.md#rnf-015--piso-de-acessibilidade)): toda animação respeita, e **nada comunica estado só por movimento** — se pulsa pra dizer "esperando", tem texto ou ícone dizendo o mesmo. Vale pra qualquer CSS que você escrever agora, não só pra depois.

Racional completo em [Visão](../produto/01-visao/01-visao.md#o-visual-atual-é-base-provisória--o-front-end-será-redesenhado-decidido-em-2026-09-17).

---

## 2026-09-17 · Para todos

### `pnpm dev` agora lê o `.env` de cada app

Antes, API, bot e CLI de migration **ignoravam** `apps/*/.env`: só funcionavam com variável exportada no shell. Sem ela, a API caía no banco da porta 5432 (o de outro projeto, em quem usa a 5442) e falhava com `auth_failed`. E exportar o `.env` no shell vazava `PORT=3001` pro Next, que roubava a porta da API.

- **`pnpm dev` e `pnpm start` carregam o `.env` do próprio app.** Não exporte `.env` no shell; se já tem alias ou script que faz isso, apague.
- **Migration:** `pnpm --filter @prolobby/api mikro-orm migration:up` (ou `pnpm mikro-orm ...` dentro de `apps/api`). O `pnpm exec mikro-orm` antigo continua sem ler o `.env`.
- **Variável no shell ganha do `.env`.** Um `DATABASE_URL` esquecido no terminal ainda manda.
- **`PORT` saiu da lista do turbo.** Cada app lê a porta do próprio `.env`.
- Testes e e2e não mudaram: continuam recebendo `DATABASE_URL` pelo comando.

### O visual do front-end é provisório

O layout de `apps/web` **vai ser redesenhado depois**. As telas atuais (home, cadastro, login) são base, não desenho final.

- **Tela nova segue o padrão das atuais**: mesmo design system, mesmo jeito de montar formulário e texto traduzido.
- **Não invista em polimento visual** — é retrabalho garantido. O esforço vai em comportamento: acessibilidade, i18n, estados de erro e segurança.
- O que sobrevive ao redesenho e precisa estar certo agora: texto no dicionário de `src/content/`, rótulo acessível e token do design system num lugar só.

Detalhes em [Visão](../produto/01-visao/01-visao.md#o-visual-atual-é-base-provisória--o-front-end-será-redesenhado-decidido-em-2026-09-17).

### `main` virou o branch padrão

- **Ao abrir PR pela interface do GitHub, a base vem em `main`. Troque pra `dev` antes de criar.** Pela linha de comando: `gh pr create --base dev`.
- **`Closes #N` não fecha a issue quando o PR entra em `dev`.** Quem mergeia fecha à mão, com comentário apontando o PR.
- **Branch de PR é apagado sozinho no merge.** Pra continuar trabalhando, crie branch nova a partir de `dev` atualizado.
- Só existem `dev` e `main`. Branches antigos já mergeados foram apagados.

---

## 2026-09-16 · Para todos

### Trabalho em andamento precisa aparecer

Regra nova no [`CONTRIBUTING.md`](../../CONTRIBUTING.md#trabalho-em-andamento-precisa-ser-visível-decidido-em-2026-09-16):

1. **Ao pegar uma issue, comente nela**: "peguei, começando por X".
2. **Abra o PR como rascunho (draft) no primeiro commit**, mesmo que seja só o esqueleto. Marque "Ready for review" quando o pipeline local passar.

Sem nenhum dos dois sinais em 5 dias úteis, a issue volta pro caminho crítico. Não é cobrança: o processo antigo só mostrava trabalho quando ele estava pronto, e uma fase inteira ficou parada sem que ninguém pudesse dizer por quê.

### O EA FC 27 sai em 25/09/2026

Acesso antecipado a partir de 18/09. O Clubs passa a ficar dentro de um hub novo, "The Grounds", só em PS5, Xbox Series, Switch 2 e PC.

- **Nada medido em FC 26 vale pro produto.** O beta roda inteiro em FC 27.
- O checklist no jogo ([#63](https://github.com/ljborgess/ProLobby.com/issues/63)) e o piloto de OCR ([#50](https://github.com/ljborgess/ProLobby.com/issues/50)) rodam em FC 27.
- Tela do Virtual Pro, overall, arquétipo e categorias podem ter mudado. Até alguém confirmar no jogo, não trate nenhum campo como garantido.

### Moderação: são 3

João é sócio com voto e está fora do código e da moderação por ora. Moderam Luciano, Rafael e Felipe, com mínimo de 2 elegíveis pra punir ([RF-075](../requisitos/05-funcionais.md#rf-075--caso-sem-3-moderadores-elegíveis-resolve-em-desfecho-neutro)).

---

## 2026-09-16 · Rafael

### 1. Retry de evento não fica no bot

[`docs/discord/HANDOFF-bot.md`](../discord/HANDOFF-bot.md) mandava "fila de retry em memória no bot". **Estava errado desde 2026-09-11.** Quem guarda a entrega e reagenda é a **API** (`EventDelivery`, [RF-058](../requisitos/05-funcionais.md#rf-058--evento-da-plataforma-pro-bot-tem-retry-e-vira-caso-ao-esgotar)). O bot só precisa ser **idempotente**: checar o estado real no Discord antes de agir. Fila em memória no bot perde evento quando ele reinicia e executa a mesma ação duas vezes.

### 2. Piloto de OCR: print de FC 26 não mede nada

- Print de FC 26 serve **só pra desenvolver o script** ([#120](https://github.com/ljborgess/ProLobby.com/issues/120)). A taxa que decide a Fase 2.2 sai de print de **FC 27**.
- Primeira rodada com **20 prints**, não 50.
- Os prints vêm de **fonte pública** (VOD de YouTube/Twitch pausado na tela do Virtual Pro). Coleta automática não funciona: Reddit e X bloqueiam, busca web só devolve site de montar build.
- **Não espere print pra seguir.** A ordem continua **#99 → #121 → #123 → #120**.

### 3. O deploy depende das contas

[#121](https://github.com/ljborgess/ProLobby.com/issues/121) depende de [#130](https://github.com/ljborgess/ProLobby.com/issues/130): domínio `.com.br` e contas de Neon, Oracle, Cloudflare e Resend no nome do projeto. Isso é com os sócios, puxado pelo Luciano. A [#99](https://github.com/ljborgess/ProLobby.com/issues/99) não depende disso e pode andar agora.

---

## 2026-09-16 · Felipe

### 1. Suas três issues fecham a Fase 2.1

[#106](https://github.com/ljborgess/ProLobby.com/issues/106) (scheduler), [#87](https://github.com/ljborgess/ProLobby.com/issues/87) (tela de cadastro e login) e [#101](https://github.com/ljborgess/ProLobby.com/issues/101) (bot protection) são as últimas abertas da fase. O lado da API está todo em `dev`.

**Se até sexta, 2026-09-18, a #106 e a #87 não tiverem sinal** (comentário ou draft PR), elas passam pro Luciano e a Fase 2.2 abre. A #101 fica com você, porque depende da #87.

Travou no ambiente, no Docker ou em entender alguma parte do projeto? **Pergunte cedo.** O [guia do primeiro dia](01-primeiro-dia.md) tem o setup, e as armadilhas conhecidas estão em [regras que já pegaram bug](03-regras-que-ja-pegaram-bug.md).

### 2. A #106 ganhou um bug no escopo

`EmailVerificationService.deleteExpiredUnverified()` existe, mas **nada chama esse método em produção**, e o projeto não tem scheduler. Sem o job, "conta nunca verificada é apagada em 30 dias" não acontece: quem se cadastra com o e-mail de outra pessoa trava aquele endereço pra sempre. O critério de aceite da #106 já inclui isso.

- **Neon hiberna.** Um job por dia é aceitável; não transforme em keep-alive ([regras que já pegaram bug](03-regras-que-ja-pegaram-bug.md)).

### 3. A #87 depende da #99

A tela precisa repassar o cabeçalho `CF-Connecting-IP` nas chamadas feitas pelo servidor do Next.js. Quem faz a API **confiar** nesse cabeçalho é a [#99](https://github.com/ljborgess/ProLobby.com/issues/99), do Rafael. Dá pra construir a tela antes, mas a proteção de rate limit só funciona com as duas juntas.

### 4. Postgres local na porta 5442?

Se a porta 5432 da sua máquina já estiver ocupada por outro projeto, suba com `POSTGRES_PORT=5442 docker compose up -d postgres` e use `DATABASE_URL=postgres://prolobby:prolobby@localhost:5442/prolobby` no `apps/api/.env` (e no comando dos testes).
