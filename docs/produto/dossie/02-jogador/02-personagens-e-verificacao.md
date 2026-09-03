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

## Verificação / cadastro de atributos

- Cadastro via **print in-game** processado por **OCR**, preenchendo automaticamente nome, posição, atributos, foto.
- OCR também extrai o **gamertag/PSN ID mostrado na tela do print** e compara com o gamertag cadastrado na conta (mesmo pipeline de leitura, sem custo extra de mecanismo). Se não bater, cadastro é **rejeitado automaticamente** — evita alguém usar print de tela de outra pessoa.
- **Troca de gamertag/PSN ID no console** (PSN ID e Xbox Gamertag permitem troca no mundo real) quebra esse match pro próximo print. Fluxo: jogador pede **atualização do gamertag cadastrado** via chamado de moderação (mesmo caminho da exceção de OCR) — sistema reprocessa unicidade (plataforma+gamertag, já fechada acima) antes de aceitar. Evita ficar travado permanentemente por ter trocado o nome no próprio console.
- Campos extraídos por OCR (atributos, overall, posição) ficam **travados** — não editáveis manualmente. Único jeito de corrigir/atualizar é **reenviar novo print** (reprocessado, substitui os dados, mantém histórico).
- Antes de salvar, tela de confirmação mostra dado extraído + nível de confiança do OCR — player confirma ou reenvia.
- Exceção: se OCR falhar repetidamente, abre **chamado pra moderação** corrigir manualmente (caso raro, auditável — ver [Moderação](../04-governanca/07-moderacao.md)).
- **Cooldown entre atualizações** (ex.: 1x a cada 24–48h) — evita spam de prints tentando "sorte" no OCR.
- **Snapshot travado durante fila/lobby ativo** — update de atributos só aplica depois que sai da fila/partida.
- Nome/foto: editáveis livremente (baixo risco competitivo, personagem é personalizável, não precisa refletir aparência real do Virtual Pro). Atributos de jogo: só via novo print.
- Foto **sem checagem automática de conteúdo** no MVP — upload livre; conteúdo inadequado é tratado reativamente via denúncia ([Moderação](../04-governanca/07-moderacao.md)), não por filtro no momento do upload.
- Histórico de prints: visível só pro dono do perfil e pra moderação (não público) — evita vazamento de dado da tela (ex.: infos da conta EA). Retenção sujeita a política de dados (ver [Dados pessoais e LGPD](../04-governanca/09-dados-pessoais-lgpd.md)).
