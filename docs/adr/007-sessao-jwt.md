# ADR-007 · Sessão por JWT sem revogação, com estado lido do banco

**Status**: aceita
**Data**: 2026-09-11

## Contexto

O [ADR-006](006-backend-separado-e-tooling.md) decidiu **JWT no NestJS**, com o Next.js só guardando o token num cookie `HttpOnly` e repassando pra API. O dossiê fixa mais duas coisas: [RF-022](../requisitos/05-funcionais.md#rf-022--sessão-simultânea-em-vários-dispositivos) permite sessões simultâneas sem limite (a trava que importa, 1 fila ativa, é por conta e não por sessão), e [RF-023](../requisitos/05-funcionais.md#rf-023--fechar-o-navegador-não-sai-do-lobby) exige que fechar o navegador **não** derrube nada — logo o cookie é persistente, não de sessão.

O que ninguém tinha decidido: **quanto dura**, **o que o token carrega**, e **o que acontece quando a conta muda de estado com um token válido em circulação**.

A última é a que morde. Sem decidir, a implementação natural (papel e estado dentro do token) produziria uma conta **banida que continua entrando na fila** até o token expirar — e [RF-079](../requisitos/05-funcionais.md#rf-079--banimento-sobrevive-à-exclusão-de-conta) acabou de ser implementada justamente pra garantir que banimento sobrevive até à exclusão de conta. Banimento que não bane por uma semana é teatro.

## Decisão

| Item | Escolha |
|---|---|
| **Revogação por sessão** | não existe |
| **Duração** | 7 dias fixos, sem renovação deslizante |
| **Claims do token** | só o id da conta (`sub`) — nada de papel, estado ou permissão |
| **Papel e estado** | lidos do banco a cada request autenticado |
| **Conta banida** | faz login, em modo restrito |
| **Default de rota** | fechado: exige sessão e conta ativa |
| **Revogação em massa** | trocar o `JWT_SECRET`, como procedimento de emergência |

### Sem revogação por sessão, e o que isso custa

Trocar a senha **não** derruba sessão nenhuma. Quem tiver um token válido segue dentro até ele expirar — inclusive alguém que roubou a conta e de quem a vítima está justamente tentando se livrar via [RF-024](../requisitos/05-funcionais.md#rf-024--link-de-redefinição-de-senha-expira-em-30-min-e-é-de-uso-único)/[RF-025](../requisitos/05-funcionais.md#rf-025--recuperação-sem-e-mail-e-sem-discord-exige-dois-fatores).

Aceito porque o ativo desta conta é **elo e reputação**, não dinheiro: não há cartão salvo, não há saldo, e estrago em elo aparece no histórico e é reversível por rollback ([ADR-002](002-log-de-evento.md)). O que a limitação exige é estar **escrita**, pra ninguém prometer ao usuário que "trocar a senha expulsa quem entrou".

### 7 dias fixos

Sem revogação, este número **é** a janela de exposição de um token roubado.

7 dias cobre o padrão de uso real (joga algumas noites, some, volta) com uma relogada por semana. 24 h daria janela menor e atrito diário num produto onde a pessoa abre a aba pra entrar na fila e esperar — ser deslogado no meio da espera é fricção concreta.

**Renovação deslizante foi descartada**: seria mais conveniente, mas transformaria token roubado de conta ativa em token praticamente eterno — bastaria ao atacante usar uma vez por semana. Conveniência não vale transformar uma janela de 7 dias em janela infinita.

### O token não carrega autorização

Só o `sub`. Papel, estado, plano e reputação vêm do banco, por chave primária, a cada request autenticado.

É o que faz banimento, suspensão e mudança de papel valerem **no request seguinte**, sem exceção e sem depender de o token expirar. O custo é uma consulta por PK — microssegundos, com índice — numa escala dimensionada pra [10 lobbies simultâneos](../requisitos/07-nao-funcionais.md#rnf-004--10-lobbies-simultâneos), 80 a 220 pessoas. Não é escala que justifique trocar correção por economia de query, e não ameaça o alvo de [RNF-001](../requisitos/07-nao-funcionais.md#rnf-001--ação-comum-responde-em-menos-de-1-s) (menos de 1 s no p95).

**Descartado o híbrido** (papel no token, estado no banco só nos endpoints sensíveis): economizaria query na navegação e exigiria que alguém lembrasse de marcar cada endpoint novo como sensível. O endpoint esquecido seria justamente o que precisava.

### Conta banida faz login, em modo restrito

O login funciona; o guard barra tudo menos ver a própria punição e abrir a apelação.

Motivo: [RF-037](../requisitos/05-funcionais.md#rf-037--uma-apelação-por-punição-reabertura-só-com-fato-novo) garante uma apelação por punição, e [Moderação](../produto/04-governanca/01-moderacao.md) registra que banimento não expulsa do Discord justamente pra a pessoa poder "ver avisos, discutir, **apelar**". Se o login recusasse conta banida, o direito de apelação passaria a depender inteiramente do Discord — e **dá pra ser banido por fraude no cadastro (print falso) sem nunca ter vinculado Discord**. O direito existiria no papel e não no produto.

Só é possível porque o estado vem do banco: com estado no token, não haveria como distinguir modo restrito de sessão normal.

### Default de rota é fechado

Guard global: rota nova exige sessão e conta ativa. Quem quer público marca `@Public()`; quem aceita outro estado (não verificada navegando, banida apelando) marca explicitamente.

Sem RLS na stack ([ADR-005](005-stack-tecnica.md)), esta é a **única** camada de autorização — item 7 do [checklist de segurança](../requisitos/08-seguranca-checklist.md). Com default aberto, esquecer o decorator não produz erro nenhum: produz uma rota aberta que ninguém nota. Mesmo princípio do `forbidNonWhitelisted` na validação de entrada.

### CSRF: coberto pelo `SameSite`, com uma condição que precisa continuar verdadeira

Não há token anti-CSRF, e não precisa haver enquanto o cookie for `SameSite: lax`: um POST de outro site não carrega o cookie, então não existe requisição forjada com sessão.

A condição é que **`lax` deixa passar navegação top-level por GET**. Enquanto nenhuma rota GET mudar estado, o vetor segue fechado — e essa passa a ser regra escrita, no [item 9b do checklist](../requisitos/08-seguranca-checklist.md). Uma rota GET com efeito colateral reabre o buraco sem que nada no código de sessão mude, que é o tipo de regressão impossível de ver num diff de outro módulo.

### `JWT_SECRET` é o botão de pânico

Trocar o secret invalida **todos** os tokens de uma vez. É a única revogação em massa que este desenho tem, e a resposta a vazamento de banco ou suspeita de comprometimento em escala.

Fica documentado no runbook junto com o custo — todo mundo reloga — pelo mesmo motivo que o procedimento de vazamento do token do bot já existe em [Integração técnica](../discord/04-integracao.md): **procedimento escrito antes de precisar, não durante**.

Descartada, por ora, a rotação sem derrubar ninguém (aceitar dois secrets na validação, assinar só com o atual): é código pra um caso que talvez nunca aconteça, e quando acontecer, derrubar todo mundo é provavelmente o comportamento desejado.

## Alternativas descartadas

**Sessão revogável com tabela no banco.** Permitiria "ver meus dispositivos" e derrubar um específico, e faria a troca de senha expulsar o invasor. Descartada pelo custo por request (consulta a cada chamada autenticada, além da consulta da conta) e por resolver um problema que o MVP não tem: sem painel de moderação com poder de expulsar sessão (Fase 5) e sem dado financeiro na conta, a capacidade de revogar não tem consumidor. **Revisitar quando o painel existir** — é a fase em que "expulsar sessão" vira ação de moderação de verdade.

**Campo `sessionsValidFrom` na conta.** Meio-termo barato: uma coluna, uma comparação, e a troca de senha mataria todas as sessões daquela conta. Descartada por enquanto porque resolve só o caso da senha trocada e ainda assim derruba as sessões legítimas junto — se esse caso aparecer no beta, é a primeira coisa a implementar, não a tabela completa.

**Refresh token.** Daria access token curto com sessão longa. Descartado por dobrar a superfície (duas credenciais, dois ciclos de vida, rotação) pra ganhar revogabilidade que o item acima já mostrou não ter consumidor no MVP.

## Consequências

- **Logout apaga o cookie e não invalida o token.** Se o token foi capturado antes, ele continua servindo até expirar. Precisa estar dito na interface em vez de prometer o contrário.
- **Toda rota autenticada faz uma consulta de conta.** É o preço, consciente, de banimento e suspensão valerem na hora.
- **Nasce uma regra de produto nova**: conta banida faz login restrito — formalizada em [RF-081](../requisitos/05-funcionais.md#rf-081--conta-banida-faz-login-em-modo-restrito-só-pra-apelar).
- **O `JWT_SECRET` vira credencial de operação**, não só variável de configuração: quem o tem consegue forjar sessão de qualquer conta, inclusive Admin. Mesmo tratamento do token do bot ([RNF-013](../requisitos/07-nao-funcionais.md#rnf-013--token-do-bot-só-em-variável-de-ambiente)) — variável de ambiente, nunca no repositório, nem no histórico.
- **Revisitar na Fase 5**, quando o painel de moderação existir: é quando revogar sessão passa a ter consumidor real.
