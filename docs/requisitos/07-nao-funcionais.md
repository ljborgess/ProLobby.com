# Requisitos não-funcionais

Numerados e rastreáveis, mesmo formato dos [funcionais](05-funcionais.md): toda linha aponta pra onde foi decidida, e o aceite é observável.

RNF é o que o sistema tem que **ser**, não o que tem que **fazer**. Vive separado porque não pertence a nenhuma área de produto — atravessa todas, e é o primeiro tipo de requisito que some quando ninguém escreve.

## Desempenho

### RNF-001 · Ação comum responde em menos de 1 s
**Origem**: [01-transversais.md](01-transversais.md)

**Aceite**: navegação, entrada na fila, envio de voto e marcação de convite recebido concluem em menos de 1 s no percentil 95, medido do clique à resposta.

### RNF-002 · OCR conclui em menos de 15 s, com progresso visível
**Origem**: [01-transversais.md](01-transversais.md)

**Aceite**: do envio do arquivo à tela de conferência, menos de 15 s. Durante o processamento há indicação de progresso — sem ela a pessoa acha que travou e reenvia, dobrando custo e criando o duplo envio que a [idempotência](01-transversais.md) trata.

### RNF-003 · Estado da fila atualiza em menos de 3 s
**Origem**: [01-transversais.md](01-transversais.md)

**Aceite**: mudança de estado (partida encontrada, categoria fechando, timeout) aparece na tela em menos de 3 s. Fila que parece parada é abandonada.

## Capacidade

### RNF-004 · 10 lobbies simultâneos
**Origem**: decidido nesta rodada de levantamento

**Aceite**: 10 lobbies ativos ao mesmo tempo — 80 a 220 pessoas — com os alvos de RNF-001 a RNF-003 mantidos. Testado antes do beta, não descoberto no dia.

- Dimensionado pra **10x a meta de sucesso** (10 partidas/semana, ver [métricas](../negocio/01-mercado.md)), com folga pra pico de horário de concentração.
- Cabe folgado numa VM de free tier, coerente com o teto de custo de R$ 0 no MVP ([Sustentabilidade](../negocio/03-sustentabilidade.md)).
- Acima disso, o gargalo que aparece primeiro **não é o servidor**: 10 lobbies são 30 canais, e o teto do Discord é 500 (ver RF-053).
- Não dimensionar pra 50: seria otimizar pra escala hipotética, princípio que o dossiê rejeita.
- **Regra de custo (2026-09-08)**: aproximando do teto do free tier antes disso (capacidade Always Free caiu pra 2 OCPU/12GB em jun/2026), o sistema **pausa cadastro** em vez de forçar upgrade pago — [RF-072](05-funcionais.md#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático). Ideia ainda não validada não justifica gasto automático.
- **Estimativa de capacidade (2026-09-08)**: Next.js + Postgres + bot (discord.js, 1 servidor só) somam ~1.2-2.5GB de RAM em carga leve, contra 12GB disponíveis — folga de 4-6x. _(Desde o [ADR-009](../adr/009-neon-cloudflare-vm.md), o Postgres roda na Neon e sai dessa conta; na VM ficam web, API, bot e `cloudflared`.)_ CPU (2 OCPU) é o recurso mais apertado, mas a carga-alvo (I/O simples, OCR via Tesseract ~80-100x/mês) fica bem abaixo do que 2 núcleos processam. Estimativa baseada em [Next.js docs](https://nextjs.org/docs/app/guides/memory-usage), [Severalnines (Postgres)](https://severalnines.com/blog/setting-optimal-environment-postgresql/) e [Renzom (discord.js)](https://www.renzom.com/blog/discord-bot-ram-sizing-2026), não medição real — confirmar com monitoramento assim que a plataforma estiver no ar.

### RNF-005 · Crescimento de armazenamento limitado pela retenção
**Origem**: [produto/04-governanca/02-lgpd.md](../produto/04-governanca/02-lgpd.md)

**Aceite**: o volume de imagens tem teto, porque a retenção de 90 dias corta o acúmulo — por regra de lifecycle do bucket ([ADR-009](../adr/009-neon-cloudflare-vm.md)). Histórico de partida cresce indefinidamente, mas é texto — ver a retenção de cada coisa em [parâmetros](../produto/parametros.md).

## Disponibilidade e recuperação

### RNF-006 · Disponibilidade por melhor esforço, sem SLA
**Origem**: [01-transversais.md](01-transversais.md)

**Aceite**: nenhuma promessa de uptime é publicada. Com 4 sócios part-time, prometer número que não se sustenta é pior que não prometer.

### RNF-007 · Perda máxima de 24 h de dado, restauração em até 24 h
**Origem**: decidido nesta rodada · [produto/04-governanca/02-lgpd.md](../produto/04-governanca/02-lgpd.md)

**Aceite**: coerente com o backup diário já decidido — no pior caso perde-se um dia de partidas, elo e reputação. A restauração completa cabe em 24 h, e isso é **verificado no teste de restauração** obrigatório antes do primeiro usuário externo.

Ter o número escrito é o que transforma "tem backup" em compromisso verificável. Sem prazo declarado, ninguém testa — e backup nunca testado não é backup.

**Como cumpre (2026-09-14, [ADR-009](../adr/009-neon-cloudflare-vm.md))**: `pg_dump` diário, criptografado, 30 dias no Oracle Object Storage em São Paulo. O teste de restauração é antecipado pro **primeiro deploy interno**, logo depois de a Fase 2.1 fechar, num projeto Neon novo.

### RNF-008 · Queda do Discord ou teto de canais pausa a fila, não derruba a plataforma
**Origem**: [discord/04-integracao.md](../discord/04-integracao.md)

**Aceite**: sem coordenação disponível, a plataforma continua servindo perfil, histórico e report de resultado; só o fechamento de lobby novo para, com aviso in-app. Partida em andamento não é afetada.

**Terceiro gatilho, acrescentado em 2026-09-11**: ocupação de **9 dos 10 lobbies simultâneos** (RNF-004) pausa o fechamento de lobby pelo mesmo caminho. É a alavanca correta pra teto de capacidade instantânea — [RF-072](05-funcionais.md#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático) usava esse número pra pausar **cadastro**, que não libera lobby nenhum e pune quem não tem relação com o pico.

## Segurança

> Ver também [checklist de segurança](08-seguranca-checklist.md) — 18 itens de prática de implementação, aplicados a partir da 1ª linha de código de backend, não só os RNFs abaixo.

### RNF-009 · Dado sensível criptografado em repouso
**Origem**: [produto/04-governanca/02-lgpd.md](../produto/04-governanca/02-lgpd.md)

**Aceite**: print, foto, Discord ID e gamertag não ficam em texto puro no banco nem no storage.

**Como isso convive com unicidade e busca (fechado em 2026-09-11)**: gamertag e Discord ID são **chave** (unicidade global do par plataforma+gamertag, Discord ID exclusivo por conta) e alvo de comparação do OCR — cifra não-determinística impede índice único e lookup, então o requisito se cancelava com o de unicidade. Cada um guarda **dois campos**: `*_hash` (HMAC determinístico com segredo do servidor, usado pra unicidade, comparação e lista de bloqueio) e `*_cifrado` (valor exibível). Ver [Modelo de dados](03-dados.md#gamertagplataforma).

### RNF-010 · Painel de moderação exige 2FA
**Origem**: [produto/04-governanca/02-lgpd.md](../produto/04-governanca/02-lgpd.md)

**Aceite**: nenhum acesso ao painel sem segundo fator. É o alvo de maior risco se comprometido — tem poder de kick, ban e edição de disputa.

### RNF-011 · Rate limiting na API própria
**Origem**: [produto/04-governanca/02-lgpd.md](../produto/04-governanca/02-lgpd.md)

**Aceite**: limite por conta e por IP em login, envio de print e leitura de perfil. Protege contra força bruta e contra raspagem em massa do perfil público — que é público, mas não é base de dados pra download.

### RNF-012 · Log de auditoria retido por 2 anos, não editável
**Origem**: decidido nesta rodada · [produto/04-governanca/02-lgpd.md](../produto/04-governanca/02-lgpd.md)

**Aceite**: registro de ação de moderador sobrevive 2 anos e nenhuma tela do painel edita nem apaga entrada.

Por que 2 anos e não "para sempre": o log **liga pessoa a denúncia e punição**, então é dado pessoal — retenção eterna sem prazo nem finalidade é o oposto do que a LGPD pede. E por que não 90 dias como os prints: a janela de reincidência de suspensão é de 180 dias ([Moderação](../produto/04-governanca/01-moderacao.md)), e um log de 90 dias deixaria o banimento sem registro de por que a primeira suspensão aconteceu.

### RNF-013 · Token do bot só em variável de ambiente
**Origem**: [discord/04-integracao.md](../discord/04-integracao.md)

**Aceite**: o token não aparece em repositório, log nem mensagem de erro. Token commitado permanece no histórico do git mesmo depois de removido.

**Rotação (decidido em 2026-09-08)**: sem rotação periódica agendada — MVP com 4 sócios, baixo risco de vazamento por processo, e rotação agendada é custo operacional sem benefício proporcional nesse tamanho de time. Rotaciona só sob suspeita ou confirmação de vazamento: regenerar o token no Developer Portal, atualizar a variável de ambiente, revisar `#log-moderacao` em busca de ação não reconhecida no período suspeito.

### RNF-021 · Segredo de sessão é credencial de operação, com procedimento de emergência escrito
**Origem**: [ADR-007](../adr/007-sessao-jwt.md), decidido em 2026-09-11

**Aceite**: o `JWT_SECRET` vive só em variável de ambiente do backend — nunca no repositório, nem no histórico do git, nem em log ou mensagem de erro. Quem o tem **forja sessão de qualquer conta, inclusive Admin**, então recebe o mesmo tratamento do token do bot ([RNF-013](#rnf-013--token-do-bot-só-em-variável-de-ambiente)).

**Procedimento de emergência, escrito antes de precisar**: trocar o segredo invalida **todos** os tokens em circulação de uma vez. É a única revogação em massa que o desenho de sessão tem ([ADR-007](../adr/007-sessao-jwt.md) decidiu JWT sem revogação por sessão), e a resposta a vazamento de banco ou suspeita de comprometimento em escala.

- **Custo conhecido**: toda a base reloga. Precisa estar escrito antes, porque a alternativa é decidir isso no meio de um incidente, por quem estiver acordado — mesmo racional do procedimento de vazamento do token do bot ([Integração técnica](../discord/04-integracao.md)).
- **Não existe rotação sem derrubar ninguém** por decisão: aceitar dois segredos na validação seria código pra um caso que talvez nunca aconteça, e quando acontecer, derrubar todo mundo é provavelmente o comportamento desejado.
- Trocar o segredo **não** resolve conta comprometida individual — pra isso não há mecanismo, e a limitação está registrada no ADR-007.

## Compatibilidade e acesso

### RNF-014 · Duas últimas versões dos navegadores atuais, celular incluído
**Origem**: decidido nesta rodada

**Aceite**: Chrome, Safari, Firefox e Edge nas duas últimas versões, em desktop e celular.

**Celular é obrigatório, não bônus**: o upload de print nasce mobile-first ([Personagens](../produto/02-jogador/01-verificacao.md)) porque a pessoa está com o celular na mão, na frente do console. O bug aparece no celular de um jogador, não no navegador de quem construiu.

### RNF-015 · Piso de acessibilidade
**Origem**: [01-transversais.md](01-transversais.md)

**Aceite**: contraste legível, navegação por teclado nos fluxos principais, rótulo em todo campo, mensagem de erro que diz o que fazer, área de toque generosa e nada que dependa de hover pra funcionar.

### RNF-016 · Interface e mensagens em português e espanhol
**Origem**: [produto/05-produto/02-escopo.md](../produto/05-produto/02-escopo.md)

**Aceite**: toda tela, notificação, e-mail transacional e mensagem do bot existe nos dois idiomas desde o primeiro dia. Retrofit de i18n custa mais que nascer com ele.

## Operação

### RNF-017 · Tudo em UTC internamente
**Origem**: [01-transversais.md](01-transversais.md)

**Aceite**: prazo, contador, expiração e job armazenados e comparados em UTC; conversão pro fuso local acontece só na exibição.

### RNF-018 · Envio com efeito é idempotente
**Origem**: [01-transversais.md](01-transversais.md)

**Aceite**: reenviar o mesmo print, confirmação, voto ou avaliação não duplica o efeito. Duplo clique não gera dois reports do mesmo lado — o que a validação cruzada leria como divergência, criando disputa artificial.

**Vale igual pro evento plataforma → bot**, com mecanismo declarado desde 2026-09-11: registro de entrega e retry ficam na API (`EntregaEvento`, ver [Modelo de dados](03-dados.md#entregaevento)) e o bot é idempotente **checando o estado no Discord antes de agir**. Idempotência guardada em memória de processo não vale — some no restart, que é exatamente quando o retry acontece.

### RNF-019 · Contadores de reincidência e recuperação exigem log de evento
**Origem**: [03-dados.md](03-dados.md)

**Aceite**: elo e reputação guardam cada alteração com motivo, partida e data. Sem esse log, o rollback de disputa é inimplementável, os contadores de janela móvel não são contáveis e o teto de 70 da recuperação não é aplicável.

### RNF-020 · Métricas do beta e de sucesso saem do próprio banco
**Origem**: [../negocio/04-lancamento.md](../negocio/04-lancamento.md)

**Aceite**: os 4 critérios de saída do beta e as 3 métricas de sucesso são exibidos numa tela do painel, calculados direto das tabelas. Nenhuma ferramenta de terceiro recebe dado de comportamento — evita abrir capítulo de LGPD e transferência internacional pra medir sete números.
