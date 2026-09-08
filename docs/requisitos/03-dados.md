# Modelo de dados — entidades e atributos

**Fase: MVP**

Consolidação das entidades que o produto exige, derivadas das decisões já tomadas — **não é esquema de banco** (isso depende da stack, deliberadamente não decidida). Serve pra duas coisas: verificar que toda regra do dossiê tem onde se apoiar, e evitar migração retroativa em campo que já se sabe necessário.

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

`email` · `senha` (hash) · `email_verificado` · `data_nascimento` · `pergunta_seguranca` + `resposta` (hash) · `discord_id` (único, exclusivo) · `reputacao` (0–100, inicia 70) · `estado` · `criado_em`

### GamertagPlataforma
`conta` · `plataforma` (PS5 / Xbox Series / PC) · `gamertag` · `verificado_em` (nulo = reivindicação provisória) — único em (plataforma, gamertag) quando verificado.

### ClubeDeclarado
Auto-declaração que habilita a pessoa a ser capitão.

`conta` · `tem_vaga` (bool) · `nome_clube` (≤20 caracteres) · `atualizado_em`

### Personagem
`conta` · `categoria` (GK / zaga-lateral / meio / ponta / ataque) · `plataforma` · `edicao_jogo` · `nome` · `foto` · `overall` · `atributos` · `elo` · `partidas_na_categoria` · `estado` · `criado_em`

- **1 ativo por categoria por edição**, até 5 ativos. Recriação dentro da categoria é livre, então há personagens inativos e arquivados guardados.
- `partidas_na_categoria` existe porque **o K-factor e o decaimento do seed dependem da contagem** (32 até a 9ª, 20 da 10ª — ver [Ranking](../produto/02-jogador/02-ranking.md)). Sem esse contador, nenhum dos dois é calculável.

### EnvioDePrint
`personagem` ou `lobby` · `hash_arquivo` (único, anti-reuso) · `arquivo` · `confianca_ocr` · `idioma_detectado` · `aceito` · `enviado_em`

- `hash_arquivo` é a trava de reuso de print ([Resultado](../produto/03-partida/04-resultado.md)); `idioma_detectado` existe porque o OCR reconhece PT, ES e EN ([Personagens](../produto/02-jogador/01-verificacao.md)) e o valor ajuda a diagnosticar rejeição.
- Arquivo apagado aos **90 dias**; o registro sobrevive pra manter o hash funcionando ([LGPD](../produto/04-governanca/02-lgpd.md)).

### EntradaFila
`conta` · `personagem` · `categoria` · `elo_no_momento` · `entrou_em` — uma ativa por conta.

`elo_no_momento` é congelado na entrada: a banda de busca (±150 abrindo a ±400) precisa de referência estável, senão o alvo se move durante a própria busca.

### Lobby
`estado` · `criado_em` · `capitao_lado_a` · `capitao_lado_b` · `clube_a` · `clube_b` · `formacao_a` · `formacao_b`

`clube_a` / `clube_b` guardam o **nome do clube capturado no momento da escolha do capitão** — é o par esperado que o OCR de resultado valida, e muda a cada lobby ([Mecânica](../produto/03-partida/01-mecanica.md)).

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
`tipo` · `estado` · `aberto_em` · `origem` (sistema / usuário / mensagem no Discord) · `lobby` · `conta_alvo` · `aberto_por` · `resolvido_por` · `resolvido_em` · `decisao`

Os tipos são os já enumerados em [Moderação](../produto/04-governanca/01-moderacao.md), incluindo os abertos automaticamente.

**`aberto_por` — gap fechado em 2026-09-08**: conta que abriu o caso (denunciante, contestante), ou `sistema` nos casos automáticos (acúmulo de avaliação negativa, retry de webhook esgotado). Sem esse campo, três requisitos não têm onde se apoiar: [RF-036](05-funcionais.md#rf-036--denunciado-nunca-vê-quem-denunciou) (painel precisa ver quem denunciou), [RF-068](05-funcionais.md#rf-068--máximo-de-3-denúncias-abertas-por-conta) (contar denúncias abertas por conta) e [RF-012](05-funcionais.md#rf-012--qualquer-humano-da-partida-contesta-uma-vez-cada) (bloquear 2ª contestação da mesma pessoa).

### LogAuditoria
`ator` · `acao` · `alvo` · `detalhe` · `criado_em` — toda ação de moderador, inclusive **acesso a print de terceiro** ([Requisitos transversais](01-transversais.md)).

### AceiteTos
`conta` · `versao` · `aceito_em` — mudança material exige aceite novo ([Termos](../produto/04-governanca/03-termos.md)).

### Notificacao
`conta` · `tipo` · `payload` · `lida_em` · `criada_em` — ver [inventário de notificações](04-notificacoes.md).

## O que a modelagem confirmou que falta em nenhum lugar

Nada além da inconsistência de gamertag e das duas entidades de evento acima. Toda outra regra do dossiê encontrou onde se apoiar — o que é o resultado esperado depois das rodadas anteriores de auditoria, e o motivo de valer a pena ter feito este exercício mesmo sendo consolidação.
