# 1. Cargos e verificação

## Cargos fixos

- **Admin** — os 4 sócios (Luciano, Rafael, João, Felipe). Acesso total ao servidor e ao bot.
- **Moderador** — mesmo grupo dos 4 no MVP (cargo separado do Admin já preparado pro dia que entrar moderador comunitário — ver [Moderação](../produto/dossie/04-governanca/07-moderacao.md)).

## Cargos sociais (auto-selecionáveis)

- No **join do servidor**, usuário passa pelo recurso nativo de **Onboarding/Screening do próprio Discord** (zero código — a plataforma Discord já oferece isso): pergunta intuitiva de plataforma (PS5/Xbox/PC), objetivo, etc., concede cargo por botão.
- Esses cargos são **só organização social** — não liberam nenhum canal funcional (fila, lobby). Servem pra dar contexto e identidade antes mesmo do onboarding formal da plataforma estar completo (ver [Onboarding](../produto/dossie/05-produto/11-onboarding.md)).

## Cargo funcional: Verificado

- Concedido **só pelo bot**, automaticamente, quando as duas condições estiverem satisfeitas: personagem verificado (OCR aprovado) **e** conta Discord vinculada — como o onboarding permite completar essas duas etapas em qualquer ordem (ver [Onboarding](../produto/dossie/05-produto/11-onboarding.md)), o gatilho é duplo: verificação aprovada com Discord já vinculado concede na hora; Discord vinculado com personagem já verificado também concede na hora. Nenhuma das duas sozinha basta.
- É o cargo que **libera acesso aos canais de fila/lobby** — o gate funcional de verdade vive aqui, os cargos sociais nunca dão acesso.
- **Revogado automaticamente durante suspensão** (ver [Ranking, reputação e punição](../produto/dossie/02-jogador/06-ranking-reputacao-e-punicao.md)) — perde acesso a canal de fila/lobby, mas continua no servidor geral (coerente com a decisão de que punição não expulsa do Discord).
- Reconcedido automaticamente quando a suspensão termina.

## Apelido (nickname)

- Ao conceder o cargo Verificado, bot **sincroniza o nickname do servidor com o gamertag/PSN ID verificado** — evita impersonation dentro do Discord (texto ou voz) e deixa claro com quem tá jogando só olhando o nome. Antes de verificado, nickname fica livre.
