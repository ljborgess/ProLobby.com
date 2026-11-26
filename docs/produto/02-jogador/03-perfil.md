# 13. Perfil e visibilidade social

**Fase: MVP**

## Perfil público

- **Elo, reputação e histórico agregado de partidas são públicos** — visíveis pra qualquer usuário da plataforma, não só o dono. Faz parte do valor competitivo/social (saber com quem vai jogar, ranking, identidade de "bom jogador").
- **Dado bruto continua privado**: print, foto de tela, Discord ID e gamertag/PSN ID fora do contexto do lobby ativo — mesma regra já fechada em [Personagens e verificação](01-verificacao.md) (histórico de prints visível só pro dono + moderação).
- **Clube EA declarado (auto-declaração pra virar capitão, ver [Personagens e verificação](01-verificacao.md)) também é privado** — usado só internamente pelo matchmaking, sem benefício claro de expor pros outros usuários. Só aparece pros convidados daquele lado quando a pessoa é escolhida capitão de fato.

## Apelido — como o jogador aparece

**Decidido em 2026-11-26.** Ranking, perfil e histórico mostram um **apelido da plataforma**, escolhido pela pessoa, nunca a gamertag ou o PSN ID.

- Motivo: a gamertag é pública fora da plataforma. Mostrá-la no ranking faria dela a chave pro histórico competitivo de qualquer um, que é justamente o que a regra de [não ter busca](#como-se-chega-ao-perfil-de-outra-pessoa) evita. Sem nome nenhum, o ranking perderia a identidade de "bom jogador", que é o valor dele.
- **3 a 16 caracteres, letras sem acento, números e `_`.** Unicode deixaria imitar o apelido de outra pessoa com letras parecidas (`a` latino e `а` cirílico).
- **Único, sem diferenciar maiúscula e minúscula**: `Craque` e `craque` são o mesmo apelido.
- **Opcional.** Sem apelido, a pessoa aparece no ranking como "sem apelido" e não some dele. Ninguém fica fora do ranking por não ter escolhido um nome.
- A reputação e o histórico seguem a **conta**, não o apelido: trocar de apelido não apaga nada.
- **Fora desta fatia**: a moderação resetar um apelido ofensivo, e um limite de trocas. Entram se o abuso aparecer.

## Ranking

- **Cinco rankings separados, um por categoria** — coerente com o elo ser por personagem/categoria ([Ranking](02-ranking.md)). Ranking geral único misturaria elos que o dossiê decidiu manter incomparáveis.
- **Top 50 por categoria**, e só quem tem **partida nos últimos 30 dias**. Dois motivos: base pequena listada por inteiro mostra "posição 12 de 14", que desmotiva mais do que motiva; e ranking dominado por número congelado de quem parou de jogar tira o sentido de quem está jogando. **É este filtro que mantém o ranking representativo** — não o [decaimento por inatividade](02-ranking.md), que só começa aos 60 dias e serve pra outra coisa (o elo de quem volta).

## Como se chega ao perfil de outra pessoa

**Não existe busca livre por gamertag.** Os caminhos são três: histórico de partida (quem já jogou com você), lobby ativo, e o ranking.

- Motivo: o valor social é saber com quem vou jogar e conferir quem me denunciou — os três caminhos cobrem isso. Busca livre resolveria o mesmo e transformaria o gamertag, que é público fora da plataforma, em chave pronta pro histórico competitivo de qualquer um.
- Perfil continua **público** pra quem chega por esses caminhos: não é privacidade por obscuridade, é ausência de um índice pesquisável.

- Estatística individual de partida (gols, assistências, nota — extraída do OCR de fim de partida) fica no histórico do personagem, visível no perfil público, mas **não pesa no elo** (ver [Ranking, reputação e punição](02-ranking.md)).
