# Requisitos funcionais

Lista numerada e rastreável. Formato e regras em [README](README.md).

**Status: 8 áreas levantadas, RF-001 a RF-046.** Nenhuma área permanece sem varredura de lacuna.

A lista é **amostra, não especificação exaustiva** — o dossiê tem mais regra decidida que RF escrito. Por decisão do time, os RFs restantes são escritos **por fatia, pouco antes de cada uma virar código**: três parâmetros do dossiê estão marcados como "a calibrar" e vão mudar com o retorno do [checklist no jogo](../produto/03-partida/05-checklist.md) e do [piloto de OCR](06-piloto-ocr.md). Escrever tudo agora garantiria reescrever parte.

A numeração é estável — **RF nunca é renumerado nem reaproveitado**. Requisito derrubado fica marcado como revogado, com o motivo, porque saber o que foi descartado vale tanto quanto saber o que vale.

Cobertura por área, pra saber onde ainda não se olhou:

| Área | Estado |
|---|---|
| Conta e autenticação | **levantado** |
| Personagem e verificação | **levantado** |
| Fila e matchmaking | **levantado** |
| Lobby | **levantado** |
| Resultado e disputa | **levantado** |
| Perfil, ranking e descoberta | **levantado** |
| Moderação | **levantado** |
| Notificação | coberto por [04-notificacoes.md](04-notificacoes.md) |

---

## Conta e autenticação

### RF-019 · Cadastro aberto, sem convite nem aprovação
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: qualquer pessoa com e-mail válido e 16 anos ou mais completa o cadastro sem intervenção de ninguém. Nenhum campo de código de convite existe.

### RF-020 · Um e-mail, uma conta
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: cadastro com e-mail já usado é recusado, inclusive se a conta existente estiver suspensa ou banida. Conta excluída por pedido LGPD libera o e-mail.

### RF-021 · Idade calculada da data de nascimento, bloqueio na hora
**Origem**: [produto/04-governanca/03-termos.md](../produto/04-governanca/03-termos.md)

**Aceite**: menos de 16 anos completos na data do cadastro é recusado no envio do formulário, sem criar conta. Não existe checkbox de autodeclaração.

### RF-022 · Sessão simultânea em vários dispositivos
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: login novo não derruba sessão existente. Duas sessões da mesma conta veem o mesmo estado de fila e de lobby, e a trava de uma fila ativa continua valendo por conta.

### RF-023 · Fechar o navegador não sai do lobby
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: fechada e reaberta a aba durante um lobby, a pessoa volta ao estado atual dele com os prazos correndo de onde estavam. Nenhuma vaga é liberada e nenhum timeout de recusa é aplicado por isso.

### RF-024 · Link de redefinição de senha expira em 30 min e é de uso único
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: link usado ou com mais de 30 min é recusado. Pedir novo link invalida o anterior.

### RF-025 · Recuperação sem e-mail e sem Discord exige dois fatores
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: o caso abre chamado de moderação e só é aprovado com **resposta da pergunta de segurança** e **print in-game novo** mostrando o gamertag da conta. Um fator sozinho não basta.

### RF-026 · Aceite de Termos é versionado e mudança material exige novo aceite
**Origem**: [produto/04-governanca/03-termos.md](../produto/04-governanca/03-termos.md)

**Aceite**: cada conta guarda a versão aceita e a data. Publicada uma versão marcada como material, a conta é barrada de usar a plataforma até aceitar a nova.

---

## Fila e matchmaking

### RF-001 · Uma fila ativa por conta
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: conta com entrada de fila ativa recebe recusa ao tentar entrar de novo, com qualquer personagem. Sair da fila libera imediatamente.

### RF-002 · Entrada na fila exige e-mail verificado, personagem verificado e Discord vinculado
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md), [produto/03-partida/03-lobby.md](../produto/03-partida/03-lobby.md)

**Aceite**: faltando qualquer uma das três, a entrada é recusada e a mensagem diz **qual** falta. Conta suspensa, banida, ou fora do servidor Discord também é recusada, com o motivo próprio.

### RF-003 · Banda de elo abre com o tempo
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: busca começa em ±150 do elo congelado na entrada, cresce +50 a cada 2 min, para em ±400 aos 10 min. O elo de referência não muda durante a busca, mesmo que outra partida da pessoa seja resolvida nesse meio.

### RF-004 · Lobby só fecha com simetria por categoria
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: para cada uma das 5 categorias, os dois lados têm o mesmo número de humanos. Excedente sem par na própria categoria permanece na fila.

### RF-005 · Lobby só fecha com piso de 4 humanos por lado
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: com 7 humanos compatíveis, nenhum lobby é criado. Com 8 e simetria satisfeita, é criado.

### RF-006 · Lobby só fecha com candidato a capitão em cada lado
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: se nenhum humano escalado de um dos lados tem clube declarado com vaga, o lobby não é criado e os jogadores seguem na fila.

### RF-007 · Timeout de fila avisa o que falta
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: aos 10 min sem atingir o piso, a pessoa recebe aviso nomeando a categoria sem par ou a ausência de candidato a capitão, com opção de continuar ou sair. Repete a cada 5 min enquanto ela continuar.

### RF-008 · Fila mostra faixa de movimento, nunca número exato
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: cada categoria exibe "pouca gente", "movimentada" ou "cheia". Em nenhuma tela ou resposta de API aparece a contagem de pessoas na fila.

### RF-009 · Recusar ou não confirmar gera timeout progressivo de fila
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: recusa explícita e estouro dos 30 s produzem o mesmo bloqueio — 5 min na 1ª ocorrência, 15 min na 2ª, 30 min na 3ª, 2 h da 4ª em diante. Durante o bloqueio, entrar na fila é recusado com o tempo restante na mensagem.

### RF-010 · Contador de timeout zera com 12 h limpas ou uma partida completada
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: após 12 h sem recusa, a próxima ocorrência volta a valer 5 min. Completar uma partida tem o mesmo efeito, imediatamente.

### RF-011 · Recusar não altera reputação
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: nenhuma recusa ou não-confirmação, em qualquer quantidade, gera evento de reputação. **Revoga o desenho anterior** de −3 na 3ª falta em 30 dias — o timeout substituiu.

---

## Personagem e verificação

### RF-027 · Personagem é inativado, nunca apagado
**Origem**: [produto/02-jogador/01-verificacao.md](../produto/02-jogador/01-verificacao.md)

**Aceite**: não existe ação de excluir personagem. Criar um novo na mesma categoria inativa o anterior, que continua consultável no histórico. O elo da categoria **não** é resetado nesse processo.

### RF-028 · Categoria só muda com zero partida
**Origem**: [produto/02-jogador/01-verificacao.md](../produto/02-jogador/01-verificacao.md)

**Aceite**: personagem com 0 partidas troca de categoria livremente. Com 1 ou mais, a troca é recusada.

### RF-029 · Print rejeitado diz qual das cinco causas
**Origem**: [requisitos/04-notificacoes.md](04-notificacoes.md)

**Aceite**: a mensagem distingue confiança abaixo de 85%, idioma não reconhecido, gamertag divergente do cadastrado naquela plataforma, formato ou tamanho inválido, e print já usado (hash repetido). Um "não foi possível processar" genérico não satisfaz este requisito.

### RF-030 · Cooldown de 24 h só conta pra atualização aceita
**Origem**: [produto/02-jogador/01-verificacao.md](../produto/02-jogador/01-verificacao.md)

**Aceite**: print aceito (≥85%) inicia o cooldown de 24 h naquele personagem. Print rejeitado não inicia nada — dá pra reenviar imediatamente.

### RF-031 · Personagem em fila ou lobby não aceita atualização
**Origem**: [produto/02-jogador/01-verificacao.md](../produto/02-jogador/01-verificacao.md)

**Aceite**: só o personagem em fila/lobby fica travado; os outros da mesma conta continuam atualizáveis. A atualização recusada informa que ela vale após a partida.

---

## Lobby

### RF-032 · Capitão que desiste após confirmar cai na cascata, sem penalidade
**Origem**: [produto/03-partida/03-lobby.md](../produto/03-partida/03-lobby.md)

**Aceite**: a desistência passa o papel ao próximo candidato do lado. Esgotada a cascata, o lobby vai pra `cancelado_sem_culpa`. Nenhum evento de reputação nem timeout de fila é gerado.

### RF-033 · Clube em uso não é candidato em outro lobby
**Origem**: [produto/03-partida/03-lobby.md](../produto/03-partida/03-lobby.md)

**Aceite**: enquanto um lobby não terminal usa o clube de uma conta, ela é excluída da cascata de capitão em qualquer outro lobby. Encerrado o lobby, volta a ser candidata.

### RF-034 · Votação de formação só conta voto de humano do próprio lado
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: prazo de 60 s; quem não votou não conta; empate é decidido pelo capitão daquele lado; nenhum voto vem de vaga de IA nem do lado adversário. Zero votos no prazo, o capitão escolhe.

---

## Resultado e disputa

### RF-012 · Qualquer humano da partida contesta, uma vez cada
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: participante de qualquer um dos dois lados abre contestação dentro das 48 h, inclusive alguém do lado que reportou. A segunda tentativa da mesma pessoa na mesma partida é recusada.

### RF-013 · Contestação abre disputa e volta a bloquear a fila
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: partida em `nao_confirmado` (fila livre) passa a `em_disputa` e as contas envolvidas voltam a ficar bloqueadas até a moderação resolver — ver [estados](02-estados.md).

### RF-041 · Placar do OCR prevalece sobre o digitado
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: divergindo os dois, o valor salvo é o lido pelo OCR, e a tela de confirmação mostra o que foi lido antes de salvar. O campo digitado nunca sobrescreve a leitura do print.

### RF-042 · Report pode ser corrigido até o outro lado confirmar
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: com a partida em `aguardando_confirmacao`, quem enviou reenvia com placar corrigido. Depois de confirmada ou expirada, a correção é recusada e o caminho é contestação.

### RF-043 · Um print só nunca confirma a partida
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: report de um lado só sempre resulta em `nao_confirmado` com 48 h de contestação, independente da confiança do OCR ou da reputação de quem enviou. Não existe caminho de auto-confirmação.

### RF-044 · Disputa sem evidência decisiva anula a partida
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: a moderação marca a partida como anulada; elo é revertido pra todos os participantes via evento de rollback, nenhum evento de reputação é gerado, e as filas são liberadas. A partida continua consultável no histórico com o rótulo de anulada.

### RF-045 · Print anterior ao piso de 5 min é recusado
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: envio antes de 5 min do fechamento do lobby é rejeitado sem consumir tentativa nem cooldown, com a mensagem dizendo quanto falta.

### RF-046 · Nota individual 0.0 no print suspende a penalidade automática
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: ausência reportada contra alguém cuja nota no print é 0.0 não aplica os −8 automaticamente — abre caso de moderação marcado como possível falha do jogo.

---

## Perfil, ranking e descoberta

### RF-014 · Cinco rankings, um por categoria
**Origem**: [produto/02-jogador/03-perfil.md](../produto/02-jogador/03-perfil.md)

**Aceite**: não existe ranking geral combinando categorias. Cada ranking ordena por elo daquela categoria.

### RF-015 · Ranking lista top 50 ativos
**Origem**: [produto/02-jogador/03-perfil.md](../produto/02-jogador/03-perfil.md)

**Aceite**: no máximo 50 posições, e só personagens cuja conta tem partida completada nos últimos 30 dias. Quem passa de 30 dias sem jogar desaparece do ranking sem perder elo por isso (o decaimento é separado, ver RF-017).

### RF-016 · Perfil de terceiro não é pesquisável
**Origem**: [produto/02-jogador/03-perfil.md](../produto/02-jogador/03-perfil.md)

**Aceite**: não existe campo de busca por gamertag em nenhuma tela nem endpoint. Chega-se ao perfil por histórico de partida compartilhada, lobby ativo ou ranking. O perfil em si continua público pra quem chega por esses caminhos.

### RF-017 · Elo decai após 60 dias de inatividade, com piso no seed
**Origem**: [produto/02-jogador/02-ranking.md](../produto/02-jogador/02-ranking.md)

**Aceite**: personagem sem partida por 60 dias perde 25 de elo por mês subsequente, parando no valor do seed original. Jogar uma partida interrompe o decaimento; o elo perdido não é devolvido.

### RF-018 · Histórico de partida não expira
**Origem**: [produto/04-governanca/02-lgpd.md](../produto/04-governanca/02-lgpd.md)

**Aceite**: placar, elo aplicado e escalação de qualquer partida seguem consultáveis indefinidamente. Só a **imagem** do print é apagada aos 90 dias — o registro do envio (hash, confiança, idioma) sobrevive.

---

## Moderação

### RF-035 · Moderador parte do caso é travado, decidem os outros 3
**Origem**: [produto/04-governanca/01-moderacao.md](../produto/04-governanca/01-moderacao.md)

**Aceite**: moderador que é alvo da denúncia, autor dela, ou participante da partida em disputa não consegue abrir nem decidir o caso — a ação é recusada pelo sistema, não apenas desencorajada. Restando menos de 2 moderadores elegíveis, o caso fica pendente em vez de ser decidido por um só.

### RF-036 · Denunciado nunca vê quem denunciou
**Origem**: [produto/04-governanca/01-moderacao.md](../produto/04-governanca/01-moderacao.md)

**Aceite**: nenhuma tela, notificação ou resposta entregue ao denunciado contém o autor da denúncia. O painel de moderação vê. Vale também pro caso aberto por acúmulo de 5 avaliações negativas.

### RF-037 · Uma apelação por punição, reabertura só com fato novo
**Origem**: [produto/04-governanca/01-moderacao.md](../produto/04-governanca/01-moderacao.md)

**Aceite**: segunda apelação sobre a mesma punição é recusada. A reabertura exige um anexo ou registro que não constava na primeira análise.

### RF-038 · 2ª suspensão em 180 dias vira banimento
**Origem**: [produto/04-governanca/01-moderacao.md](../produto/04-governanca/01-moderacao.md)

**Aceite**: aplicada uma segunda suspensão dentro de 180 dias da primeira, a conta é banida permanentemente. Suspensão anterior a 180 dias não conta. Suspensão revertida por apelação não conta.

### RF-039 · Moderador só acessa print anexado ao caso que trata
**Origem**: [requisitos/01-transversais.md](01-transversais.md)

**Aceite**: não existe navegação livre por prints. Abrir um print registra ator, caso e horário no log de auditoria.

### RF-040 · Toda ação de moderador entra no log de auditoria
**Origem**: [produto/04-governanca/02-lgpd.md](../produto/04-governanca/02-lgpd.md)

**Aceite**: resolver disputa, aplicar ou reverter punição, editar dado, acessar print e ativar plano ficam registrados com ator, alvo, horário e o que mudou. O log não é editável nem apagável pelo painel.
