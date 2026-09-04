# 13. Perfil e visibilidade social

**Fase: MVP**

## Perfil público

- **Elo, reputação e histórico agregado de partidas são públicos** — visíveis pra qualquer usuário da plataforma, não só o dono. Faz parte do valor competitivo/social (saber com quem vai jogar, ranking, identidade de "bom jogador").
- **Dado bruto continua privado**: print, foto de tela, Discord ID e gamertag/PSN ID fora do contexto do lobby ativo — mesma regra já fechada em [Personagens e verificação](01-verificacao.md) (histórico de prints visível só pro dono + moderação).
- **Clube EA declarado (auto-declaração pra virar capitão, ver [Personagens e verificação](01-verificacao.md)) também é privado** — usado só internamente pelo matchmaking, sem benefício claro de expor pros outros usuários. Só aparece pros convidados daquele lado quando a pessoa é escolhida capitão de fato.
## Ranking

- **Cinco rankings separados, um por categoria** — coerente com o elo ser por personagem/categoria ([Ranking](02-ranking.md)). Ranking geral único misturaria elos que o dossiê decidiu manter incomparáveis.
- **Top 50 por categoria**, e só quem tem **partida nos últimos 30 dias**. Dois motivos: base pequena listada por inteiro mostra "posição 12 de 14", que desmotiva mais do que motiva; e ranking dominado por número congelado de quem parou de jogar tira o sentido de quem está jogando (junto com o [decaimento por inatividade](02-ranking.md)).

## Como se chega ao perfil de outra pessoa

**Não existe busca livre por gamertag.** Os caminhos são três: histórico de partida (quem já jogou com você), lobby ativo, e o ranking.

- Motivo: o valor social é saber com quem vou jogar e conferir quem me denunciou — os três caminhos cobrem isso. Busca livre resolveria o mesmo e transformaria o gamertag, que é público fora da plataforma, em chave pronta pro histórico competitivo de qualquer um.
- Perfil continua **público** pra quem chega por esses caminhos: não é privacidade por obscuridade, é ausência de um índice pesquisável.

- Estatística individual de partida (gols, assistências, nota — extraída do OCR de fim de partida) fica no histórico do personagem, visível no perfil público, mas **não pesa no elo** (ver [Ranking, reputação e punição](02-ranking.md)).
