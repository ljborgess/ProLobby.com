# 2. Personagens e verificação

**Fase: MVP**

## Contexto

EA FC Pro Clubs **não tem API pública** — nenhuma integração automática com dado oficial é possível. Toda verificação depende de evidência enviada pelo próprio player (print) e processamento local (OCR), não de consulta a sistema da EA.

## Modelo de personagem

- Um **personagem = 1 posição fixa**, com atributos/overall próprios (reflete como o Virtual Pro funciona no jogo).
- **1 conta (vinculada a Discord — ver [Discord e lobby](04-discord-e-lobby.md)) pode ter até 5 personagens**, um por categoria de posição:
  1. Goleiro (GK)
  2. Zaga/Lateral (CB, LB, RB)
  3. Meio-campo (CDM, CM, CAM)
  4. Ponta (LM, RM, LW, RW)
  5. Ataque (ST, CF)
- Sem limite de recriação dentro de uma categoria — mas 1 personagem ativo por categoria.
- Personagem fica vinculado à edição do jogo (ver [Escopo de plataforma, jogo e região](08-escopo-plataforma-jogo-regiao.md)).

## Verificação / cadastro de atributos

- Cadastro via **print in-game** processado por **OCR**, preenchendo automaticamente nome, posição, atributos, foto.
- Campos extraídos por OCR (atributos, overall, posição) ficam **travados** — não editáveis manualmente. Único jeito de corrigir/atualizar é **reenviar novo print** (reprocessado, substitui os dados, mantém histórico).
- Antes de salvar, tela de confirmação mostra dado extraído + nível de confiança do OCR — player confirma ou reenvia.
- Exceção: se OCR falhar repetidamente, abre **chamado pra moderação** corrigir manualmente (caso raro, auditável — ver [Moderação](07-moderacao.md)).
- **Cooldown entre atualizações** (ex.: 1x a cada 24–48h) — evita spam de prints tentando "sorte" no OCR.
- **Snapshot travado durante fila/lobby ativo** — update de atributos só aplica depois que sai da fila/partida.
- Nome/foto: editáveis livremente (baixo risco competitivo). Atributos de jogo: só via novo print.
- Histórico de prints: visível só pro dono do perfil e pra moderação (não público) — evita vazamento de dado da tela (ex.: infos da conta EA). Retenção sujeita a política de dados (ver [Dados pessoais e LGPD](09-dados-pessoais-lgpd.md)).
