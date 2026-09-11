# ADR-008 · E-mail transacional por provedor externo, com transferência internacional declarada

**Status**: aceita
**Data**: 2026-09-11

## Contexto

O [Onboarding](../produto/05-produto/01-onboarding.md) decide que **e-mail serve só pra conta, nunca pra notificação de produto** — verificação de cadastro, redefinição de senha, e o aviso de reabertura de [RF-078](../requisitos/05-funcionais.md#rf-078--aviso-de-cadastro-pausado-e-de-reabertura-sai-por-e-mail). Aviso de fila, lobby, resultado e punição vai por Discord e in-app, e nada disso muda aqui.

O que o dossiê **não** dizia: por onde esse e-mail sai. E a escolha não é neutra — endereço de e-mail é dado pessoal, e praticamente todo provedor sério opera fora do Brasil, o que levanta transferência internacional sob a LGPD.

A questão ficou visível ao implementar a [verificação de e-mail](https://github.com/ljborgess/ProLobby.com/issues/89): sem provedor, o cadastro é funcionalmente incompleto — a pessoa cria conta, não recebe nada, e a conta fica presa em `unverified` sem caminho de saída.

## Decisão

**Provedor externo de e-mail transacional**, com a transferência internacional declarada na Política de Privacidade e o provedor nomeado.

A escolha concreta (Resend, Amazon SES ou equivalente) fica para o momento do deploy, porque depende de preço e de região disponível — mas **o formato da decisão está fechado**: é provedor externo, não SMTP próprio.

### Por que não SMTP na própria VM

Seria a opção coerente com "dado nunca sai do Brasil" ([Sustentabilidade](../negocio/03-sustentabilidade.md)), e foi avaliada com seriedade por isso.

Caiu por um motivo prático e grave: **IP novo, sem reputação, cai em spam**. E-mail de verificação que não chega mata o cadastro **silenciosamente** — a pessoa não recebe, não entende, e a plataforma não tem como saber. É o pior modo de falha possível nesta posição do fluxo, porque acontece exatamente na primeira interação de alguém com o produto.

Construir reputação de IP é trabalho contínuo (SPF, DKIM, DMARC, aquecimento, monitoramento de bounce) para um time de 4 part-time, e o ganho seria evitar uma transferência internacional que a base legal abaixo já resolve.

### Por que a base legal aqui é diferente do PostHog

O [Lançamento](../negocio/04-lancamento.md) descartou ferramenta de analytics de terceiro com esta frase: *"mandar dado de comportamento pra fora abre capítulo novo de LGPD e transferência internacional — caro demais pra medir 4 números"*.

A distinção que sustenta as duas decisões opostas:

| | Analytics | E-mail transacional |
|---|---|---|
| Que dado sai | comportamento: o que a pessoa clicou, quando, por quanto tempo | o endereço, e o conteúdo da mensagem que ela pediu |
| Base legal | consentimento — e revogável | **execução de contrato**: sem enviar, o serviço não funciona |
| Dá pra evitar? | sim, medindo do próprio banco (foi o que se fez) | não: a verificação de e-mail **é** o envio de e-mail |
| Quem pediu | ninguém | a própria pessoa, ao se cadastrar |

Analytics era dado que não precisava sair. Aqui o envio é o serviço.

## Consequências

- **A Política de Privacidade precisa nomear o provedor** e declarar a transferência internacional. Entra na mesma consulta jurídica já pendente ([Termos](../produto/04-governanca/03-termos.md)) — não é item novo de agenda, é um parágrafo a mais num documento que já vai ser escrito.
- **O endereço de e-mail sai do Brasil**; nenhum outro dado vai junto. O conteúdo é um token de uso único e um link — sem gamertag, sem elo, sem histórico.
- **A interface do envio é abstrata** (`MailSender`), e o provedor é uma linha no módulo. Trocar não toca em nenhum chamador, o que também significa que trocar de provedor depois, se o preço ou a região mudarem, é barato.
- **`ConsoleMailSender` recusa rodar em produção.** É o default até o provedor entrar, e loga em vez de enviar. A trava existe porque uma conta que nunca recebe o link é indistinguível de um cadastro quebrado — e essa classe, sem a trava, faria disso o comportamento padrão.
- **Bounce e reclamação de spam não são tratados.** Com provedor externo há webhook pra isso; no volume do MVP (dezenas de e-mails por semana), ignorar é aceitável. Revisitar se a taxa de entrega virar problema no beta.

## Alternativas descartadas

**SMTP na VM Oracle.** Zero terceiro, zero transferência. Descartada pela deliverability — ver acima.

**Provedor brasileiro.** Eliminaria a transferência internacional de vez. Descartada por ora: os disponíveis têm free tier menor ou inexistente, e a decisão de custo zero no MVP ([Sustentabilidade](../negocio/03-sustentabilidade.md)) pesa mais que evitar uma transferência que a base legal cobre. **Revisitar se a consulta jurídica apontar risco concreto** — é a alternativa que resolve o problema pela raiz, e continua na mesa.

**Não enviar e-mail nenhum, verificando por Discord.** Tecnicamente possível, e tentador porque o vínculo Discord já é obrigatório pra fila. Descartada porque quebraria a ordem do onboarding ([Onboarding](../produto/05-produto/01-onboarding.md)): conta existe antes do Discord, e o Discord é o **terceiro** passo, não o primeiro. Também deixaria a recuperação de conta sem caminho — que é justamente o cenário que [RF-025](../requisitos/05-funcionais.md#rf-025--recuperação-sem-e-mail-e-sem-discord-exige-dois-fatores) trata como o pior possível.
