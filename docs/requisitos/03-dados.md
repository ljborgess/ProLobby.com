# Modelo de dados — entidades e atributos

**Fase: MVP**

Consolidação das entidades que o produto exige, derivadas das decisões já tomadas — **não é esquema de banco**, é o inventário de campo que o esquema precisa contemplar. Serve pra duas coisas: verificar que toda regra do dossiê tem onde se apoiar, e evitar migração retroativa em campo que já se sabe necessário.

O esquema concreto vive em `apps/api` (MikroORM, [ADR-006](../adr/006-backend-separado-e-tooling.md)) — quando os dois divergirem, este arquivo é a fonte do **que precisa existir** e a migration é a fonte do **como está implementado**.

Estados de cada entidade em [Estados do lobby e da partida](02-estados.md).

## Identidade: gamertag é por plataforma

**Inconsistência que a modelagem revelou.** O dossiê afirmava três coisas que não fechavam juntas: gamertag fica **na conta**, plataforma fica **no personagem**, e a identidade única é a combinação **plataforma + gamertag** ([Personagens](../produto/02-jogador/01-verificacao.md), [Escopo](../produto/05-produto/02-escopo.md)).

Quem migra de PS5 pra PC — caso que o escopo trata explicitamente, preservando a reputação da conta — passa a ter personagens em duas plataformas. E PSN ID e gamertag de Xbox são nomes diferentes: um campo só na conta não guarda os dois. Pior, o OCR compara "o gamertag da tela" contra "o gamertag da conta" e não teria como saber contra qual comparar.

**Decisão: a conta guarda um gamertag por plataforma.** O personagem aponta pra plataforma; o OCR compara contra o gamertag daquela plataforma. Casa com a identidade única ser o par, e com a troca de plataforma já prevista.

- Unicidade global continua em **(plataforma, gamertag)**, e a exclusividade só nasce com a verificação — reivindicação não verificada não expira, porque não bloqueia ninguém ([Personagens](../produto/02-jogador/01-verificacao.md)).
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
`conta` · `categoria` (GK / zaga-lateral / meio / ponta / ataque) · `arquetipo` · `plataforma` · `edicao_jogo` · `nome` · `foto` · `elo` (derivado, sem coluna — #207) · `partidas_na_categoria` · `estado` · `verificado_em` · `criado_em`

- **`arquetipo` entra, `overall` e `atributos` saem (2026-09-24, #194).**
  - A verificação lê a tela `Archetypes`, que não mostra nenhum dos dois.
  - Desde o FC 26, o overall só existe por posição, no lobby do clube, e o seed do elo fica neutro ([piloto de OCR, rodada 2](06-piloto-ocr.md)).
  - O arquétipo tem que ser compatível com a categoria ([Personagens](../produto/02-jogador/01-verificacao.md), "Categoria e arquétipo").
- **`estado`**: pendente de verificação, verificado, inativo (substituído na mesma categoria) ou arquivado (edição passada). Pendente e verificado contam como "o ativo" da categoria.
- **1 ativo por categoria por edição**, até 5 ativos. Recriação dentro da categoria é livre, então há personagens inativos e arquivados guardados. A regra é um índice único parcial no banco, e não uma checagem no código: duas criações ao mesmo tempo não podem ganhar as duas.
- `partidas_na_categoria` existe porque **o K-factor depende da contagem** (32 até a 9ª, 20 da 10ª — ver [Ranking](../produto/02-jogador/02-ranking.md)). Sem esse contador, ele não é calculável.
- **O personagem que substitui outro na mesma categoria herda `partidas_na_categoria`** (RF-027, 2026-09-24). Começar do zero entregaria de novo o K-factor de jogador novo, e reabriria a troca de categoria que a RF-028 trava.
- **Como o elo da categoria é lido (2026-09-30, #207):** não existe coluna. É **1000 mais a soma dos `EventoElo` não revertidos** de todos os personagens da conta naquela categoria e edição, inclusive os inativos. O substituto herda o elo porque os eventos do anterior continuam no log (RF-027). Ninguém escreve o número: quem muda elo grava evento (#209, #211), e o rollback (#210) só marca `revertido_em` — a próxima leitura volta sozinha.

### EnvioDePrint
`personagem` ou `lobby` · `hash_arquivo` (único, anti-reuso) · `arquivo` · `confianca_ocr` · `idioma_detectado` · `aceito` · `enviado_em`

- `hash_arquivo` é a trava de reuso de print ([Resultado](../produto/03-partida/04-resultado.md)); `idioma_detectado` existe porque o OCR reconhece PT, ES e EN ([Personagens](../produto/02-jogador/01-verificacao.md)) e o valor ajuda a diagnosticar rejeição.
- Arquivo apagado aos **90 dias**, ou na rodada seguinte do job se a conta for apagada antes; o registro sobrevive (sem conta nem personagem) pra manter o hash funcionando ([LGPD](../produto/04-governanca/02-lgpd.md)).
- **`estado` e `causa` no lugar de `aceito` (2026-09-24, #195 e #198)**: toda tentativa vira registro, inclusive a recusada, porque o teto de 10 por hora (RF-065) conta tentativas. O estado é recebido (passou nas checagens e espera verificação), aceito ou recusado; a causa é uma das da [RF-029](05-funcionais.md#rf-029--print-rejeitado-diz-a-causa). Só o print guardado tem hash.
- **Enquanto o OCR não entra, cada print recebido abre um `CasoModeracao` de verificação de personagem**, ligado ao envio (um caso por print). O moderador digita o arquétipo e o gamertag que vê, e o servidor compara com o declarado; a fila não manda nem o arquétipo nem o gamertag declarados pro navegador, pra não virar cola. **Ninguém verifica o próprio personagem.** Personagem substituído (RF-027) fecha o caso aberto junto.
- **Cooldown sem coluna nova (2026-09-24, #197)**: as 24 h da [RF-030](05-funcionais.md#rf-030--cooldown-de-24-h-só-conta-pra-atualização-aceita) contam a partir do `verificado_em` mais recente da categoria naquela edição, que só a aprovação escreve; o personagem substituído entra na conta, senão criar um substituto logo depois da aprovação furaria o cooldown. Enquanto um print está recebido, outro do mesmo personagem é recusado, senão dois na fila furariam o cooldown. A pergunta "o arquétipo aberto é o seu ativo?" vai junto com o envio, obrigatória, até a tela de confirmação do OCR (#199).

### EntradaFila
`conta` · `personagem` · `categoria` · `elo_no_momento` · `entrou_em` — uma ativa por conta.

O personagem `travado` de [Estados](02-estados.md) **não é coluna**: é derivado de existir entrada pra ele (#228, 2026-10-06). Enquanto existe, o personagem não recebe print, troca de categoria nem substituto ([RF-031](05-funcionais.md#rf-031--personagem-em-fila-ou-lobby-não-aceita-atualização)). Sair da fila apaga a linha.

**`lobby` (#231, 2026-10-07)**: nulo enquanto busca. Quando a fila escala a entrada, ela ganha o lobby em vez de ser apagada: a conta segue com a única entrada, o personagem segue travado e quem voltar à busca mantém o `entrou_em`. Escalado não sai da fila pela rota de saída; sai recusando o lobby (#232).

`elo_no_momento` é congelado na entrada: a banda de busca (±150 abrindo a ±400) precisa de referência estável, senão o alvo se move durante a própria busca. É também o valor que entra na média de cada lado no cálculo de elo ([RF-077](05-funcionais.md#rf-077--expectativa-de-elo-usa-a-média-dos-humanos-de-cada-lado)).

### OcorrenciaRecusaFila
`conta` · `lobby` · `criado_em` — uma linha por recusa explícita ou por estouro dos 30 s.

**Gap fechado em 2026-09-11.** O timeout progressivo de fila ([RF-009](05-funcionais.md#rf-009--recusar-ou-não-confirmar-gera-timeout-progressivo-de-fila): 5/15/30 min, 2 h) e o zeramento ([RF-010](05-funcionais.md#rf-010--contador-de-timeout-zera-com-12-h-limpas-ou-uma-partida-completada): 12 h limpas ou 1 partida completada) não tinham **onde** ser contados: recusa não gera evento de reputação por decisão explícita ([RF-011](05-funcionais.md#rf-011--recusar-não-altera-reputação)), e o log de elo/reputação era o único registro datado do sistema. Sem esta tabela, as duas regras eram inimplementáveis.

O bloqueio corrente é **derivado**, não guardado: conta as ocorrências desde o mais recente entre (agora − 12 h) e a última partida completada, e aplica a escada. Estado derivado não dessincroniza.

**Como a contagem ficou no código (#232, 2026-10-07)**: em cadeia, lendo ao pé da letra o "12 h sem recusa" do [RF-010](05-funcionais.md#rf-010--contador-de-timeout-zera-com-12-h-limpas-ou-uma-partida-completada). Cada recusa sobe um degrau quando vem menos de 12 h depois da anterior; um intervalo de 12 h ou uma partida completada recomeça do 1º. A janela móvel de 12 h da frase acima dá outro número quando as recusas vêm espaçadas: recusas a cada 6 h seguem subindo na cadeia, e na janela ficariam presas no 2º degrau. Partida completada = último evento de elo `match_result` da conta. A recusa grava o id do lobby como valor simples, porque o lobby recusado é desfeito.

### RegistroAuditoria
`acao` (papel trocado / caso resolvido) · `autor` · `rotulo_autor` (moderador, sistema ou `cli:<e-mail>`) · `conta_alvo` · `caso` · `antes` · `depois` · `criado_em`

**Só acréscimo, garantido pelo banco** (#243, 2026-10-09): um trigger recusa UPDATE, DELETE e TRUNCATE pra qualquer role, e a role da API fica só com SELECT e INSERT. Por isso **não há chave estrangeira**: a exclusão em cascata de uma conta seria um UPDATE ou DELETE aqui, e o trigger travaria a própria exclusão. Os ids ficam como valor simples; depois de uma exclusão LGPD, não apontam pra ninguém. Grava hoje a troca de papel (script `set-role`) e toda resolução de caso de verificação, do moderador ou do sistema.

### Lobby
`estado` · `criado_em` · `fechado_em` · `encerrado_em` · `capitao_lado_a` · `capitao_lado_b` · `clube_a` · `clube_b` · `formacao_a` · `formacao_b` · `placar_a` · `placar_b` · `anulada` · `canal_texto_id` · `canal_voz_a_id` · `canal_voz_b_id`

`clube_a` / `clube_b` guardam o **nome do clube capturado no momento da escolha do capitão** — é o par esperado que o OCR de resultado valida, e muda a cada lobby ([Mecânica](../produto/03-partida/01-mecanica.md)).

**Campos acrescentados em 2026-09-11**, todos por requisito que não tinha apoio:

- **`fechado_em`** — *todo* prazo do fluxo conta "desde o lobby fechar" (5 min de convite, 60 min de zero-report, piso de 15 min e teto de 3 h de deleção de canal) e só existia `criado_em`, que é outro instante: o lobby é criado ao fechar o roster e "fecha" quando os dois capitães confirmam. `encerrado_em` marca a entrada em estado terminal, base da faxina de canal órfão.
- **`placar_a` / `placar_b` / `anulada`** — o resultado **confirmado** não tinha casa. `Report` guarda o que cada lado enviou; o valor que vale, que alimenta elo e o histórico indefinido de [RF-018](05-funcionais.md#rf-018--histórico-de-partida-não-expira), ficava sem campo, e o rótulo de partida anulada de [RF-044](05-funcionais.md#rf-044--disputa-sem-evidência-decisiva-anula-a-partida) também.
- **`canal_*_id`** — [RF-052](05-funcionais.md#rf-052--canais-são-apagados-pelos-três-gatilhos-e-imediatamente-em-cancelamento) e [RF-054](05-funcionais.md#rf-054--faxina-horária-apaga-canal-órfão) mandam apagar os 3 canais e varrer órfão, e o bot não tem banco — sem os ids gravados aqui, "apagar os canais daquele lobby" dependia de memória de processo.

**Como a cascata de capitão ficou no código (#247, 2026-10-09)**: `espera_capitao_desde` marca o início dos 5 min do teto, contado quando os 8 confirmam a entrada. `fechado_em` é gravado quando os dois lados têm capitão confirmado, e o lobby passa a `waiting_invite`. Teto estourado sem os dois capitães leva a `cancelled_no_fault`, com `encerrado_em`. O nome do clube vai pra `clube_a`/`clube_b` na confirmação do capitão, copiado do `ClubeDeclarado` (mesmo limite de 20 caracteres).

### OfertaCapitao
`lobby` · `lado` · `conta` · `ofertada_em` · `resultado` (confirmed / declined / expired / withdrawn, nulo enquanto espera) · `respondida_em` · `declarou_cheio`

Uma linha por oferta do papel de capitão (#247). A oferta em aberto é a que tem `resultado` nulo, uma por lado. Quem já recebeu oferta naquele lado não é candidato de novo, então a fila de candidatos é derivada das linhas e não precisa de coluna própria. `declarou_cheio` registra o "o clube encheu" sem penalidade, separado da recusa simples, pra auditoria de abuso futura. Desistência do capitão confirmado vira `withdrawn` e reabre a cascata naquele lado.

### EstatisticaPartida
`participacao_lobby` · `nota` · `gols` · `assistencias` · `posicao_lida` · `extraida_de` (envio de print)

**Gap fechado em 2026-09-11.** Duas regras já decididas dependiam desses campos e nenhuma tinha onde gravá-los: [RF-046](05-funcionais.md#rf-046--nota-individual-00-no-print-suspende-a-penalidade-automática) (nota individual 0.0 suspende os −8 automáticos, proteção contra o bug de perda de controle) e a estatística individual exibida no perfil público ([Perfil](../produto/02-jogador/03-perfil.md)). `posicao_lida` é o que [RF-067](05-funcionais.md#rf-067--print-final-confere-a-categoria-jogada) compara com a categoria da fila.

Não pesa no elo, por decisão ([Ranking](../produto/02-jogador/02-ranking.md)) — é histórico e insumo de moderação.

### ParticipacaoLobby
`lobby` · `conta` · `personagem` · `lado` · `posicao` · `elo_no_momento` · `confirmou_entrada` · `confirmou_convite_recebido` · `voto_formacao`

`elo_no_momento` é copiado da entrada na fila quando o lobby fecha (#209): a entrada é apagada quando a partida assenta, e é este valor que entra na média de cada lado da [RF-077](05-funcionais.md#rf-077--expectativa-de-elo-usa-a-média-dos-humanos-de-cada-lado).

`confirmou_convite_recebido` é o que sustenta o cancelamento anti-exclusão de 5 minutos ([Lobby](../produto/03-partida/03-lobby.md)).

**Como o convite ficou no código (#248, 2026-10-14)**: `confirmou_convite_recebido` é uma data, e a linha do capitão ganhou `declarou_clube_cheio_em`. A janela conta 5 min do `fechado_em`. O capitão já está no próprio clube, então nunca conta como "esperando convite". Todos os outros marcaram: `in_progress`. Passados os 5 min com alguém de um lado sem convite, o lobby termina e todos voltam a buscar na hora, com o tempo que tinham, sem recusa e sem evento de reputação. Se o capitão daquele lado declarou clube cheio, `cancelled_no_fault`; se ficou calado, `cancelled_by_captain` e um caso `captain_abuse` contra ele. Com os dois lados incompletos, só o capitão calado leva caso. O 60 min do zero-report a partir de `in_progress` é da 4.1.

**Como a votação de formação ficou no código (#249, 2026-10-15)**: `voto_formacao` virou tabela própria, `VotoFormacao` (`lobby` · `conta` · `formacao` · `votado_em`, um por pessoa, trocado no lugar até o fim do prazo). O lado sai da participação de quem votou, nunca do pedido. Os 60 s contam de `votacao_formacao_aberta_em`, gravado quando o bot avisa que criou os canais (evento `lobby.channels_created`, que também traz os três ids de canal); conta a hora em que a API recebe o aviso, não a do bot. Fim do prazo: a mais votada vai pra `formacao_a`/`formacao_b`; empate ou zero voto deixa a formação vazia até o capitão escolher (entre as empatadas, ou qualquer uma). O conjunto começa com as três formações que o dossiê cita (4-3-3, 4-4-2, 4-2-3-1).

### Report
`lobby` · `conta` · `placar_a` · `placar_b` · `envio_print` · `reportou_ausencia_de` · `enviado_em`

**Como o report ficou no código (4.1, fatia A, 2026-10-15)**: um por pessoa por lobby, com o `lado` copiado da participação. `envio_print` virou o hash do arquivo (único entre todos os reports, então o mesmo arquivo nunca reporta duas partidas) e o caminho do arquivo cifrado, apagado em 90 dias como o print de personagem. A checagem de imagem (tipo real e tamanho) é a mesma do print de personagem. Antes de 5 min do `fechado_em`, a API recusa e diz quanto falta (RF-045). O primeiro report aceito leva o lobby de `in_progress` pra `awaiting_confirmation` e grava `primeiro_report_em`, o marco dos 15 min. Quem reportou corrige o placar digitado, com `corrigido_em`, enquanto ninguém do outro lado reportou (RF-042); o print não muda. Sem OCR ainda (#191), o placar digitado é o que vale; `reportou_ausencia_de` fica pra fatia da ausência.

**Como a ausência ficou no código (4.1, 2026-10-21)**: `reportou_ausencia_de` virou a tabela `AusenciaReportada` (`report` · `participacao`), uma linha por pessoa que o report diz ter saído ou não jogado. Pode ser de qualquer lado, menos quem reporta. Quando a partida termina em `finished`, a ausência apontada pelos **dois lados** está confirmada e gera o `EventoReputacao` `disconnect` (−8) no lugar do `clean_match`. Apontada por um lado só, não conta como confirmada: a pessoa não leva os −8, mas também não ganha o +1. Resultado de um lado só (o caminho das 48 h) nunca confirma ausência. A exceção da nota 0.0 ([RF-046](05-funcionais.md#rf-046--nota-individual-00-no-print-suspende-a-penalidade-automática)) espera o OCR ler a nota (#191).

**Como a confirmação cruzada ficou no código (4.1, fatia B, 2026-10-15)**: o primeiro report do outro lado, dentro de 15 min do `primeiro_report_em`, decide. Igual a todos os reports já enviados, o lobby vai pra `finished` com `placar_a`/`placar_b` e `encerrado_em`. Qualquer diferença, inclusive entre colegas do mesmo lado, vai pra `in_dispute` com um caso `score_dispute` e a fila continua presa. Sem o outro lado em 15 min, `not_confirmed` com o placar do primeiro report e `nao_confirmado_em`, que vira `finished` depois de 48 h. Em `finished` e `not_confirmed` as entradas da fila são apagadas: a conta sai da fila e o personagem destrava. Ao virar `finished`, pelos dois caminhos, cada humano ganha o `EventoReputacao` `clean_match` (+1 até 70). O elo da partida fica pra #209.

**Como a contestação ficou no código (4.1, fatia C, 2026-10-16)**: é um `CasoModeracao` do tipo `score_dispute` com `aberto_por` preenchido, e é esse campo que barra a segunda contestação da mesma pessoa na mesma partida (RF-012). Só vale em `not_confirmed` dentro das 48 h do `nao_confirmado_em`; leva o lobby pra `in_dispute` e esvazia `placar_a`/`placar_b`. Partida em `in_dispute` barra a entrada na fila de todos os participantes, e quem estava buscando sai da busca; quem já foi colocado em lobby novo fica nele (RF-013). Disputa prende a fila, não o clube: o capitão de uma partida em disputa pode capitanear outra.

**Como o zero-report ficou no código (4.1, fatia D, 2026-10-16)**: só sai de `in_progress`, ou seja, com todos os convites confirmados. Passados 60 min do `fechado_em` sem nenhum print, o lobby vai pra `expired_no_report` com `encerrado_em`, as entradas da fila são apagadas e cada humano ganha um `EventoReputacao` `zero_report` com o lobby. O valor segue a RF-071: conta os `zero_report` não revertidos da conta nos 30 dias anteriores; 1ª e 2ª vez −3, depois −6, −9 e assim por diante, nunca abaixo de zero. O valor fica gravado no evento e um recálculo (#210) não o refaz, porque a escala depende de datas, não do valor anterior.

### Avaliacao
`lobby` · `de_conta` · `para_conta` · `tipo` (joinha / negativa) · `criada_em` — só entre companheiros do mesmo lado.

Ao excluir a conta de quem avaliou, `de_conta` é anonimizado e a joinha continua contando pro outro ([LGPD](../produto/04-governanca/02-lgpd.md)).

**Como a avaliação ficou no código (Fase 4.2, 2026-10-20)**: a tabela é `peer_rating`, com uma avaliação por par por partida e só em lobby `finished`. O prazo pra avaliar é de 48 h desde o `encerrado_em`, decidido em 2026-10-20 ([parâmetros](../produto/parametros.md)). Joinha gera o `EventoReputacao` `peer_thumbs_up` (+1 até 100) na hora. Negativa não mexe em nada; abre caso `negative_rating_threshold` quando há 5 pessoas diferentes **e** 5 partidas diferentes entre as negativas dos últimos 30 dias que vieram depois do último caso desse tipo, e esse corte evita abrir dois casos pela mesma leva. As duas contagens são separadas, uma aproximação do "pessoas diferentes em partidas diferentes": o moderador que lê o caso vê os detalhes. O autor da avaliação nunca sai da API ([RF-036](05-funcionais.md#rf-036--denunciado-nunca-vê-quem-denunciou)).

### EventoReputacao e EventoElo — as entidades que o rollback exige

**Implicação que estava implícita e não podia ficar.** O dossiê decidiu **rollback retroativo** de elo, reputação e contadores de reincidência quando a moderação reverte uma disputa ([Ranking](../produto/02-jogador/02-ranking.md)). Guardar só o valor atual **torna isso impossível** — não há como desfazer o que não foi registrado.

`conta` (ou `personagem`, no elo) · `delta` · `motivo` · `lobby` · `criado_em` · `revertido_em`

**Retenção: indefinida, igual ao histórico de partida (decidido em 2026-09-08)** — o log é o que sustenta o valor atual de elo/reputação e os contadores de reincidência; apagá-lo quebra a rastreabilidade do próprio número corrente, não é dado efêmero como o print.

Três regras do dossiê dependem desse log, não só o rollback:

- **Contadores de janela móvel de 30 dias** (3 faltas, 3 zero-reports, 5 negativas) precisam de eventos com data pra serem contados — valor atual não responde "quantos nos últimos 30 dias".
- **Recuperação de +1 por partida limpa com teto em 70** precisa distinguir a origem de cada ganho, senão o teto não é aplicável.
- **Reverter uma penalidade sem deixar rastro no histórico de reincidência** exige marcar o evento como revertido, não apagá-lo.

**Como a reputação é escrita (2026-09-25, #208):** um serviço só grava o `EventoReputacao` e atualiza a `reputacao` da conta, na mesma transação e com a conta travada. Assim a coluna é sempre 70 mais a soma dos eventos não revertidos. O `delta` guardado é a mudança que de fato aconteceu, já com o teto de 70 da partida limpa e o chão de 0. **Mudança zero também grava evento, com delta 0**, por exemplo partida limpa com a reputação em 70. Se ela moveu o número depende do que veio antes, e o rollback (#210) refaz a conta em ordem pra recalcular. As faixas (abaixo de 55 a fila fica mais lenta, abaixo de 40 suspensão, abaixo de 25 banimento) saem do número, então nunca discordam dele. **Cruzar uma faixa não tem registro à parte**: o log em ordem já diz de onde cada evento saiu e aonde chegou, com a direção. Aplicar o mesmo resultado duas vezes pro mesmo lobby ainda grava dois eventos; a trava contra isso entra com quem chama (fechamento do lobby, Fase 3). A suspensão e o banimento em si são da Fase 4.2.

**Como a partida anulada é desfeita (2026-09-25, #210):** os `EventoElo` de resultado e os `EventoReputacao` do lobby recebem `revertido_em`, e nenhum evento novo é gravado (RF-044). O elo volta sozinho, porque é derivado dos eventos. A reputação é **refeita em ordem a partir de 70**, recalculando cada evento automático depois do revertido: subtrair o delta daria pontos acima do teto (uma desconexão anulada depois de voltar a 70 levaria a 78). `partidas_na_categoria` perde a partida no **personagem ativo da categoria**, que é onde o resultado a contou (contrato com a #209) e o que o substituto herda (RF-027); os substituídos ficam como histórico. As contas envolvidas são travadas em ordem fixa, então dois rollbacks do mesmo lobby revertem uma vez só, e dois de lobbies diferentes não travam um no outro. **Limite aceito**: as partidas seguintes à anulada mantêm o K-factor e o esperado com que foram calculadas; recalcular a cadeia não entra agora.

**Como o decaimento é aplicado (2026-10-06, #211):** um job diário (UTC) olha só as categorias com partida, porque só elas podem estar acima de 1000. Cortes devidos = 1 no dia 90 sem partida e mais 1 a cada 30 dias; cortes já feitos = `EventoElo` `inactivity_decay` depois da última partida. O job grava só a diferença, então rodar de novo no mesmo dia não corta de novo, e um job atrasado põe em dia os cortes devidos. Cada corte é de −25 sem descer de 1000, vai pro personagem ativo da categoria, e é gravado com a conta travada. A última partida é o `match_result` mais recente **não revertido** de qualquer personagem da conta na categoria e edição: partida anulada não conta.

### CasoModeracao
`tipo` · `estado` · `aberto_em` · `origem` (sistema / usuário / mensagem no Discord) · `lobby` · `conta_alvo` · `aberto_por` · `resolvido_por` · `resolvido_em` · `decisao` · `caminho_evidencia` · `mensagem_apelacao` · `caso_apelado`

Os tipos são os já enumerados em [Moderação](../produto/04-governanca/01-moderacao.md), incluindo os abertos automaticamente.

**Como a denúncia ficou no código (Fase 4.2, 2026-10-20)**: é um caso `user_report` com duas colunas novas, preenchidas só nele: `motivo_denuncia` (`fraud` / `disconnect` / `behavior`) e `mensagem_denuncia`, o relato de quem denunciou. A mensagem entra no inventário de dado pessoal como a de apelação. Só se denuncia alguém com quem já se jogou uma partida, de qualquer lado, e nunca a si mesmo. Com 3 denúncias `aberto` pela conta, a 4ª é recusada até uma sair desse estado ([RF-068](05-funcionais.md#rf-068--máximo-de-3-denúncias-abertas-por-conta)). Denúncia arquivada como improcedente é a que fica `dismissed`: a 3ª em 30 dias abre um caso `baseless_reports` contra quem denunciou ([RF-069](05-funcionais.md#rf-069--denúncia-reincidente-sem-fundamento-vira-caso-de-conduta)). O gatilho é `UserReportService.afterDismissal`, que o painel (Fase 5) chama ao arquivar. Só contam os arquivamentos posteriores ao último caso desse tipo, pra mesma leva não abrir dois. A denúncia vinda de mensagem no Discord ainda não existe e vai passar pelo mesmo teto.

**Como a escada de punição ficou no código (Fase 4.2, 2026-10-20)**: toda punição automática vira um caso que já nasce `resolvido`, pelo sistema, com a `decisao` que a pessoa lê. São dois tipos novos, `suspension` e `ban`. Ninguém precisa agir neles, então não são avisados em `#casos-moderacao`. Eles existem pra apelação ter o que apontar ([RF-037](05-funcionais.md#rf-037--uma-apelação-por-punição-reabertura-só-com-fato-novo), #160) e pra [RF-038](05-funcionais.md#rf-038--2ª-suspensão-em-180-dias-vira-banimento) ter suspensões pra contar. Quem pune é o cruzamento da reputação, nunca o valor corrente ([RF-074](05-funcionais.md#rf-074--fim-de-suspensão-restaura-a-reputação-para-45)): cruzar 40 pra baixo suspende por 7 dias (`Conta.suspensao_termina_em`), ou bane se existe outra suspensão `resolvida` aberta nos 180 dias anteriores; cruzar 25 pra baixo bane. A apelação deferida pela moderação (Fase 5) deve deixar o caso da suspensão como `arquivado`, e é isso que tira ela da conta da RF-038. O banimento grava o Discord e os gamertags verificados da conta em `IdentidadeBloqueada` ([RF-079](05-funcionais.md#rf-079--banimento-sobrevive-à-exclusão-de-conta)). A punição tira a conta da busca, mas não mexe em partida em andamento. A cada 10 min um job encerra as suspensões cumpridas: a conta volta a `ativa` com o `EventoReputacao` `suspension_served`, que sobe pra 45 e deixa como está quem já estava acima ([RF-074](05-funcionais.md#rf-074--fim-de-suspensão-restaura-a-reputação-para-45)).

**As três últimas colunas foram acrescentadas em 2026-09-18**, e existiam no código antes de existirem aqui — achado de varredura, mesma classe do `discord_id` em texto puro:

- **`caminho_evidencia`** — print anexado ao caso, hoje o de recuperação de conta ([RF-025](05-funcionais.md#rf-025--recuperação-sem-e-mail-e-sem-discord-exige-dois-fatores)). Guarda **caminho**, nunca a imagem: o arquivo fica cifrado fora do banco, e a coluna é zerada quando a retenção de 90 dias apaga o print ([LGPD](../produto/04-governanca/02-lgpd.md)). **Importa estar aqui** porque este documento é a espinha do inventário de dado pessoal — coluna que aponta pra print e não consta do inventário é dado pessoal fora do mapa.
- **`mensagem_apelacao`** — o que a pessoa alega ([RF-037](05-funcionais.md#rf-037--uma-apelação-por-punição-reabertura-só-com-fato-novo), [RF-081](05-funcionais.md#rf-081--conta-banida-faz-login-em-modo-restrito-só-pra-apelar)).
- **`caso_apelado`** — o caso que esta apelação contesta, preenchido só em apelação. É o índice único sobre ele que faz valer "uma apelação por punição" da RF-037, não uma leitura anterior.

**`aberto_por` — gap fechado em 2026-09-08**: conta que abriu o caso (denunciante, contestante), ou `sistema` nos casos automáticos (acúmulo de avaliação negativa, retry de webhook esgotado). Sem esse campo, três requisitos não têm onde se apoiar: [RF-036](05-funcionais.md#rf-036--denunciado-nunca-vê-quem-denunciou) (painel precisa ver quem denunciou), [RF-068](05-funcionais.md#rf-068--máximo-de-3-denúncias-abertas-por-conta) (contar denúncias abertas por conta) e [RF-012](05-funcionais.md#rf-012--qualquer-humano-da-partida-contesta-uma-vez-cada) (bloquear 2ª contestação da mesma pessoa).

### EntregaEvento
`id_evento` (único) · `tipo` · `payload_cifrado` · `alvo` (lobby ou conta) · `tentativas` · `entregue_em` · `criado_em`

**`payload_cifrado` (2026-10-27, [#250](https://github.com/ljborgess/ProLobby.com/issues/250))**: o `lobby.closed` leva os Discord IDs de todos os humanos do lobby, e Discord ID não fica em texto puro no banco ([RNF-009](07-nao-funcionais.md#rnf-009--dado-sensível-criptografado-em-repouso)). O payload de todo evento é gravado cifrado com a mesma chave do print, e a API decifra só na hora de entregar.

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
