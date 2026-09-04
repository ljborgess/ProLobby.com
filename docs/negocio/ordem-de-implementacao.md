# Ordem de implementação — por onde começar

Uso interno dos 4. Ordem sugerida com base nas dependências já mapeadas no dossiê — não é cronograma com data, é sequência lógica (o que trava o quê).

## 0. Antes de escrever qualquer código

**Teste prático do mecanismo Pro Clubs** ([checklist completo](../produto/03-partida/01-mecanica-pro-clubs.md)) — custo quase zero (minutos, sem código), e decide se boa parte do desenho de lobby/Discord sobrevive como está. Fazer isso primeiro é a decisão de maior alavancagem possível: gastar tempo de engenharia no fluxo de capitão/clube antes de confirmar que ele funciona na prática é o jeito mais caro de descobrir que precisa mudar.

Só depois disso faz sentido decidir **stack técnica** (deliberadamente adiada até aqui) — a resposta do teste pode influenciar decisão de stack (ex.: se o ciclo de convite for lento, importa mais ter backend que lida bem com espera assíncrona/fila do que outra coisa).

**Junto com a stack, decidir o teto de custo mensal** (ver [tese de mercado](tese-de-mercado.md)) — principalmente OCR pago por chamada vs. biblioteca local, que é a escolha de maior impacto no custo recorrente.

## 1. Discord primeiro (configuração, não código)

Servidor Discord não depende da plataforma existir — é configuração manual, rápida, sem escrever linha de código:

1. Cria a conta separada dona do servidor ([docs/discord/README.md](../discord/README.md)).
2. Cria o servidor, cargos fixos (Admin/Moderador), canais fixos (#regras, #anuncios, #geral, #fila-status, #status-sistema, #suporte-e-denuncia, #log-moderacao — ver [Canais](../discord/02-canais.md)).
3. Configura Onboarding/Screening nativo do Discord pros cargos sociais ([Cargos e verificação](../discord/01-cargos-e-verificacao.md)).
4. Cria a aplicação do bot no Discord Developer Portal, gera token ([Integração técnica](../discord/04-integracao-tecnica.md)) — ainda sem lógica nenhuma implementada, só existindo.

Motivo de fazer isso cedo: zero dependência de decisão de stack, dá pro time já ter comunidade rodando (mesmo que manual) enquanto a plataforma é construída — e o servidor existir cedo ajuda a validar cargos/canais na prática antes de automatizar.

## 2. Núcleo da plataforma — sem isso nada funciona

**Transversal, desde o primeiro item**: requisitos de segurança de [Dados pessoais e LGPD](../produto/04-governanca/02-dados-pessoais-lgpd.md#requisitos-de-segurança-independentes-de-stack) — criptografia de dado sensível em repouso e rate limiting na API própria entram junto com conta/autenticação (item 1), não depois. 2FA no painel e log de auditoria de moderador entram só quando o painel existir (item 5, Governança) — mas o schema de log já deveria contemplar isso desde o design do banco, pra não precisar migração retroativa.

Ordem dentro da plataforma, cada item destrava o próximo:

1. **Conta + autenticação** — e-mail + senha, verificação de e-mail, recuperação por link (30min), aceite versionado de ToS, pergunta de segurança no cadastro ([Onboarding](../produto/05-produto/01-onboarding.md)). Interface já nasce em **português e espanhol** ([Escopo](../produto/05-produto/02-escopo-plataforma-jogo-regiao.md)) — retrofit de i18n depois custa mais caro que nascer com ele.
2. **OCR de personagem** (cadastro/verificação) — é o mesmo motor de OCR que "Resultado de partida" vai reusar depois, vale construir pensando nos dois usos desde já ([Personagens e verificação](../produto/02-jogador/01-personagens-e-verificacao.md)). Fluxo de upload nasce **mobile-first** — a maioria dos envios vem do celular (foto da tela do console), não do desktop.
3. **Vínculo Discord (OAuth2)** — só depois de já ter conta + personagem funcionando, porque é o terceiro (e último) requisito do onboarding, e depende do bot já existir (etapa 1 acima).
4. **Fila e matchmaking** — distribuição por categoria, equilíbrio por elo ([Fila e matchmaking](../produto/03-partida/02-fila-e-matchmaking.md)). Essa é a primeira peça que só faz sentido depois que personagem + elo (próximo item) existem.
5. **Motor de elo/reputação** — precisa existir antes da fila fechar de verdade (equilíbrio depende disso).

## 3. Fechamento do lobby (a parte mais arriscada)

Só depois do núcleo funcionando: escolha de capitão, integração com o bot via webhook, canais dinâmicos ([Discord e lobby](../produto/03-partida/03-discord-e-lobby.md), [Bot: permissões](../discord/03-bot-e-moderacao.md)). Essa etapa é onde o resultado do teste prático (item 0) mais importa — se o mecanismo mudar, é aqui que muda o código.

## 4. Resultado, disputa, ranking

1. **Report de resultado + OCR de validação** (reusa o motor OCR do item 2.2) — ([Resultado de partida](../produto/03-partida/04-resultado-de-partida.md)).
2. **Rollback, zero-report, escada de punição, avaliação por pares** ([Ranking, reputação e punição](../produto/02-jogador/02-ranking-reputacao-e-punicao.md)).
3. **Perfil público + ranking** ([Perfil e visibilidade](../produto/02-jogador/03-perfil-e-visibilidade.md)) — depende de já ter dado real de partida rodando.

## 5. Governança (antes do primeiro usuário externo, não antes)

Não bloqueia desenvolvimento interno/teste com os 4, mas bloqueia abrir pra fora:

- Painel de moderação com **2FA obrigatório** e **log de auditoria de toda ação** ([Moderação](../produto/04-governanca/01-moderacao.md)) — maior alvo de risco se comprometido.
- Termos de Uso + Política de Privacidade publicados ([Termos de uso](../produto/04-governanca/03-termos-de-uso-e-idade.md)).
- Retenção automática de dados (LGPD, [02-dados-pessoais-lgpd.md](../produto/04-governanca/02-dados-pessoais-lgpd.md)).
- Entidade legal (CNPJ/MEI) — pendência registrada na [tese de mercado](tese-de-mercado.md), só bloqueia ToS ter peso jurídico e monetização futura, não bloqueia teste interno.

## Resumo — o que fazer essa semana

1. Rodar o teste prático do jogo (item 0) — zero código, alguém dos 4 só precisa jogar.
2. Montar o servidor Discord (item 1) — configuração manual, pode rodar em paralelo com o teste.
3. Só depois: decidir stack e começar o núcleo da plataforma (item 2).
