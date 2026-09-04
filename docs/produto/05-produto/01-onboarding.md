# 11. Onboarding

**Fase: MVP**

## Fluxo

1. Cria conta — já libera navegação básica (perfil, ranking, histórico), sem Discord nem personagem.
2. Cria e verifica ao menos 1 personagem (print/OCR — ver [Personagens e verificação](../02-jogador/01-personagens-e-verificacao.md)) — desbloqueia perfil competitivo completo.
3. Vincula Discord (ver [Discord e lobby](../03-partida/03-discord-e-lobby.md)) — obrigatório só nesse ponto, porque é o que efetivamente libera **entrar na fila** (bot precisa coordenar o lobby).

Etapas 2 e 3 são independentes entre si (pode verificar personagem sem Discord vinculado, ou vice-versa) — só a **fila** exige as duas completas.

## Autenticação da conta

- **Login por e-mail + senha**, com Discord como vínculo separado (não é login social) — mantém o onboarding acima funcionando como desenhado: conta existe antes de Discord, e Discord entra só como pré-requisito de fila.
- **E-mail serve só pra conta, nunca pra notificação de produto**: login, verificação de cadastro e recuperação de senha (transacional). Aviso de fila/lobby/resultado/punição continua exclusivamente Discord + in-app, como já decidido em [Discord e lobby](../03-partida/03-discord-e-lobby.md) — ninguém recebe e-mail de partida.
- **E-mail verificado antes de liberar a fila** — conta com e-mail não confirmado navega, mas não entra em fila (evita conta descartável ou erro de digitação travando recuperação depois).
- **Aceite de Termos versionado**: plataforma guarda qual versão do ToS cada jogador aceitou e quando. Mudança material nos Termos exige novo aceite antes de continuar usando (ver [Termos de uso e idade mínima](../04-governanca/03-termos-de-uso-e-idade.md)).

## Recuperação de conta

- **Esqueceu a senha (ainda tem o e-mail)**: link único de redefinição enviado por e-mail, **expira em 30 minutos**. Automático, sem moderador envolvido.
- **Perdeu acesso ao e-mail E ao Discord**: cai em chamado de moderação (mesmo fluxo de exceção de OCR/troca de gamertag — ver [Moderação](../04-governanca/01-moderacao.md)), exigindo **dois fatores** pra provar posse:
  1. **Pergunta de segurança** definida pelo próprio jogador no cadastro (pergunta + resposta, escolhidas por ele).
  2. **Print in-game novo** mostrando o gamertag cadastrado na conta — prova que controla a conta EA de verdade, mesma evidência que a plataforma já usa pra verificar personagem.
- Motivo dos dois fatores: pergunta de segurança sozinha é vetor conhecido de roubo de conta (resposta adivinhável ou pública). Como a moderação já revisa esse caso de qualquer forma, exigir o print junto não adiciona atrito real e fecha a brecha — conta com elo investido não fica pendurada num fator fraco.
