# 7. Moderação

**Fase: MVP** (moderação interna) · **Futuro** (moderador comunitário)

## Quem modera

- **Atualizado em 2026-09-16: são 3 moderadores** (Luciano, Rafael, Felipe). O João não entra por ora. Com 3, **mínimo de 2 elegíveis pra punir**, e disputa sem quórum tem limite por conta — regra em [RF-075](../../requisitos/05-funcionais.md#rf-075--caso-sem-3-moderadores-elegíveis-resolve-em-desfecho-neutro).
- Fase 1 (MVP): moderação feita pelos 4 (Luciano, Rafael, João, Felipe), com painel simples de fila de casos pendentes. Requisitos de segurança do painel (2FA obrigatório pros 4, log de auditoria de toda ação de moderador) documentados em [Dados pessoais e LGPD](02-lgpd.md#requisitos-de-segurança-independentes-de-stack) — o painel é o alvo de maior risco se comprometido (poder de kick/ban/editar disputa).
- **Conflito de interesse — regra formal, não mais bom senso.** O sistema **bloqueia tecnicamente** a ação do moderador sobre um caso em que ele é parte: alvo da denúncia, autor dela, ou participante da partida em disputa ([Requisitos transversais](../../requisitos/01-transversais.md)). **Decidem os outros 3.**
  - O desenho anterior dizia que os 4 decidiam juntos mesmo assim, apostando no bom senso do grupo. Isso era exatamente o que um usuário contestaria — e numa comunidade BR de Pro Clubs pequena, esse tipo de história circula rápido. A trava custa pouco e não depende de confiança.
  - Com 3 decidindo, empate não existe. **Correção (2026-09-08)**: com 2 moderadores elegíveis ainda dá empate 1×1, sem critério de desempate — então o caso **só é decidido com os 3 elegíveis presentes**.
  - **Correção (2026-09-11): "espera até haver 3" era deadlock.** São 4 moderadores; com 2 envolvidos no mesmo caso sobram 2 elegíveis **permanentemente** — não existe terceiro pra aparecer, e as contas envolvidas ficam presas em disputa com a fila bloqueada junto, indefinidamente. Passa a valer [RF-075](../../requisitos/05-funcionais.md#rf-075--caso-sem-3-moderadores-elegíveis-resolve-em-desfecho-neutro): 48 h pros elegíveis restantes decidirem por unanimidade e, sem isso, o sistema aplica o **desfecho neutro** — partida anulada (elo revertido, ninguém punido) ou denúncia arquivada sem punição, registrado no log como "sem quórum". Nunca pune sem quórum, então o pior caso é um resultado anulado, não uma punição injusta.

## Casos que caem em moderação

- Disputa de placar (prints divergentes entre os dois lados)
- Exceção de OCR (falha repetida no reconhecimento do print)
- Denúncia (fraude, desconexão contestada, comportamento)
- Apelação de punição (ver [Ranking, reputação e punição](../02-jogador/02-ranking.md))
- Abuso de capitão (recusa convidar sem motivo, remove alguém no meio da formação, trava a limpeza pós-jogo — ver [Mecânica real do EA FC Pro Clubs](../03-partida/01-mecanica.md))
- Retry de webhook plataforma↔bot esgotado (ver [Integração técnica](../../discord/04-integracao.md))
- Acúmulo de avaliação negativa por pares (5 negativos em 30 dias, de pessoas diferentes em partidas diferentes — ver [Ranking, reputação e punição](../02-jogador/02-ranking.md))
- Recuperação de conta com e-mail e Discord perdidos (ver [Onboarding](../05-produto/01-onboarding.md))
- Ausência reportada com nota individual 0.0 no print — possível bug de perda de controle do jogo, não abandono real (ver [Resultado de partida](../03-partida/04-resultado.md))
- **Troca de identidade vinculada** — gamertag alterado no console (ver [Verificação](../02-jogador/01-verificacao.md)) ou troca do Discord vinculado ([RF-082](../../requisitos/05-funcionais.md#rf-082--vínculo-de-discord-não-se-desfaz-por-conta-própria)). **Acrescentado em 2026-09-18**: o caso de gamertag já existia no código como tipo (`gamertag_change`) e nunca constou desta lista, que é a fonte dos tipos ([Modelo de dados](../../requisitos/03-dados.md#casomoderacao)); o de Discord nasceu com a RF-082. O que o moderador confere nos dois: se a identidade de destino já está em outra conta, e se a conta de origem tem punição em curso — sem isso o chamado vira o botão de desvincular que a RF-082 recusa.

## Limite de denúncia — contra inundação da fila

**3 denúncias abertas por conta ao mesmo tempo.** Com 3 pendentes, a próxima só entra quando uma resolver.

- É limite de **casos em aberto**, não cota por período. Quem tem problema real raramente tem 3 simultâneos; quem quer inundar fica travado no terceiro.
- Sem isso, uma pessoa dedicada derruba a capacidade dos 4 moderadores part-time sozinha — e a mensagem em `#suporte-e-denuncia` abre caso **automaticamente** ([Bot](../../discord/03-bot.md)), então não havia freio nenhum. A avaliação negativa por pares já tinha trava (5 de pessoas diferentes em partidas diferentes); a denúncia direta não tinha.
- **Denúncia reincidente sem fundamento vira, ela mesma, caso de conduta**: **3 denúncias arquivadas como improcedentes em 30 dias** (janela móvel, mesmo padrão dos outros contadores do dossiê) abrem caso de conduta contra quem denunciou — [RF-069](../../requisitos/05-funcionais.md#rf-069--denúncia-reincidente-sem-fundamento-vira-caso-de-conduta). O mecanismo não é só de vazão, é de responsabilidade.

## Denúncia é anônima pro denunciado

A moderação vê quem denunciou; **o denunciado nunca sabe**. Recebe o motivo e a decisão, nunca o autor.

Motivo: a avaliação por pares e a denúncia acontecem entre gente do mesmo time ([Ranking](../02-jogador/02-ranking.md)), e numa base pequena as mesmas pessoas se reencontram na fila constantemente. Revelar o autor transforma denunciar em convite à retaliação na próxima partida — e o efeito prático é ninguém denunciar mais nada, que esvazia o único mecanismo que pega comportamento tóxico em call.

Vale igual pro acúmulo de 5 avaliações negativas: o caso chega à moderação com as origens, e a decisão sai sem elas.

## Apelação

- **Uma apelação por punição aplicada.** Reabre só com **fato novo** — evidência que não existia na primeira análise (print, log, registro de partida).
- Motivo do limite: com 4 moderadores part-time, uma pessoa insistente consome a capacidade inteira, e volume de moderação já é tratado como gargalo real ([Backlog](../05-produto/03-backlog.md)). O fato novo mantém a porta aberta pra erro verdadeiro sem abrir pra apelação em série.

## Reincidência de suspensão

A escada de punição ([Ranking](../02-jogador/02-ranking.md)) cita "reincidência de suspensão" como caminho pro banimento permanente, sem número nem janela — ou seja, era inaplicável.

- **2ª suspensão em 180 dias vira banimento permanente.**
- A janela de 180 dias existe por coerência com a reputação agora ser recuperável: se jogar limpo devolve pontos, um tropeço de dois anos atrás não pode contar pra sempre. Sem janela, a recuperação de reputação seria contradita pelo histórico de punição.

## Meta de tempo de resposta

- **Disputa de placar e exceção de OCR**: meta de **24 horas** pra primeira resposta (não necessariamente resolução final) — reporter bloqueado de fila enquanto isso, então prioridade alta.
- **Denúncia e apelação de punição**: meta de **48 horas**.
- Meta, não garantia contratual — com só 4 moderadores part-time, serve pra time saber quando um caso já passou do esperado e virar prioridade, não pra prometer SLA externo.

## Escala futura

- Papel de moderador comunitário (voluntário/eleito, painel próprio) só entra quando o volume de casos passar da capacidade dos 4 — decisão deliberadamente adiada, não faz sentido desenhar pra um volume ainda desconhecido.
