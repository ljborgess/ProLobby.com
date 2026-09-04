# 7. Moderação

**Fase: MVP** (moderação interna) · **Futuro** (moderador comunitário)

## Quem modera

- Fase 1 (MVP): moderação feita pelos 4 (Luciano, Rafael, João, Felipe), com painel simples de fila de casos pendentes. Requisitos de segurança do painel (2FA obrigatório pros 4, log de auditoria de toda ação de moderador) documentados em [Dados pessoais e LGPD](02-lgpd.md#requisitos-de-segurança-independentes-de-stack) — o painel é o alvo de maior risco se comprometido (poder de kick/ban/editar disputa).
- **Conflito de interesse — regra formal, não mais bom senso.** O sistema **bloqueia tecnicamente** a ação do moderador sobre um caso em que ele é parte: alvo da denúncia, autor dela, ou participante da partida em disputa ([Requisitos transversais](../../requisitos/01-transversais.md)). **Decidem os outros 3.**
  - O desenho anterior dizia que os 4 decidiam juntos mesmo assim, apostando no bom senso do grupo. Isso era exatamente o que um usuário contestaria — e numa comunidade BR de Pro Clubs pequena, esse tipo de história circula rápido. A trava custa pouco e não depende de confiança.
  - Com 3 decidindo, empate não existe. Se sobrar apenas 1 moderador elegível (caso raro, dois sócios envolvidos), o caso espera até haver 2 — melhor atrasar que decidir sozinho num caso que envolve sócio.

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
