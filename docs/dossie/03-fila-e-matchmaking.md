# 3. Fila e matchmaking

**Fase: MVP** (fila individual) · **Fase 2** (fila por time pré-formado)

## Modelo de fila

- Fila **individual por posição** (MVP) — cada personagem entra na fila da sua posição.
- Fila por time pré-formado (grupos de amigos entram como bloco) fica pra **Fase 2** — não precisa balancear posição entre estranhos, só parear dois blocos.
- **1 fila ativa por conta** — não dá pra colocar 2 personagens em filas simultâneas.
- Antes de entrar na fila, player escolhe **qual personagem** (logo, qual posição) vai usar.

## Equilíbrio de time

- Formação dos 22: sistema busca **equilibrar overall médio entre os dois times** — prioriza qualidade de partida sobre velocidade de entrada.
- **Elo/rating de desempenho pesa mais que overall** no equilíbrio; overall é critério de desempate entre players de elo parecido.
  - Motivo: overall é auto-declarado via print (mesmo verificado, é atributo do personagem); elo vem de resultado real dentro da plataforma — mais confiável, mais difícil de forjar.
  - Detalhe do elo em [Ranking, reputação e punição](06-ranking-reputacao-e-punicao.md).

## Escopo

- Crossplay, gerações de console, edições do jogo e região: ver [Escopo de plataforma, jogo e região](08-escopo-plataforma-jogo-regiao.md).
