# 3. Bot central: permissões e responsabilidades

## Escopo

O bot é o **motor único de automação** entre a plataforma (aplicação web) e o servidor Discord — não é só um bot de Discord, é o componente que a aplicação usa pra executar toda ação que precisa acontecer no servidor. Permissão **total** no servidor (gerenciar cargo, canal, mensagem, kick, ban) e integração direta com os eventos da plataforma (verificação aprovada, lobby fechado, resultado reportado, punição aplicada). Objetivo: **zero ação manual** de admin mexendo direto nas configurações do Discord — tudo que dá pra automatizar, o bot automatiza.

## Responsabilidades (consolidado do que já foi decidido)

| Evento na plataforma | Ação do bot no Discord |
|---|---|
| Personagem aprovado (OCR) **e** Discord vinculado (qualquer ordem, gatilho duplo) | Concede cargo **Verificado** + sincroniza nickname com gamertag/PSN ID (ver [Cargos e verificação](01-cargos.md)) |
| Lobby fecha (humanos confirmados) | Plataforma decide o capitão de cada lado (critério de reputação — ver [Discord e lobby](../produto/03-partida/03-lobby.md)); **só depois dos 2 capitães confirmados** (cascata esgotada nunca chega aqui, ver linha abaixo), bot cria **3 canais temporários** (2 de voz privados por time + 1 de texto compartilhado por todos), posta nome dos capitães e avisos operacionais no canal de texto, pinga todo mundo, dispara timer de entrada |
| Calls do lobby vazias por 10 min (piso 15 min / teto 3 h após o lobby fechar) | Deleta os 3 canais temporários — ver [Canais](02-canais.md) |
| Partida termina (relatório processado) | Manda DM lembrando os 2 capitães de remover os convidados do próprio clube (bot não alcança o clube EA diretamente, sem API — só lembra) |
| Varredura de hora em hora | Apaga canal temporário órfão de lobby já encerrado; alerta em **#status-sistema** se o servidor passar de 400 canais (limite do Discord é 500) |
| Cascata de capitão esgota (nenhum candidato de um lado tem clube/vaga) | Desfaz o lobby, notifica todos que voltam pra fila sem penalidade |
| Convite pro clube não confirmado por alguém em 5 min | Desfaz o lobby e apaga os 3 canais **na hora** (sem esperar o piso de 15 min), notifica todos que voltam pra fila **sem penalidade**, abre caso de abuso de capitão (ver [Discord e lobby](../produto/03-partida/03-lobby.md)) |
| Silêncio total — 60 min do lobby fechar sem nenhum print | Encerra o lobby e libera a fila de todos **sem penalidade** — partida que não começou não gera zero-report (ver [Discord e lobby](../produto/03-partida/03-lobby.md)) |
| Membro vinculado sai do servidor Discord | Bloqueia o acesso à fila da conta vinculada + notificação in-app explicando; desbloqueia sozinho quando a pessoa voltar pelo link fixo (ver [Discord e lobby](../produto/03-partida/03-lobby.md)) |
| Fila fechou / lobby formado / disputa resolvida / punição aplicada | Notifica via DM do bot + notificação in-app na plataforma |
| Disputa cai em moderação / suspensão aplicada | Notifica as partes envolvidas |
| Suspensão aplicada | Revoga cargo Verificado (perde acesso a canal de fila/lobby, continua no servidor) |
| Suspensão termina | Reconcede cargo Verificado |
| Banimento permanente aplicado | Revoga cargo Verificado — sem reconcessão futura |
| Exclusão de conta (pedido LGPD) | **Kick do servidor** — diferente de suspensão/ban, é saída voluntária da plataforma inteira |
| Personagem arquivado (edição nova do jogo) | Revoga cargo Verificado até reverificar a edição nova (ver [Cargos e verificação](01-cargos.md)) |
| Zero-report expira (36h sem ninguém reportar) | Notifica todos os humanos da partida (encerrada sem dado, penalidade leve de reputação aplicada — ver [Resultado de partida](../produto/03-partida/04-resultado.md)) + manda DM lembrando os 2 capitães de remover os convidados do próprio clube — mesmo lembrete de limpeza do evento "Partida termina", pra não deixar estranhos parados no clube quando ninguém reporta |
| Resultado de partida confirmado (sem disputa) | Notifica todos os humanos da partida que elo/reputação foram atualizados + convida a avaliar os companheiros humanos de time (opcional — ver [Ranking, reputação e punição](../produto/02-jogador/02-ranking.md)) |
| Acúmulo de 5 avaliações negativas (30 dias, pessoas/partidas diferentes) | Cria caso automático na fila de moderação — sem punição automática |
| Rollback retroativo (disputa revertida pela moderação) | Notifica todos os humanos envolvidos que elo/reputação foram recalculados (ver [Ranking, reputação e punição](../produto/02-jogador/02-ranking.md)) |
| Qualquer chamado de moderação resolvido (exceção de OCR, troca de gamertag, apelação — ver [Moderação](../produto/04-governanca/01-moderacao.md)) | Notifica o solicitante via DM + in-app — mesma esteira usada pra disputa/punição, sem exceção |
| Mensagem em **#suporte-e-denuncia** | Cria caso automaticamente na fila de moderação da plataforma ([Moderação](../produto/04-governanca/01-moderacao.md)) — painel único, sem checar dois sistemas |
| Plano ativado no painel (Fundador ou Apoiador, confirmação manual de PIX) | Concede o cargo **Fundador** ou **Apoiador** — reconhecimento só, sem liberar canal nem permissão nenhuma (ver [Cargos](01-cargos.md) e [Sustentabilidade](../negocio/03-sustentabilidade.md)) |
| Plano mensal de Apoiador expira sem renovação | Revoga o cargo Apoiador. Fundador não expira — é pagamento único |
| Banimento permanente aplicado | Revoga **também** Fundador, Apoiador e Beta, junto com o Verificado — sem devolver dinheiro (ver [Cargos](01-cargos.md)) |
| Qualquer ação sensível (kick, ban, concessão/revogação de Verificado, ativação de plano) | Posta registro em **#log-moderacao** (ver [Canais](02-canais.md)) — auditável sem depender do audit log nativo |

## O que o bot não faz

- **Nenhum comando de jogador.** Nem `/fila`, nem `/perfil`, nem consulta. O bot só reage a evento da plataforma e a comando de moderador. Motivo: comando de jogador duplicaria a plataforma dentro do Discord — dois lugares pra fazer a mesma coisa, dobrando a superfície de bug — e contraria a divisão de que **regra vive na plataforma, execução no bot** ([Integração técnica](04-integracao.md)). Um link resolve o que uma consulta resolveria.
- **Não move ninguém pra canal de voz.** Posta o link e pronto. Voz é opcional por decisão registrada ([Discord e lobby](../produto/03-partida/03-lobby.md)); arrastar torna obrigatória de fato, e tira quem está em outra call naquele momento.

## Idioma das mensagens

- **DM sai no idioma que a pessoa escolheu na plataforma** — o bot sabe quem é, porque o vínculo Discord é obrigatório pra fila.
- **Mensagem em canal compartilhado sai nos dois idiomas**, curta. O canal do lobby reúne gente de idiomas diferentes, e a comunidade não é fragmentada por idioma ([Escopo](../produto/05-produto/02-escopo.md), [Canais](02-canais.md)).

## O que continua manual (mesmo com permissão total)

- **Kick e ban**: bot tem o poder técnico, mas a ação só dispara por **comando explícito de um moderador humano** — nunca reação automática a suspensão/punição (ver [Ranking, reputação e punição](../produto/02-jogador/02-ranking.md)). Permissão total no bot não significa gatilho automático em toda ação sensível — kick/ban continua decisão humana, só executada via comando em vez de configuração manual do servidor.
- **Checagem de permissão do comando**: bot só executa kick/ban se quem chamou tiver o cargo Admin ou Moderador (checagem nativa do Discord, não lógica customizada) — requisito de segurança, evita comando de kick/ban aberto pra qualquer membro.

## Fora de escopo aqui

- Qual plataforma/framework de bot, hospedagem, linguagem — isso é **stack técnica**, deliberadamente não decidido ainda (ver [Backlog](../produto/05-produto/03-backlog.md)). Este arquivo define responsabilidade e permissão, não implementação. Existe rascunho de hipótese não decidida em [05-arquitetura-bot.md](05-arquitetura-bot.md), bloqueado pelos mesmos dois bloqueadores.
