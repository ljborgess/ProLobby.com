# 13. Perfil e visibilidade social

**Fase: MVP**

## Perfil público

- **Elo, reputação e histórico agregado de partidas são públicos** — visíveis pra qualquer usuário da plataforma, não só o dono. Faz parte do valor competitivo/social (saber com quem vai jogar, ranking, identidade de "bom jogador").
- **Dado bruto continua privado**: print, foto de tela, Discord ID e gamertag/PSN ID fora do contexto do lobby ativo — mesma regra já fechada em [Personagens e verificação](01-verificacao.md) (histórico de prints visível só pro dono + moderação).
- **Clube EA declarado (auto-declaração pra virar capitão, ver [Personagens e verificação](01-verificacao.md)) também é privado** — usado só internamente pelo matchmaking, sem benefício claro de expor pros outros usuários. Só aparece pros convidados daquele lado quando a pessoa é escolhida capitão de fato.
- Estatística individual de partida (gols, assistências, nota — extraída do OCR de fim de partida) fica no histórico do personagem, visível no perfil público, mas **não pesa no elo** (ver [Ranking, reputação e punição](02-ranking.md)).
