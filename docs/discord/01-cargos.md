# 1. Cargos e verificação

## Cargos fixos

- **Admin** — os 4 sócios (Luciano, Rafael, João, Felipe). Acesso total ao servidor e ao bot.
- **Moderador** — mesmo grupo dos 4 no MVP (cargo separado do Admin já preparado pro dia que entrar moderador comunitário — ver [Moderação](../produto/04-governanca/01-moderacao.md)).

## Cargos sociais (auto-selecionáveis)

- No **join do servidor**, usuário passa pelo recurso nativo de **Onboarding/Screening do próprio Discord** (zero código — a plataforma Discord já oferece isso): pergunta intuitiva de plataforma (PS5/Xbox/PC), objetivo, etc., concede cargo por botão.
- Esses cargos são **só organização social** — não liberam nenhum canal funcional (fila, lobby). Servem pra dar contexto e identidade antes mesmo do onboarding formal da plataforma estar completo (ver [Onboarding](../produto/05-produto/01-onboarding.md)).

## Cargo funcional: Verificado

- Concedido **só pelo bot**, automaticamente, quando as duas condições estiverem satisfeitas: personagem verificado (OCR aprovado) **e** conta Discord vinculada — como o onboarding permite completar essas duas etapas em qualquer ordem (ver [Onboarding](../produto/05-produto/01-onboarding.md)), o gatilho é duplo: verificação aprovada com Discord já vinculado concede na hora; Discord vinculado com personagem já verificado também concede na hora. Nenhuma das duas sozinha basta.
- É o cargo que **libera acesso aos canais de fila/lobby** — o gate funcional de verdade vive aqui, os cargos sociais nunca dão acesso.
- **Revogado automaticamente durante suspensão** (ver [Ranking, reputação e punição](../produto/02-jogador/02-ranking.md)) — perde acesso a canal de fila/lobby, mas continua no servidor geral (coerente com a decisão de que punição não expulsa do Discord).
- Reconcedido automaticamente quando a suspensão termina.
- **Banimento permanente**: mesma revogação, sem reconcessão futura — não tem "quando terminar" porque não termina.
- **Personagem arquivado** (edição nova do jogo exige reverificação — ver [Escopo de plataforma, jogo e região](../produto/05-produto/02-escopo.md)): cargo cai junto, porque deixa de existir verificação válida pra edição corrente. Reconcedido quando reverificar a edição nova. Coerente com a fila também bloquear nesse estado.
- **Exclusão de conta** (pedido voluntário, LGPD — ver [Dados pessoais e LGPD](../produto/04-governanca/02-lgpd.md)): diferente de suspensão/banimento (involuntário, mantém no servidor), exclusão é saída voluntária da plataforma inteira — bot **remove (kick) do servidor** junto com o resto do processo de exclusão.

## Cargos de reconhecimento: Fundador e Apoiador

- **Beta** — quem participou do beta fechado gratuito (ver [Lançamento](../negocio/04-lancamento.md)). Cargo **permanente**, posicionado como mais antigo que Fundador na hierarquia visual. É a única recompensa do beta: sem Fundador grátis nem com desconto.
- **Fundador** — quem apoiou na janela de lançamento (primeiros 30 dias ou 50 pessoas, ver [Sustentabilidade](../negocio/03-sustentabilidade.md)). Cargo **permanente**, nunca reconcedido depois que a janela fecha — é o que faz a escassez ser real.
- **Apoiador** — concedido pelo bot a quem tem plano ativo (ver [Sustentabilidade](../negocio/03-sustentabilidade.md)). Cor própria e destaque na lista de membros. Fundador já inclui os benefícios de Apoiador, sem mensalidade.

**Banimento permanente revoga os três** (Beta, Fundador, Apoiador) junto com o Verificado, **sem devolução de dinheiro** — foi banido por conduta própria, coerente com o enquadramento de apoio sem reembolso ([Termos](../produto/04-governanca/03-termos.md)). Motivo: cargo de honra ao lado de quem fraudou print corrói o valor do cargo pra todos os outros apoiadores, que é a única coisa que ele entrega.

Suspensão temporária **não** mexe nesses cargos — só no Verificado. Apoio não é conduta, e o cargo volta a fazer sentido quando a suspensão terminar.
- **Não libera canal nenhum, não dá permissão nenhuma** — é reconhecimento, e nada mais. O gate funcional continua sendo só o Verificado, e a [linha vermelha](../negocio/03-sustentabilidade.md) proíbe qualquer vantagem comprada que toque fila, elo, capitão ou resultado.
- Já entra na estrutura do servidor desde a montagem inicial, mesmo sem ninguém pra receber — criar cargo depois é trivial, mas deixar registrado agora evita que a decisão seja reaberta quando houver dinheiro em jogo.

## Apelido (nickname)

- Ao conceder o cargo Verificado, bot **sincroniza o nickname do servidor com o gamertag/PSN ID verificado** — evita impersonation dentro do Discord (texto ou voz) e deixa claro com quem tá jogando só olhando o nome. Antes de verificado, nickname fica livre.
- **Se a sincronização falhar** (permissão do Discord, hierarquia de cargo, nickname duplicado, etc.): bot manda DM avisando que não conseguiu sincronizar automaticamente e pede pra pessoa trocar o nickname manualmente.
