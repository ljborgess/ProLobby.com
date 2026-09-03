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
  - Detalhe do elo em [Ranking, reputação e punição](../02-jogador/06-ranking-reputacao-e-punicao.md).
- **Comparação é categoria contra categoria, não média geral do time**: goleiro do time A é pareado com goleiro do time B (elo próximo), zaga com zaga, meio com meio, ataque com ataque — coerente com elo já ser por categoria. Evita mascarar desequilíbrio grave numa posição crítica (ex.: goleiro fraco) atrás de uma média geral do time que parece equilibrada.

## Composição do time

- Cada time (11) fecha com uma **distribuição fixa por categoria**, definida a priori (ex.: 1 GK, 4 zaga/lateral, 3 meio, 3 ponta/ataque = 11) — matchmaking só fecha os 22 quando bate essa distribuição nos dois lados.
- Motivo: separa a decisão de **quem entra** (matchmaking, precisa de número fechado por categoria) da decisão de **como jogar** (tática, ver "Formação tática" abaixo) — evita ambiguidade de "quanto falta pra fechar fila".

## Formação tática (pós-lobby)

- Depois do lobby fechado (22 confirmados), **cada time vota** a formação (ex.: 4-3-3, 4-4-2, 4-2-3-1) dentro de um conjunto compatível com a distribuição fixa de categoria acima — não muda quem tá no time, só o esquema tático em campo.
- Não afeta matchmaking nem elo — é coordenação/flavor pro time decidir junto antes de entrar na partida.
- **Empate na votação**: host decide (reaproveita o papel já definido por reputação/conexão em [Discord e lobby](04-discord-e-lobby.md), sem critério novo).

## Timeout de fila

- Se a fila não fechar os 22 dentro de um prazo (ex.: 10-15 min), avisa o player apontando a **categoria específica que falta** (ex.: "faltam goleiros") com opção de continuar esperando ou sair — mais útil que mensagem genérica, ajuda o jogador a decidir e sinaliza onde a fila tá travada.

## Confirmação de entrada no lobby

- Quando o matchmaking acha os 22, **não fecha automático** — cada player tem uma janela curta (ex.: 30s) pra aceitar/recusar antes do lobby fechar de vez.
- Quem não confirma é removido da fila (vaga reabre pros outros 21 continuarem esperando substituto), com penalidade leve de reputação em caso de reincidência.
- Motivo: sem essa etapa, alguém AFK trava o lobby até o timer de entrada no Discord estourar, desperdiçando o tempo dos outros 21.

## Escopo

- Crossplay, gerações de console, edições do jogo e região: ver [Escopo de plataforma, jogo e região](../05-produto/08-escopo-plataforma-jogo-regiao.md).
