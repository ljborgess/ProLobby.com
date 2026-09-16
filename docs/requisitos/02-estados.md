# Estados do lobby e da partida

**Fase: MVP**

Consolidação, não decisão nova: todas as transições abaixo já estavam decididas, espalhadas em prosa por [Fila](../produto/03-partida/02-fila.md), [Lobby](../produto/03-partida/03-lobby.md), [Resultado](../produto/03-partida/04-resultado.md) e [Moderação](../produto/04-governanca/01-moderacao.md). O que faltava era a **lista dos estados**.

Por que importa como requisito: a regra "conta fica bloqueada de nova fila até a partida anterior resolver" ([Resultado](../produto/03-partida/04-resultado.md)) depende inteiramente de qual estado a partida está. Sem a lista, quem implementar inventa os estados, e a regra passa a depender de interpretação — com o efeito colateral de prender jogador inocente, que é justo o que os cancelamentos foram desenhados pra evitar.

## Os estados

| # | Estado | Fila do jogador | Como sai |
|---|---|---|---|
| 1 | `buscando` | ocupada | fecha roster → 2 · **10 min sem piso → continua buscando**, com aviso do que falta a cada 5 min ([RF-007](05-funcionais.md#rf-007--timeout-de-fila-avisa-o-que-falta)) · jogador sai → livre |
| 2 | `aguardando_jogadores` | ocupada | todos confirmam em 30 s → 3 · alguém não confirma → volta a 1 |
| 3 | `aguardando_capitao` | ocupada | 2 capitães confirmam em 30 s → 4 · cascata esgota, **ou passa de 5 min de cascata** → `cancelado_sem_culpa` ([RF-080](05-funcionais.md#rf-080--cascata-de-capitão-tem-teto-de-5-min)) |
| 4 | `aguardando_convite` | ocupada | todos marcam convite recebido em 5 min → 5 · alguém não recebeu **por vaga insuficiente** → `cancelado_sem_culpa` · alguém não recebeu **sem motivo declarado** → `cancelado_por_capitao` |
| 5 | `em_andamento` | ocupada | 1º print aceito → 6 · **60 min sem print → `expirada_sem_report`** |
| 6 | `aguardando_confirmacao` | ocupada | 2º print bate em 15 min → 8 · 15 min sem 2º print → 7 · placares divergem → 9 |
| 7 | `nao_confirmado` | **livre** | 48 h sem contestação → 8 · contestado → 9 |
| 8 | `encerrada` | **livre** | terminal |
| 9 | `em_disputa` | ocupada | moderação decide → 8 (com rollback se divergir do aplicado) |
| 10 | `cancelado_sem_culpa` | **livre** | terminal — sem penalidade pra ninguém |
| 11 | `cancelado_por_capitao` | **livre** | terminal — abre caso de abuso de capitão |
| 12 | `expirada_sem_report` | **livre** | terminal — **−3 de reputação pra cada humano** da partida ([RF-071](05-funcionais.md#rf-071--zero-report-reincidente-dobra-a-penalidade) escala na reincidência) |

## O que a tabela torna explícito

**Só quatro estados prendem a fila além do fluxo normal**, e três deles são terminais que a liberam. O único que prende por muito tempo é `em_disputa` — decisão deliberada do MVP, com revisão prevista se virar gargalo ([Backlog](../produto/05-produto/03-backlog.md)).

**`nao_confirmado` libera a fila mesmo com a partida em aberto** (estado 7). Coerente com o desenho: quem reportou fez a parte dele, e a janela de 48 h corre sem prendê-lo — o bloqueio existe pra forçar o report, não pra punir quem reportou.

**Os três cancelamentos são estados distintos, não um só.** Parecem iguais de fora (lobby desfeito, fila livre) mas têm consequências diferentes: `cancelado_sem_culpa` não gera nada, `cancelado_por_capitao` abre caso de moderação, e `expirada_sem_report` aplica penalidade. Colapsar os três num "cancelado" genérico perderia exatamente a distinção que evita punir quem não tem culpa.

**`expirada_sem_report` só é alcançável a partir de `em_andamento` com convites confirmados.** É o que separa "a partida aconteceu e ninguém reportou" (negligência real, penalidade justa) de "a partida nunca começou" (sem culpa) — a distinção decidida em [Resultado](../produto/03-partida/04-resultado.md).

**Correção de 2026-09-11 — o estado 12 era inalcançável.** O estado 5 saía por "60 min sem print → `cancelado_sem_culpa`" e o zero-report expirava em 36 h, mas as **duas regras tinham a mesma precondição** (todos confirmaram convite, nenhum print chegou). A de 60 min disparava sempre primeiro e sem penalidade, então `expirada_sem_report`, o −3 e [RF-071](05-funcionais.md#rf-071--zero-report-reincidente-dobra-a-penalidade) eram código morto — e voltava exatamente o incentivo que RF-071 existe pra matar: o lado perdedor espera 60 min e escapa de graça.

Resolvido com **um prazo só**: passados 60 min do lobby fechar sem nenhum print, a partida expira **com** penalidade. As 36 h foram revogadas. O que sustenta a decisão é a **confirmação de convite recebido**: a partir dela a coordenação comprovadamente funcionou, e reportar vira dever do grupo. Quem realmente foi vítima de queda do jogo perde 3 pontos recuperáveis a +1 por partida limpa ([Ranking](../produto/02-jogador/02-ranking.md)) — custo aceito em troca de a regra existir de verdade. Partida que nunca engatou continua sem penalidade, pelos estados 3 e 4.

## Efeitos colaterais por transição

Ações que o sistema dispara ao mudar de estado, todas já decididas nos arquivos de origem:

| Transição | Efeito |
|---|---|
| 2 → 3 | plataforma escolhe capitão por reputação entre quem declarou **vagas suficientes** no clube ([RF-006](05-funcionais.md#rf-006--lobby-só-fecha-com-candidato-a-capitão-em-cada-lado)) |
| 3 → 4 | bot cria os 3 canais temporários (ids guardados no `Lobby`, ver [Modelo de dados](03-dados.md#lobby)), posta capitães, dispara o timer de convite de 5 min **e a votação de formação de 60 s** ([RF-034](05-funcionais.md#rf-034--votação-de-formação-só-conta-voto-de-humano-do-próprio-lado)) |
| → 4 (falha) | canais **não** são criados — cascata esgotada nunca chega a criar canal |
| 4 → `cancelado_por_capitao` | canais apagados **na hora**, sem esperar o piso de 15 min; abre caso de abuso de capitão |
| 4 → `cancelado_sem_culpa` | mesma deleção imediata, **sem** caso de abuso — vaga que encheu depois da declaração não é má conduta ([RF-006](05-funcionais.md#rf-006--lobby-só-fecha-com-candidato-a-capitão-em-cada-lado)) |
| 5 → 12 | −3 de reputação **pra cada humano** da partida, com a escala de reincidência de [RF-071](05-funcionais.md#rf-071--zero-report-reincidente-dobra-a-penalidade); fila de todos liberada |
| 6 → 8 | elo e reputação aplicados; convite pra avaliar companheiros; DM lembrando capitães da limpeza do clube |
| 7 → 8 | mesmos efeitos, ao fim das 48 h |
| 9 → 8 | recálculo e **rollback** de elo, reputação e contadores de reincidência, se divergir do já aplicado |
| qualquer → terminal | canais temporários entram na regra de deleção ([Canais](../discord/02-canais.md)) |

## Estados da conta e do personagem

Menores, mas também nunca enumerados:

**Conta**: `nao_verificada` (e-mail pendente, navega e não entra na fila) → `ativa` → `suspensa` (7 dias, sem fila, cargo Verificado revogado) → `banida` (terminal, cargos revogados) · `excluida` (terminal, LGPD).

- A suspensão é disparada pelo **cruzamento** do limiar de 40, registrado como evento — não pelo valor corrente ser menor que 40. A distinção não é acadêmica: avaliar por valor corrente re-suspendia a conta na primeira tentativa de voltar à fila, e a 2ª suspensão em 180 dias é banimento permanente ([RF-038](05-funcionais.md#rf-038--2ª-suspensão-em-180-dias-vira-banimento)) — punição temporária virava terminal sozinha.
- Cumpridos os 7 dias, a conta volta pra `ativa` e a **reputação é restaurada pra 45** ([RF-074](05-funcionais.md#rf-074--fim-de-suspensão-restaura-a-reputação-para-45)), acima do limiar de suspensão e abaixo do de prioridade — sai da punição, continua na fila lenta até se recuperar jogando.
- `banida` e `excluida` são terminais diferentes, mas a identidade banida sobrevive à exclusão ([RF-079](05-funcionais.md#rf-079--banimento-sobrevive-à-exclusão-de-conta)).

**Personagem**: `aguardando_ocr` → `ativo` → `travado` (em fila ou lobby, sem atualizar atributos) · `arquivado` (edição nova do jogo, exige reverificação).

Personagem `travado` trava só ele, não os outros 4 da conta ([Personagens](../produto/02-jogador/01-verificacao.md)).
