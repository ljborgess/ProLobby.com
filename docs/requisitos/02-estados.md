# Estados do lobby e da partida

**Fase: MVP**

Consolidação, não decisão nova: todas as transições abaixo já estavam decididas, espalhadas em prosa por [Fila](../produto/03-partida/02-fila.md), [Lobby](../produto/03-partida/03-lobby.md), [Resultado](../produto/03-partida/04-resultado.md) e [Moderação](../produto/04-governanca/01-moderacao.md). O que faltava era a **lista dos estados**.

Por que importa como requisito: a regra "conta fica bloqueada de nova fila até a partida anterior resolver" ([Resultado](../produto/03-partida/04-resultado.md)) depende inteiramente de qual estado a partida está. Sem a lista, quem implementar inventa os estados, e a regra passa a depender de interpretação — com o efeito colateral de prender jogador inocente, que é justo o que os cancelamentos foram desenhados pra evitar.

## Os estados

| # | Estado | Fila do jogador | Como sai |
|---|---|---|---|
| 1 | `buscando` | ocupada | fecha roster → 2 · timeout de 10 min sem piso → cancelado · jogador sai → livre |
| 2 | `aguardando_jogadores` | ocupada | todos confirmam em 30 s → 3 · alguém não confirma → volta a 1 |
| 3 | `aguardando_capitao` | ocupada | 2 capitães confirmam em 30 s → 4 · cascata esgota → `cancelado_sem_culpa` |
| 4 | `aguardando_convite` | ocupada | todos marcam convite recebido em 5 min → 5 · alguém não recebeu → `cancelado_por_capitao` |
| 5 | `em_andamento` | ocupada | 1º print aceito → 6 · 60 min sem print → `cancelado_sem_culpa` |
| 6 | `aguardando_confirmacao` | ocupada | 2º print bate em 15 min → 8 · 15 min sem 2º print → 7 · placares divergem → 9 |
| 7 | `nao_confirmado` | **livre** | 48 h sem contestação → 8 · contestado → 9 |
| 8 | `encerrada` | **livre** | terminal |
| 9 | `em_disputa` | ocupada | moderação decide → 8 (com rollback se divergir do aplicado) |
| 10 | `cancelado_sem_culpa` | **livre** | terminal — sem penalidade pra ninguém |
| 11 | `cancelado_por_capitao` | **livre** | terminal — abre caso de abuso de capitão |
| 12 | `expirada_sem_report` | **livre** | terminal — −3 de reputação rateado entre os humanos |

## O que a tabela torna explícito

**Só quatro estados prendem a fila além do fluxo normal**, e três deles são terminais que a liberam. O único que prende por muito tempo é `em_disputa` — decisão deliberada do MVP, com revisão prevista se virar gargalo ([Backlog](../produto/05-produto/03-backlog.md)).

**`nao_confirmado` libera a fila mesmo com a partida em aberto** (estado 7). Coerente com o desenho: quem reportou fez a parte dele, e a janela de 48 h corre sem prendê-lo — o bloqueio existe pra forçar o report, não pra punir quem reportou.

**Os três cancelamentos são estados distintos, não um só.** Parecem iguais de fora (lobby desfeito, fila livre) mas têm consequências diferentes: `cancelado_sem_culpa` não gera nada, `cancelado_por_capitao` abre caso de moderação, e `expirada_sem_report` aplica penalidade. Colapsar os três num "cancelado" genérico perderia exatamente a distinção que evita punir quem não tem culpa.

**`expirada_sem_report` só é alcançável a partir de `em_andamento` com convites confirmados.** É o que separa "a partida aconteceu e ninguém reportou" (negligência real, penalidade justa) de "a partida nunca começou" (sem culpa) — a distinção decidida em [Resultado](../produto/03-partida/04-resultado.md).

## Efeitos colaterais por transição

Ações que o sistema dispara ao mudar de estado, todas já decididas nos arquivos de origem:

| Transição | Efeito |
|---|---|
| 2 → 3 | plataforma escolhe capitão por reputação entre quem declarou clube com vaga |
| 3 → 4 | bot cria os 3 canais temporários, posta capitães, dispara timer |
| → 4 (falha) | canais **não** são criados — cascata esgotada nunca chega a criar canal |
| 4 → `cancelado_por_capitao` | canais apagados **na hora**, sem esperar o piso de 15 min |
| 6 → 8 | elo e reputação aplicados; convite pra avaliar companheiros; DM lembrando capitães da limpeza do clube |
| 7 → 8 | mesmos efeitos, ao fim das 48 h |
| 9 → 8 | recálculo e **rollback** de elo, reputação e contadores de reincidência, se divergir do já aplicado |
| qualquer → terminal | canais temporários entram na regra de deleção ([Canais](../discord/02-canais.md)) |

## Estados da conta e do personagem

Menores, mas também nunca enumerados:

**Conta**: `nao_verificada` (e-mail pendente, navega e não entra na fila) → `ativa` → `suspensa` (7 dias, sem fila, cargo Verificado revogado) → `banida` (terminal, cargos revogados) · `excluida` (terminal, LGPD).

**Personagem**: `aguardando_ocr` → `ativo` → `travado` (em fila ou lobby, sem atualizar atributos) · `arquivado` (edição nova do jogo, exige reverificação).

Personagem `travado` trava só ele, não os outros 4 da conta ([Personagens](../produto/02-jogador/01-verificacao.md)).
