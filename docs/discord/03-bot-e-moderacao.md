# 3. Bot central: permissões e responsabilidades

## Escopo

O bot é o **motor único de automação** entre a plataforma (aplicação web) e o servidor Discord — não é só um bot de Discord, é o componente que a aplicação usa pra executar toda ação que precisa acontecer no servidor. Permissão **total** no servidor (gerenciar cargo, canal, mensagem, kick, ban) e integração direta com os eventos da plataforma (verificação aprovada, lobby fechado, resultado reportado, punição aplicada). Objetivo: **zero ação manual** de admin mexendo direto nas configurações do Discord — tudo que dá pra automatizar, o bot automatiza.

## Responsabilidades (consolidado do que já foi decidido)

| Evento na plataforma | Ação do bot no Discord |
|---|---|
| Personagem aprovado (OCR) **e** Discord vinculado (qualquer ordem, gatilho duplo) | Concede cargo **Verificado** + sincroniza nickname com gamertag/PSN ID (ver [Cargos e verificação](01-cargos-e-verificacao.md)) |
| Lobby fecha (22 confirmados) | Cria **2 canais de voz temporários** (Time A / Time B, privados cada um aos seus 11), posta host + gamertag/PSN de todos (só dentro do lobby), pinga os 22, dispara timer de entrada (ver [Discord e lobby](../produto/dossie/03-partida/04-discord-e-lobby.md)) |
| Host não confirma / desconecta | Reatribui host pro próximo melhor candidato, automaticamente |
| Partida termina (relatório processado) | Deleta os 2 canais de voz temporários do lobby |
| Fila fechou / lobby formado / disputa resolvida / punição aplicada | Notifica via DM do bot + notificação in-app na plataforma |
| Disputa cai em moderação / suspensão aplicada | Notifica as partes envolvidas |
| Suspensão aplicada | Revoga cargo Verificado (perde acesso a canal de fila/lobby, continua no servidor) |
| Suspensão termina | Reconcede cargo Verificado |
| Banimento permanente aplicado | Revoga cargo Verificado — sem reconcessão futura |
| Exclusão de conta (pedido LGPD) | **Kick do servidor** — diferente de suspensão/ban, é saída voluntária da plataforma inteira |
| Personagem arquivado (edição nova do jogo) | Revoga cargo Verificado até reverificar a edição nova (ver [Cargos e verificação](01-cargos-e-verificacao.md)) |
| Zero-report expira (24-48h sem ninguém reportar) | Notifica os 22 (partida encerrada sem dado, penalidade leve de reputação aplicada — ver [Resultado de partida](../produto/dossie/03-partida/05-resultado-de-partida.md)) |
| Resultado de partida confirmado (sem disputa) | Notifica os 22 que elo/reputação foram atualizados |
| Rollback retroativo (disputa revertida pela moderação) | Notifica os 22 envolvidos que elo/reputação foram recalculados (ver [Ranking, reputação e punição](../produto/dossie/02-jogador/06-ranking-reputacao-e-punicao.md)) |
| Qualquer chamado de moderação resolvido (exceção de OCR, troca de gamertag, apelação — ver [Moderação](../produto/dossie/04-governanca/07-moderacao.md)) | Notifica o solicitante via DM + in-app — mesma esteira usada pra disputa/punição, sem exceção |
| Mensagem em **#suporte-e-denuncia** | Cria caso automaticamente na fila de moderação da plataforma ([Moderação](../produto/dossie/04-governanca/07-moderacao.md)) — painel único, sem checar dois sistemas |
| Qualquer ação sensível (kick, ban, concessão/revogação de Verificado) | Posta registro em **#log-moderacao** (ver [Canais](02-canais.md)) — auditável sem depender do audit log nativo |

## O que continua manual (mesmo com permissão total)

- **Kick e ban**: bot tem o poder técnico, mas a ação só dispara por **comando explícito de um moderador humano** — nunca reação automática a suspensão/punição (ver [Ranking, reputação e punição](../produto/dossie/02-jogador/06-ranking-reputacao-e-punicao.md)). Permissão total no bot não significa gatilho automático em toda ação sensível — kick/ban continua decisão humana, só executada via comando em vez de configuração manual do servidor.

## Fora de escopo aqui

- Qual plataforma/framework de bot, hospedagem, linguagem — isso é **stack técnica**, deliberadamente não decidido ainda (ver [Backlog](../produto/dossie/05-produto/10-backlog-fases-futuras.md)). Este arquivo define responsabilidade e permissão, não implementação.
