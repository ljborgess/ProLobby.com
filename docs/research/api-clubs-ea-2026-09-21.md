# API de partida de Clubs da EA — investigação (2026-09-21)

**Pergunta da [#153](https://github.com/ljborgess/ProLobby.com/issues/153)**: existe endpoint da EA que devolva o roster de uma partida de Clubs e, se existe, ele é utilizável — estável, sem autenticação impossível, sem termo de uso que proíba, e com jogador de IA distinguível de humano?

**Resposta: não dá.** O endpoint existe, é público e devolve o roster nominal. O uso é que não se sustenta: os termos da EA proíbem acesso automatizado, e a resposta não distingue jogador de IA de humano — que é exatamente o que a [RF-066](../requisitos/05-funcionais.md) precisa. A **RF-066 segue como desenhada, por OCR da tela final**, e o teste 6 do [#63](https://github.com/ljborgess/ProLobby.com/issues/63) continua sendo a pergunta que decide se ela funciona.

> **Nenhuma chamada foi feita ao endpoint durante esta investigação**, de propósito: acesso automatizado é o que a cláusula abaixo proíbe, e sondar pra confirmar que a sondagem é proibida seria absurdo. O que está aqui vem de documentação da EA, de fórum oficial e de clientes de terceiro publicados.

## O que existe

Endpoints não documentados que o próprio site `proclubs.ea.com` consome do navegador, sem chave nem token:

```
GET https://proclubs.ea.com/api/fc/clubs/matches
    ?clubIds=<id>&matchType=leagueMatch|playoffMatch|friendlyMatch
    &platform=common-gen5&maxResultCount=<n>
```

Outros do mesmo conjunto: `clubs/info`, `clubs/overallStats`, `members/stats`, `members/career/stats`, `allTimeLeaderboard/search`, `club/playoffAchievements`.

**A resposta de partida tem o roster nominal**: um objeto `players`, indexado por id de clube e depois por id de jogador, com `playername`, `pos`, `rating` e as estatísticas individuais. É o que os serviços de terceiro citados no [levantamento de 2026-09-18](fontes-checklist-jogo-2026-09-18.md) consomem.

Clientes públicos que documentam o formato: [`1erkandogan/fc27-clubs-api`](https://github.com/1erkandogan/fc27-clubs-api) (FC 27, inclusive amistoso) e [`alex-jordan547/proclubs-sdk`](https://github.com/alex-jordan547/proclubs-sdk).

## Por que não serve

### 1. Os termos proíbem, e isso decide sozinho

A [Seção 6 do User Agreement](https://tos.ea.com/legalapp/WEBTERMS/US/en/PC/11072022) proíbe:

> "Use any robot, spider or other automated device or process to access EA Services for any purpose such as scraping data, abuse EA Services, account creation, or copying material."

E a licença concedida no [User Agreement](https://www.ea.com/legal/user-agreement) (atualizado em 14/05/2026) é **pessoal e não comercial**:

> "EA grants you a personal, limited, non-transferable (i.e., not for sharing), revocable and non-exclusive license to use the EA Services to which you have access for your non-commercial use, only if you follow this Agreement."

O ProLobby tem plano pago ([sustentabilidade](../negocio/README.md)), então nem a cláusula de uso não comercial acomodaria a chamada, mesmo que o acesso fosse manual. O critério de aceite da #153 já resolvia este caso: **endpoint que existe mas cujo uso é proibido conta como "não dá"**.

### 2. A resposta não distingue IA de humano

Nenhum campo documentado marca jogador controlado pela IA, `anyone` ou bot. O `players` traz `playername` para as entradas que existem, e nada diz se uma vaga foi preenchida pela IA do jogo.

Isso mata o uso específico que a RF-066 faz do roster. O furo que ela fecha é **o capitão que escala alguém de fora da plataforma**, e para isso é preciso separar três coisas: humano da plataforma, humano de fora e IA. Sem o terceiro, a comparação acusa divergência em toda partida que rodou com vaga aberta — que é o caminho normal, porque a IA completa as vagas ([fila](../produto/03-partida/02-fila.md)).

**Ressalva honesta**: ausência de campo na documentação da comunidade não é prova de ausência na resposta da EA. Provar exigiria uma partida real e uma chamada — a chamada que o item 1 proíbe. Se algum dia houver API oficial, esta é a primeira pergunta a refazer.

### 3. Estabilidade: já caiu e ficou caído

- Tópico no fórum oficial: [endpoints fora desde 19/06/2026](https://forums.ea.com/discussions/fc-26-general-discussion-en/ea-pro-clubs-api-endpoints-have-been-down-since-friday-june-19-2026/13509909), incluindo o de busca de clube e o de dado de partida privada.
- A EA bloqueia o que não parece tráfego de navegador (Akamai): sem cabeçalho de navegador, a resposta é 403. Um serviço nosso dependeria de continuar imitando navegador — o que é tanto frágil quanto, de novo, o item 1.
- Os endpoints são não documentados e mudam sem aviso a cada edição do jogo (`fc26-clubs-api` e `fc27-clubs-api` são repositórios separados por isso).

Mesmo sem a proibição, isso não é base para uma regra antifraude: quando o endpoint cair, a validação de roster cai com ele.

## Consequência para o dossiê

- **RF-066 continua por OCR da tela final.** Nada a mudar no requisito.
- **O teste 6 do [#63](https://github.com/ljborgess/ProLobby.com/issues/63) segue sendo o que decide a RF-066**: se o nome do jogador de IA é distinguível na tela final. Esta investigação não substitui esse teste; ela só fecha o caminho alternativo.
- **Não há issue de implementação a abrir** (o critério de aceite da #153 previa uma, para o caso "dá").
- **Quando revisitar**: se a EA publicar API oficial de Clubs — existe [proposta de usuários no fórum](https://forums.ea.com/discussions/fc-26-general-discussion-en/club-champions-proposal-for-a-dedicated-pro-clubs-api/13600408), sem resposta oficial. API oficial mudaria o item 1 e permitiria refazer a pergunta do item 2.

## Fontes

- [EA User Agreement, Seção 6 · Rules of Conduct](https://tos.ea.com/legalapp/WEBTERMS/US/en/PC/11072022)
- [EA User Agreement (14/05/2026)](https://www.ea.com/legal/user-agreement)
- [Fórum oficial: endpoints fora desde 19/06/2026](https://forums.ea.com/discussions/fc-26-general-discussion-en/ea-pro-clubs-api-endpoints-have-been-down-since-friday-june-19-2026/13509909)
- [Fórum oficial: proposta de API dedicada de Pro Clubs](https://forums.ea.com/discussions/fc-26-general-discussion-en/club-champions-proposal-for-a-dedicated-pro-clubs-api/13600408)
- [`1erkandogan/fc27-clubs-api`](https://github.com/1erkandogan/fc27-clubs-api) — endpoints e formato de resposta do FC 27
- [`alex-jordan547/proclubs-sdk`](https://github.com/alex-jordan547/proclubs-sdk) — SDK não oficial em TypeScript
