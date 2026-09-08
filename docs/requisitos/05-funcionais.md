# Requisitos funcionais

Lista numerada e rastreável. Formato e regras em [README](README.md).

**Status: 9 áreas levantadas, RF-001 a RF-071 (RF-071 reservado, sem aceite), RNF-001 a RNF-020.** Nenhuma área permanece sem varredura de lacuna.

Cobre as 9 áreas do produto, mais os [não-funcionais](07-nao-funcionais.md) em arquivo próprio.

> **Ressalva viva**: três parâmetros do dossiê estão marcados como "a calibrar" e vão mudar com o retorno do [checklist no jogo](../produto/03-partida/05-checklist.md) e do [piloto de OCR](06-piloto-ocr.md) — os 5 min de confirmação de convite, os 60 min de silêncio total, e se o modelo de 5 personagens sobrevive ao que o jogo oferece. Os RFs que dependem deles serão revisados, não reescritos do zero.

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

**Aceite**: qualquer pessoa com e-mail válido e 16 anos ou mais completa o cadastro sem intervenção de ninguém. Nenhum campo de código de convite existe.

### RF-020 · Um e-mail, uma conta
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md)

**Aceite**: só existe uma conta por endereço. **A tela nunca revela isso**: cadastro e recuperação respondem sempre "enviamos um e-mail com as instruções", e o conteúdo real (link de verificação, ou aviso de conta existente) chega por e-mail. Conta excluída por pedido LGPD libera o endereço.

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

> **Decisão consciente (2026-09-08), não gap**: desde FC26 uma conta pode ter até 3 clubes simultâneos ([Mecânica](../produto/03-partida/01-mecanica.md)), e este RF trava a **conta inteira**, não só o clube em uso — mais conservador do que o jogo permitiria (a conta poderia ceder um dos outros 2 clubes livres). Identificado em `docs/research/investigacao-design-2026-09-04.md` (seção 3), confirmado em auditoria (2026-09-08) e **mantido como está**: mudar exigiria pedir e validar por OCR os 3 clubes no cadastro de personagem em vez de 1, e repensar a cascata de capitão inteira — escopo grande demais pro ganho, fora do MVP. Revisar só se o volume de "cascata esgotada por clube ocupado" mostrar que é gargalo real.

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

**Aceite**: moderador que é alvo da denúncia, autor dela, ou participante da partida em disputa não consegue abrir nem decidir o caso — a ação é recusada pelo sistema, não apenas desencorajada. **O caso só é decidido com os 3 moderadores elegíveis presentes** — corrigido em 2026-09-08: restando 2 elegíveis o caso também fica pendente, porque 2 pessoas podem empatar 1×1 sem critério de desempate definido. Restando menos de 3, o caso espera até haver 3.

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

**Aceite**: imagem abaixo da dimensão mínima ou completamente desfocada é rejeitada localmente, sem chamada de OCR, com mensagem dizendo o que corrigir.

### RF-065 · Teto de 10 uploads por hora por conta
**Origem**: [produto/02-jogador/01-verificacao.md](../produto/02-jogador/01-verificacao.md)

**Aceite**: do 11º upload na janela de uma hora em diante, a resposta é recusa com o tempo restante. Conta a tentativa, aceita ou não.

Os três juntos fecham o vetor: a regra de rejeição não consumir cooldown transformava cada print ruim numa chamada de OCR grátis e ilimitada — 1000 unidades de free tier queimadas numa tarde, derrubando a premissa de custo R$ 0. A intenção original (não punir quem tem foto ruim) continua de pé.

### RF-066 · Gamertags do print final conferem contra o roster do lobby
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: o OCR extrai os gamertags da tela de fim de partida. Nome humano que não consta no roster do lobby **derruba o resultado** e abre caso de abuso de capitão. Vagas de IA não contam.

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

**Aceite**: 1ª e 2ª ocorrência de zero-report em 30 dias aplicam −3 de reputação (já coberto por [Resultado](../produto/03-partida/04-resultado.md)). Da 3ª ocorrência em diante, dentro da mesma janela móvel de 30 dias, o valor sobe **+3 a cada nova ocorrência**: 3ª → −6, 4ª → −9, 5ª → −12, e assim por diante. Contador de reincidência zera quando a ocorrência mais antiga sai da janela móvel de 30 dias — mesmo mecanismo do contador de timeout de fila ([Requisitos transversais](01-transversais.md)).
