# Checklist de segurança — sempre aplicar ao codar

**Regra permanente, não fase do dossiê.** Entra em vigor na primeira linha de código de backend/auth/banco, independente de quando isso acontecer (depois dos [dois bloqueadores](../../HANDOFF.md#os-dois-bloqueadores--leia-isto-antes-de-qualquer-coisa)). Consultar antes de qualquer PR que toque autenticação, banco, upload ou API.

**Atualizado (2026-09-08, [ADR-005](../adr/005-stack-tecnica.md) + [ADR-006](../adr/006-backend-separado-e-tooling.md); banco e borda ajustados em 2026-09-14, [ADR-009](../adr/009-neon-cloudflare-vm.md) — ver itens 3, 11 e 18)**: stack decidida é Postgres **sem RLS** — client nunca fala direto com o banco, tudo passa pela **API do NestJS** (`apps/api`); o Next.js é só frontend e não decide autorização. Isso muda os itens 3 e 4 abaixo: não têm política de linha pra manter, mas o **princípio continua valendo com peso redobrado nos itens 6 e 7** (auth server-side, restringir acessos), porque não existe camada de banco fazendo esse trabalho.

## 1 · Esconder API keys
Nenhuma chave (OCR pago, Discord, provedor de e-mail, storage) exposta no client. Só server-side ou variável de ambiente do backend. Cobre [RNF-013](07-nao-funcionais.md#rnf-013--token-do-bot-só-em-variável-de-ambiente) (token do bot) — estender pra toda chave de terceiro, não só Discord.

## 2 · Limpar secrets do git
Nenhum `.env`, chave ou token commitado, nem no histórico. Usar `.gitignore` desde o primeiro commit de código; se vazar, revogar a chave (não basta remover o commit — histórico do git persiste).

## 3 · Não expor acesso direto ao banco
O client (browser/app) nunca fala direto com o banco, só com a API do NestJS (`apps/api`). Se algum dia mudar pra um banco com client-side access (ex.: Supabase com anon key), essa chave só pode fazer o que a política de linha permite (item 4) — nunca tratar a chave pública como equivalente a autenticado.

**Atualizado (2026-09-14, [ADR-009](../adr/009-neon-cloudflare-vm.md))**: o banco está na Neon, e o **endereço dele é público** — restringir por IP só existe no plano pago. As compensações são obrigatórias:
- **Duas roles**: `prolobby_app` (API, sem DDL) e `prolobby_owner` (migrations, dump, restore). A API nunca conecta com a dona do schema.
- **Senha aleatória, só em variável de ambiente**, com o mesmo tratamento do token do bot.
- **`sslmode=require&channel_binding=require`** nas duas URLs.
- **Botão de pânico no runbook**: trocar a senha das duas roles e reiniciar.
- **Segundo fator** nos painéis da Neon, da Oracle e da Cloudflare.

## 4 · RLS (row-level security)
**N/A na stack decidida** — sem RLS, autorização é 100% responsabilidade do item 7 (restringir acessos) e do item 6 (auth server-side), no código do NestJS, apoiada no campo `papel` da Conta ([Modelo de dados](03-dados.md#conta)). Se algum dia migrar pra Postgres gerenciado com RLS, reativar este item: toda tabela com dado de usuário teria RLS ligado, sem exceção "por enquanto".

## 5 · Criptografia de dados
Print, foto, Discord ID, gamertag — não em texto puro no banco nem no storage. Já é [RNF-009](07-nao-funcionais.md#rnf-009--dado-sensível-criptografado-em-repouso).

## 6 · Auth server-side
**Atualizado (2026-09-08, [ADR-006](../adr/006-backend-separado-e-tooling.md))**: auth mora inteira no NestJS (JWT via `@nestjs/jwt`), não no Next.js. Decisão de "está autenticado" e "tem permissão" nunca confia em dado vindo do client (token, role, ID em cookie legível) — Next.js só guarda o token (cookie `HttpOnly`) e repassa pra API, nunca decide sozinho.

## 7 · Restringir acessos
Toda rota/endpoint do NestJS checa se quem chama pode fazer aquilo — moderador vs. jogador comum, dono do recurso vs. terceiro. Sem RLS (item 4), esta é a **única** camada de autorização — nenhum endpoint assume que "só quem sabe a URL" é controle de acesso.

## 8 · Bloquear mass assignment
Endpoint de update aceita só os campos que o formulário expõe — nunca serializa o body inteiro pro model (ex.: alguém mandar `{"reputacao": 100}` no update de perfil não pode funcionar).

## 9 · Proteger cookies
Cookie de sessão: `HttpOnly`, `Secure`, `SameSite`. Nenhum dado sensível em cookie legível por JS.

## 9b · CSRF: o que protege hoje é o `SameSite`, e ele tem uma condição

Não existe token anti-CSRF. O que fecha o vetor é o cookie de sessão com **`SameSite: lax`** ([ADR-007](../adr/007-sessao-jwt.md)): um POST vindo de outro site não carrega o cookie, então não há requisição forjada com sessão.

**A condição**: `lax` permite que navegação top-level por **GET** carregue o cookie. Enquanto nenhuma rota GET mudar estado, o vetor continua fechado. Se alguma mudar — um `GET /fila/sair`, um link de "confirmar" que grava algo — ela fica exposta a qualquer link que a pessoa clique em outro lugar.

**Regra prática, que vale pra toda rota nova**: GET nunca tem efeito colateral. Ação que muda estado usa POST, PATCH ou DELETE. É boa prática de HTTP em qualquer lugar, e aqui é também o que sustenta a ausência de token CSRF.

**O que o `SameSite` não cobre: login e cadastro** (auditoria de 2026-09-21). As duas rotas não dependem de cookie existente, então um formulário em qualquer site podia postar nelas: um corpo `text/plain` montado para ser JSON válido passava pelo proxy `/bff` e **logava a vítima na conta do atacante** (e o Discord que ela vinculasse ficava preso lá, porque o vínculo é exclusivo), ou criava conta usando o IP de cada visitante. Foi confirmado contra o app rodando. O fechamento mora no `apps/web`, em `rejectCrossSite`: rota `/bff` que muda estado recusa `Sec-Fetch-Site` diferente de `same-origin`/`none` e corpo que não seja `application/json`. **Regra prática**: toda rota `/bff` nova que muda estado chama `rejectCrossSite`. A exceção é o callback do Discord, que é navegação vinda de outro site por definição e é protegido pelo `state` de uso único.

`SameSite: strict` foi descartado por outro motivo, registrado no ADR-007: derrubaria o cookie de quem chega por link do Discord, que é o caminho normal de entrada neste produto ([RF-060](05-funcionais.md#rf-060--sair-do-servidor-discord-bloqueia-a-fila-até-voltar)).

## 10 · Hash nas senhas
Nunca senha em texto puro nem hash reversível. bcrypt/argon2 com salt, nunca MD5/SHA-1 sozinho.

## 11 · Rate limit
Por conta e por IP em login, envio de print, e leitura de perfil público. Já é [RNF-011](07-nao-funcionais.md#rnf-011--rate-limiting-na-api-própria).

**IP real em produção ([ADR-009](../adr/009-neon-cloudflare-vm.md))**: o cliente é identificado pelo cabeçalho `CF-Connecting-IP`, nunca por `trust proxy` por contagem. Isso só é seguro enquanto a API for alcançável **apenas pelo túnel da Cloudflare**: nenhum `ports:` nos serviços de produção do Docker Compose. Publicar a porta da API não gera erro nenhum — só torna o IP forjável e o rate limit decorativo. O web repassa o `CF-Connecting-IP` quando chama a API na renderização do servidor.

## 12 · Bot protection
Cadastro, login e report de resultado com proteção contra automação (captcha, honeypot, ou throttling agressivo em padrão de bot) — sem isso o rate limit sozinho não impede farm de conta.

## 13 · Queries parametrizadas
Nenhuma query monta SQL por concatenação de string com input do usuário. Sempre parametrizada/prepared statement ou ORM que faça isso por baixo.

## 14 · Validação de inputs
Todo input do usuário validado no servidor (tipo, tamanho, formato) — validação só no client não conta, é contorná­vel. Cobre formato/tamanho de upload ([parâmetros.md](../produto/parametros.md): JPG/PNG/WEBP, 10 MB).

## 15 · Vazar conteúdo
Resposta de erro/API nunca revela mais do que o necessário — sem stack trace, sem mensagem interna, sem confirmar/negar existência de recurso quando isso já é regra de negócio (ex.: [RF-070](05-funcionais.md#rf-070--tela-nunca-revela-se-um-e-mail-tem-conta), [RF-036](05-funcionais.md#rf-036--denunciado-nunca-vê-quem-denunciou)).

## 16 · Restringir uploads
Aceitar só os formatos declarados (JPG/PNG/WEBP), checar tipo real do arquivo (não só extensão), teto de tamanho (10 MB) e de volume por hora (10/h — já é antifraude, [RF-065](05-funcionais.md#rf-065--teto-de-10-uploads-por-hora-por-conta)). Nunca servir upload de volta com o content-type que o navegador decidir.

## 17 · Trim de respostas de API
Endpoint devolve só os campos que a tela precisa — nunca o objeto inteiro do banco (evita vazar campo interno, hash de senha, flag de moderação por acidente).

## 18 · Security headers
`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Strict-Transport-Security` — configurados desde o primeiro deploy, não como reforço depois.

**Na borda da Cloudflare ([ADR-009](../adr/009-neon-cloudflare-vm.md))**:
- **Cache só de estático público** (`/_next/static/*`, imagens, fontes). **Nunca `/api/*` nem HTML** — cache errado ali entrega a página de uma pessoa pra outra. Resposta com sessão sai com `Cache-Control: private, no-store`.
- **Web Analytics e Browser Insights desligados** ([RNF-020](07-nao-funcionais.md#rnf-020--métricas-do-beta-e-de-sucesso-saem-do-próprio-banco)).
- **Nenhuma transformação de conteúdo** (Rocket Loader, Email Obfuscation, injeção de script): quebra a CSP.
