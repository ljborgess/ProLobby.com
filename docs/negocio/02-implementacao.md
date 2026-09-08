# Ordem de implementação — por onde começar

Uso interno dos 4. Ordem sugerida com base nas dependências já mapeadas no dossiê — não é cronograma com data, é sequência lógica (o que trava o quê).

## 0. Antes de escrever qualquer código

**Teste prático do mecanismo Pro Clubs** ([checklist completo](../produto/03-partida/05-checklist.md)) — custo quase zero (minutos, sem código), e decide se boa parte do desenho de lobby/Discord sobrevive como está. Fazer isso primeiro é a decisão de maior alavancagem possível: gastar tempo de engenharia no fluxo de capitão/clube antes de confirmar que ele funciona na prática é o jeito mais caro de descobrir que precisa mudar.

Só depois disso faz sentido decidir **stack técnica** (deliberadamente adiada até aqui) — a resposta do teste pode influenciar decisão de stack (ex.: se o ciclo de convite for lento, importa mais ter backend que lida bem com espera assíncrona/fila do que outra coisa). Existe rascunho de hipótese pro bot do Discord ([docs/discord/05-arquitetura-bot.md](../discord/05-arquitetura-bot.md)), não decidido — bloqueado pela mesma regra.

**O teto de custo já está resolvido**: R$ 0 no MVP, via free tier (ver [Sustentabilidade](03-sustentabilidade.md)). Isso restringe a stack — favorece o que roda inteiro num host só, sem serviço gerenciado pago. E desarma a escolha "OCR pago vs. biblioteca local": o volume do MVP cabe no free tier do provedor, então nessa escala nenhuma das duas custa nada, e a decisão passa a ser técnica em vez de financeira.

**Primeiro trabalho de engenharia: o [piloto de OCR](../requisitos/06-piloto-ocr.md)** — bloqueador nº 2. Dos cinco riscos do projeto, quatro se resolvem jogando ou com gente; o OCR é o único que exige código pra ser medido, e roda isolado (um script sobre 50 prints reais, sem conta, sem banco, sem tela). Vem antes de qualquer parte da plataforma, em paralelo ao checklist.

> A ordem por dependência abaixo continua correta pra responder *o que dá pra construir*. Ela não responde *o que construir primeiro*, que é ordenado por risco.

## 1. Discord primeiro (configuração, não código)

Servidor Discord não depende da plataforma existir — é configuração manual, rápida, sem escrever linha de código:

1. Cria a conta separada dona do servidor ([docs/discord/README.md](../discord/README.md)).
2. Cria o servidor, cargos fixos (Admin/Moderador), canais fixos (#regras, #anuncios, #geral, #fila-status, #status-sistema, #suporte-e-denuncia, #log-moderacao — ver [Canais](../discord/02-canais.md)).
3. Configura Onboarding/Screening nativo do Discord pros cargos sociais ([Cargos e verificação](../discord/01-cargos.md)).
4. Cria a aplicação do bot no Discord Developer Portal, gera token, **ativa o Server Members Intent** (não vem ligado por padrão — sem ele o bot não gerencia cargo/nickname, e falha em silêncio) ([Integração técnica](../discord/04-integracao.md)) — ainda sem lógica nenhuma implementada, só existindo.

O servidor é criado **manualmente**, não pelo bot: a API permitiria, mas o bot viraria dono do servidor, contrariando a decisão de propriedade por conta separada.

Motivo de fazer isso cedo: zero dependência de decisão de stack, dá pro time já ter comunidade rodando (mesmo que manual) enquanto a plataforma é construída — e o servidor existir cedo ajuda a validar cargos/canais na prática antes de automatizar.

## 2. Núcleo da plataforma — sem isso nada funciona

**Transversal, desde o primeiro item**: os [requisitos transversais](../requisitos/01-transversais.md) — fuso UTC, janela móvel de 30 dias, papéis da plataforma, idempotência de envio, piso de acessibilidade — não são etapa, são base: retrofit de fuso ou de idempotência depois custa muito mais que nascer com eles. Idem os requisitos de segurança de [Dados pessoais e LGPD](../produto/04-governanca/02-lgpd.md#requisitos-de-segurança-independentes-de-stack) — criptografia de dado sensível em repouso e rate limiting na API própria entram junto com conta/autenticação (item 1), não depois. 2FA no painel e log de auditoria de moderador entram só quando o painel existir (item 5, Governança) — mas o schema de log já deveria contemplar isso desde o design do banco, pra não precisar migração retroativa.

Ordem dentro da plataforma, cada item destrava o próximo:

1. **Conta + autenticação** — o schema nasce com as entidades e atributos de [Modelo de dados](../requisitos/03-dados.md), incluindo o **log de evento de elo e reputação** (sem ele o rollback de disputa é inimplementável) e um gamertag por plataforma. E-mail + senha, verificação de e-mail, recuperação por link (30min), aceite versionado de ToS, pergunta de segurança no cadastro ([Onboarding](../produto/05-produto/01-onboarding.md)). O schema já nasce com **campo de plano na conta e tabela de evento de pagamento** ([Sustentabilidade](03-sustentabilidade.md)) — nada de cobrança implementado, só o espaço reservado, porque fazer isso como migração retroativa é o que custa caro. Interface já nasce em **português e espanhol** ([Escopo](../produto/05-produto/02-escopo.md)) — retrofit de i18n depois custa mais caro que nascer com ele.
2. **OCR de personagem** (cadastro/verificação) — é o mesmo motor de OCR que "Resultado de partida" vai reusar depois, vale construir pensando nos dois usos desde já ([Personagens e verificação](../produto/02-jogador/01-verificacao.md)). Fluxo de upload nasce **mobile-first** — a maioria dos envios vem do celular (foto da tela do console), não do desktop.
3. **Vínculo Discord (OAuth2)** — só depois de já ter conta + personagem funcionando, porque é o terceiro (e último) requisito do onboarding, e depende do bot já existir (etapa 1 acima).
4. **Fila e matchmaking** — distribuição por categoria, equilíbrio por elo ([Fila e matchmaking](../produto/03-partida/02-fila.md)). Essa é a primeira peça que só faz sentido depois que personagem + elo (próximo item) existem.
5. **Motor de elo/reputação** — precisa existir antes da fila fechar de verdade (equilíbrio depende disso).

## 3. Fechamento do lobby (a parte mais arriscada)

Só depois do núcleo funcionando: escolha de capitão, integração com o bot via webhook, canais dinâmicos ([Discord e lobby](../produto/03-partida/03-lobby.md), [Bot: permissões](../discord/03-bot.md)). Essa etapa é onde o resultado do teste prático (item 0) mais importa — se o mecanismo mudar, é aqui que muda o código.

## 4. Resultado, disputa, ranking

1. **Report de resultado + OCR de validação** (reusa o motor OCR do item 2.2) — ([Resultado de partida](../produto/03-partida/04-resultado.md)).
2. **Rollback, zero-report, escada de punição, avaliação por pares** ([Ranking, reputação e punição](../produto/02-jogador/02-ranking.md)).
3. **Perfil público + ranking** ([Perfil e visibilidade](../produto/02-jogador/03-perfil.md)) — depende de já ter dado real de partida rodando.

## 5. Governança (antes do primeiro usuário externo, não antes)

Não bloqueia desenvolvimento interno/teste com os 4, mas bloqueia abrir pra fora:

- Painel de moderação com **2FA obrigatório** e **log de auditoria de toda ação** ([Moderação](../produto/04-governanca/01-moderacao.md)) — maior alvo de risco se comprometido.
- Termos de Uso + Política de Privacidade publicados ([Termos de uso](../produto/04-governanca/03-termos.md)).
- Retenção automática de dados (LGPD, [02-lgpd.md](../produto/04-governanca/02-lgpd.md)).
- Entidade legal aberta **antes da pré-venda** (fim do beta menos 7 dias), não antes da abertura pública. **MEI não aceita a atividade** (confirmado por CNAE, 2026-09-08) — é ME no Simples, custo R$ 200-300/mês em vez de R$ 76, gatilho de assinatura em ~700 contas ativas (ver [Sustentabilidade](03-sustentabilidade.md)).
- **Tela de contagem no painel** com os 4 números do critério de saída do beta e as 3 métricas de sucesso, direto do banco, sem ferramenta de terceiro (ver [Lançamento](04-lancamento.md)).
- **Cobrança de lançamento**, que é dias de trabalho e não semanas, porque não tem gateway: chave PIX com confirmação manual, ação "ativar plano" no painel de moderação (mesmo log de auditoria), cargo Fundador/Apoiador via a esteira de bot já existente, e uma página de venda com o risco dito antes do pagamento. Redação revisada junto com os Termos ([Termos de uso](../produto/04-governanca/03-termos.md)) — o enquadramento de apoio depende dela.

## 6. Beta fechado, depois abertura

Produto pronto não vai direto pro público: roda **beta fechado gratuito** com ~24 convidados (metade rede pessoal, metade estranhos), até o critério de saída medido bater — 10 partidas completas, fila fechando sozinha em metade, OCR aceitando 80% de primeira, zero cancelamento por bug. Na última semana do beta roda a **pré-venda** do Fundador aos convidados, a preço cheio, pra ter taxa de conversão real antes de apostar a janela pública. Só então abre. Torneio não entra no lançamento. Detalhe em [Lançamento](04-lancamento.md).

**O recrutamento dos convidados roda em paralelo ao desenvolvimento**, não depois — é a única etapa que não depende de código, e a que mais costuma ser esquecida até virar bloqueio.

## Resumo — o que fazer essa semana

1. Rodar o [checklist de teste no jogo](../produto/03-partida/05-checklist.md) (item 0) — zero código, alguém dos 4 só precisa jogar.
2. Montar o servidor Discord (item 1) — configuração manual, pode rodar em paralelo com o teste.
3. Só depois: decidir stack e começar o núcleo da plataforma (item 2).
