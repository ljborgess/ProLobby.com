# 3. Bot central: permissões e responsabilidades

## Escopo

O bot é o **motor único de automação** entre a plataforma (aplicação web) e o servidor Discord — não é só um bot de Discord, é o componente que a aplicação usa pra executar toda ação que precisa acontecer no servidor. Permissão **total** no servidor (gerenciar cargo, canal, mensagem, kick, ban) e integração direta com os eventos da plataforma (verificação aprovada, lobby fechado, resultado reportado, punição aplicada). Objetivo: **zero ação manual** de admin mexendo direto nas configurações do Discord — tudo que dá pra automatizar, o bot automatiza.

## Responsabilidades (consolidado do que já foi decidido)

| Evento na plataforma | Ação do bot no Discord |
|---|---|
| Personagem aprovado (OCR) **e** Discord vinculado (qualquer ordem, gatilho duplo) | Concede cargo **Verificado** + sincroniza nickname com gamertag/PSN ID (ver [Cargos e verificação](01-cargos-e-verificacao.md)) |
| Lobby fecha (22 confirmados) | Plataforma decide o capitão de cada lado (critério de reputação — ver [Discord e lobby](../produto/dossie/03-partida/04-discord-e-lobby.md)); **só depois dos 2 capitães confirmados** (cascata esgotada nunca chega aqui, ver linha abaixo), bot cria **3 canais temporários** (2 de voz privados por time + 1 de texto compartilhado pelos 22), posta nome dos capitães e avisos operacionais no canal de texto, pinga os 22, dispara timer de entrada |
| Partida termina (relatório processado) | Deleta os 3 canais temporários do lobby, manda DM lembrando os 2 capitães de remover os convidados do próprio clube (bot não alcança o clube EA diretamente, sem API — só lembra) |
| Cascata de capitão esgota (nenhum candidato de um lado tem clube/vaga) | Desfaz o lobby, notifica os 22 que voltam pra fila sem penalidade |
| Fila fechou / lobby formado / disputa resolvida / punição aplicada | Notifica via DM do bot + notificação in-app na plataforma |
| Disputa cai em moderação / suspensão aplicada | Notifica as partes envolvidas |
| Suspensão aplicada | Revoga cargo Verificado (perde acesso a canal de fila/lobby, continua no servidor) |
| Suspensão termina | Reconcede cargo Verificado |
| Banimento permanente aplicado | Revoga cargo Verificado — sem reconcessão futura |
| Exclusão de conta (pedido LGPD) | **Kick do servidor** — diferente de suspensão/ban, é saída voluntária da plataforma inteira |
| Personagem arquivado (edição nova do jogo) | Revoga cargo Verificado até reverificar a edição nova (ver [Cargos e verificação](01-cargos-e-verificacao.md)) |
| Zero-report expira (24-48h sem ninguém reportar) | Notifica os 22 (partida encerrada sem dado, penalidade leve de reputação aplicada — ver [Resultado de partida](../produto/dossie/03-partida/05-resultado-de-partida.md)) + manda DM lembrando os 2 capitães de remover os convidados do próprio clube — mesmo lembrete de limpeza do evento "Partida termina", pra não deixar estranhos parados no clube quando ninguém reporta |
| Resultado de partida confirmado (sem disputa) | Notifica os 22 que elo/reputação foram atualizados |
| Rollback retroativo (disputa revertida pela moderação) | Notifica os 22 envolvidos que elo/reputação foram recalculados (ver [Ranking, reputação e punição](../produto/dossie/02-jogador/06-ranking-reputacao-e-punicao.md)) |
| Qualquer chamado de moderação resolvido (exceção de OCR, troca de gamertag, apelação — ver [Moderação](../produto/dossie/04-governanca/07-moderacao.md)) | Notifica o solicitante via DM + in-app — mesma esteira usada pra disputa/punição, sem exceção |
| Mensagem em **#suporte-e-denuncia** | Cria caso automaticamente na fila de moderação da plataforma ([Moderação](../produto/dossie/04-governanca/07-moderacao.md)) — painel único, sem checar dois sistemas |
| Qualquer ação sensível (kick, ban, concessão/revogação de Verificado) | Posta registro em **#log-moderacao** (ver [Canais](02-canais.md)) — auditável sem depender do audit log nativo |

## O que continua manual (mesmo com permissão total)

- **Kick e ban**: bot tem o poder técnico, mas a ação só dispara por **comando explícito de um moderador humano** — nunca reação automática a suspensão/punição (ver [Ranking, reputação e punição](../produto/dossie/02-jogador/06-ranking-reputacao-e-punicao.md)). Permissão total no bot não significa gatilho automático em toda ação sensível — kick/ban continua decisão humana, só executada via comando em vez de configuração manual do servidor.
- **Checagem de permissão do comando**: bot só executa kick/ban se quem chamou tiver o cargo Admin ou Moderador (checagem nativa do Discord, não lógica customizada) — requisito de segurança, evita comando de kick/ban aberto pra qualquer membro.

## Fora de escopo aqui

- Qual plataforma/framework de bot, hospedagem, linguagem — isso é **stack técnica**, deliberadamente não decidido ainda (ver [Backlog](../produto/dossie/05-produto/10-backlog-fases-futuras.md)). Este arquivo define responsabilidade e permissão, não implementação.
