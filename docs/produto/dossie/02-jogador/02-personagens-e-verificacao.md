# 2. Personagens e verificação

**Fase: MVP**

## Contexto

EA FC Pro Clubs **não tem API pública** — nenhuma integração automática com dado oficial é possível. Toda verificação depende de evidência enviada pelo próprio player (print) e processamento local (OCR), não de consulta a sistema da EA.

## Modelo de personagem

- Um **personagem = 1 posição fixa**, com atributos/overall próprios (reflete como o Virtual Pro funciona no jogo).
- **1 conta pode ter até 5 personagens**, um por categoria de posição (Discord é vínculo separado, obrigatório só pra fila — ver [Discord e lobby](../03-partida/04-discord-e-lobby.md)):
  1. Goleiro (GK)
  2. Zaga/Lateral (CB, LB, RB)
  3. Meio-campo (CDM, CM, CAM)
  4. Ponta (LM, RM, LW, RW)
  5. Ataque (ST, CF)
- Sem limite de recriação dentro de uma categoria — mas 1 personagem ativo por categoria.
- Personagem fica vinculado à edição do jogo (ver [Escopo de plataforma, jogo e região](../05-produto/08-escopo-plataforma-jogo-regiao.md)).

## Identidade da conta

- Gamertag/PSN ID é único por **combinação (plataforma + gamertag)** — não gamertag isolado. Mesmo gamertag em plataformas diferentes (PS/Xbox/PC) são contas diferentes garantidamente (ecossistemas separados); mesmo gamertag na mesma plataforma não é permitido (conflito real).

## Clube EA (auto-declaração, opcional)

- Campo opcional no perfil: **"tenho clube EA com vaga disponível?"** (sim/não) + nome do clube — jogador atualiza quando quiser. Sem API da EA, é a única forma da plataforma saber quem pode ser candidato a **capitão** (ver [Discord e lobby](../03-partida/04-discord-e-lobby.md) e [Mecânica real do EA FC Pro Clubs](../03-partida/00-mecanica-pro-clubs.md)) — filtra candidatos plausíveis, mas é reconfirmado no momento do lobby (dado pode ficar desatualizado).
- Campo de nome do clube limitado a **20 caracteres** (limite real de nome completo de clube no EA FC) — validação de tamanho evita entrada inválida que nunca vai bater com o que aparece na tela do jogo.
- **Consentimento explícito**: ao marcar "sim", jogador é avisado que autoriza até 10 jogadores de outro lobby serem convidados temporariamente pro clube quando for escolhido capitão — coberto pelos [Termos de Uso](../04-governanca/12-termos-de-uso-e-idade.md), mesmo padrão já usado pra consentimento de print/foto/Discord ID.

## Verificação / cadastro de atributos

- Cadastro via **print in-game** processado por **OCR**, preenchendo automaticamente nome, posição, atributos, foto.
- **Upload validado**: formato JPG, PNG ou WEBP, tamanho máximo **10 MB** por arquivo — rejeita outro formato/tamanho antes de gastar processamento de OCR à toa.
- **Como o print chega até a plataforma** (dois caminhos aceitos, já que a tela fica no console, não no PC):
  1. **Screenshot do console**, transferido de qualquer forma (app oficial PlayStation/Xbox no celular, nuvem, cabo) — caso mais fácil pro OCR, imagem limpa.
  2. **Foto da tela tirada com o celular** — aceito, desde que o painel e os dados estejam **nítidos e legíveis** (sem reflexo cobrindo número, sem ângulo que distorça, sem corte de informação).
  - Foto de tela erra mais no OCR (brilho, reflexo, moiré) — não precisa de regra nova: a confiança mínima de 85% já rejeita o que sair ruim, e a tela de confirmação mostra o que foi lido antes de salvar.
  - **Consequência de interface**: o fluxo de upload precisa ser **mobile-first**, não só responsivo — é de onde a maioria dos envios vai sair (o jogador está com o celular na mão, na frente do console).
- **Nível de confiança mínimo do OCR pra aceitar automaticamente: 85%** — abaixo disso, mesmo sem erro óbvio, pede confirmação extra do jogador antes de salvar (não é a mesma coisa que falha total, é zona de incerteza).
- OCR também extrai o **gamertag/PSN ID mostrado na tela do print** e compara com o gamertag cadastrado na conta (mesmo pipeline de leitura, sem custo extra de mecanismo). Se não bater, cadastro é **rejeitado automaticamente** — evita alguém usar print de tela de outra pessoa.
- **Troca de gamertag/PSN ID no console** (PSN ID e Xbox Gamertag permitem troca no mundo real) quebra esse match pro próximo print. Fluxo: jogador pede **atualização do gamertag cadastrado** via chamado de moderação (mesmo caminho da exceção de OCR) — sistema reprocessa unicidade (plataforma+gamertag, já fechada acima) antes de aceitar. Evita ficar travado permanentemente por ter trocado o nome no próprio console.
- Campos extraídos por OCR (atributos, overall, posição) ficam **travados** — não editáveis manualmente. Único jeito de corrigir/atualizar é **reenviar novo print** (reprocessado, substitui os dados, mantém histórico).
- Antes de salvar, tela de confirmação mostra dado extraído + nível de confiança do OCR — player confirma ou reenvia.
- Exceção: se OCR falhar repetidamente, abre **chamado pra moderação** corrigir manualmente (caso raro, auditável — ver [Moderação](../04-governanca/07-moderacao.md)).
- **Cooldown de 24h entre atualizações aceitas** — evita spam de prints tentando "sorte" no OCR. Só conta pra atualização que **passou** (confiança ≥85%, salva de verdade); tentativa rejeitada por confiança baixa não consome o cooldown, pode reenviar na hora.
- **Exceção de OCR falhando repetidamente**: 3 tentativas seguidas com confiança abaixo do mínimo (85%, mesmo personagem, mesmo dia) abrem o chamado de moderação automaticamente — não precisa o jogador pedir manualmente.
- **Snapshot travado durante fila/lobby ativo** — trava só o **personagem/categoria que está na fila/lobby naquele momento**, não os outros 4 da conta (ex.: se você tá numa partida de goleiro, seu personagem de ataque continua atualizável normalmente). Update de atributos do personagem travado só aplica depois que sai da fila/partida.
- Nome/foto: editáveis livremente (baixo risco competitivo, personagem é personalizável, não precisa refletir aparência real do Virtual Pro). Atributos de jogo: só via novo print.
- Foto **sem checagem automática de conteúdo** no MVP — upload livre; conteúdo inadequado é tratado reativamente via denúncia ([Moderação](../04-governanca/07-moderacao.md)), não por filtro no momento do upload.
- Histórico de prints: visível só pro dono do perfil e pra moderação (não público) — evita vazamento de dado da tela (ex.: infos da conta EA). Retenção sujeita a política de dados (ver [Dados pessoais e LGPD](../04-governanca/09-dados-pessoais-lgpd.md)).
