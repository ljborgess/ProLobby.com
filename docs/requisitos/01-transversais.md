# Requisitos transversais

**Fase: MVP**

Decisões que não pertencem a um fluxo só — atravessam o produto inteiro e, se ficarem implícitas, cada parte do sistema escolhe uma resposta diferente. Vieram de uma auditoria do dossiê como **documento de requisito**, não como conjunto de regras de negócio: o que estava decidido era o comportamento; o que faltava era a base sobre a qual o comportamento roda.

## Tempo

### Fuso: UTC por dentro, local na tela

**Todo prazo, contador, expiração e job roda em UTC.** A interface converte pro fuso do navegador de quem está olhando.

Motivo: a região do escopo ([Escopo](../produto/05-produto/02-escopo.md)) cobre Brasil, Argentina, Chile, Uruguai e Paraguai — vários fusos, alguns com horário de verão. Sem um fuso único por dentro, "3 falhas de OCR no mesmo dia" ([Personagens](../produto/02-jogador/01-verificacao.md)) significa coisas diferentes por país, e duas pessoas do mesmo lobby veriam prazos distintos pro mesmo evento.

É também o único formato que não exige retrabalho quando a região expandir — expansão já foi desenhada como aditiva.

### "Em 30 dias" é janela móvel

Todos os contadores de reincidência olham os **últimos 30 dias a contar de agora**, nunca o mês do calendário. Vale pros três: 3 faltas de confirmação de lobby ([Fila](../produto/03-partida/02-fila.md)), 3 zero-reports ([Resultado](../produto/03-partida/04-resultado.md)), 5 avaliações negativas ([Ranking](../produto/02-jogador/02-ranking.md)).

Motivo: mês do calendário dá absolvição de graça. Quem acumula duas faltas no dia 29 fica limpo em 48 horas; quem falta no dia 2 carrega o peso por um mês inteiro. Mesma conduta, punição diferente por sorte de data.

Sem decaimento gradual: falta sai da janela de uma vez, aos 30 dias. Decaimento seria mais justo na teoria e um mecanismo a mais pra explicar ao jogador — desproporcional pro tamanho do problema.

## Definições que eram usadas sem existir

### Conta ativa

**Conta com ao menos 1 partida completada nos últimos 30 dias** (janela móvel, como acima).

O termo era usado como gatilho de decisão e nas [métricas de sucesso](../negocio/01-mercado.md) sem nunca ter sido definido — ou seja, a métrica não era medível. Conta cadastrada não conta, conta verificada não conta: partida completada é o único sinal de uso real, coerente com "partidas por semana" ser a métrica principal.

## Papéis dentro da plataforma

O dossiê especificava os cargos do **Discord** em detalhe e nunca enumerou os papéis da **própria plataforma**. São coisas diferentes: o cargo do Discord controla acesso a canal, o papel da plataforma controla acesso a dado e ação.

| Papel | Pode |
|---|---|
| **Visitante** (não logado) | ver perfil público, ranking, páginas institucionais |
| **Usuário** | tudo do visitante + gerenciar os próprios personagens, entrar na fila, reportar resultado, avaliar companheiros, abrir chamado |
| **Moderador** | tudo do usuário + painel de moderação: resolver disputa, exceção de OCR, aplicar punição, ver print de terceiro no contexto de um caso |
| **Admin** | tudo do moderador + gerenciar papéis, executar comando de kick/ban, ver log de auditoria completo |

- **Moderador e Admin são os mesmos 4 no MVP**, com papéis separados desde já pelo mesmo motivo que no Discord: preparar a entrada de moderador comunitário sem migração retroativa ([Moderação](../produto/04-governanca/01-moderacao.md)).
- Papel de moderador **não dá acesso irrestrito a print** — só aos anexados ao caso que ele está tratando, e o acesso fica no log de auditoria ([LGPD](../produto/04-governanca/02-lgpd.md)).
- Ação de moderador sobre a **própria conta** é bloqueada pelo sistema (resolver disputa da sua partida, remover sua punição). O dossiê deixou o conflito de interesse sem regra formal, apostando no bom senso do grupo — mas a trava técnica no caso mais óbvio é barata e não depende de confiança.

## Requisitos não-funcionais

Existia timeout de 10 s pro bot ([Integração técnica](../discord/04-integracao.md)) e nada pra plataforma. Num produto de fila, tempo de resposta é requisito funcional — a pessoa está com o console ligado esperando.

| Requisito | Alvo | Por quê |
|---|---|---|
| Resposta de página/ação comum | < 1 s | navegação e fila precisam parecer instantâneas |
| Processamento de OCR (upload → resultado na tela) | < 15 s, com indicação de progresso | acima disso a pessoa acha que travou e reenvia, dobrando custo e criando duplo envio |
| Atualização do estado da fila | < 3 s | fila que parece parada é abandonada |
| Disponibilidade | melhor esforço, sem SLA | 4 sócios part-time; prometer uptime que não se sustenta é pior que não prometer |

Alvos, não garantia contratual — servem pra saber quando algo saiu do aceitável, mesmo racional das metas de resposta da [moderação](../produto/04-governanca/01-moderacao.md).

## Idempotência de envio

Todo envio que gera efeito (print de verificação, print de resultado, confirmação de lobby, avaliação de companheiro) precisa ser **idempotente**: reenviar o mesmo envio não duplica o efeito.

- O hash de arquivo ([Resultado](../produto/03-partida/04-resultado.md)) já impede **reusar** um print entre partidas diferentes — mas não trata **duplo envio do mesmo print na mesma partida**, que é o caso comum: dois cliques, conexão ruim, ou a pessoa achando que travou (ver o alvo de 15 s acima).
- Sem isso, o duplo envio vira dois reports do mesmo lado, e a validação cruzada trata como divergência — gerando disputa artificial que cai em moderação.

## Acessibilidade

Piso mínimo, não certificação: contraste suficiente pra leitura, navegação por teclado nos fluxos principais, rótulo em todo campo de formulário, e mensagem de erro que diz o que fazer (não só que falhou).

O fluxo de upload é **mobile-first** por decisão já registrada ([Personagens](../produto/02-jogador/01-verificacao.md)) — a maioria dos envios sai do celular, na frente do console. Isso implica área de toque generosa e nada que dependa de hover pra funcionar.

## Inventário de telas

Nenhum documento listava as telas do produto — existiam só no artefato de preview. Sem inventário não dá pra estimar nem dividir trabalho.

| Tela | Fluxo |
|---|---|
| Cadastro / login / recuperação | [Onboarding](../produto/05-produto/01-onboarding.md) |
| Meus personagens (lista) | [Personagens](../produto/02-jogador/01-verificacao.md) |
| Upload de print + confirmação do que o OCR leu | [Personagens](../produto/02-jogador/01-verificacao.md) |
| Vínculo do Discord | [Onboarding](../produto/05-produto/01-onboarding.md) |
| Fila — escolha de categoria e estado da busca | [Fila](../produto/03-partida/02-fila.md) |
| Lobby — escalação dos dois lados, capitão, votação de formação, confirmação de convite | [Lobby](../produto/03-partida/03-lobby.md) |
| Report de resultado + avaliação de companheiros | [Resultado](../produto/03-partida/04-resultado.md) |
| Perfil público (próprio e de terceiro) | [Perfil](../produto/02-jogador/03-perfil.md) |
| Ranking | [Perfil](../produto/02-jogador/03-perfil.md) |
| Notificações in-app | [Lobby](../produto/03-partida/03-lobby.md) |
| Abrir chamado / minhas contestações | [Moderação](../produto/04-governanca/01-moderacao.md) |
| Painel de moderação — fila de casos, caso aberto, log de auditoria, contadores | [Moderação](../produto/04-governanca/01-moderacao.md) |
| Institucional — Termos e Política de Privacidade | [Termos](../produto/04-governanca/03-termos.md) |

Tudo em **português e espanhol** desde o início ([Escopo](../produto/05-produto/02-escopo.md)).
