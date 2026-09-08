# Checklist de segurança — sempre aplicar ao codar

**Regra permanente, não fase do dossiê.** Entra em vigor na primeira linha de código de backend/auth/banco, independente de quando isso acontecer (depois dos [dois bloqueadores](../../HANDOFF.md#os-dois-bloqueadores--leia-isto-antes-de-qualquer-coisa)). Consultar antes de qualquer PR que toque autenticação, banco, upload ou API.

**Atualizado (2026-09-08, [ADR-005](../adr/005-stack-tecnica.md) + [ADR-006](../adr/006-backend-separado-e-tooling.md))**: stack decidida é Postgres self-hosted **sem RLS** — client nunca fala direto com o banco, tudo passa pela **API do NestJS** (`apps/api`); o Next.js é só frontend e não decide autorização. Isso muda os itens 3 e 4 abaixo: não têm política de linha pra manter, mas o **princípio continua valendo com peso redobrado nos itens 6 e 7** (auth server-side, restringir acessos), porque não existe camada de banco fazendo esse trabalho.

## 1 · Esconder API keys
Nenhuma chave (OCR pago, Discord, provedor de e-mail, storage) exposta no client. Só server-side ou variável de ambiente do backend. Cobre [RNF-013](07-nao-funcionais.md#rnf-013--token-do-bot-só-em-variável-de-ambiente) (token do bot) — estender pra toda chave de terceiro, não só Discord.

## 2 · Limpar secrets do git
Nenhum `.env`, chave ou token commitado, nem no histórico. Usar `.gitignore` desde o primeiro commit de código; se vazar, revogar a chave (não basta remover o commit — histórico do git persiste).

## 3 · Não expor acesso direto ao banco
**N/A na stack decidida (Postgres self-hosted, sem RLS)** — o client (browser/app) nunca fala direto com o banco, só com a API do NestJS (`apps/api`). Se algum dia mudar pra um banco com client-side access (ex.: Supabase com anon key), essa chave só pode fazer o que a política de linha permite (item 4) — nunca tratar a chave pública como equivalente a autenticado.

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

## 10 · Hash nas senhas
Nunca senha em texto puro nem hash reversível. bcrypt/argon2 com salt, nunca MD5/SHA-1 sozinho.

## 11 · Rate limit
Por conta e por IP em login, envio de print, e leitura de perfil público. Já é [RNF-011](07-nao-funcionais.md#rnf-011--rate-limiting-na-api-própria).

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
