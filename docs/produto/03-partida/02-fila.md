# 3. Fila e matchmaking

**Fase: MVP** (fila individual) · **Fase 2** (fila por time pré-formado)

## Modelo de fila

- Fila **individual por posição** (MVP) — cada personagem entra na fila da sua posição.
- Fila por time pré-formado (grupos de amigos entram como bloco) fica pra **Fase 2** — não precisa balancear posição entre estranhos, só parear dois blocos.
- **1 fila ativa por conta** — não dá pra colocar 2 personagens em filas simultâneas.
- Antes de entrar na fila, player escolhe **qual personagem** (logo, qual posição) vai usar.

## Equilíbrio de time

- Formação dos times: sistema busca **equilibrar os dois lados por categoria** (não por média geral — ver "Comparação é categoria contra categoria" abaixo) — prioriza qualidade de partida sobre velocidade de entrada.
- **Elo/rating de desempenho pesa mais que overall** no equilíbrio; overall é critério de desempate entre players de elo parecido.
  - Motivo: overall é auto-declarado via print (mesmo verificado, é atributo do personagem); elo vem de resultado real dentro da plataforma — mais confiável, mais difícil de forjar.
  - Detalhe do elo em [Ranking, reputação e punição](../02-jogador/02-ranking.md).
- **Comparação é categoria contra categoria, não média geral do time**: goleiro do time A é pareado com goleiro do time B (elo próximo), zaga com zaga, meio com meio, ataque com ataque — coerente com elo já ser por categoria. Evita mascarar desequilíbrio grave numa posição crítica (goleiro fraco, por exemplo) atrás de uma média geral do time que parece equilibrada.
- **Tolerância de elo e expansão de busca**: matchmaking começa buscando dentro de uma banda de **±150 pontos de elo por categoria**, expandindo em **incrementos de 50 pontos a cada 2 minutos desde o início da busca** (não espera o timeout de fila) — chega ao teto de **±400 pontos** aos 10 minutos, mesmo momento em que o timeout de fila (ver abaixo) avisa o jogador. Evita fila trancada esperando par perfeito numa base pequena de usuários, sem abrir mão de equilíbrio nos primeiros minutos (quando a chance de achar par próximo é maior).

## Composição do time

- **Forma fixa do time**: **1 Goleiro + 4 Zaga/Lateral + 2 Meio-campo + 2 Ponta + 2 Ataque = 11**, cobrindo as 5 categorias já definidas em [Personagens e verificação](../02-jogador/01-verificacao.md). Essa forma nunca muda.
- **Humanos preenchem o que der; o jogo completa o resto com IA.** Matchmaking encaixa quem está na fila nas vagas da própria categoria — as vagas que sobrarem são preenchidas automaticamente pela **IA do próprio EA FC** (recurso padrão do modo Clubes, ver [Mecânica real do EA FC Pro Clubs](01-mecanica.md)). Isso não é feature da plataforma: o jogo faz sozinho quando o clube entra em partida sem os 11 humanos.
- Consequência de arquitetura: a plataforma só decide **quando fechar o lobby e com quantos humanos** — nunca controla o preenchimento por IA, que é comportamento do jogo.
- Motivo de manter a forma fixa: separa a decisão de **quem entra** (matchmaking) da decisão de **como jogar** (tática, ver "Formação tática" abaixo). A formação em campo (4-3-3, 4-4-2 etc.) não é restringida por ela — o capitão de cada lado (ver [Discord e lobby](03-lobby.md)) monta livremente.

## Quantos humanos por partida

- **Simetria obrigatória**: os dois lados fecham com **o mesmo número de humanos**. Se sobrar gente ímpar na fila, o excedente espera o próximo lobby. Motivo: IA joga diferente de humano — time com mais humanos leva vantagem estrutural, e o equilíbrio por elo (premissa central do produto) desmorona se os lados têm composição diferente.
- **Piso de 4 humanos por lado (8 no total)** pra abrir partida. Abaixo disso a partida vira majoritariamente IA e perde sentido competitivo — elo ficaria difícil de justificar.
- **Teto natural de 11 por lado** — quanto mais humano, melhor; a fila sempre tenta juntar o máximo dentro do prazo.
- **Partida com IA conta igual pro elo**: como os dois lados têm a mesma quantidade de IA (simetria acima), a disputa é justa entre si — não há razão pra valer menos, e evita mecanismo de peso variável difícil de explicar pro jogador.
- Isso é o que destrava o problema de arranque da plataforma (ver [tese de mercado](../../negocio/01-mercado.md)): meta realista de 8 pessoas em vez de 22 pra uma partida acontecer.

## Formação tática (pós-lobby)

- Depois do lobby fechado (todos os humanos confirmados), **cada time vota** a formação (ex.: 4-3-3, 4-4-2, 4-2-3-1) dentro de um conjunto compatível com a distribuição fixa de categoria acima — não muda quem tá no time, só o esquema tático em campo.
- Não afeta matchmaking nem elo — é coordenação/flavor pro time decidir junto antes de entrar na partida.
- **Empate na votação**: capitão do time decide (ver [Discord e lobby](03-lobby.md)) — reaproveita o papel já definido por reputação/dono do clube usado, sem critério novo.

## Timeout de fila

- Durante **10 minutos** a fila trabalha pra juntar o **máximo de humanos possível** (com a banda de elo expandindo, como descrito acima). No fim do prazo, fecha com quem tiver — respeitando a simetria entre os lados e o piso de 4 por lado. O que faltar vira IA dentro do jogo.
- Se nem o piso for atingido em 10 minutos, avisa o player apontando a **categoria específica que falta** (ex.: "faltam goleiros") com opção de continuar esperando ou sair — mais útil que mensagem genérica. Aviso se repete a cada 5 minutos adicionais enquanto o jogador continuar esperando.

## Confirmação de entrada no lobby

- Quando o matchmaking fecha o lobby, **não confirma automático** — cada player tem uma janela de **30 segundos** pra aceitar/recusar antes do lobby fechar de vez.
- Quem não confirma é removido da fila (vaga reabre pros outros 21 continuarem esperando substituto), com **penalidade de -3 pontos de reputação** a partir da 3ª falta de confirmação em 30 dias (mesmo padrão de threshold usado no zero-report, ver [Resultado de partida](04-resultado.md)) — primeira e segunda falta no período não pesam de verdade, só a partir da terceira.
- Motivo: sem essa etapa, alguém AFK trava o lobby até o timer de entrada no Discord estourar, desperdiçando o tempo dos outros 21.

## Escopo

- Crossplay, gerações de console, edições do jogo e região: ver [Escopo de plataforma, jogo e região](../05-produto/02-escopo.md).
