# 3. Fila e matchmaking

**Fase: MVP** (fila individual) · **Fase 2** (fila por time pré-formado)

## Modelo de fila

- Fila **individual por posição** (MVP) — cada personagem entra na fila da sua posição.
- Fila por time pré-formado (grupos de amigos entram como bloco) fica pra **Fase 2** — não precisa balancear posição entre estranhos, só parear dois blocos.
- **1 fila ativa por conta** — não dá pra colocar 2 personagens em filas simultâneas.
- Antes de entrar na fila, player escolhe **qual personagem** (logo, qual posição) vai usar.

## Equilíbrio de time

- Formação dos 20 jogadores reais (a partida em campo tem 22 humanos — 20 reais pareados pela plataforma + 2 gerentes das contas de serviço, um por lado, fora do matchmaking; ver [Mecânica real do EA FC Pro Clubs](00-mecanica-pro-clubs.md)): sistema busca **equilibrar os dois times por categoria** (não por média geral — ver "Comparação é categoria contra categoria" abaixo) — prioriza qualidade de partida sobre velocidade de entrada.
- **Elo/rating de desempenho pesa mais que overall** no equilíbrio; overall é critério de desempate entre players de elo parecido.
  - Motivo: overall é auto-declarado via print (mesmo verificado, é atributo do personagem); elo vem de resultado real dentro da plataforma — mais confiável, mais difícil de forjar.
  - Detalhe do elo em [Ranking, reputação e punição](../02-jogador/06-ranking-reputacao-e-punicao.md).
- **Comparação é categoria contra categoria, não média geral do time**: goleiro do time A é pareado com goleiro do time B (elo próximo), zaga com zaga, meio com meio, ataque com ataque — coerente com elo já ser por categoria. Evita mascarar desequilíbrio grave numa posição crítica (ex.: goleiro fraco) atrás de uma média geral do time que parece equilibrada.

## Composição do time

- Cada time real fecha com **10 jogadores** (a 11ª vaga em campo é do gerente da conta de serviço, não vem da fila — ver [Mecânica real do EA FC Pro Clubs](00-mecanica-pro-clubs.md)), com **distribuição fixa por categoria**: **1 Goleiro + 3 Zaga/Lateral + 2 Meio-campo + 2 Ponta + 2 Ataque = 10**, cobrindo as 5 categorias já definidas em [Personagens e verificação](../02-jogador/02-personagens-e-verificacao.md). Matchmaking só fecha os 20 reais quando bate essa distribuição nos dois lados.
- Motivo: separa a decisão de **quem entra** (matchmaking, precisa de número fechado por categoria) da decisão de **como jogar** (tática, ver "Formação tática" abaixo) — evita ambiguidade de "quanto falta pra fechar fila". A formação em campo (4-3-3, 4-4-2 etc., 11 posições) não é restringida por essa distribuição — o gerente monta livremente entre quem foi puxado + a vaga dele.

## Formação tática (pós-lobby)

- Depois do lobby fechado (20 confirmados), **cada time vota** a formação (ex.: 4-3-3, 4-4-2, 4-2-3-1) dentro de um conjunto compatível com a distribuição fixa de categoria acima — não muda quem tá no time, só o esquema tático em campo.
- Não afeta matchmaking nem elo — é coordenação/flavor pro time decidir junto antes de entrar na partida.
- **Empate na votação**: sorteio entre as opções empatadas — não existe papel de "host" pra decidir desempate (ver [Discord e lobby](04-discord-e-lobby.md), Pro Clubs usa servidor dedicado, sem host de jogador). Sorteio é simples, sem viés, sem exigir designar alguém.

## Timeout de fila

- Se a fila não fechar os 20 dentro de um prazo (ex.: 10-15 min), avisa o player apontando a **categoria específica que falta** (ex.: "faltam goleiros") com opção de continuar esperando ou sair — mais útil que mensagem genérica, ajuda o jogador a decidir e sinaliza onde a fila tá travada.

## Confirmação de entrada no lobby

- Quando o matchmaking acha os 20, **não fecha automático** — cada player tem uma janela curta (ex.: 30s) pra aceitar/recusar antes do lobby fechar de vez.
- Quem não confirma é removido da fila (vaga reabre pros outros continuarem esperando substituto), com penalidade leve de reputação em caso de reincidência.
- Motivo: sem essa etapa, alguém AFK trava o lobby até o timer de entrada no Discord estourar, desperdiçando o tempo dos outros 19.

## Escopo

- Crossplay, gerações de console, edições do jogo e região: ver [Escopo de plataforma, jogo e região](../05-produto/08-escopo-plataforma-jogo-regiao.md).
