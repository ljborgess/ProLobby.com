# 11. Onboarding

**Fase: MVP**

## Fluxo

1. Cria conta — já libera navegação básica (perfil, ranking, histórico), sem Discord nem personagem.
2. Cria e verifica ao menos 1 personagem (print/OCR — ver [Personagens e verificação](../02-jogador/01-verificacao.md)) — desbloqueia perfil competitivo completo.
3. Vincula Discord (ver [Discord e lobby](../03-partida/03-lobby.md)) — obrigatório só nesse ponto, porque é o que efetivamente libera **entrar na fila** (bot precisa coordenar o lobby).

Etapas 2 e 3 são independentes entre si (pode verificar personagem sem Discord vinculado, ou vice-versa) — só a **fila** exige as duas completas.

## Cadastro e sessão

- **Cadastro aberto**, sem convite nem aprovação manual. O gate real do produto não é criar conta, é **entrar na fila** — que já exige e-mail verificado, personagem verificado e Discord vinculado. No beta fechado, quem controla o acesso é o cargo do Discord ([Lançamento](../../negocio/04-lancamento.md)), não o cadastro: código de convite seria feature útil por poucas semanas e código morto no schema depois.
- **Cadastro e recuperação não revelam se um e-mail tem conta.** As duas telas respondem sempre a mesma coisa — "enviamos um e-mail com as instruções" — e o conteúdo real chega por e-mail: link de verificação se o endereço estava livre, aviso de que já existe conta se estava tomado. Sem isso, qualquer um descobre por tentativa quais endereços estão cadastrados, e a única pessoa que precisa dessa informação é a dona do e-mail — que a recebe.
- **Um e-mail, uma conta.** E-mail é chave única, coerente com o Discord ID também ser exclusivo ([Discord e lobby](../03-partida/03-lobby.md)). É também o que torna a recuperação de senha inequívoca — com dois cadastros no mesmo e-mail, o link chegaria sem se saber pra qual conta. Quem joga em dois consoles não precisa de duas contas: a mesma conta guarda um gamertag por plataforma ([Personagens](../02-jogador/01-verificacao.md)).
- **Sessão simultânea em vários dispositivos é permitida.** É o uso real: entrar na fila no PC e subir o print pelo celular, na frente do console — coerente com o upload ser mobile-first. A trava que importa (1 fila ativa) é por **conta**, não por sessão, então múltiplas sessões não abrem brecha nenhuma.
- **Fechar o navegador não é sair do lobby.** O lobby vive no servidor, não na aba: reabrindo, a pessoa cai no estado atual dele com os prazos que estiverem correndo ([Estados](../../requisitos/02-estados.md)). Tratar aba fechada como abandono transformaria queda de conexão em punição — e no celular, na frente do console, trocar de app fecha aba com facilidade. O bot continua alcançando a pessoa por DM nesse meio-tempo, que é parte do motivo de o vínculo Discord ser obrigatório pra fila.

## Autenticação da conta

- **Login por e-mail + senha**, com Discord como vínculo separado (não é login social) — mantém o onboarding acima funcionando como desenhado: conta existe antes de Discord, e Discord entra só como pré-requisito de fila.
- **E-mail serve só pra conta, nunca pra notificação de produto**: login, verificação de cadastro e recuperação de senha (transacional). Aviso de fila/lobby/resultado/punição continua exclusivamente Discord + in-app, como já decidido em [Discord e lobby](../03-partida/03-lobby.md) — ninguém recebe e-mail de partida.
- **E-mail verificado antes de liberar a fila** — conta com e-mail não confirmado navega, mas não entra em fila (evita conta descartável ou erro de digitação travando recuperação depois).
- **Aceite de Termos versionado**: plataforma guarda qual versão do ToS cada jogador aceitou e quando. Mudança material nos Termos exige novo aceite antes de continuar usando (ver [Termos de uso e idade mínima](../04-governanca/03-termos.md)).

## Recuperação de conta

- **Esqueceu a senha (ainda tem o e-mail)**: link único de redefinição enviado por e-mail, **expira em 30 minutos**. Automático, sem moderador envolvido.
- **Perdeu acesso ao e-mail E ao Discord**: cai em chamado de moderação (mesmo fluxo de exceção de OCR/troca de gamertag — ver [Moderação](../04-governanca/01-moderacao.md)), exigindo **dois fatores** pra provar posse:
  1. **Pergunta de segurança** definida pelo próprio jogador no cadastro (pergunta + resposta, escolhidas por ele).
  2. **Print in-game novo** mostrando o gamertag cadastrado na conta — prova que controla a conta EA de verdade, mesma evidência que a plataforma já usa pra verificar personagem.
- Motivo dos dois fatores: pergunta de segurança sozinha é vetor conhecido de roubo de conta (resposta adivinhável ou pública). Como a moderação já revisa esse caso de qualquer forma, exigir o print junto não adiciona atrito real e fecha a brecha — conta com elo investido não fica pendurada num fator fraco.
