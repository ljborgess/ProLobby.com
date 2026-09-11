# 12. Termos de uso e idade mínima

**Fase: MVP** (antes do primeiro usuário externo real)

## Idade mínima

- **16 anos** — acompanha a classificação do próprio EA FC, mas com corte mais alto que o padrão Discord (13) porque envolve chat de voz com estranhos via Pro Clubs.
- **Verificação**: campo de **data de nascimento** no cadastro (não checkbox genérico "sou maior de 16") — sistema calcula a idade e bloqueia o cadastro na hora se der menos de 16 anos, sem depender de o jogador fazer conta sozinho. Sem verificação documental. Mesmo padrão de mercado usado por plataformas sociais/gaming (o próprio Discord funciona assim); verificação documental é atrito e custo de compliance desproporcional pro MVP.

## Apoio financeiro (Fundador e Apoiador)

Os Termos precisam cobrir o que a [Sustentabilidade](../../negocio/03-sustentabilidade.md) decidiu vender já no lançamento — e a redação é o que sustenta o enquadramento:

- **Fundador é apoio ao projeto, não compra de serviço com continuidade garantida.** Sem reembolso caso o projeto pare (decisão do time, risco assumido).
- **A palavra "vitalício" não aparece** em nenhum lugar — implica serviço perpétuo, o que é promessa de continuidade. A formulação é "acesso de Fundador enquanto a plataforma existir".
- **Risco dito antes do pagamento**, na mesma tela: fase inicial, sem garantia de continuidade, sem reembolso. Não em link de rodapé.
- **Nada comprado altera fila, elo, escolha de capitão ou resultado** — a linha vermelha entra no texto dos Termos, não só no dossiê interno.
- **Banimento permanente revoga os cargos de apoio sem devolver dinheiro** ([Cargos](../../discord/01-cargos.md)) — precisa estar dito, não presumido.
- **Exclusão de conta não apaga o registro fiscal da transação**, retido por 5 anos por obrigação legal ([LGPD](02-lgpd.md)). Sem essa ressalva escrita, a plataforma promete exclusão total e não pode cumprir.
- **Exclusão de conta também não levanta banimento**: o identificador de quem foi banido permanece em lista de bloqueio, guardado como hash ([RF-079](../../requisitos/05-funcionais.md#rf-079--banimento-sobrevive-à-exclusão-de-conta)). Mesma lógica da ressalva acima — precisa estar escrito, ou a plataforma promete apagar tudo e mantém algo.
- Ativar cobrança é **mudança material**, então exige novo aceite versionado de quem já usava.

**Ressalva jurídica**: apoio **com contrapartida** pode ser lido como contrato de serviço sob o CDC — o Código de Defesa do Consumidor não deixa de valer porque o vendedor chamou de doação. A redação da página de venda entra na mesma consulta jurídica das pendências abaixo.

## Adolescente de 16-17 anos — pendência jurídica

Com corte em 16 anos, **a base inclui menores de idade** — e a LGPD (art. 14) trata dado de criança e adolescente com regra própria, exigindo que o tratamento seja no melhor interesse do titular. O texto da lei é explícito sobre consentimento de responsável para **criança** (até 12); para **adolescente** (12 a 18) a interpretação é menos assentada e varia conforme o entendimento aplicado.

- **Não é decisão de produto, é de assessoria jurídica** — registrado aqui como pendência, não resolvido por conta própria. Entra junto com a formalização da entidade legal (ver [tese de mercado](../../negocio/01-mercado.md)), antes do primeiro usuário externo.
- Alternativa que elimina a questão, se a resposta jurídica vier complicada: **subir o corte pra 18 anos**. Custa alcance de público, mas fecha o assunto sem depender de interpretação.
- Não bloqueia teste interno com os 4 sócios (todos maiores).

## Termos de Uso / Política de Privacidade

- Obrigatórios **antes do primeiro usuário externo ao time** (não precisa ser documento jurídico complexo no dia 1, mas precisa existir).
- **Aceite versionado**: plataforma registra qual versão do ToS cada jogador aceitou e quando. Mudança material (ex.: quando entrar monetização) exige novo aceite antes de continuar usando — exigência prática de LGPD, já que consentimento precisa ser rastreável. Barato se o schema nascer com o campo (ver [Onboarding](../05-produto/01-onboarding.md)).
- Publicados em **português e espanhol**, acompanhando o idioma da plataforma (ver [Escopo de plataforma, jogo e região](../05-produto/02-escopo.md)).
- Motivo: coleta de print, foto, Discord ID e gamertag sem aviso formal é risco jurídico direto, não só decisão de produto — complementa a política de retenção/exclusão de [Dados pessoais e LGPD](02-lgpd.md).
- Cobre também o consentimento de **uso do clube EA declarado pelo jogador** (ver [Personagens e verificação](../02-jogador/01-verificacao.md)) — ao declarar clube com vaga, jogador é avisado explicitamente que autoriza até 10 jogadores de outro lobby serem convidados temporariamente pro clube quando escolhido capitão.
