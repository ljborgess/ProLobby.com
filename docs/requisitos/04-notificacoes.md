# Inventário de notificações

**Fase: MVP**

O lado Discord estava completo na [tabela do bot](../discord/03-bot.md); o lado **in-app nunca foi listado**. E o dossiê decidiu que os dois canais recebem o mesmo evento, com a DM sendo conveniência e o in-app sendo a garantia ([Lobby](../produto/03-partida/03-lobby.md)) — o que significa que o in-app precisa cobrir **tudo**, inclusive o que o bot faz.

Sem inventário, o in-app nasce cobrindo só metade dos eventos, e a "garantia" não garante.

## Regra de canal

| Canal | Papel |
|---|---|
| **In-app** | recebe **todo** evento desta lista, sempre. É a garantia. |
| **DM do bot** | recebe os marcados como urgentes. É conveniência — se falhar, nada se perde. |
| **E-mail** | só transacional de conta (verificação, redefinição de senha, **e o aviso de reabertura do cadastro pausado** — [RF-078](05-funcionais.md#rf-078--aviso-de-cadastro-pausado-e-de-reabertura-sai-por-e-mail)). **Nunca** evento de produto. |

Urgente = a pessoa precisa agir agora, com prazo correndo. O resto é informativo.

## A lista

### Fila e lobby

| Evento | Urgente | Prazo em jogo |
|---|---|---|
| Partida encontrada, confirme entrada | **sim** | 30 s |
| Você foi escolhido capitão, ainda tem vaga no clube? | **sim** | 30 s |
| Lobby fechado — canais criados, capitães anunciados | **sim** | timer de entrada |
| Vote a formação do seu time | **sim** | 60 s |
| Marque se recebeu o convite pro clube | **sim** | 5 min |
| Fila sem fechar — falta categoria X, ou nenhum candidato a capitão | não | repete a cada 5 min |
| Lobby desfeito — cascata de capitão esgotada ou estourou o teto de 5 min, sem penalidade | não | — |
| Lobby cancelado — alguém não recebeu convite, sem penalidade | não | — |
| Lobby cancelado — clube do capitão sem vaga suficiente, sem penalidade e sem caso de abuso | não | — |
| **Bloqueio temporário de fila aplicado, com o tempo restante** ([RF-009](05-funcionais.md#rf-009--recusar-ou-não-confirmar-gera-timeout-progressivo-de-fila)) | **sim** | 5 min · 15 min · 30 min · 2 h |
| **Fila pausada** — Discord fora do ar, teto de 500 canais, ou 9 de 10 lobbies ocupados ([RF-053](05-funcionais.md#rf-053--acima-de-400-canais-alerta-no-teto-a-fila-pausa), [RF-072](05-funcionais.md#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático)) | não | — |

### Resultado

| Evento | Urgente | Prazo em jogo |
|---|---|---|
| Outro lado reportou, confirme o placar | **sim** | 15 min |
| Resultado confirmado — elo e reputação atualizados | não | — |
| Avalie seus companheiros (opcional) | não | — |
| Resultado aceito como não confirmado — contestável | não | 48 h |
| Placares divergiram — foi pra moderação | não | — |
| **Resultado retido — jogador fora do roster no print final** ([RF-066](05-funcionais.md#rf-066--gamertags-do-print-final-conferem-contra-o-roster-do-lobby)) | não | — |
| **Categoria jogada divergiu da categoria da fila — caso aberto** ([RF-067](05-funcionais.md#rf-067--print-final-confere-a-categoria-jogada)) | não | — |
| Expirou sem report (60 min sem print) — −3 de reputação pra cada humano | não | — |
| Capitão: remova os convidados do seu clube | não | — |

### Reputação, punição e conta

| Evento | Urgente | Prazo em jogo |
|---|---|---|
| Reputação cruzou um limiar (55 / 40 / 25) | **sim** | — |
| Suspensão aplicada, e quando termina | **sim** | 7 dias |
| Suspensão encerrada — fila liberada | não | — |
| Banimento aplicado, com o caminho de apelação | **sim** | — |
| Elo e reputação recalculados por rollback de disputa | não | — |
| Personagem verificado — cargo concedido | não | — |
| Print rejeitado pelo OCR, com o motivo | **sim** | — |
| 3 falhas de OCR no dia — chamado aberto automaticamente | não | — |
| Personagens arquivados — edição nova exige reverificação | não | — |
| Saiu do servidor Discord — fila bloqueada até voltar | **sim** | — |
| Suspensão encerrada — reputação restaurada em 45 ([RF-074](05-funcionais.md#rf-074--fim-de-suspensão-restaura-a-reputação-para-45)) | não | — |
| **Nickname não pôde ser sincronizado — trocar à mão** ([RF-056](05-funcionais.md#rf-056--nickname-sincroniza-com-o-gamertag-com-fallback-por-dm)) | não | — |
| **Plano ativado — cargo Fundador ou Apoiador concedido** | não | — |

### Moderação

| Evento | Urgente | Prazo em jogo |
|---|---|---|
| Seu chamado foi recebido | não | — |
| Seu chamado foi resolvido, com a decisão | **sim** | — |
| Você foi denunciado e o caso está em análise | não | — |
| Apelação julgada | **sim** | — |

## Regras de comportamento

- **Mensagem de rejeição diz o que fazer**, não só que falhou ([Requisitos transversais](01-transversais.md)). Print rejeitado é o caso mais importante: o motivo precisa distinguir confiança baixa, idioma não reconhecido, gamertag divergente, formato inválido e print já usado — cinco causas com cinco ações diferentes, e hoje todas cairiam num "não foi possível processar".
- **DM que falha não vira caso.** O in-app já recebeu o mesmo evento; a decisão de não tratar falha de DM está em [Lobby](../produto/03-partida/03-lobby.md).
- **Notificação de lobby cancelado diz explicitamente que não houve penalidade.** Sem isso a pessoa assume que perdeu reputação e a percepção de injustiça acontece mesmo sem o fato — foi o problema que os três cancelamentos distintos foram desenhados pra evitar ([Estados](02-estados.md)).
- **Nada de notificação de marketing ou reengajamento** no MVP. Todo evento da lista é consequência de uma ação real da pessoa ou de algo que afeta a conta dela.
- Notificação in-app é **marcada como lida**, não apagada — o histórico serve de rastro pra contestação ("eu nunca fui avisado").
- **Auditoria de 2026-09-11**: 6 eventos faltavam nesta lista — bloqueio temporário de fila, fila pausada por capacidade, resultado retido por roster, categoria divergente, fallback de nickname e plano ativado. Todos existiam em RF ou na [tabela do bot](../discord/03-bot.md), e a lista se declara a garantia — o que faltasse aqui simplesmente não chegaria à pessoa.
