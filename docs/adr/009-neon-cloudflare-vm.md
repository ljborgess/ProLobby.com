# ADR-009 · Banco na Neon, Cloudflare na frente, VM Oracle só pra processos

**Status**: aceita — corrige as linhas **Banco de dados** e **Hospedagem** do [ADR-005](005-stack-tecnica.md)
**Data**: 2026-09-14

## Contexto

O [ADR-005](005-stack-tecnica.md) pôs tudo numa VM Oracle Free Tier em São Paulo: Next.js, API, bot e Postgres. Isso deixava com o time três trabalhos que não são produto: manter o Postgres, fazer backup e restaurar, e expor a VM na internet com proxy reverso e HTTPS. Também deixava a plataforma inteira dependente de um único free tier, que a Oracle já cortou uma vez (de 4 OCPU/24 GB pra 2 OCPU/12 GB, em junho de 2026).

Foi proposta uma troca de stack: **Neon** no banco, **Clerk** na autenticação e **Cloudflare** na hospedagem. A decisão foi tomada numa sessão de perguntas em 2026-09-14, com duas regras que valeram pra todas as escolhas:

- **O menor custo possível** — R$ 0 sempre que der ([RF-072](../requisitos/05-funcionais.md#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático)).
- **Nada do que já foi construído é jogado fora sem motivo forte.** Na data, cadastro, sessão ([ADR-007](007-sessao-jwt.md)), verificação de e-mail ([ADR-008](008-provedor-de-email.md)) e aceite de Termos já estavam em `dev`, com 71 testes e2e.

## Decisão

**A Neon guarda o banco, em São Paulo. A Cloudflare fica na frente de tudo. A VM Oracle roda só processos. A autenticação continua própria.**

```
navegador → Cloudflare (DNS, HTTPS, CDN, DDoS) → túnel → VM Oracle São Paulo
                                                         ├── cloudflared
                                                         ├── web  (Next.js)
                                                         ├── api  (NestJS) ──→ Neon São Paulo (banco)
                                                         │                 └──→ Oracle Object Storage SP (prints, backups)
                                                         └── bot  (discord.js)
                                              rede interna do Docker, nenhuma porta publicada
```

### 1 · Banco: Neon, região São Paulo, plano grátis

- Região `aws-sa-east-1`. **A região não muda depois de criado o projeto** — errar aqui significa recriar o projeto.
- **Hiberna depois de 5 minutos parado** (padrão). A primeira requisição depois disso leva 0,5 a 1 s a mais. Se o p95 do [RNF-001](../requisitos/07-nao-funcionais.md#rnf-001--ação-comum-responde-em-menos-de-1-s) estourar no beta, o ajuste é acordar o banco antes dos horários de concentração anunciados no Discord, ainda no plano grátis.
- **Duas URLs**, as duas com `sslmode=require&channel_binding=require`:
  - `DATABASE_URL` — com pooler (`-pooler` no host), usada pela API.
  - `DATABASE_DIRECT_URL` — direta, usada por migrations, `pg_dump` e restore.
- **Duas roles**, com menor privilégio:
  - `prolobby_app` — lê e escreve dado, **sem DDL**. É a da API.
  - `prolobby_owner` — dona do schema. Só migrations, dump e restore.
  - A migration que cria o arranjo concede as permissões e o `ALTER DEFAULT PRIVILEGES`, pra toda tabela futura já nascer acessível à `prolobby_app`. **Escrita em 2026-09-17** (`Migration20260917150000`): a role em si nasce no console da Neon, que gera a senha — `CREATE ROLE` em migration versionada exigiria privilégio que a role dona não tem e poria uma senha no repositório. A migration é condicional à existência da role, então local e CI, onde ela não existe, aplicam sem erro.

### 2 · Backup: `pg_dump` diário feito pela VM

- Uma vez por dia, a VM roda `pg_dump` pela URL direta, **criptografa o arquivo** e manda pro Oracle Object Storage em São Paulo.
- **Retido por 30 dias**, cumprindo [LGPD](../produto/04-governanca/02-lgpd.md) e [RNF-007](../requisitos/07-nao-funcionais.md#rnf-007--perda-máxima-de-24-h-de-dado-restauração-em-até-24-h).
- **Os 6 horas de histórico da Neon grátis viram camada extra**, pra desfazer um "apaguei sem querer" em minutos. Não são o backup: vivem dentro do fornecedor que o backup protege.
- **Restauração testada no primeiro deploy interno**, num projeto Neon novo.

### 3 · Prints: Oracle Object Storage, São Paulo

- **Bucket privado, sem URL pública.** O print chega à pessoa pela API, que confere quem pode ver.
- **Upload só pela API** — validação de tipo, tamanho e dono (item 16) e o balde `upload` do rate limit continuam valendo.
- **Retenção de 90 dias por regra de lifecycle do bucket**, não por job do scheduler.
- **Criptografia em repouso nativa da Oracle.** O OCR precisa da imagem aberta, então criptografar no app não acrescenta proteção.
- **Nenhuma imagem no banco.**

### 4 · Hospedagem dos processos: VM Oracle Free Tier, São Paulo

- `web`, `api`, `bot` e `cloudflared` num **Docker Compose**. Se a Oracle cortar o free tier de novo, migrar pra um VPS pago leva horas, não um redesenho.
- **Nenhum `ports:` nos serviços de produção.** A API só é alcançável pelo túnel.

### 5 · Entrada: Cloudflare Tunnel

- **Nenhuma porta aberta na VM** — nem 80, nem 443, nem 22. Nginx e Caddy deixam de ser necessários.
- **Web e API no mesmo endereço**: `prolobby.com.br` é o web, e `prolobby.com.br/api/*` vai pra API por regra de caminho do túnel. O cookie de sessão fica na mesma origem, e o CORS só existe no desenvolvimento local.
- A API ganha o prefixo `/api` em `applySecurity()`, **não no `main.ts`** (corrigido em 2026-09-17). O `main.ts` não roda em teste nenhum: um prefixo só lá deixaria os e2e chamando `/accounts` e passando, enquanto produção serve `/api/accounts` — teste verde provando o roteamento errado.
- **Os Route Handlers do `apps/web` vivem em `/bff/*`**, nunca em `/api/*` (corrigido em 2026-09-17). Eles estavam em `/api/accounts` e `/api/sessions`, exatamente os caminhos que a regra acima manda pro NestJS: em produção o túnel desviaria antes, e o handler que repassa o `CF-Connecting-IP` e faz o relay do cookie de sessão nunca executaria. Quebra invisível — não falha build nem teste, só o deploy.
- **SSH pelo Cloudflare Access**, com segundo fator, só chave.

### 6 · IP real e rate limit

- O `ThrottlerGuard` identifica o cliente pelo cabeçalho **`CF-Connecting-IP`** em produção e por `req.ip` no desenvolvimento. A Cloudflare sobrescreve esse cabeçalho, e só dá pra chegar na API pelo túnel.
- **O web repassa o `CF-Connecting-IP`** quando chama a API na renderização do servidor.
- **Não se usa `trust proxy` por contagem** — com a VM alcançável por outro caminho, ele deixaria o IP forjável.

### 7 · Domínio

- **`.com.br` no Registro.br (~R$ 40/ano)**, com DNS na Cloudflare.
- **Ainda não comprado** (2026-09-17) — segue no primeiro deploy interno, logo depois de a Fase 2.1 fechar.
- **Titularidade decidida em 2026-09-17** ([#130](https://github.com/ljborgess/ProLobby.com/issues/130)): domínio e contas de infra (Cloudflare, Neon, Oracle, Resend) ficam no CPF do **Luciano**, com acordo escrito entre os 4 — transferido pro CNPJ quando a ME existir. Fecha a pendência de titularidade nesse ponto.
- **E-mail do projeto**: ainda em aberto (2026-09-17) — `prolobbysuporte@gmail.com` foi provisório, cotado pra troca antes das contas abaixo saírem do papel. Decidido o definitivo, é ele quem vira dono de todas as contas acima — nunca e-mail pessoal de um sócio.

### 8 · Cloudflare configurada pra ver o mínimo

- **Cache só de estático público** — `/_next/static/*`, imagens e fontes. **Nunca `/api/*` nem HTML.** A API e o Next.js mandam `Cache-Control: private, no-store` nas respostas com sessão, como segunda barreira.
- **Web Analytics e Browser Insights desligados** — [RNF-020](../requisitos/07-nao-funcionais.md#rnf-020--métricas-do-beta-e-de-sucesso-saem-do-próprio-banco).
- **Nenhuma transformação de conteúdo** (Rocket Loader, Email Obfuscation, injeção de script) — reescreve o HTML e quebra a CSP (item 18).

### 9 · Tetos grátis e alertas

| Teto grátis | Pausar cadastro alivia? | Ação |
|---|---|---|
| OCR: 1.000 chamadas/mês | sim | pausa cadastro em 90% ([RF-072](../requisitos/05-funcionais.md#rf-072--cadastro-pausa-perto-do-teto-do-free-tier-sem-gasto-automático), já decidido) |
| E-mail: teto diário do provedor | sim | pausa cadastro em **90 e-mails/dia** (Resend grátis, [ADR-008](008-provedor-de-email.md)) |
| Neon: 0,5 GB de armazenamento | não | alerta em 70% e 90% |
| Neon: 100 CU-horas/mês de compute | não | alerta em 70% e 90% |
| **Neon: 5 GB/mês de saída** — estourou, o banco é suspenso até o próximo ciclo | não | **alerta em 60% e 80%** |
| Oracle Object Storage: 20 GB | não | alerta em 80% |

- **A cada 6 horas, um job consulta a API de gestão da Neon** (`GET /projects/{id}`: `compute_time_seconds`, `data_transfer_bytes`, `synthetic_storage_size_bytes`). É uma chamada de controle e **não acorda o banco**.
- O tamanho do bucket vem da API da Oracle; o OCR, do contador próprio (Fase 2.2).
- **O alerta vai pra `#status-sistema`** como evento `system.quota_alert` do contrato do webhook.
- `NEON_API_KEY` recebe o tratamento do token do bot ([RNF-013](../requisitos/07-nao-funcionais.md#rnf-013--token-do-bot-só-em-variável-de-ambiente)).
- **Nenhum gasto automático.** Todo alerta pede decisão humana.

### 10 · Endereço público do banco, com compensações

O endereço da Neon é público, e restringir por IP (IP Allow) só existe no plano Scale, que é pago. Compensações:

1. Roles separadas (decisão 1) — API comprometida não destrói schema.
2. Senha aleatória gerada pela Neon, só em variável de ambiente.
3. SSL com `channel_binding` (decisão 1).
4. Botão de pânico no runbook: trocar a senha das duas roles e reiniciar o compose.
5. Segundo fator obrigatório nos painéis da Neon, da Oracle e da Cloudflare. As contas ficam no e-mail pessoal do Luciano (decisão 7, 2026-09-17) — o segundo fator é o que sustenta esta compensação, já que não há e-mail dedicado.

### 11 · LGPD: dado armazenado fica no Brasil, e o resto é declarado

- A promessa do ADR-005 passa a ser **"dado armazenado nunca sai do Brasil"**: banco, prints e backups ficam em São Paulo.
- **O que trafega fora dele é declarado na Política de Privacidade**: as requisições passam pela rede global da Cloudflare (IP, cookie, cabeçalhos), e o e-mail sai pelo provedor do [ADR-008](008-provedor-de-email.md).
- Quatro operadores declarados em [Termos](../produto/04-governanca/03-termos.md). Entra na consulta jurídica que já estava pendente.

### 12 · Quando vira código

- **Primeiro deploy interno logo depois de a Fase 2.1 fechar**, fechado ao público pelo Cloudflare Access. Só os 4 abrem.
- **Quem faz é o Rafael**, na trilha de bot e infra, **depois do piloto de OCR** e em paralelo com o começo da 2.2. As issues nascem quando a 2.2 abrir.
- **Já agora**, as issues abertas absorvem o que evita retrabalho: #87 (web chamando `/api`, repasse do `CF-Connecting-IP`, `Cache-Control` nas páginas com sessão), #106 (sai o job de prints) e #99 (reescrita pro túnel).

### Regras de código que a Neon impõe

Entram no [CONTRIBUTING](../../CONTRIBUTING.md) e valem a partir de agora:

1. **Nada consulta o banco em ciclo com o sistema parado.** Tick de fila só com gente na fila; retry de evento só com entrega pendente; scheduler diário. Um `setInterval` esquecido mantém a Neon acordada 24 horas e estoura o plano grátis em silêncio.
2. **O pool começa com zero conexões e reconecta sozinho.** A Neon derruba conexões paradas ao hibernar.
3. **Nada que dependa de sessão do Postgres** — `SET` de sessão, `LISTEN/NOTIFY`, advisory lock de sessão. O PgBouncer em modo transação divide conexões entre requisições.

## Alternativas descartadas

**Clerk na autenticação.** A autenticação própria já estava pronta e testada (~1.500 linhas), e o Clerk bate de frente com três regras decididas: o cadastro não pode revelar se um e-mail existe ([RF-070](../requisitos/05-funcionais.md#rf-070--tela-nunca-revela-se-um-e-mail-tem-conta)), a recuperação exige pergunta de segurança ([RF-025](../requisitos/05-funcionais.md#rf-025--recuperação-sem-e-mail-e-sem-discord-exige-dois-fatores)), e conta banida faz login em modo restrito pra apelar ([RF-081](../requisitos/05-funcionais.md#rf-081--conta-banida-faz-login-em-modo-restrito-só-pra-apelar)). Também mandaria a identidade inteira da pessoa pros EUA, quando o ADR-008 só aceitou mandar o e-mail.

**Next.js nos Cloudflare Workers.** O plano grátis limita o Worker a 3 MiB, que um Next com i18n e telas tende a passar; a renderização rodaria na borda global, lendo o cookie de sessão fora do Brasil; e seriam dois alvos de deploy. A velocidade ganha não aparece pra um público concentrado perto de São Paulo. **Revisitar** se o público sair da América do Sul ou se a VM ficar apertada de CPU.

**API e bot na Cloudflare.** O bot mantém conexão contínua com o gateway do Discord, e os Workers não mantêm processo rodando. Containers da Cloudflare seriam o primeiro gasto recorrente pra reproduzir o que a VM grátis já dá.

**Cloudflare R2 pros prints.** Não tem região nem jurisdição no Brasil, e print é dado sensível.

**Disco da VM pros prints.** Prenderia as evidências de disputa ao destino da VM; migrar de servidor passaria a exigir carregar arquivos.

**Plano pago da Neon pelo histórico mais longo.** Mesmo pago, o histórico mora dentro da Neon: projeto apagado ou conta bloqueada levam o backup junto.

**Banco sempre ligado.** Passa das 100 CU-horas do plano grátis pra resolver um atraso de meio segundo antes de medir se ele incomoda alguém.

**Subdomínio grátis de terceiro.** Endereço aleatório do túnel muda a cada reinício; subdomínios como `eu.org` levam semanas pra aprovar e passam pouca confiança pra quem digita senha.

**`trust proxy` por contagem de proxies.** Com a Cloudflare na frente, quem alcança a VM por outro caminho forja o próprio IP.

**Data Localization Suite da Cloudflare**, pra manter o processamento no Brasil. É recurso pago. A saída foi declarar em vez de evitar, como o ADR-008 fez com o e-mail.

## Consequências

- **Nada do código entregue quebra.** Cadastro, sessão, verificação de e-mail e aceite de Termos seguem valendo. CI e desenvolvimento local continuam com Postgres em Docker.
- **Sai do time**: operar Postgres, backup físico do banco e HTTPS/proxy reverso. **Entra**: o job de `pg_dump`, o job de cotas e a configuração do túnel e do cache.
- **O tempo real da fila (Fase 2.5) não pode usar `LISTEN/NOTIFY`.** Pra cumprir o [RNF-003](../requisitos/07-nao-funcionais.md#rnf-003--estado-da-fila-atualiza-em-menos-de-3-s), vai por WebSocket ou SSE dentro da própria API, que é uma instância só.
- **A regra de "nenhum `ports:` em produção" é frágil por natureza**: quebrá-la não gera erro, só deixa o rate limit forjável. Fica comentada no compose e no checklist de deploy.
- **A estimativa ganha até +1 semana na trilha do Rafael**, pelo deploy interno. Entra na próxima recalibração de [Ordem de implementação](../negocio/02-implementacao.md).
- **Gatilhos de revisão**:
  - IP Allow e plano Scale da Neon — quando houver receita recorrente (gatilho de ~700 contas ativas de [Sustentabilidade](../negocio/03-sustentabilidade.md)).
  - Workers pro web — público fora da América do Sul, ou CPU da VM apertada.
  - VPS pago — a Oracle cortar o free tier de novo.
