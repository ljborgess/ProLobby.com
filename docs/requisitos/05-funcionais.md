# Requisitos funcionais

Lista numerada e rastreável. Formato e regras em [README](README.md).

**Status: 9 áreas levantadas, RF-001 a RF-081, RNF-001 a RNF-021.** Nenhuma área permanece sem varredura de lacuna.

> **Auditoria de 2026-09-11**: varredura de fluxo ponta a ponta fechou 24 achados — 6 quebras de fluxo (entre elas um estado inalcançável e um loop de suspensão que virava banimento), 6 lacunas de modelo de dados, 7 ambiguidades e 5 de processo/repo. RF-074 a RF-080 nasceram daí; RF-006, RF-034, RF-035, RF-043, RF-058, RF-066, RF-071 e RF-072 foram corrigidos no lugar. Relatório completo em [research/auditoria-2026-09-11.md](../research/auditoria-2026-09-11.md).

Cobre as 9 áreas do produto, mais os [não-funcionais](07-nao-funcionais.md) em arquivo próprio.

> **Ressalva viva**: três parâmetros do dossiê estão marcados como "a calibrar" e vão mudar com o retorno do [checklist no jogo](../produto/03-partida/05-checklist.md) e do [piloto de OCR](06-piloto-ocr.md) — os 5 min de confirmação de convite, os 60 min de expiração por zero-report, e se o modelo de 5 personagens sobrevive ao que o jogo oferece. Os RFs que dependem deles serão revisados, não reescritos do zero.

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
| **Discord e bot** | **levantado** |
| **Antiabuso e antifraude** | **levantado** |
| Notificação | coberto por [04-notificacoes.md](04-notificacoes.md) |
| Não-funcionais | coberto por [07-nao-funcionais.md](07-nao-funcionais.md) |

---

## Conta e autenticação

### RF-019 · Cadastro aberto, sem convite nem aprovação
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: qualquer pessoa com e-mail válido e 16 anos ou mais completa o cadastro sem intervenção de ninguém. Nenhum campo de código de convite existe. Formulário inclui **pergunta e resposta de segurança, obrigatórias** — ver [RF-025](#rf-025--recuperação-sem-e-mail-e-sem-discord-exige-dois-fatores).

**Exceção (2026-09-08)**: perto do teto do free tier, o cadastro pausa por [RF-072](#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático) — não é intervenção discricionária, é regra de capacidade automática e igual pra todos.

### RF-020 · Um e-mail, uma conta
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: só existe uma conta por endereço. **A tela nunca revela isso**: cadastro e recuperação respondem sempre "enviamos um e-mail com as instruções", e o conteúdo real (link de verificação, ou aviso de conta existente) chega por e-mail. Conta excluída por pedido LGPD libera o endereço.

### RF-021 · Idade calculada da data de nascimento, bloqueio na hora
**Origem**: [produto/04-governanca/03-termos.md](../produto/04-governanca/03-termos.md)

**Aceite**: menos de 16 anos completos na data do cadastro é recusado no envio do formulário, sem criar conta. Não existe checkbox de autodeclaração.

### RF-022 · Sessão simultânea em vários dispositivos
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: login novo não derruba sessão existente. Duas sessões da mesma conta veem o mesmo estado de fila e de lobby, e a trava de uma fila ativa continua valendo por conta.

**Conflito entre dispositivos (decidido em 2026-09-09)**: confirmando num dispositivo e recusando em outro dentro da mesma janela (ex.: os 30s de [RF-009](#rf-009--recusar-ou-não-confirmar-gera-timeout-progressivo-de-fila)), **a confirmação vence** — coerente com RF-011 (recusa nunca afeta reputação) e o princípio de dar benefício da dúvida.

### RF-023 · Fechar o navegador não sai do lobby
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: fechada e reaberta a aba durante um lobby, a pessoa volta ao estado atual dele com os prazos correndo de onde estavam. Nenhuma vaga é liberada e nenhum timeout de recusa é aplicado por isso.

### RF-024 · Link de redefinição de senha expira em 30 min e é de uso único
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: link usado ou com mais de 30 min é recusado. Pedir novo link invalida o anterior.

### RF-025 · Recuperação sem e-mail e sem Discord exige dois fatores
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: o caso abre chamado de moderação e só é aprovado com **resposta da pergunta de segurança** e **print in-game novo** mostrando o gamertag da conta. Um fator sozinho não basta.

**Pré-requisito (decidido em 2026-09-09)**: pergunta e resposta de segurança são **obrigatórias no cadastro** (RF-019), não configuráveis depois — sem isso, quem perde e-mail e Discord ao mesmo tempo fica sem nenhum caminho de recuperação, o pior cenário de suporte possível.

### RF-026 · Aceite de Termos é versionado e mudança material exige novo aceite
**Origem**: [produto/04-governanca/03-termos.md](../produto/04-governanca/03-termos.md)

**Aceite**: cada conta guarda a versão aceita e a data. Publicada uma versão marcada como material, a conta é barrada de usar a plataforma até aceitar a nova.

### RF-078 · Aviso de cadastro pausado e de reabertura sai por e-mail
**Origem**: gap encontrado em auditoria, decidido em 2026-09-11 · [RF-072](#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático)

**Aceite**: recusado o cadastro por teto de free tier, a tela pede o e-mail pra fila de espera e o aviso de reabertura é enviado **por e-mail**, uma vez, sem nenhum outro conteúdo. O endereço da fila de espera não cria conta e é descartado quando o cadastro reabre ou em 90 dias, o que vier primeiro.

Por que precisou de RF próprio: [RF-072](#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático) prometia "a pessoa é avisada quando reabrir" e **nenhum canal podia cumprir** — quem foi recusado não tem conta, então não existe notificação in-app nem DM do bot, e o [inventário de notificações](04-notificacoes.md) proíbe e-mail pra evento de produto. Este é o caso de fronteira que a proibição não previa: é transacional de conta (a conta que não pôde nascer), não engajamento.

---

## Fila e matchmaking

### RF-001 · Uma fila ativa por conta
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: conta com entrada de fila ativa recebe recusa ao tentar entrar de novo, com qualquer personagem. Sair da fila libera imediatamente.

### RF-002 · Entrada na fila exige e-mail verificado, personagem verificado e Discord vinculado
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md), [produto/03-partida/03-lobby.md](../produto/03-partida/03-lobby.md)

**Aceite**: faltando qualquer uma das três, a entrada é recusada e a mensagem diz **quais** faltam — **lista todas as pendentes numa resposta só**, na ordem e-mail → personagem → Discord (decidido em 2026-09-09; evita a pessoa corrigir uma e descobrir a próxima só na tentativa seguinte). Conta suspensa, banida, ou fora do servidor Discord também é recusada, com o motivo próprio.

**Durante o beta fechado há um quarto pré-requisito**, o cargo Beta — ver [RF-076](#rf-076--beta-fechado-é-trava-na-fila-não-só-cargo-de-canal).

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

**Aceite**: se nenhum humano escalado de um dos lados tem clube declarado com vagas suficientes, o lobby não é criado e os jogadores seguem na fila. **"Vagas suficientes" = `vagas_livres` declaradas ≥ número de humanos do lado menos 1** (o capitão já é membro do próprio clube).

**Correção de 2026-09-11 — revoga o critério de "qualquer vaga maior que zero"** (decidido em 2026-09-09). Aquele critério quebrava o fluxo logo adiante: capitão com 1 vaga livre e 4 humanos no lado só conseguia convidar um, os outros 3 estouravam a janela de 5 min de [confirmação de convite](../produto/03-partida/03-lobby.md), o lobby caía em `cancelado_por_capitao` e **abria caso de abuso contra quem não fez nada errado**. A justificativa original (a IA cobre humano faltante dentro do clube) confundia duas coisas: a IA cobre vaga **que o lobby deixou vazia de propósito**, não humano escalado que ficou de fora por falta de espaço — esse é exatamente o caso de exclusão invisível que a janela de 5 min foi desenhada pra pegar.

Consequência: a auto-declaração passa a guardar **número de vagas livres (0 a 10)**, não um sim/não ([Personagens](../produto/02-jogador/01-verificacao.md), [Modelo de dados](03-dados.md#clubedeclarado)). Declaração desatualizada continua possível — o capitão informa a vaga que encheu na confirmação de 30 s ou na janela de convite, e o lobby cai em `cancelado_sem_culpa`, **sem** caso de abuso ([Estados](02-estados.md)).

### RF-007 · Timeout de fila avisa o que falta
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: aos 10 min sem atingir o piso, a pessoa recebe aviso nomeando a categoria sem par ou a ausência de candidato a capitão, com opção de continuar ou sair. Repete a cada 5 min enquanto ela continuar.

### RF-008 · Fila mostra faixa de movimento, nunca número exato
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: cada categoria exibe "pouca gente" (menos de 5 pessoas), "movimentada" (5 a 15) ou "cheia" (mais de 15) — faixas fixas, decididas em 2026-09-09, calibráveis depois com dado real de uso. Em nenhuma tela ou resposta de API aparece a contagem exata de pessoas na fila.

### RF-009 · Recusar ou não confirmar gera timeout progressivo de fila
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: recusa explícita e estouro dos 30 s produzem o mesmo bloqueio — 5 min na 1ª ocorrência, 15 min na 2ª, 30 min na 3ª, 2 h da 4ª em diante. Durante o bloqueio, entrar na fila é recusado com o tempo restante na mensagem.

### RF-010 · Contador de timeout zera com 12 h limpas ou uma partida completada
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: após 12 h sem recusa, a próxima ocorrência volta a valer 5 min. Completar uma partida tem o mesmo efeito, imediatamente.

### RF-011 · Recusar não altera reputação
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: nenhuma recusa ou não-confirmação, em qualquer quantidade, gera evento de reputação. **Revoga o desenho anterior** de −3 na 3ª falta em 30 dias — o timeout substituiu.

**Onde o contador mora (fechado em 2026-09-11)**: justamente por não gerar evento de reputação, a recusa não tinha onde ser registrada — e sem registro, nem o timeout progressivo de [RF-009](#rf-009--recusar-ou-não-confirmar-gera-timeout-progressivo-de-fila) nem o zeramento de [RF-010](#rf-010--contador-de-timeout-zera-com-12-h-limpas-ou-uma-partida-completada) são calculáveis. Passa a existir a entidade `OcorrenciaRecusaFila` ([Modelo de dados](03-dados.md#ocorrenciarecusafila)), e o bloqueio é **derivado** dela, não guardado como estado.

### RF-076 · Beta fechado é trava na fila, não só cargo de canal
**Origem**: gap encontrado em auditoria, decidido em 2026-09-11 · [negocio/04-lancamento.md](../negocio/04-lancamento.md)

**Aceite**: com o modo de beta fechado ligado, a entrada na fila exige — além dos três pré-requisitos de [RF-002](#rf-002--entrada-na-fila-exige-e-mail-verificado-personagem-verificado-e-discord-vinculado) — que o Discord vinculado tenha o **cargo Beta**. Sem o cargo, a recusa explica que a plataforma está em beta fechado. Desligado o modo, a checagem some sem migração. Cadastro, verificação de personagem e vínculo de Discord continuam abertos a qualquer um durante o beta.

Por que precisou existir: [Lançamento](../negocio/04-lancamento.md) afirmava que "quem controla o acesso no beta é o cargo do Discord", mas o cargo só controla **visibilidade de canal** — a fila roda na plataforma e só checava e-mail, personagem e vínculo. Qualquer estranho que achasse o site entrava na fila e furava o beta inteiro, que é justamente o que mede se a fila fecha sozinha com 24 pessoas. A trava reusa o vínculo Discord já obrigatório, sem código de convite (que o [Onboarding](../produto/05-produto/01-onboarding.md) descartou por virar campo morto depois).

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

**Concorrência (decidido em 2026-09-09)**: a checagem e a reserva do clube no fechamento do lobby são **atômicas** (transação/lock no momento de confirmar o candidato) — sem isso, dois lobbies fechando quase ao mesmo tempo podem eleger o mesmo clube antes que o primeiro grave a reserva.

> **Decisão consciente (2026-09-08), não gap**: desde FC26 uma conta pode ter até 3 clubes simultâneos ([Mecânica](../produto/03-partida/01-mecanica.md)), e este RF trava a **conta inteira**, não só o clube em uso — mais conservador do que o jogo permitiria (a conta poderia ceder um dos outros 2 clubes livres). Identificado em `docs/research/investigacao-design-2026-09-04.md` (seção 3), confirmado em auditoria (2026-09-08) e **mantido como está**: mudar exigiria pedir e validar por OCR os 3 clubes no cadastro de personagem em vez de 1, e repensar a cascata de capitão inteira — escopo grande demais pro ganho, fora do MVP. Revisar só se o volume de "cascata esgotada por clube ocupado" mostrar que é gargalo real.

### RF-034 · Votação de formação só conta voto de humano do próprio lado
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: prazo de 60 s; quem não votou não conta; empate é decidido pelo capitão daquele lado; nenhum voto vem de vaga de IA nem do lado adversário. Zero votos no prazo, o capitão escolhe.

**Quando a votação acontece (ambiguidade fechada em 2026-09-11)**: os 60 s começam quando o **bot cria os canais**, ou seja, no estado `aguardando_convite`, **depois** dos dois capitães confirmados — corre em paralelo com a janela de 5 min do convite. [Fila](../produto/03-partida/02-fila.md) dizia "depois do lobby fechado (todos os humanos confirmados)", o que colocava a votação **antes** da confirmação de capitão; era incompatível com o empate ser decidido pelo capitão (que ainda não existia) e com a formação ser aplicada por ele dentro do clube. Não gera estado novo na [máquina de estados](02-estados.md): é efeito colateral da transição 3 → 4.

### RF-080 · Cascata de capitão tem teto de 5 min
**Origem**: gap encontrado em auditoria, decidido em 2026-09-11 · [produto/03-partida/03-lobby.md](../produto/03-partida/03-lobby.md)

**Aceite**: a cascata de capitão dos dois lados tem **teto total de 5 min** desde o lobby entrar em `aguardando_capitao`. Estourado o teto, o lobby vai pra `cancelado_sem_culpa` e todos voltam pra fila sem penalidade, mesmo que ainda houvesse candidato na fila de cascata.

Por que precisou existir: cada candidato tem 30 s, mas nada limitava **quantos** candidatos a cascata percorria — com até 11 por lado e os dois lados correndo, o lobby podia ficar minutos em `aguardando_capitao` com 8 pessoas paradas olhando a tela. Toda outra etapa do fluxo tem teto declarado ([Lobby](../produto/03-partida/03-lobby.md)); esta não tinha.

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

**Janela do 2º lado e expiração (números já em [parametros.md](../produto/parametros.md), ausentes deste RF até 2026-09-09)**: o 2º lado tem **15 min a partir do 1º print aceito** pra reportar também. Se **nenhum** print chegar em **60 min** desde o fechamento do lobby, a partida expira por zero-report — encerra sem dado, penalidade de reputação conforme [RF-071](#rf-071--zero-report-reincidente-dobra-a-penalidade), fila de todos os envolvidos liberada.

**Prazo único desde 2026-09-11**: as 36 h de zero-report foram revogadas e substituídas pelos 60 min que já existiam como "silêncio total". Os dois prazos tinham a mesma precondição (todos confirmaram convite, nenhum print), então o de 60 min disparava sempre primeiro e sem penalidade — ver [Estados](02-estados.md) pro raciocínio completo.

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

**Aceite**: personagem sem partida por 60 dias perde 25 de elo a cada **30 dias corridos adicionais** (mesma janela móvel usada nos outros contadores do sistema, não mês de calendário — decidido em 2026-09-09), primeiro desconto no dia 90 (60 + 30), parando no valor do seed original. Jogar uma partida interrompe o decaimento; o elo perdido não é devolvido.

### RF-018 · Histórico de partida não expira
**Origem**: [produto/04-governanca/02-lgpd.md](../produto/04-governanca/02-lgpd.md)

**Aceite**: placar, elo aplicado e escalação de qualquer partida seguem consultáveis indefinidamente. Só a **imagem** do print é apagada aos 90 dias — o registro do envio (hash, confiança, idioma) sobrevive.

### RF-077 · Expectativa de elo usa a média dos humanos de cada lado
**Origem**: ambiguidade fechada em 2026-09-11 · [produto/02-jogador/02-ranking.md](../produto/02-jogador/02-ranking.md)

**Aceite**: a probabilidade esperada de vitória sai da fórmula Elo padrão aplicada sobre a **média aritmética do elo dos humanos de cada lado**, congelado na entrada da fila; vagas de IA não entram na conta. O ganho/perda resultante é aplicado a cada personagem com o **K-factor dele** (32 até a 9ª partida na categoria, 20 da 10ª) — lados iguais na média podem, portanto, mover elos diferentes.

Por que precisou ser dito: [Ranking](../produto/02-jogador/02-ranking.md) falava em "diferença de elo entre os dois lados" sem definir o agregado, e o matchmaking parea **categoria contra categoria** — média do time e pareamento por categoria dão números diferentes pra mesma partida. Média foi escolhida por ser a única que continua definida quando os lados têm composição de categoria idêntica mas elos distribuídos de formas diferentes, que é o caso normal.

---

## Moderação

### RF-035 · Moderador parte do caso é travado, decidem os outros 3
**Origem**: [produto/04-governanca/01-moderacao.md](../produto/04-governanca/01-moderacao.md)

**Aceite**: moderador que é alvo da denúncia, autor dela, ou participante da partida em disputa não consegue abrir nem decidir o caso — a ação é recusada pelo sistema, não apenas desencorajada. **O caso é decidido por 3 moderadores elegíveis** sempre que houver 3.

**Correção de 2026-09-11 — "espera até haver 3" era deadlock, não espera.** São 4 moderadores no total; com 2 deles envolvidos no mesmo caso sobram 2 elegíveis **permanentemente**, e nada faz aparecer um terceiro. O caso ficava pendente pra sempre e as contas envolvidas presas em `em_disputa` (fila bloqueada) junto. Restando menos de 3 elegíveis, vale [RF-075](#rf-075--caso-sem-3-moderadores-elegíveis-resolve-em-desfecho-neutro).

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

### RF-074 · Fim de suspensão restaura a reputação para 45
**Origem**: gap encontrado em auditoria, decidido em 2026-09-11 · [produto/02-jogador/02-ranking.md](../produto/02-jogador/02-ranking.md)

**Aceite**: cumpridos os 7 dias de suspensão, a conta volta a `ativa`, o cargo Verificado é reconcedido e a reputação é **definida em 45** por um `EventoReputacao` com motivo próprio — nunca abaixo disso, e sem alterar quem já estava acima. A suspensão é disparada pelo **cruzamento** do limiar de 40 (evento registrado), não pelo valor corrente estar abaixo dele.

Por que precisou existir: nada restaurava a reputação ao fim da pena, e a recuperação desenhada (+1 por partida limpa, [Ranking](../produto/02-jogador/02-ranking.md)) **exige jogar**. A conta voltava com 39, o valor corrente disparava a suspensão de novo na primeira tentativa de fila, e a 2ª suspensão em 180 dias é banimento permanente ([RF-038](#rf-038--2ª-suspensão-em-180-dias-vira-banimento)) — a punição temporária virava terminal sem nenhuma conduta nova. 45 põe a conta acima do limiar de suspensão (40) e abaixo do de prioridade (55): sai da punição, continua na fila lenta até se recuperar jogando.

### RF-075 · Caso sem 3 moderadores elegíveis resolve em desfecho neutro
**Origem**: gap encontrado em auditoria, decidido em 2026-09-11 · [produto/04-governanca/01-moderacao.md](../produto/04-governanca/01-moderacao.md)

**Correção de 2026-09-16 — são 3 moderadores, e 1 sozinho nunca pune.** O João não entra na moderação por ora (outras prioridades), então os moderadores são Luciano, Rafael e Felipe. Com 3, basta 2 estarem na partida em disputa pra sobrar **1 elegível** — e "unanimidade de 1" deixava uma pessoa só decidir, inclusive banir. A regra passa a ser:

- **2 ou mais elegíveis** decidem, por unanimidade, em até 48 h.
- **Menos de 2 elegíveis**: desfecho neutro **imediato**, sem esperar 48 h por uma decisão que não pode acontecer.
- **Disputa anulada por falta de quórum fica registrada no nome de quem abriu.** A **2ª disputa sem quórum em 30 dias** (janela móvel, mesmo contador de [RF-069](#rf-069--denúncia-reincidente-sem-fundamento-vira-caso-de-conduta)) aberta pela mesma conta **não anula**: o resultado original fica valendo. Fecha o exploit de perder uma partida com 2 sócios dentro e disputar só pra apagar a derrota — quem teve problema real é protegido na primeira, quem usa a brecha como estratégia pega uma vez.

Texto original, mantido como registro:

**Aceite**: restando menos de 3 moderadores elegíveis ([RF-035](#rf-035--moderador-parte-do-caso-é-travado-decidem-os-outros-3)), o caso fica aberto por **48 h** aguardando decisão unânime dos elegíveis que sobraram. Sem unanimidade nesse prazo — ou sem nenhum elegível — o sistema aplica o **desfecho neutro** e encerra: disputa de placar vira partida anulada (elo revertido pra todos, nenhuma penalidade de reputação, fila liberada, mesmo tratamento de [RF-044](#rf-044--disputa-sem-evidência-decisiva-anula-a-partida)), e denúncia ou apelação é arquivada sem punição. O desfecho neutro entra no log de auditoria com motivo "sem quórum".

Por que precisou existir: com 4 moderadores e 2 deles envolvidos no mesmo caso, sobram 2 elegíveis **permanentemente** — "esperar até haver 3" nunca termina, e as contas envolvidas ficam presas em `em_disputa` com a fila bloqueada junto. O desfecho neutro nunca pune sem quórum, então o pior caso é um resultado anulado, não uma punição injusta.

---

## Discord e bot

### RF-047 · Bot não expõe comando de jogador
**Origem**: decidido nesta rodada · [discord/03-bot.md](../discord/03-bot.md)

**Aceite**: nenhum comando de barra voltado ao jogador existe — nem de consulta. O bot só reage a evento da plataforma (criar canal, conceder cargo, postar aviso, mandar DM) e a comando de moderador.

Motivo: comando de jogador duplicaria a plataforma dentro do Discord, criando dois lugares pra fazer a mesma coisa e dobrando a superfície de bug — contra a decisão de que regra vive na plataforma e execução no bot ([Integração técnica](../discord/04-integracao.md)).

### RF-048 · Kick e ban só por comando de Admin ou Moderador
**Origem**: [discord/03-bot.md](../discord/03-bot.md)

**Aceite**: o bot tem a permissão técnica, mas a ação só dispara por comando explícito de quem tem o cargo, verificado pela checagem nativa do Discord. Nenhuma punição da plataforma gera kick ou ban automático.

### RF-049 · DM sai no idioma da conta; canal compartilhado sai bilíngue
**Origem**: decidido nesta rodada · [produto/05-produto/02-escopo.md](../produto/05-produto/02-escopo.md)

**Aceite**: DM usa o idioma escolhido pela pessoa na plataforma — o bot sabe quem é, porque o vínculo é obrigatório pra fila. Mensagem no canal de texto do lobby sai em português e espanhol, curta, porque o canal reúne gente dos dois idiomas e a comunidade não é fragmentada por idioma.

### RF-050 · Bot avisa o canal de voz com link, nunca move ninguém
**Origem**: decidido nesta rodada · [produto/03-partida/03-lobby.md](../produto/03-partida/03-lobby.md)

**Aceite**: o bot posta o link do canal do time e não usa a permissão de mover membro. Voz é opcional por decisão registrada — arrastar alguém pra uma call sem pedir a torna obrigatória de fato, e tira quem está em outra call naquele momento.

### RF-051 · Canais do lobby nascem só depois dos dois capitães confirmados
**Origem**: [discord/03-bot.md](../discord/03-bot.md)

**Aceite**: cascata de capitão esgotada nunca chega a criar canal. Confirmados os dois, o bot cria os 3 canais (2 de voz privados por time, 1 de texto compartilhado), posta os capitães com o nome do clube de cada lado e dispara o timer.

### RF-052 · Canais são apagados pelos três gatilhos, e imediatamente em cancelamento
**Origem**: [discord/02-canais.md](../discord/02-canais.md)

**Aceite**: os 3 somem juntos quando as duas calls ficam vazias por 10 min, respeitando piso de 15 min e teto de 3 h desde o lobby fechar. **Lobby cancelado apaga na hora**, sem esperar o piso — não há partida pra proteger e o canal só ocuparia o teto de 500.

### RF-053 · Acima de 400 canais alerta; no teto, a fila pausa
**Origem**: decidido nesta rodada · [discord/02-canais.md](../discord/02-canais.md)

**Aceite**: passando de 400 canais, o bot alerta em `#status-sistema`. Atingido o teto do Discord (500), a plataforma para de fechar lobby novo com aviso in-app — **mesmo caminho da queda do Discord**, porque a situação é a mesma: sem canal, o lobby não pode ser coordenado. Sem transbordar pra um segundo servidor, que fragmentaria a comunidade unificada.

### RF-054 · Faxina horária apaga canal órfão
**Origem**: [discord/02-canais.md](../discord/02-canais.md)

**Aceite**: de hora em hora o bot varre e apaga canal temporário de lobby já terminal. Rede de segurança independente do fluxo normal de deleção.

**Como o bot sabe o que é órfão (fechado em 2026-09-11)**: os ids dos 3 canais são gravados no `Lobby` no momento da criação ([Modelo de dados](03-dados.md#lobby)), e a varredura pergunta à API quais lobbies estão em estado terminal — o bot não deduz nada por nome de canal nem guarda a lista em memória, que não sobrevive a restart.

### RF-055 · Cargo Verificado tem gatilho duplo e é revogado por quatro motivos
**Origem**: [discord/01-cargos.md](../discord/01-cargos.md)

**Aceite**: concedido quando personagem verificado **e** Discord vinculado coexistem, em qualquer ordem de chegada. Revogado em suspensão (reconcedido ao fim), banimento (sem reconcessão), personagem arquivado por edição nova (reconcedido ao reverificar) e exclusão de conta.

### RF-056 · Nickname sincroniza com o gamertag, com fallback por DM
**Origem**: [discord/01-cargos.md](../discord/01-cargos.md)

**Aceite**: ao conceder o Verificado, o bot ajusta o nickname do servidor pro gamertag verificado. Falhando (permissão, hierarquia de cargo, duplicidade), manda DM pedindo a troca manual — e não repete a tentativa em loop.

### RF-057 · Toda ação sensível do bot entra em #log-moderacao
**Origem**: [discord/02-canais.md](../discord/02-canais.md)

**Aceite**: kick, ban, concessão e revogação de Verificado ficam registrados no canal privado, sem depender do audit log nativo do Discord.

### RF-058 · Evento da plataforma pro bot tem retry e vira caso ao esgotar
**Origem**: [discord/04-integracao.md](../discord/04-integracao.md)

**Aceite**: sem confirmação em 10 s, a plataforma reenvia — 3 tentativas, em 10 s, 20 s e 40 s. Esgotado, abre caso na fila de moderação e a fila de partidas pausa (ver RNF-008).

**Idempotência (decidido em 2026-09-09, mecanismo fechado em 2026-09-11)**: cada evento carrega uma chave única (id do evento). Sem isso, reenvio por ACK perdido (não por falha real) duplica ação: cria os 3 canais duas vezes, kicka duas vezes, etc. Mesmo princípio de [RNF-018](07-nao-funcionais.md#rnf-018--envio-com-efeito-é-idempotente).

**Quem lembra o quê**: a fila de retry e o registro de entrega vivem na **API** (entidade `EntregaEvento`, ver [Modelo de dados](03-dados.md#entregaevento)), não no bot — a API é quem retenta, e é o único dos dois processos que tem banco. O bot é idempotente **checando o estado real no Discord antes de agir** (canal com aquele nome/id já existe → não cria; cargo já concedido → não concede), não guardando lista de ids em memória. Memória não sobrevive a restart, e era esse o buraco: o scaffold assumia dedup e fila de retry em memória no bot ([arquitetura do bot](../discord/05-arquitetura-bot.md)).

### RF-059 · Ações do mesmo evento rodam em sequência
**Origem**: [discord/04-integracao.md](../discord/04-integracao.md)

**Aceite**: criar os 3 canais, pingar os jogadores e postar a mensagem do lobby disparam uma após a outra, não em paralelo — respeita o rate limit do Discord sem infraestrutura de throttling própria.

### RF-060 · Sair do servidor Discord bloqueia a fila até voltar
**Origem**: [produto/03-partida/03-lobby.md](../produto/03-partida/03-lobby.md)

**Aceite**: o bot detecta a saída pelo evento nativo, a conta é bloqueada de entrar na fila com aviso in-app explicando, e o desbloqueio é automático quando a pessoa retorna pelo link fixo. O vínculo OAuth2 não é desfeito.

### RF-061 · Mensagem em #suporte-e-denuncia abre caso na plataforma
**Origem**: [discord/03-bot.md](../discord/03-bot.md)

**Aceite**: a mensagem cria caso na fila de moderação automaticamente, com painel único — sem ninguém precisar checar dois sistemas.

### RF-062 · Servidor é criado à mão, nunca pelo bot
**Origem**: [discord/04-integracao.md](../discord/04-integracao.md)

**Aceite**: a criação do servidor não é automatizada, mesmo sendo possível via API — o bot viraria dono, contra a decisão de propriedade por conta separada não pessoal. O **Server Members Intent** precisa estar ativo no Developer Portal, sem o qual o cargo Verificado nunca é concedido e a falha é silenciosa.

---

## Antiabuso e antifraude

Requisitos vindos de uma revisão adversarial do fluxo inteiro — procurando brecha de bug, spam e fraude, não lacuna de decisão.

### RF-063 · Hash roda antes do OCR, não depois
**Origem**: [produto/02-jogador/01-verificacao.md](../produto/02-jogador/01-verificacao.md)

**Aceite**: arquivo cujo hash já existe é rejeitado **sem** que nenhuma chamada de OCR seja feita. Vale pro print de verificação e pro de resultado.

### RF-064 · Pré-checagens locais barram lixo antes de custar chamada
**Origem**: [produto/02-jogador/01-verificacao.md](../produto/02-jogador/01-verificacao.md)

**Aceite**: imagem abaixo de **800×600px**, ou com variância de Laplaciano abaixo do limiar de nitidez (método padrão de detecção de blur; **valor exato calibrado durante o [piloto de OCR](06-piloto-ocr.md)**, não decidido a priori), é rejeitada localmente, sem chamada de OCR, com mensagem dizendo o que corrigir. Decidido em 2026-09-09.

### RF-065 · Teto de 10 uploads por hora por conta
**Origem**: [produto/02-jogador/01-verificacao.md](../produto/02-jogador/01-verificacao.md)

**Aceite**: do 11º upload na janela de uma hora em diante, a resposta é recusa com o tempo restante. Conta a tentativa, aceita ou não.

Os três juntos fecham o vetor: a regra de rejeição não consumir cooldown transformava cada print ruim numa chamada de OCR grátis e ilimitada — 1000 unidades de free tier queimadas numa tarde, derrubando a premissa de custo R$ 0. A intenção original (não punir quem tem foto ruim) continua de pé.

### RF-066 · Gamertags do print final conferem contra o roster do lobby
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: o OCR extrai os gamertags da tela de fim de partida. Nome humano que não consta no roster do lobby **segura o resultado** — a partida vai pra `em_disputa`, elo e reputação **não são aplicados**, e abre caso de abuso de capitão pra moderação decidir. Vagas de IA não contam.

**Correção de 2026-09-11 — "derruba o resultado" automaticamente punia capitão legítimo.** O próprio desenho aceita que o clube do capitão tem os parceiros de sempre como membros e que **membro humano entra antes da IA** ([Resultado](../produto/03-partida/04-resultado.md)) — foi por isso que exigir clube sem outros humanos foi descartado. Ou seja: um parceiro do clube entrando numa partida normal produz exatamente o sinal que este RF trata como fraude, e o capitão não controla isso de fora do jogo. Derrubar na hora tornaria a regra um gerador de falso positivo em partida legítima.

Segurar em vez de derrubar mantém o furo fechado (nenhuma partida com gente de fora aplica elo silenciosamente) sem punir sozinho, e não inventa mecanismo: reusa `em_disputa` e o rollback que o [log de evento](03-dados.md#eventoreputacao-e-eventoelo--as-entidades-que-o-rollback-exige) já sustenta. Se o volume de falso positivo for alto, a saída é pedir ao capitão que esvazie o clube antes — decisão que só faz sentido com o dado do [teste 6](../produto/03-partida/05-checklist.md).

> **Premissa não verificada deste requisito**: ele assume que dá pra **distinguir nome de IA de gamertag humano** na tela final. Ninguém confirmou isso. Se a IA aparecer com nome plausível e indistinguível, a validação não funciona como escrita e precisa de outro sinal. Entrou no [checklist](../produto/03-partida/05-checklist.md) como parte do teste 6.

Fecha o furo mais grave da revisão: **"clube com vaga" não é "clube sem outros humanos"**. Membro humano do clube do capitão entra na escalação antes da IA, então a partida podia rodar com amigos do capitão que não estão na plataforma — sem elo, sem reputação, sem verificação — e o equilíbrio por elo virava ficção sem ninguém perceber.

### RF-067 · Print final confere a categoria jogada
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: a posição de cada jogador na tela final é comparada com a categoria em que ele entrou na fila. Divergência abre caso, não derruba o resultado automaticamente — a leitura de posição é menos confiável que a de nome.

Mitiga o furo aberto pela ressalva da Virtual Pro única: nada impedia verificar um build e jogar com outro ([Personagens](../produto/02-jogador/01-verificacao.md), teste 7 do [checklist](../produto/03-partida/05-checklist.md)).

### RF-068 · Máximo de 3 denúncias abertas por conta
**Origem**: [produto/04-governanca/01-moderacao.md](../produto/04-governanca/01-moderacao.md)

**Aceite**: com 3 casos abertos pela conta, a abertura do 4º é recusada até um resolver. Vale também pra denúncia originada de mensagem em `#suporte-e-denuncia`.

### RF-069 · Denúncia reincidente sem fundamento vira caso de conduta
**Origem**: [produto/04-governanca/01-moderacao.md](../produto/04-governanca/01-moderacao.md)

**Aceite**: **3 denúncias arquivadas como improcedentes em 30 dias** (janela móvel) abrem caso de conduta contra quem denunciou, avaliado pela moderação como qualquer outro. Número decidido em 2026-09-08 — o texto original não especificava quantidade nem janela.

### RF-070 · Tela nunca revela se um e-mail tem conta
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: cadastro e recuperação de senha devolvem a mesma resposta independente de o endereço existir. A distinção chega por e-mail, para a pessoa que é dona dele.

### RF-071 · Zero-report reincidente dobra a penalidade
**Origem**: gap encontrado em auditoria, decidido em 2026-09-08 · [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: 1ª e 2ª ocorrência de zero-report em 30 dias aplicam −3 de reputação **a cada humano da partida** (não −3 rateados entre eles — ambiguidade fechada em 2026-09-11; a escala de reincidência abaixo é por conta, então o valor base também precisa ser por conta pra ser somável). Da 3ª ocorrência em diante, dentro da mesma janela móvel de 30 dias, o valor sobe **+3 a cada nova ocorrência**: 3ª → −6, 4ª → −9, 5ª → −12, e assim por diante. Contador de reincidência zera quando a ocorrência mais antiga sai da janela móvel de 30 dias — mesmo mecanismo do contador de timeout de fila ([Requisitos transversais](01-transversais.md)).

### RF-072 · Cadastro pausa perto do teto do free tier, sem gasto automático
**Origem**: decidido em 2026-09-08 · [negocio/03-sustentabilidade.md](../negocio/03-sustentabilidade.md)

**Aceite**: **90% do teto de recurso acumulativo** do free tier (900 de 1000 chamadas de OCR no mês) — número decidido em 2026-09-09, 10% de folga pra reagir antes de bater o limite exato. Atingido, novo cadastro é recusado com mensagem de fila de espera, e a pessoa é avisada quando reabrir ([RF-078](#rf-078--aviso-de-cadastro-pausado-e-de-reabertura-sai-por-e-mail)).

**Correção de 2026-09-11 — ocupação de lobby não pausa cadastro.** O critério anterior misturava dois tipos de teto: chamada de OCR é **acumulativa no mês** (barrar entrada nova reduz mesmo o consumo), enquanto lobby simultâneo é **ocupação instantânea** que se resolve em minutos — barrar cadastro ali não libera um único lobby e pune quem nada tem a ver com o pico. A alavanca certa pra capacidade instantânea é **pausar o fechamento de lobby novo**, que já existe em [RF-053](#rf-053--acima-de-400-canais-alerta-no-teto-a-fila-pausa) e [RNF-008](07-nao-funcionais.md#rnf-008--queda-do-discord-ou-teto-de-canais-pausa-a-fila-não-derruba-a-plataforma): atingidos 9 de 10 lobbies simultâneos ([RNF-004](07-nao-funcionais.md#rnf-004--10-lobbies-simultâneos)), a fila pausa com aviso in-app e volta sozinha quando um lobby encerra. Cadastro segue aberto. Não existe caminho automático que gere custo — passar do free tier nunca vira cobrança sem decisão humana explícita dos 4 sócios. Vale enquanto a ideia não estiver validada (critério de saída do beta, ver [Lançamento](../negocio/04-lancamento.md)); revisar quando decidirem pagar por infra conscientemente.

**Tetos novos da stack de 2026-09-14 ([ADR-009](../adr/009-neon-cloudflare-vm.md))**, com a mesma regra acima — a ação precisa aliviar o recurso:

| Teto grátis | Pausar cadastro alivia? | Ação |
|---|---|---|
| OCR: 1.000 chamadas/mês | sim | pausa cadastro em 90% (acima) |
| E-mail: teto diário do provedor ([ADR-008](../adr/008-provedor-de-email.md)) | sim | pausa cadastro em **90 e-mails/dia** (Resend grátis, ~100/dia — escolhido em 2026-09-16) |
| Neon: 0,5 GB de armazenamento | não | alerta em 70% e 90% |
| Neon: 100 CU-horas/mês | não | alerta em 70% e 90% |
| Neon: 5 GB/mês de saída — estourou, banco suspenso até o próximo ciclo | não | alerta em 60% e 80% |
| Oracle Object Storage: 20 GB | não | alerta em 80% |

Medição a cada 6 horas pela API de gestão da Neon (não acorda o banco) e pela API da Oracle; alerta em `#status-sistema`. Nenhum alerta dispara gasto: todos pedem decisão humana.

**Reconciliação com o critério de desistir de 90 dias ([tese de mercado](../negocio/01-mercado.md))**: a meta de sucesso do MVP (10 partidas/semana, ~80-100 chamadas OCR/mês) fica ~10x abaixo do teto do free tier (1000 OCR/mês) — na escala-alvo, RF-072 não deveria disparar durante a janela de medição. **Se disparar mesmo assim, é sinal de demanda muito acima do esperado, não de fracasso** — nesse cenário os 4 decidem conscientemente pagar por infra (a mesma decisão que RF-072 já reserva pra eles), em vez de deixar o critério de desistir confundir capacidade truncada com falta de demanda.

### RF-081 · Conta banida faz login, em modo restrito, só pra apelar
**Origem**: gap encontrado em grilling de desenho de sessão, decidido em 2026-09-11 · [ADR-007](../adr/007-sessao-jwt.md)

**Aceite**: conta `banida` completa o login normalmente e alcança **apenas** duas coisas: ver a punição aplicada (motivo e data) e abrir a apelação prevista em [RF-037](#rf-037--uma-apelação-por-punição-reabertura-só-com-fato-novo). Qualquer outra rota responde recusa com o motivo. Conta `excluida` não faz login em hipótese nenhuma.

Por que precisou existir: [RF-037](#rf-037--uma-apelação-por-punição-reabertura-só-com-fato-novo) garante uma apelação por punição, e [Moderação](../produto/04-governanca/01-moderacao.md) registra que o banimento **não** expulsa do Discord justamente pra a pessoa poder "ver avisos, discutir, apelar". Mas nada dizia se ela consegue **entrar na plataforma** — e a leitura natural (banido não loga) transferiria o direito de apelação inteiro pro Discord.

Isso não fecha: **dá pra ser banido por fraude no cadastro (print falso comprovado) sem nunca ter vinculado Discord**, porque o vínculo só é obrigatório pra entrar na fila ([RF-002](#rf-002--entrada-na-fila-exige-e-mail-verificado-personagem-verificado-e-discord-vinculado)). Essa pessoa ficaria banida sem nenhum caminho de apelação — o direito existiria no papel e não no produto.

O modo restrito só é implementável porque o token de sessão **não** carrega o estado da conta: ele é lido do banco a cada request ([ADR-007](../adr/007-sessao-jwt.md)), então o banimento passa a valer no request seguinte, e não quando o token expira.

### RF-079 · Banimento sobrevive à exclusão de conta
**Origem**: gap encontrado em auditoria, decidido em 2026-09-11 · [produto/04-governanca/02-lgpd.md](../produto/04-governanca/02-lgpd.md)

**Aceite**: ao banir uma conta, o sistema grava o **hash** (HMAC com segredo do servidor) do Discord ID e do par (plataforma, gamertag) numa lista de bloqueio própria, sem guardar o valor legível. Cadastro, vínculo de Discord e verificação de personagem consultam essa lista. A exclusão de conta por pedido LGPD apaga a conta e anonimiza o histórico como já previsto, **e não apaga a lista de bloqueio**.

Por que precisou existir: o banimento era vinculado a Discord ID + gamertag guardados **na própria conta** ([Ranking](../produto/02-jogador/02-ranking.md)), e a exclusão LGPD apaga a identidade e libera o e-mail ([RF-020](#rf-020--um-e-mail-uma-conta)) — então bastava pedir exclusão logo após o banimento pra recriar tudo limpo, com o mesmo Discord e o mesmo gamertag. Guardar hash em vez de valor mantém o bloqueio funcionando sem manter dado pessoal legível de quem pediu exclusão; a base legal é exercício regular de direito, e a ressalva entra nos [Termos](../produto/04-governanca/03-termos.md) junto com a do registro fiscal.

### RF-073 · Correção manual de OCR pela moderação, campo a campo
**Origem**: decidido em 2026-09-08 · [produto/02-jogador/01-verificacao.md](../produto/02-jogador/01-verificacao.md)

**Aceite**: no chamado aberto por falha repetida de OCR, o moderador digita os mesmos campos que o OCR extrairia — overall, posição, gamertag e a lista de atributos que o pipeline de OCR extrai (**enumeração exata sai do [piloto de OCR](06-piloto-ocr.md)**, não inventada aqui — não decidir nome de atributo de jogo sem confirmar o que o pipeline real lê). Moderador vê o print diretamente — não é um simples aprovar/rejeitar. A ação fica registrada no `LogAuditoria` como ação de moderador ([RF-040](#rf-040--toda-ação-de-moderador-entra-no-log-de-auditoria)), distinta de extração automática.
