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

- **Simetria obrigatória, e é por categoria — não só por contagem**: se um lado tem humano numa categoria, o outro lado tem humano na mesma categoria; se um lado deixa a vaga pra IA, o outro deixa também. Contar só o total não basta: 4 zagueiros humanos contra 1 goleiro + 1 meio + 2 atacantes dá a mesma contagem, mas o pareamento **categoria contra categoria** (a premissa central do equilíbrio, descrito acima) deixa de existir — não há goleiro do B pra comparar com o goleiro do A, e o elo da partida fica sem base pra ser justificado.
  - Consequência prática: a fila fecha mais devagar, porque precisa achar **par de mesma categoria**, não só gente. Custo aceito deliberadamente — equilíbrio é o produto; velocidade de fila é conveniência.
  - Quem sobra sem par na própria categoria espera o próximo lobby (mesma regra do excedente ímpar).
- **Piso de 4 humanos por lado (8 no total)** pra abrir partida. Abaixo disso a partida vira majoritariamente IA e perde sentido competitivo — elo ficaria difícil de justificar.
- **Pré-requisito de capitão pra fechar o lobby**: cada lado precisa ter, entre os humanos escalados, **ao menos 1 jogador com clube EA declarado com vaga** (ver [Personagens e verificação](../02-jogador/01-verificacao.md)) — é critério de fechamento de lobby, não de entrada na fila (qualquer um entra na fila, com clube ou sem).
  - Motivo: o piso de 4 encolheu a lista de candidatos a capitão de 11 pra 4 por lado. Sem esse critério, a cascata de escolha de capitão ([Discord e lobby](03-lobby.md)) esgota com frequência alta numa base pequena, e o lobby é desfeito depois de todo mundo já ter confirmado entrada — a pior forma de falhar, porque desperdiça a confirmação de 8 pessoas. Melhor não fechar o lobby do que fechar e desfazer.
  - Não elimina o caso de cascata esgotada (a declaração pode estar desatualizada e ser recusada na confirmação de 30s — ver [Discord e lobby](03-lobby.md)), só o torna raro em vez de comum.
- **Teto natural de 11 por lado** — quanto mais humano, melhor; a fila sempre tenta juntar o máximo dentro do prazo.
- **Partida com IA conta igual pro elo**: como os dois lados têm a mesma quantidade de IA (simetria acima), a disputa é justa entre si — não há razão pra valer menos, e evita mecanismo de peso variável difícil de explicar pro jogador.
- Isso é o que destrava o problema de arranque da plataforma (ver [tese de mercado](../../negocio/01-mercado.md)): meta realista de 8 pessoas em vez de 22 pra uma partida acontecer.

## Formação tática (pós-lobby)

- Depois do lobby fechado (todos os humanos confirmados), **cada time vota** a formação (ex.: 4-3-3, 4-4-2, 4-2-3-1) dentro de um conjunto compatível com a distribuição fixa de categoria acima — não muda quem tá no time, só o esquema tático em campo.
- Não afeta matchmaking nem elo — é coordenação/flavor pro time decidir junto antes de entrar na partida.
- **Prazo de 60 segundos** pra votar, desde o bot criar os canais. Toda outra etapa do fluxo tem prazo (30s de confirmação do jogador, 30s do capitão) — sem um aqui, o lobby fica esperando voto que pode nunca vir. Quem não votou no prazo simplesmente não conta; a formação sai dos votos recebidos, e se **ninguém** votar, o capitão escolhe.
- **Empate na votação**: capitão do time decide (ver [Discord e lobby](03-lobby.md)) — reaproveita o papel já definido por reputação/dono do clube usado, sem critério novo.

## Timeout de fila

- Durante **10 minutos** a fila trabalha pra juntar o **máximo de humanos possível** (com a banda de elo expandindo, como descrito acima). No fim do prazo, fecha com quem tiver — respeitando a simetria entre os lados e o piso de 4 por lado. O que faltar vira IA dentro do jogo.
- Se nem o piso for atingido em 10 minutos, avisa o player apontando o **que falta** — a categoria específica sem par (ex.: "falta goleiro do outro lado") ou, se for esse o caso, que **nenhum lado tem candidato a capitão** (ninguém com clube declarado com vaga) com opção de continuar esperando ou sair — mais útil que mensagem genérica. Aviso se repete a cada 5 minutos adicionais enquanto o jogador continuar esperando.

## Confirmação de entrada no lobby

- Quando o matchmaking fecha o lobby, **não confirma automático** — cada player tem uma janela de **30 segundos** pra aceitar/recusar antes do lobby fechar de vez.
- Quem não confirma é removido da fila (vaga reabre pros outros humanos do lobby continuarem esperando substituto).
- Motivo: sem essa etapa, alguém AFK trava o lobby até o timer de entrada no Discord estourar, desperdiçando o tempo dos outros humanos do lobby.

### Timeout progressivo de fila (substitui a penalidade de reputação)

**Recusar a partida ou deixar os 30 s estourarem dá o mesmo resultado: bloqueio temporário de nova fila, que cresce na reincidência.**

| Ocorrência | Bloqueio |
|---|---|
| 1ª | 5 min |
| 2ª | 15 min |
| 3ª | 30 min |
| 4ª e seguintes | 2 h |

- **Zera após 12 h sem nenhuma recusa**, ou ao completar uma partida.
- **Substituiu a penalidade de −3 de reputação na 3ª falta em 30 dias**, que era o desenho anterior. Motivo: o timeout paga o dano na hora e é proporcional, enquanto a penalidade de reputação castigava duas vezes o mesmo ato e deixava marca permanente por algo que se resolve em minutos. Sai também um contador de janela móvel — reputação volta a medir só o que atravessa partidas.
- **Recusar e não responder pesam igual**, por decisão explícita. Recusar rápido é mais educado (devolve o lobby à fila antes), mas separar os dois criaria um terceiro número num sistema que já tem vários — e o dano ao lobby é o mesmo: ele caiu.

## O que a pessoa vê da fila

- **Faixa de movimento por categoria, não número exato**: "pouca gente", "movimentada", "cheia".
- Motivo: a pessoa precisa da informação pra decidir se vale esperar, mas número exato escancara a liquidez justo quando ela está pior — e "0 na fila" faz fechar a aba e não voltar, que é o boca-a-boca negativo apontado como fatal na [tese de mercado](../../negocio/01-mercado.md). Faixa entrega a decisão sem entregar a fraqueza.

## Escopo

- Crossplay, gerações de console, edições do jogo e região: ver [Escopo de plataforma, jogo e região](../05-produto/02-escopo.md).
