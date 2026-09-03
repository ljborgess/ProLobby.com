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

## Timeout de fila

- Se a fila não fechar os 22 dentro de um prazo (ex.: 10-15 min), avisa o player ("sem jogadores suficientes agora") com opção de continuar esperando ou sair — sem isso, fila trava sem feedback e não dá pra distinguir "sem gente" de bug.

## Confirmação de entrada no lobby

- Quando o matchmaking acha os 22, **não fecha automático** — cada player tem uma janela curta (ex.: 30s) pra aceitar/recusar antes do lobby fechar de vez.
- Quem não confirma é removido da fila (vaga reabre pros outros 21 continuarem esperando substituto), com penalidade leve de reputação em caso de reincidência.
- Motivo: sem essa etapa, alguém AFK trava o lobby até o timer de entrada no Discord estourar, desperdiçando o tempo dos outros 21.

## Escopo

- Crossplay, gerações de console, edições do jogo e região: ver [Escopo de plataforma, jogo e região](08-escopo-plataforma-jogo-regiao.md).
