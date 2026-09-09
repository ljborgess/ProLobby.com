# 2. Personagens e verificação

**Fase: MVP**

## Contexto

EA FC Pro Clubs **não tem API pública** — nenhuma integração automática com dado oficial é possível. Toda verificação depende de evidência enviada pelo próprio player (print) e processamento local (OCR), não de consulta a sistema da EA.

## Modelo de personagem

- Um **personagem = 1 posição fixa**, com atributos/overall próprios (reflete como o Virtual Pro funciona no jogo).
- **1 conta pode ter até 5 personagens**, um por categoria de posição (Discord é vínculo separado, obrigatório só pra fila — ver [Discord e lobby](../03-partida/03-lobby.md)):
  1. Goleiro (GK)
  2. Zaga/Lateral (CB, LB, RB)
  3. Meio-campo (CDM, CM, CAM)
  4. Ponta (LM, RM, LW, RW)
  5. Ataque (ST, CF)
- Sem limite de recriação dentro de uma categoria — mas 1 personagem ativo por categoria.
- **Personagem não é apagado, é inativado.** Criar um novo na categoria inativa o anterior, que fica guardado com o histórico. Motivo: o **elo pertence à categoria, não ao personagem** ([Ranking](02-ranking.md)) — se apagar levasse o elo embora, bastaria recriar pra fugir de elo baixo, que é smurf de graça dentro da própria conta.
- **Troca de categoria só com zero partida.** Quem subiu print de goleiro no slot de ataque corrige sem perder nada, desde que não tenha jogado. Da 1ª partida em diante, trava: já existe elo naquela categoria, e mover seria transferir desempenho entre posições — exatamente o que o elo por categoria existe pra impedir.

> **Ressalva sobre o modelo, pendente de teste em campo.** Estes 5 personagens são abstração **da plataforma**, não do jogo. O EA FC trabalha com **uma Virtual Pro por conta EA**, reconfigurável em posição e arquétipo — não um elenco de builds salvos. Então os 5 são, na prática, **5 snapshots verificados da mesma Virtual Pro em configurações diferentes**.
>
> Consequência que a plataforma não consegue fechar: quem entra na fila como goleiro precisa **estar** configurado como goleiro no console naquele momento, e nada aqui verifica isso — dá pra verificar um build forte e jogar com outro. Está no [checklist](../03-partida/05-checklist.md) como teste 7, com a possível mitigação (usar a posição e a nota que aparecem no print de fim de partida pra conferir que a pessoa jogou na categoria em que entrou).
- Personagem fica vinculado à edição do jogo (ver [Escopo de plataforma, jogo e região](../05-produto/02-escopo.md)).

## Identidade da conta

- **A conta guarda um gamertag por plataforma** (PSN ID pro PS5, gamertag pro Xbox, ID pro PC) — não um campo único. Motivo: quem migra de plataforma mantém a conta e a reputação ([Escopo](../05-produto/02-escopo.md)), passando a ter personagens em duas plataformas com nomes diferentes em cada ecossistema. O personagem aponta pra plataforma dele, e o OCR compara contra o gamertag **daquela** plataforma. Detalhe em [Modelo de dados](../../requisitos/03-dados.md).
- Gamertag/PSN ID é único por **combinação (plataforma + gamertag)** — não gamertag isolado. Mesmo gamertag em plataformas diferentes (PS/Xbox/PC) são contas diferentes garantidamente (ecossistemas separados); mesmo gamertag na mesma plataforma não é permitido (conflito real).
- **A exclusividade só nasce com a verificação, não com a digitação.** Enquanto nenhum print aprovou aquele gamertag, a reivindicação é **provisória** e não bloqueia mais ninguém — várias contas podem ter digitado o mesmo gamertag ao mesmo tempo, e **a primeira que verificar leva**; as outras são notificadas e precisam corrigir o campo. Reivindicação provisória que fica **7 dias sem verificação** é liberada automaticamente.
  - Motivo: exclusividade no momento da digitação criaria bloqueio de identidade por squatting — bastava digitar o gamertag de outra pessoa e nunca verificar pra impedir o dono real de se cadastrar, sem nenhuma via de saída além de chamado de moderação. O print é a prova de posse; antes dele, não há nada pra proteger.
  - Caso raro que sobra: alguém verifica com print falsificado antes do dono real. Cai no fluxo de **troca de gamertag/fraude** ([Moderação](../04-governanca/01-moderacao.md)), com o dono real provando posse pelo mesmo mecanismo de print in-game novo já usado na recuperação de conta ([Onboarding](../05-produto/01-onboarding.md)).

## Clube EA (auto-declaração, opcional)

- Campo opcional no perfil: **"tenho clube EA com vaga disponível?"** (sim/não) + nome do clube — jogador atualiza quando quiser. Sem API da EA, é a única forma da plataforma saber quem pode ser candidato a **capitão** (ver [Discord e lobby](../03-partida/03-lobby.md) e [Mecânica real do EA FC Pro Clubs](../03-partida/01-mecanica.md)) — filtra candidatos plausíveis, mas é reconfirmado no momento do lobby (dado pode ficar desatualizado).
- Campo de nome do clube limitado a **20 caracteres** (limite real de nome completo de clube no EA FC) — validação de tamanho evita entrada inválida que nunca vai bater com o que aparece na tela do jogo.
- **Consentimento explícito**: ao marcar "sim", jogador é avisado que autoriza até 10 jogadores de outro lobby serem convidados temporariamente pro clube quando for escolhido capitão — coberto pelos [Termos de Uso](../04-governanca/03-termos.md), mesmo padrão já usado pra consentimento de print/foto/Discord ID.

## Verificação / cadastro de atributos

- Cadastro via **print in-game** processado por **OCR**, preenchendo automaticamente nome, posição, atributos, foto.
- **Upload validado**: formato JPG, PNG ou WEBP, tamanho máximo **10 MB** por arquivo — rejeita outro formato/tamanho antes de gastar processamento de OCR à toa.
- **Como o print chega até a plataforma** (dois caminhos aceitos, já que a tela fica no console, não no PC):
  1. **Screenshot do console**, transferido de qualquer forma (app oficial PlayStation/Xbox no celular, nuvem, cabo) — caso mais fácil pro OCR, imagem limpa.
  2. **Foto da tela tirada com o celular** — aceito, desde que o painel e os dados estejam **nítidos e legíveis** (sem reflexo cobrindo número, sem ângulo que distorça, sem corte de informação).
  - Foto de tela erra mais no OCR (brilho, reflexo, moiré) — não precisa de regra nova: a confiança mínima de 85% já rejeita o que sair ruim, e a tela de confirmação mostra o que foi lido antes de salvar.
  - **Consequência de interface**: o fluxo de upload precisa ser **mobile-first**, não só responsivo — é de onde a maioria dos envios vai sair (o jogador está com o celular na mão, na frente do console).
- **Idioma da interface do jogo — premissa que estava implícita e não é verdadeira.** O OCR não lê números soltos: depende de **texto da interface do EA FC** (rótulo de atributo, nome de posição, título da tela), e esse texto segue o idioma do console de cada jogador. Como o escopo é Brasil e América do Sul ([Escopo](../05-produto/02-escopo.md)), chegam prints em **português, espanhol e inglês** — brasileiro jogando com o jogo em inglês é caso comum, não exceção.
  - **Decisão: o pipeline reconhece os três idiomas e detecta sozinho** qual é, usando o resultado de maior confiança. Sem pedir pro jogador declarar o idioma (ele erraria, e é fricção desnecessária num fluxo que já tem upload).
  - Sem isso o problema é silencioso, que é o pior tipo: print em idioma não previsto não dá erro explicativo — só não alcança os 85% de confiança, cai em "confiança baixa" e depois abre chamado. Uma fatia possivelmente grande dos usuários ficaria presa em suporte manual sem entender o motivo.
  - Vale igual pro OCR de fim de partida ([Resultado](../03-partida/04-resultado.md)) — é o mesmo motor, e a validação de "é a tela de fim de partida" é justamente reconhecimento de texto da interface.
- **Nível de confiança mínimo do OCR pra aceitar automaticamente: 85%** — abaixo disso, mesmo sem erro óbvio, pede confirmação extra do jogador antes de salvar (não é a mesma coisa que falha total, é zona de incerteza).
- OCR também extrai o **gamertag/PSN ID mostrado na tela do print** e compara com o gamertag cadastrado na conta (mesmo pipeline de leitura, sem custo extra de mecanismo). Se não bater, cadastro é **rejeitado automaticamente** — evita alguém usar print de tela de outra pessoa.
- **Troca de gamertag/PSN ID no console** (PSN ID e Xbox Gamertag permitem troca no mundo real) quebra esse match pro próximo print. Fluxo: jogador pede **atualização do gamertag cadastrado** via chamado de moderação (mesmo caminho da exceção de OCR) — sistema reprocessa unicidade (plataforma+gamertag, já fechada acima) antes de aceitar. Evita ficar travado permanentemente por ter trocado o nome no próprio console.
- Campos extraídos por OCR (atributos, overall, posição) ficam **travados** — não editáveis manualmente. Único jeito de corrigir/atualizar é **reenviar novo print** (reprocessado, substitui os dados, mantém histórico).
- Antes de salvar, tela de confirmação mostra dado extraído + nível de confiança do OCR — player confirma ou reenvia.
- Exceção: se OCR falhar repetidamente, abre **chamado pra moderação** corrigir manualmente (caso raro, auditável — ver [Moderação](../04-governanca/01-moderacao.md)). **Decidido em 2026-09-08**: "corrigir manualmente" significa o moderador **digita os mesmos campos que o OCR extrairia** (overall, posição, atributos, gamertag) vendo o print a olho nu — não é aprovar/rejeitar sem poder editar dado. Resolve o caso de print legível a olho humano que o OCR não lê (fonte incomum, reflexo parcial). Ação de moderador, não de OCR automático — entra no `LogAuditoria` como qualquer outra ([RF-040](../../requisitos/05-funcionais.md#rf-040--toda-ação-de-moderador-entra-no-log-de-auditoria)). Aceite formal: [RF-073](../../requisitos/05-funcionais.md#rf-073--correção-manual-de-ocr-pela-moderação-campo-a-campo).
- **Pré-checagens grátis antes de chamar o OCR — fecham um vetor de custo ilimitado.** A regra de rejeição não consumir cooldown (logo abaixo) protege quem tem foto ruim, mas transformava **cada rejeição numa chamada de OCR grátis e infinita**: mandando lixo em loop, uma pessoa queima o free tier do mês (1000 unidades) numa tarde e derruba a premissa de custo R$ 0 ([Sustentabilidade](../../negocio/03-sustentabilidade.md)).
  1. **Hash do arquivo primeiro.** A trava de reuso já existe ([Resultado](../03-partida/04-resultado.md)); passa a rodar **antes** do OCR, não depois — arquivo repetido nunca custa chamada.
  2. **Dimensão mínima e nível de foco**, verificados localmente. Imagem pequena demais ou completamente desfocada não tem chance de passar dos 85%, então não vale pagar pra descobrir.
  3. **Teto de 10 uploads por hora por conta.** Não resolve sozinho (10 chamadas × muitas contas ainda somam), mas junto com as duas primeiras o lixo óbvio para de custar.
  - As três são locais e de graça. A intenção original fica de pé: foto ruim de verdade continua sendo reenviável na hora, sem cooldown.
- **Cooldown de 24h entre atualizações aceitas** — evita spam de prints tentando "sorte" no OCR. Só conta pra atualização que **passou** (confiança ≥85%, salva de verdade); tentativa rejeitada por confiança baixa não consome o cooldown, pode reenviar na hora.
- **Exceção de OCR falhando repetidamente**: 3 tentativas seguidas com confiança abaixo do mínimo (85%, mesmo personagem, mesmo dia) abrem o chamado de moderação automaticamente — não precisa o jogador pedir manualmente.
- **Snapshot travado durante fila/lobby ativo** — trava só o **personagem/categoria que está na fila/lobby naquele momento**, não os outros 4 da conta (ex.: se você tá numa partida de goleiro, seu personagem de ataque continua atualizável normalmente). Update de atributos do personagem travado só aplica depois que sai da fila/partida.
- Nome/foto: editáveis livremente (baixo risco competitivo, personagem é personalizável, não precisa refletir aparência real do Virtual Pro). Atributos de jogo: só via novo print.
- **Nome e foto ofensivos seguem o mesmo tratamento reativo**: sem filtro no momento de salvar, resolvido por denúncia ([Moderação](../04-governanca/01-moderacao.md)), com a moderação podendo forçar a troca ou zerar o nome pro gamertag verificado. Antes o nome estava só como "editável livremente", sem regra nenhuma, enquanto a foto já tinha a dela — mesma superfície de abuso, mesmo tratamento. Lista de bloqueio foi descartada: é fácil de burlar com grafia criativa e criaria manutenção eterna em dois idiomas.
- Foto **sem checagem automática de conteúdo** no MVP — upload livre; conteúdo inadequado é tratado reativamente via denúncia ([Moderação](../04-governanca/01-moderacao.md)), não por filtro no momento do upload.
- Histórico de prints: visível só pro dono do perfil e pra moderação (não público) — evita vazamento de dado da tela (ex.: infos da conta EA). Retenção sujeita a política de dados (ver [Dados pessoais e LGPD](../04-governanca/02-lgpd.md)).
