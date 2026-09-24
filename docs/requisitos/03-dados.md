# Modelo de dados — entidades e atributos

**Fase: MVP**

Consolidação das entidades que o produto exige, derivadas das decisões já tomadas — **não é esquema de banco**, é o inventário de campo que o esquema precisa contemplar. Serve pra duas coisas: verificar que toda regra do dossiê tem onde se apoiar, e evitar migração retroativa em campo que já se sabe necessário.

O esquema concreto vive em `apps/api` (MikroORM, [ADR-006](../adr/006-backend-separado-e-tooling.md)) — quando os dois divergirem, este arquivo é a fonte do **que precisa existir** e a migration é a fonte do **como está implementado**.

Estados de cada entidade em [Estados do lobby e da partida](02-estados.md).

## Identidade: gamertag é por plataforma

**Inconsistência que a modelagem revelou.** O dossiê afirmava três coisas que não fechavam juntas: gamertag fica **na conta**, plataforma fica **no personagem**, e a identidade única é a combinação **plataforma + gamertag** ([Personagens](../produto/02-jogador/01-verificacao.md), [Escopo](../produto/05-produto/02-escopo.md)).

Quem migra de PS5 pra PC — caso que o escopo trata explicitamente, preservando a reputação da conta — passa a ter personagens em duas plataformas. E PSN ID e gamertag de Xbox são nomes diferentes: um campo só na conta não guarda os dois. Pior, o OCR compara "o gamertag da tela" contra "o gamertag da conta" e não teria como saber contra qual comparar.

**Decisão: a conta guarda um gamertag por plataforma.** O personagem aponta pra plataforma; o OCR compara contra o gamertag daquela plataforma. Casa com a identidade única ser o par, e com a troca de plataforma já prevista.

- Unicidade global continua em **(plataforma, gamertag)**, e a exclusividade só nasce com a verificação — reivindicação não verificada expira em 7 dias ([Personagens](../produto/02-jogador/01-verificacao.md)).
- Troca de gamertag no console altera o valor **daquela plataforma**, via chamado de moderação, sem afetar as outras.

## Entidades

### Conta
Reputação e identidade da pessoa. Uma por Discord ID.

`email` · `senha` (hash) · `email_verificado` · `data_nascimento` · `pergunta_seguranca` + `resposta` (hash) · `discord_id_hash` + `discord_id_cifrado` (único, exclusivo) · `papel` · `reputacao` (0–100, inicia 70) · `plano` · `estado` · `suspensao_termina_em` · `criado_em`

- **`discord_id` virou hash + cifra (2026-09-11, achado na revisão do #96)**: [RNF-009](07-nao-funcionais.md#rnf-009--dado-sensível-criptografado-em-repouso) manda Discord ID não ficar em texto puro, e ele é **chave** (exclusivo por conta) e alvo de lookup pelo bot — o mesmo conflito que a auditoria já tinha resolvido no gamertag e que passou batido aqui. Mesma solução: `discord_id_hash` (HMAC determinístico, com o **mesmo segredo** de `GamertagPlataforma` e `IdentidadeBloqueada`) pra unicidade e busca, `discord_id_cifrado` pro valor exibível.
  - **Dívida com prazo declarado**: a entidade `Account` nasceu no [#96](https://github.com/ljborgess/ProLobby.com/pull/96) com a coluna simples, porque o campo é sempre nulo até o vínculo OAuth2 existir. A troca precisa acontecer **na Fase 2.3, antes do primeiro vínculo real** — depois disso deixa de ser mudança de schema vazio e vira migração de dado pessoal.
- **`suspensao_termina_em` — gap fechado em 2026-09-11**: a suspensão dura 7 dias e termina com reputação restaurada em 45 ([RF-074](05-funcionais.md#rf-074--fim-de-suspensão-restaura-a-reputação-para-45)), o que exige um job saber **quando** cada uma vence. Sem o campo, o fim da pena dependia de varrer o log de eventos atrás da última punição.

- **`papel` — gap fechado em 2026-09-08**: os quatro papéis da plataforma (Visitante / Usuário / Moderador / Admin) estavam definidos em [Requisitos transversais](01-transversais.md#papéis-dentro-da-plataforma) e não tinham onde morar. Sem o campo, três requisitos ficam sem apoio — [RF-035](05-funcionais.md#rf-035--moderador-parte-do-caso-é-travado-decidem-os-outros-3), [RF-039](05-funcionais.md#rf-039--moderador-só-acessa-print-anexado-ao-caso-que-trata) e [RF-040](05-funcionais.md#rf-040--toda-ação-de-moderador-entra-no-log-de-auditoria) — e o item 7 do [checklist de segurança](08-seguranca-checklist.md) (restringir acessos) fica sem base, já que é a **única** camada de autorização na stack sem RLS. Visitante é ausência de conta, não valor persistido.
- **`plano` — gap fechado em 2026-09-08**: [Ordem de implementação](../negocio/02-implementacao.md) já mandava o schema nascer com o campo, e ele não constava aqui. Nada de cobrança implementada, só o espaço reservado — fazer isso como migração retroativa é o que custa caro ([Sustentabilidade](../negocio/03-sustentabilidade.md)).

### GamertagPlataforma
`conta` · `plataforma` (PS5 / Xbox Series / PC) · `gamertag_cifrado` · `gamertag_hash` · `verificado_em` (nulo = reivindicação provisória) — único em (plataforma, `gamertag_hash`) quando verificado.

- **Dois campos, não um (decidido em 2026-09-11)**: [RNF-009](07-nao-funcionais.md#rnf-009--dado-sensível-criptografado-em-repouso) manda o gamertag não ficar em texto puro, mas ele é **chave de unicidade global**, alvo de comparação do OCR e origem do nickname do Discord ([RF-056](05-funcionais.md#rf-056--nickname-sincroniza-com-o-gamertag-com-fallback-por-dm)) — cifra não-determinística torna índice único e lookup impossíveis. `gamertag_hash` é HMAC determinístico com segredo do servidor (unicidade e comparação), `gamertag_cifrado` guarda o valor pra exibir. Sem essa separação, o requisito de criptografia e o de unicidade se cancelavam.

### ClubeDeclarado
Auto-declaração que habilita a pessoa a ser capitão.

`conta` · `vagas_livres` (0–10) · `nome_clube` (≤20 caracteres) · `atualizado_em`

- **`vagas_livres` substitui o `tem_vaga` booleano (2026-09-11)**: [RF-006](05-funcionais.md#rf-006--lobby-só-fecha-com-candidato-a-capitão-em-cada-lado) passou a exigir vagas suficientes pros humanos do lado, não "pelo menos uma". Booleano deixava fechar lobby que não tinha como convidar todo mundo, e o estouro caía como abuso no capitão.

### Personagem
`conta` · `categoria` (GK / zaga-lateral / meio / ponta / ataque) · `arquetipo` · `plataforma` · `edicao_jogo` · `nome` · `foto` · `elo` · `partidas_na_categoria` · `estado` · `verificado_em` · `criado_em`

- **`arquetipo` entra, `overall` e `atributos` saem (2026-09-24, #194).**
  - A verificação lê a tela `Archetypes`, que não mostra nenhum dos dois.
  - Desde o FC 26, o overall só existe por posição, no lobby do clube, e o seed do elo fica neutro ([piloto de OCR, rodada 2](06-piloto-ocr.md)).
  - O arquétipo tem que ser compatível com a categoria ([Personagens](../produto/02-jogador/01-verificacao.md), "Categoria e arquétipo").
- **`estado`**: pendente de verificação, verificado, inativo (substituído na mesma categoria) ou arquivado (edição passada). Pendente e verificado contam como "o ativo" da categoria.
- **1 ativo por categoria por edição**, até 5 ativos. Recriação dentro da categoria é livre, então há personagens inativos e arquivados guardados. A regra é um índice único parcial no banco, e não uma checagem no código: duas criações ao mesmo tempo não podem ganhar as duas.
- `partidas_na_categoria` existe porque **o K-factor e o decaimento do seed dependem da contagem** (32 até a 9ª, 20 da 10ª — ver [Ranking](../produto/02-jogador/02-ranking.md)). Sem esse contador, nenhum dos dois é calculável.
- **O personagem que substitui outro na mesma categoria herda `partidas_na_categoria`** (RF-027, 2026-09-24). Começar do zero entregaria de novo o K-factor de jogador novo, e reabriria a troca de categoria que a RF-028 trava.
- **Pendência pra Fase 2.4: o elo é da categoria, e o `EventoElo` aponta pro personagem.** A RF-027 diz que trocar o personagem não zera o elo, então o motor de elo precisa somar os eventos de todos os personagens da conta naquela categoria e edição, e não só os do personagem ativo.

### EnvioDePrint
`personagem` ou `lobby` · `hash_arquivo` (único, anti-reuso) · `arquivo` · `confianca_ocr` · `idioma_detectado` · `aceito` · `enviado_em`

- `hash_arquivo` é a trava de reuso de print ([Resultado](../produto/03-partida/04-resultado.md)); `idioma_detectado` existe porque o OCR reconhece PT, ES e EN ([Personagens](../produto/02-jogador/01-verificacao.md)) e o valor ajuda a diagnosticar rejeição.
- Arquivo apagado aos **90 dias**, ou na rodada seguinte do job se a conta for apagada antes; o registro sobrevive (sem conta nem personagem) pra manter o hash funcionando ([LGPD](../produto/04-governanca/02-lgpd.md)).
- **`estado` e `causa` no lugar de `aceito` (2026-09-24, #195 e #198)**: toda tentativa vira registro, inclusive a recusada, porque o teto de 10 por hora (RF-065) conta tentativas. O estado é recebido (passou nas checagens e espera verificação), aceito ou recusado; a causa é uma das da [RF-029](05-funcionais.md#rf-029--print-rejeitado-diz-a-causa). Só o print guardado tem hash.
- **Enquanto o OCR não entra, cada print recebido abre um `CasoModeracao` de verificação de personagem**, ligado ao envio (um caso por print). O moderador digita o arquétipo e o gamertag que vê, e o servidor compara com o declarado. **Ninguém verifica o próprio personagem.**

### EntradaFila
`conta` · `personagem` · `categoria` · `elo_no_momento` · `entrou_em` — uma ativa por conta.

`elo_no_momento` é congelado na entrada: a banda de busca (±150 abrindo a ±400) precisa de referência estável, senão o alvo se move durante a própria busca. É também o valor que entra na média de cada lado no cálculo de elo ([RF-077](05-funcionais.md#rf-077--expectativa-de-elo-usa-a-média-dos-humanos-de-cada-lado)).

### OcorrenciaRecusaFila
`conta` · `lobby` · `criado_em` — uma linha por recusa explícita ou por estouro dos 30 s.

**Gap fechado em 2026-09-11.** O timeout progressivo de fila ([RF-009](05-funcionais.md#rf-009--recusar-ou-não-confirmar-gera-timeout-progressivo-de-fila): 5/15/30 min, 2 h) e o zeramento ([RF-010](05-funcionais.md#rf-010--contador-de-timeout-zera-com-12-h-limpas-ou-uma-partida-completada): 12 h limpas ou 1 partida completada) não tinham **onde** ser contados: recusa não gera evento de reputação por decisão explícita ([RF-011](05-funcionais.md#rf-011--recusar-não-altera-reputação)), e o log de elo/reputação era o único registro datado do sistema. Sem esta tabela, as duas regras eram inimplementáveis.

O bloqueio corrente é **derivado**, não guardado: conta as ocorrências desde o mais recente entre (agora − 12 h) e a última partida completada, e aplica a escada. Estado derivado não dessincroniza.

### Lobby
`estado` · `criado_em` · `fechado_em` · `encerrado_em` · `capitao_lado_a` · `capitao_lado_b` · `clube_a` · `clube_b` · `formacao_a` · `formacao_b` · `placar_a` · `placar_b` · `anulada` · `canal_texto_id` · `canal_voz_a_id` · `canal_voz_b_id`

`clube_a` / `clube_b` guardam o **nome do clube capturado no momento da escolha do capitão** — é o par esperado que o OCR de resultado valida, e muda a cada lobby ([Mecânica](../produto/03-partida/01-mecanica.md)).

**Campos acrescentados em 2026-09-11**, todos por requisito que não tinha apoio:

- **`fechado_em`** — *todo* prazo do fluxo conta "desde o lobby fechar" (5 min de convite, 60 min de zero-report, piso de 15 min e teto de 3 h de deleção de canal) e só existia `criado_em`, que é outro instante: o lobby é criado ao fechar o roster e "fecha" quando os dois capitães confirmam. `encerrado_em` marca a entrada em estado terminal, base da faxina de canal órfão.
- **`placar_a` / `placar_b` / `anulada`** — o resultado **confirmado** não tinha casa. `Report` guarda o que cada lado enviou; o valor que vale, que alimenta elo e o histórico indefinido de [RF-018](05-funcionais.md#rf-018--histórico-de-partida-não-expira), ficava sem campo, e o rótulo de partida anulada de [RF-044](05-funcionais.md#rf-044--disputa-sem-evidência-decisiva-anula-a-partida) também.
- **`canal_*_id`** — [RF-052](05-funcionais.md#rf-052--canais-são-apagados-pelos-três-gatilhos-e-imediatamente-em-cancelamento) e [RF-054](05-funcionais.md#rf-054--faxina-horária-apaga-canal-órfão) mandam apagar os 3 canais e varrer órfão, e o bot não tem banco — sem os ids gravados aqui, "apagar os canais daquele lobby" dependia de memória de processo.

### EstatisticaPartida
`participacao_lobby` · `nota` · `gols` · `assistencias` · `posicao_lida` · `extraida_de` (envio de print)

**Gap fechado em 2026-09-11.** Duas regras já decididas dependiam desses campos e nenhuma tinha onde gravá-los: [RF-046](05-funcionais.md#rf-046--nota-individual-00-no-print-suspende-a-penalidade-automática) (nota individual 0.0 suspende os −8 automáticos, proteção contra o bug de perda de controle) e a estatística individual exibida no perfil público ([Perfil](../produto/02-jogador/03-perfil.md)). `posicao_lida` é o que [RF-067](05-funcionais.md#rf-067--print-final-confere-a-categoria-jogada) compara com a categoria da fila.

Não pesa no elo, por decisão ([Ranking](../produto/02-jogador/02-ranking.md)) — é histórico e insumo de moderação.

### ParticipacaoLobby
`lobby` · `conta` · `personagem` · `lado` · `posicao` · `confirmou_entrada` · `confirmou_convite_recebido` · `voto_formacao`

`confirmou_convite_recebido` é o que sustenta o cancelamento anti-exclusão de 5 minutos ([Lobby](../produto/03-partida/03-lobby.md)).

### Report
`lobby` · `conta` · `placar_a` · `placar_b` · `envio_print` · `reportou_ausencia_de` · `enviado_em`

### Avaliacao
`lobby` · `de_conta` · `para_conta` · `tipo` (joinha / negativa) · `criada_em` — só entre companheiros do mesmo lado.

Ao excluir a conta de quem avaliou, `de_conta` é anonimizado e a joinha continua contando pro outro ([LGPD](../produto/04-governanca/02-lgpd.md)).

### EventoReputacao e EventoElo — as entidades que o rollback exige

**Implicação que estava implícita e não podia ficar.** O dossiê decidiu **rollback retroativo** de elo, reputação e contadores de reincidência quando a moderação reverte uma disputa ([Ranking](../produto/02-jogador/02-ranking.md)). Guardar só o valor atual **torna isso impossível** — não há como desfazer o que não foi registrado.

`conta` (ou `personagem`, no elo) · `delta` · `motivo` · `lobby` · `criado_em` · `revertido_em`

**Retenção: indefinida, igual ao histórico de partida (decidido em 2026-09-08)** — o log é o que sustenta o valor atual de elo/reputação e os contadores de reincidência; apagá-lo quebra a rastreabilidade do próprio número corrente, não é dado efêmero como o print.

Três regras do dossiê dependem desse log, não só o rollback:

- **Contadores de janela móvel de 30 dias** (3 faltas, 3 zero-reports, 5 negativas) precisam de eventos com data pra serem contados — valor atual não responde "quantos nos últimos 30 dias".
- **Recuperação de +1 por partida limpa com teto em 70** precisa distinguir a origem de cada ganho, senão o teto não é aplicável.
- **Reverter uma penalidade sem deixar rastro no histórico de reincidência** exige marcar o evento como revertido, não apagá-lo.

### CasoModeracao
`tipo` · `estado` · `aberto_em` · `origem` (sistema / usuário / mensagem no Discord) · `lobby` · `conta_alvo` · `aberto_por` · `resolvido_por` · `resolvido_em` · `decisao` · `caminho_evidencia` · `mensagem_apelacao` · `caso_apelado`

Os tipos são os já enumerados em [Moderação](../produto/04-governanca/01-moderacao.md), incluindo os abertos automaticamente.

**As três últimas colunas foram acrescentadas em 2026-09-18**, e existiam no código antes de existirem aqui — achado de varredura, mesma classe do `discord_id` em texto puro:

- **`caminho_evidencia`** — print anexado ao caso, hoje o de recuperação de conta ([RF-025](05-funcionais.md#rf-025--recuperação-sem-e-mail-e-sem-discord-exige-dois-fatores)). Guarda **caminho**, nunca a imagem: o arquivo fica cifrado fora do banco, e a coluna é zerada quando a retenção de 90 dias apaga o print ([LGPD](../produto/04-governanca/02-lgpd.md)). **Importa estar aqui** porque este documento é a espinha do inventário de dado pessoal — coluna que aponta pra print e não consta do inventário é dado pessoal fora do mapa.
- **`mensagem_apelacao`** — o que a pessoa alega ([RF-037](05-funcionais.md#rf-037--uma-apelação-por-punição-reabertura-só-com-fato-novo), [RF-081](05-funcionais.md#rf-081--conta-banida-faz-login-em-modo-restrito-só-pra-apelar)).
- **`caso_apelado`** — o caso que esta apelação contesta, preenchido só em apelação. É o índice único sobre ele que faz valer "uma apelação por punição" da RF-037, não uma leitura anterior.

**`aberto_por` — gap fechado em 2026-09-08**: conta que abriu o caso (denunciante, contestante), ou `sistema` nos casos automáticos (acúmulo de avaliação negativa, retry de webhook esgotado). Sem esse campo, três requisitos não têm onde se apoiar: [RF-036](05-funcionais.md#rf-036--denunciado-nunca-vê-quem-denunciou) (painel precisa ver quem denunciou), [RF-068](05-funcionais.md#rf-068--máximo-de-3-denúncias-abertas-por-conta) (contar denúncias abertas por conta) e [RF-012](05-funcionais.md#rf-012--qualquer-humano-da-partida-contesta-uma-vez-cada) (bloquear 2ª contestação da mesma pessoa).

### EntregaEvento
`id_evento` (único) · `tipo` · `payload` · `alvo` (lobby ou conta) · `tentativas` · `entregue_em` · `criado_em`

**Gap fechado em 2026-09-11.** [RF-058](05-funcionais.md#rf-058--evento-da-plataforma-pro-bot-tem-retry-e-vira-caso-ao-esgotar) exige retry com backoff (10s/20s/40s) e descarte de reenvio duplicado por id — e a [arquitetura do bot](../discord/05-arquitetura-bot.md) colocava as duas coisas **em memória, no bot**, que não tem banco e perde tudo em restart (justo quando o retry importa). O registro passa a viver na API, que é quem retenta; o bot fica idempotente checando o estado real no Discord antes de agir.

### IdentidadeBloqueada
`discord_id_hash` · `gamertag_hash` · `plataforma` · `motivo` · `caso` · `criado_em`

**Gap fechado em 2026-09-11** ([RF-079](05-funcionais.md#rf-079--banimento-sobrevive-à-exclusão-de-conta)). O banimento era vinculado a Discord ID + gamertag guardados **na Conta**, e a exclusão por LGPD apaga a conta e libera o e-mail — bastava pedir exclusão depois do ban pra voltar limpo com a mesma identidade. Guarda só hash (mesmo HMAC de `GamertagPlataforma`), então sobrevive à exclusão sem reter dado pessoal legível.

### LogAuditoria
`ator` · `acao` · `alvo` · `detalhe` · `criado_em` — toda ação de moderador, inclusive **acesso a print de terceiro** ([Requisitos transversais](01-transversais.md)).

### AceiteTos
`conta` · `versao` · `aceito_em` — mudança material exige aceite novo ([Termos](../produto/04-governanca/03-termos.md)).

### Notificacao
`conta` · `tipo` · `payload` · `lida_em` · `criada_em` — ver [inventário de notificações](04-notificacoes.md).

### EventoPagamento
`conta` · `tipo` (fundador / apoiador) · `valor` · `confirmado_por` · `confirmado_em` · `criado_em`

**Gap fechado em 2026-09-08**, mesmo motivo do campo `plano` na Conta: [Ordem de implementação](../negocio/02-implementacao.md) manda a tabela nascer junto com o schema e ela não constava aqui. **Nada de cobrança implementada no MVP** — a confirmação é manual por PIX, feita no painel de moderação e registrada também no `LogAuditoria` ([Sustentabilidade](../negocio/03-sustentabilidade.md)). O espaço existe pra não precisar de migração retroativa quando o lançamento chegar.

## O que a modelagem confirmou que falta em nenhum lugar

Nada além da inconsistência de gamertag e das duas entidades de evento acima. Toda outra regra do dossiê encontrou onde se apoiar — o que é o resultado esperado depois das rodadas anteriores de auditoria, e o motivo de valer a pena ter feito este exercício mesmo sendo consolidação.

**Auditoria de 2026-09-11** encontrou seis, todos de regra já decidida que não tinha campo: `EstatisticaPartida` (nota 0.0 de RF-046 e estatística do perfil), `OcorrenciaRecusaFila` (timeout progressivo de RF-009/RF-010), `EntregaEvento` (retry e idempotência de RF-058), `IdentidadeBloqueada` (RF-079), os campos novos de `Lobby` (prazos, placar final, ids de canal) e a separação hash/cifra do gamertag. Relatório em [research/auditoria-2026-09-11.md](../research/auditoria-2026-09-11.md).

**Auditoria de 2026-09-08 (contra o scaffold do monorepo)** encontrou mais três: o campo `papel` da Conta, o campo `plano` e a entidade `EventoPagamento` acima — todos eram decisão já tomada em outro documento que nunca chegou até aqui. Corrigidos no mesmo dia, antes da primeira migration existir.
