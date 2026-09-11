# Auditoria de fluxo — ProLobby (2026-09-11)

Varredura completa do dossiê (53 documentos), do scaffold (`apps/`, `packages/`), do CI e do tracker (61 issues), procurando **quebra de fluxo** — regra que não fecha com outra, requisito sem onde se apoiar, prazo que engole prazo — não erro de escrita.

Ponto de partida: a higiene formal está boa. `scripts/check-docs-links.sh` passa, a numeração de RF não tem buraco nem repetição, todo RF aponta pra origem, e o grafo de issues (#25→#26/#30/#36/#40/#45) está montado com dependência nativa do GitHub. Os 24 achados abaixo são de **comportamento**, e todos foram corrigidos nesta mesma data.

## Resumo

| Classe | Qtd | Efeito se não corrigido |
|---|---|---|
| Quebra de fluxo | 6 | estado inalcançável, punição que vira banimento, capitão punido por regra do sistema, deadlock de moderação, beta sem trava |
| Modelo de dados | 6 | regra já decidida sem campo onde gravar — migração retroativa depois |
| Ambiguidade | 7 | duas implementações defensáveis pro mesmo requisito |
| Processo / repo | 5 | documento de entrada apontando pra issue morta, CI sem porta de qualidade |

Saíram daí **RF-074 a RF-080**, quatro entidades novas, seis campos novos em `Lobby` e a revogação de dois números (36 h de zero-report, "qualquer vaga maior que zero").

---

## 1 · Quebra de fluxo

### 1.1 `expirada_sem_report` era inalcançável — o zero-report inteiro era código morto
`02-estados.md` fazia o estado `em_andamento` sair por "60 min sem print → `cancelado_sem_culpa`", e `04-resultado.md` mandava expirar por zero-report em 36 h com −3 de reputação. **As duas regras tinham a mesma precondição**: todos confirmaram o convite e nenhum print chegou. A de 60 min disparava sempre primeiro, e sem penalidade — então o estado 12, o −3 e [RF-071](../requisitos/05-funcionais.md#rf-071--zero-report-reincidente-dobra-a-penalidade) nunca aconteciam. Voltava exatamente o incentivo que RF-071 existe pra matar: o lado perdedor não reporta e escapa de graça em uma hora.

Não existe sinal que separe "a partida rolou" de "o Amistoso não engatou" sem print — é por isso que o prazo de 60 min foi criado.

**Corrigido**: prazo único de 60 min, **com** penalidade; as 36 h foram revogadas. A divisória entre com culpa e sem culpa passou a ser a confirmação de convite recebido, que é sinal explícito e já registrado. Lobby que cai antes disso (cascata, teto de cascata, convite não confirmado) continua sem penalidade.

### 1.2 Suspensão se convertia sozinha em banimento permanente
Reputação abaixo de 40 suspende por 7 dias. Nada restaurava a reputação no fim da pena, e a recuperação desenhada (+1 por partida limpa) **exige jogar**. A conta voltava com 39, o valor corrente disparava a suspensão de novo na primeira tentativa de fila, e a 2ª suspensão em 180 dias é banimento permanente ([RF-038](../requisitos/05-funcionais.md#rf-038--2ª-suspensão-em-180-dias-vira-banimento)). Ninguém precisava reincidir em nada.

**Corrigido**: [RF-074](../requisitos/05-funcionais.md#rf-074--fim-de-suspensão-restaura-a-reputação-para-45) — fim de pena restaura a reputação em 45 (acima do limiar de suspensão, abaixo do de prioridade), e a suspensão passa a ser disparada pelo **cruzamento** do limiar, registrado como evento, não pelo valor corrente.

### 1.3 "Qualquer vaga maior que zero" cancelava o lobby e punia o capitão
[RF-006](../requisitos/05-funcionais.md#rf-006--lobby-só-fecha-com-candidato-a-capitão-em-cada-lado) (relaxado em 2026-09-09) deixava fechar lobby com capitão de 1 vaga livre e 4 humanos no lado: 3 nunca recebiam convite, a janela de 5 min estourava e o lobby caía em `cancelado_por_capitao` — **com caso de abuso contra quem não fez nada**. A justificativa ("a IA cobre humano faltante dentro do clube") confundia vaga deixada vazia de propósito pelo lobby com humano escalado que ficou de fora por falta de espaço, que é justamente a exclusão invisível que a janela de 5 min existe pra pegar.

**Corrigido**: a declaração virou **contagem de vagas** (0 a 10) e o fechamento exige `vagas_livres ≥ humanos do lado − 1`. Declaração desatualizada continua possível, e aí o cancelamento é `cancelado_sem_culpa`, sem caso de abuso.

### 1.4 RF-066 disparava contra capitão legítimo
O próprio dossiê aceita que o clube do capitão tem os parceiros de sempre como membros e que **membro humano entra antes da IA** — foi por isso que exigir clube vazio foi descartado. Mas [RF-066](../requisitos/05-funcionais.md#rf-066--gamertags-do-print-final-conferem-contra-o-roster-do-lobby) mandava **derrubar o resultado** e abrir caso de abuso ao ver nome humano fora do roster. Ou seja: parceiro de clube entrando numa partida normal produzia o sinal tratado como fraude, e o capitão não controla isso de fora do jogo.

**Corrigido**: retém em vez de derrubar — a partida vai pra `em_disputa`, elo e reputação não são aplicados, e a moderação decide. Fecha o mesmo furo sem punir sozinho, reusando o rollback que o log de evento já sustenta. A frequência real é dado do teste 6 do [checklist](../produto/03-partida/05-checklist.md).

### 1.5 Quórum de moderação era deadlock, não espera
[RF-035](../requisitos/05-funcionais.md#rf-035--moderador-parte-do-caso-é-travado-decidem-os-outros-3) exigia 3 elegíveis entre 4 moderadores e mandava "esperar até haver 3". Com 2 sócios envolvidos no mesmo caso sobram 2 elegíveis **permanentemente** — não há terceiro pra aparecer, e as contas envolvidas ficam presas em `em_disputa` com a fila bloqueada junto, indefinidamente.

**Corrigido**: [RF-075](../requisitos/05-funcionais.md#rf-075--caso-sem-3-moderadores-elegíveis-resolve-em-desfecho-neutro) — 48 h pra unanimidade dos elegíveis restantes e, sem isso, **desfecho neutro**: partida anulada ou denúncia arquivada, nunca punição. Registrado no log como "sem quórum".

### 1.6 Beta fechado não tinha trava nenhuma
[Lançamento](../negocio/04-lancamento.md) dizia que o acesso no beta é controlado pelo cargo do Discord — e o cargo só controla **visibilidade de canal**. A fila roda na plataforma e checava apenas e-mail verificado, personagem verificado e Discord vinculado, todos abertos a qualquer um. Qualquer pessoa que achasse o site entrava na fila e furava o beta, que é justamente o que mede se a fila fecha sozinha com ~24 pessoas.

**Corrigido**: [RF-076](../requisitos/05-funcionais.md#rf-076--beta-fechado-é-trava-na-fila-não-só-cargo-de-canal) — com o modo ligado, a entrada na fila exige o cargo Beta no Discord vinculado. Reusa o vínculo já obrigatório, sem código de convite.

---

## 2 · Modelo de dados — regra decidida sem onde se apoiar

Todas em [03-dados.md](../requisitos/03-dados.md).

| Achado | Regra que ficava inimplementável | Correção |
|---|---|---|
| Sem estatística individual de partida | [RF-046](../requisitos/05-funcionais.md#rf-046--nota-individual-00-no-print-suspende-a-penalidade-automática) (nota 0.0 suspende os −8) e a estatística do perfil público | entidade `EstatisticaPartida` |
| Sem contador de recusa de fila | [RF-009](../requisitos/05-funcionais.md#rf-009--recusar-ou-não-confirmar-gera-timeout-progressivo-de-fila)/[RF-010](../requisitos/05-funcionais.md#rf-010--contador-de-timeout-zera-com-12-h-limpas-ou-uma-partida-completada) — recusa não gera evento de reputação por decisão, então não havia registro datado nenhum | entidade `OcorrenciaRecusaFila`, bloqueio **derivado** dela |
| Sem registro de entrega de evento | [RF-058](../requisitos/05-funcionais.md#rf-058--evento-da-plataforma-pro-bot-tem-retry-e-vira-caso-ao-esgotar) — retry e dedup viviam em memória do bot, que não tem banco e perde tudo em restart | entidade `EntregaEvento` na API; bot idempotente checando o Discord |
| Sem lista de bloqueio | banimento vinculado a Discord ID + gamertag guardados na conta, apagados no pedido de LGPD | entidade `IdentidadeBloqueada` (hash), [RF-079](../requisitos/05-funcionais.md#rf-079--banimento-sobrevive-à-exclusão-de-conta) |
| `Lobby` sem `fechado_em`, placar final, `anulada` e ids de canal | todo prazo conta "desde o lobby fechar"; o resultado confirmado e o rótulo de anulada ([RF-044](../requisitos/05-funcionais.md#rf-044--disputa-sem-evidência-decisiva-anula-a-partida)) não tinham campo; a deleção de canal dependia de memória de processo | 6 campos novos |
| Gamertag cifrado x unicidade | [RNF-009](../requisitos/07-nao-funcionais.md#rnf-009--dado-sensível-criptografado-em-repouso) mandava não guardar em texto puro, mas o gamertag é chave única, alvo do OCR e origem do nickname — cifra não-determinística mata índice e lookup | `gamertag_hash` (HMAC determinístico) + `gamertag_cifrado` |

---

## 3 · Ambiguidade — duas implementações defensáveis

| Achado | Decisão |
|---|---|
| Quando a votação de formação acontece: [Fila](../produto/03-partida/02-fila.md) dizia "antes do capitão", [Lobby](../produto/03-partida/03-lobby.md) e RF-034 diziam "ao criar os canais" | depois dos capitães confirmados, em paralelo com a janela de convite — votar antes é incoerente com o capitão desempatar e aplicar a formação |
| Expectativa de elo: média do time ou pareamento por categoria | média aritmética dos humanos de cada lado, IA fora ([RF-077](../requisitos/05-funcionais.md#rf-077--expectativa-de-elo-usa-a-média-dos-humanos-de-cada-lado)) |
| −3 de zero-report "rateado" ou por pessoa | **por pessoa** — rateado entre 8 a 22 gente torna a penalidade invisível, e a escala de RF-071 é por conta |
| [RF-072](../requisitos/05-funcionais.md#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático) pausava cadastro por ocupação de lobby | teto acumulativo (OCR) pausa **cadastro**; capacidade instantânea (9 de 10 lobbies) pausa **fila**, pelo caminho de [RNF-008](../requisitos/07-nao-funcionais.md#rnf-008--queda-do-discord-ou-teto-de-canais-pausa-a-fila-não-derruba-a-plataforma) |
| Cascata de capitão sem teto de tempo | teto total de 5 min ([RF-080](../requisitos/05-funcionais.md#rf-080--cascata-de-capitão-tem-teto-de-5-min)) |
| Aviso de cadastro pausado sem canal possível (sem conta: sem in-app, sem DM; e-mail proibido pra evento de produto) | e-mail, como transacional de conta ([RF-078](../requisitos/05-funcionais.md#rf-078--aviso-de-cadastro-pausado-e-de-reabertura-sai-por-e-mail)) |
| [Inventário de notificações](../requisitos/04-notificacoes.md) se declara a garantia e faltavam 6 eventos | acrescentados: bloqueio de fila, fila pausada, resultado retido, categoria divergente, fallback de nickname, plano ativado |

---

## 4 · Processo e repo

- **`CLAUDE.md` dizia "repo hoje é só documentação"** e que os bloqueadores rodam antes de qualquer código — falso desde o ADR-005 e o scaffold, e é o arquivo carregado em toda sessão de agente. Corrigido.
- **`HANDOFF.md` estava congelado em 2026-09-08**, apontando pras issues #1-#5 "reabertas". Elas estão fechadas como `not planned` desde 2026-09-10 e o trabalho vive em #25-#61. Reescrito.
- **`CONTRIBUTING.md` usava o grafo #1-#24 como "exemplo real"** — mesmas issues mortas. Trocado pelo grafo vivo.
- **CI sem porta de qualidade além de lint/test/build**: acrescentados `pnpm format:check` (o script existia e nada o chamava) e `pnpm audit --prod --audit-level=high` (item 2 do [checklist de segurança](../requisitos/08-seguranca-checklist.md)). Postgres no CI continua sendo a issue #27. Na mesma passada, `happy-dom`, `vitest`, `vite` e `@nestjs/platform-express` foram atualizados e a única vulnerabilidade crítica/alta de produção (multer) saiu por override.
- **O bloqueador nº 1 (checklist no jogo) não tinha issue nenhuma** apesar de RF-051/052/055 dependerem dele. Aberta.

---

## O que esta auditoria não tocou

- **Os dois bloqueadores continuam sem rodar** — checklist no jogo e piloto de OCR. Nada aqui substitui medir.
- **RF-033** (clube em uso trava a conta inteira) segue como decisão consciente, não gap.
- **Conluio de resultado** segue como risco aceito, com o gatilho de revisão já definido.
