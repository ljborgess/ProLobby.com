# 9. Dados pessoais e LGPD

**Fase: MVP**

## Contexto

Plataforma guarda dado sensível o suficiente pra exigir política clara: print (imagem de tela pessoal), foto do personagem, Discord ID, gamertag/PSN. Rodando no Brasil, sujeito à LGPD.

## Retenção

- Prints (evidência de cadastro e de resultado) retidos por **90 dias**, apagados automaticamente depois (job de limpeza roda diariamente, apaga tudo que passou do prazo — sem exclusão manual dependente de alguém lembrar). 90 dias cobre com folga a janela de contestação (48h) e o zero-report (36h), sobrando margem pra investigação de moderação em caso mais raro/demorado.
- Consequência direta: o "histórico de prints" visível pro dono do perfil (ver [Personagens e verificação](../02-jogador/01-verificacao.md)) cobre só o período de retenção — prints mais antigos que o prazo simplesmente não existem mais pra visualizar.

## Dado financeiro (apoio e assinatura)

A monetização ([Sustentabilidade](../../negocio/03-sustentabilidade.md)) introduz uma categoria de dado que esta política não cobria: **comprovante de PIX carrega nome completo do pagador e instituição financeira** — dado pessoal, e não coberto pela regra de prints.

- **Comprovante é descartado assim que o pagamento é confirmado.** Fica só o **registro mínimo da transação**: valor, data, forma, conta vinculada e identificação fiscal. A imagem do comprovante não é retida.
- **Registro mínimo é retido por 5 anos**, por obrigação fiscal — não pelos 90 dias dos prints. Base legal é cumprimento de obrigação legal, não consentimento (então o titular não pode revogá-la).
- **Isolado do resto**: o registro fiscal vive separado do perfil de jogo, sem vínculo com print, foto ou histórico de partida. Assim a exclusão de conta consegue apagar tudo o que é do jogo sem tocar no que a lei obriga guardar.
- Criptografia em repouso vale igual, como pra qualquer dado sensível (ver requisitos abaixo).

## Exclusão de conta

- Player pode pedir exclusão de conta e dados pessoais (direito LGPD) — inclui remoção (kick) do servidor Discord, já que é saída voluntária da plataforma inteira, diferente de suspensão/banimento (ver [docs/discord/](../../discord/README.md)).
- **Exceção obrigatória — dado fiscal**: o registro mínimo de transação de quem apoiou/assinou **não é apagado** no pedido de exclusão, e fica retido pelos 5 anos legais (ver seção acima). A própria LGPD prevê retenção por cumprimento de obrigação legal, então não é descumprimento do direito de exclusão — mas **precisa estar escrito nos Termos** ([Termos de uso](03-termos.md)), sob pena de a plataforma prometer o que não pode entregar.
- Histórico de elo/reputação pode ser mantido de forma **agregada e anonimizada** (sem vincular a print/foto/identidade), pra não perder integridade estatística da plataforma.
- **No histórico dos outros participantes, o excluído vira "jogador removido".** Uma partida tem até 22 envolvidos: apagar o registro inteiro destruiria o histórico de gente que não pediu nada, e deixaria o elo já aplicado sem partida de origem — quebrando a auditabilidade do ranking. Então o **gamertag e qualquer identificador saem** e são substituídos por rótulo anônimo; placar, elo e o resto da partida continuam válidos.
  - Cumpre o pedido de exclusão (a identidade desaparece de toda tela) sem transformar o direito de uma pessoa em perda para as outras sete do lado dela.
  - Vale também pra avaliação por pares: a joinha que ela deu continua contando pro outro, sem registro de quem deu.

## Requisitos de segurança (independentes de stack)

Decisão de requisito, não de tecnologia — vale pra qualquer stack escolhida depois:

- **Dado sensível em repouso é criptografado**: print, foto de tela, e qualquer campo de identidade (Discord ID, gamertag) armazenados com criptografia no banco/storage — não em texto puro.
- **Painel de moderação exige autenticação forte** (2FA) pros 4 — o painel tem poder de kick/ban/editar disputa, é o alvo de maior risco se comprometido.
- **Log de auditoria do lado da plataforma**, não só do Discord: toda ação de moderador (resolver disputa, aplicar punição, editar dado) fica registrada com quem fez, quando, o quê — mesmo racional do `#log-moderacao` do Discord, mas cobrindo as ações que só acontecem dentro do painel da própria plataforma.
- **Backup diário com restauração testada**: elo, reputação e histórico de partida são o **ativo central do produto** — não são recuperáveis por reprocessamento (o print original é apagado em 90 dias, e o resultado da partida não existe em nenhum lugar fora da plataforma; a EA não tem API pra reconstituir nada). Requisito: backup diário do banco, retido por no mínimo 30 dias, com **restauração testada de verdade pelo menos uma vez** antes do primeiro usuário externo — backup nunca testado não é backup.
  - Print e foto seguem a política de retenção de 90 dias acima **inclusive no backup** — backup não pode virar cópia eterna de dado que a plataforma prometeu apagar.
  - Não confundir com o direito de exclusão: pedido de exclusão de conta precisa alcançar os backups dentro do prazo de rotação, não só o banco em produção.
- **Rate limiting na API própria da plataforma** (não só no Discord, já coberto em [Integração técnica](../../discord/04-integracao.md)) — protege contra scraping de perfil público em massa e tentativa de força bruta em login.
