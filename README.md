<div align="center">

# ProLobby

**Matchmaking competitivo e identidade verificada para EA FC Pro Clubs**

[![CI](https://github.com/ljborgess/ProLobby.com/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/ljborgess/ProLobby.com/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-f5b841)

[Como funciona](#como-funciona) · [Novidades](#novidades) · [Arquitetura](#arquitetura) · [Começando](#começando) ·
[Documentação](#documentação) · [Contribuindo](#contribuindo)

</div>

---

## Sobre

O ProLobby transforma a fila individual em partida organizada de Pro Clubs. O jogador entra na
fila pela posição que joga, o sistema monta dois times equilibrados por elo e coordena o resto:
capitão, canais de voz no Discord, validação do resultado e ranking.

A partida acontece dentro do EA FC. A plataforma não executa o jogo: organiza, verifica e mede.

## Como funciona

| Etapa | O que acontece |
|---|---|
| **1. Identidade** | O jogador envia o print do Virtual Pro; OCR extrai overall, posição e gamertag. Sem API pública da EA, toda verificação é evidência |
| **2. Fila** | Entrada individual por categoria: goleiro, zaga, meio, ponta ou ataque |
| **3. Matchmaking** | Dois lados equilibrados por elo, categoria contra categoria, com simetria obrigatória. A IA do jogo completa as vagas vazias |
| **4. Lobby** | Um capitão por lado, escolhido por reputação, empresta o próprio clube. O bot cria os canais de voz |
| **5. Resultado** | Print da tela final confirma placar e elenco; elo e reputação atualizam por categoria |
| **6. Governança** | Disputa, denúncia e apelação passam por moderação com trava de conflito de interesse |

Regras completas, com o motivo de cada decisão, no [dossiê de produto](docs/produto/README.md).

## Novidades

### Vínculo com o Discord — [#149](https://github.com/ljborgess/ProLobby.com/issues/149)

O Discord é onde a partida acontece: o bot cria os canais do lobby e controla quem entra na fila.
O vínculo liga a conta da plataforma ao usuário do Discord, e é pré-requisito da fila (RF-002).

```mermaid
sequenceDiagram
    participant J as Jogador
    participant W as apps/web
    participant A as apps/api
    participant D as Discord
    J->>W: Vincular Discord
    W->>A: POST /accounts/me/discord-link/attempts
    A-->>W: URL de autorização (state + PKCE)
    W->>D: Redireciona
    J->>D: Autoriza (escopo identify)
    D->>W: /bff/discord/callback?code&state
    W->>A: PUT /accounts/me/discord-link
    A->>D: Troca o code, lê só o ID
    A->>A: Confere lista de banidos e grava hash + cifra
    A-->>W: 204
    W-->>J: Discord vinculado
```

| Sem vínculo | Vinculado |
|:---:|:---:|
| <img src="docs/assets/vinculo-discord-nao-vinculado.png" alt="Tela do Discord sem vínculo, com o botão Vincular Discord" width="320"> | <img src="docs/assets/vinculo-discord-vinculado.png" alt="Tela do Discord já vinculado, sem botão" width="320"> |

| Discord de outra conta | Identidade banida |
|:---:|:---:|
| <img src="docs/assets/vinculo-discord-ja-vinculado.png" alt="Recusa: Discord já vinculado a outra conta" width="320"> | <img src="docs/assets/vinculo-discord-bloqueado.png" alt="Recusa genérica: conta bloqueada, com caminho de apelação" width="320"> |

- **Um Discord, uma conta.** O vínculo é exclusivo e não tem botão de desvincular: trocar é chamado
  de moderação (RF-082).
- **Banido não volta.** O ID é cruzado com a lista de bloqueio na mesma transação da gravação. A
  recusa não diz qual identidade disparou, pra tela não virar oráculo (RF-079).
- **Nada legível no banco.** O Discord ID vira HMAC (busca e unicidade) e AES-256-GCM (exibição).
  O token do Discord é usado uma vez e descartado.
- **Português e espanhol**, como toda tela da plataforma.

<img src="docs/assets/vinculo-discord-es.png" alt="A mesma tela em espanhol" width="320">

### `/verifications` diz o que falta — [#171](https://github.com/ljborgess/ProLobby.com/issues/171)

A tela de vínculo existia sem nada apontar pra ela. Login passa a levar pra `/verifications`, que lista
os pré-requisitos da fila ([RF-002](docs/requisitos/05-funcionais.md)) com o estado de cada um e o caminho pra resolver.
A home (`/`) é só a landing — nunca mostra o painel de alguém logado, e quem chega nela com sessão é
mandado direto pra `/verifications`, sem ver o "Criar conta" de novo (roteamento revisado em 2026-09-22:
antes a própria home fazia os dois papéis, e misturava marketing público com painel de conta na mesma URL).
O vínculo **não** virou parte do cadastro: o [onboarding](docs/produto/05-produto/01-onboarding.md) mantém a conta existindo antes do Discord, e
vincular antes de confirmar a conta prenderia o Discord numa conta abandonada ([RF-082](docs/requisitos/05-funcionais.md)).

<img src="docs/assets/home-proximos-passos.png" alt="Home logada com os próximos passos: e-mail não verificado e Discord não vinculado" width="420">

### Cadastro avisa o mínimo da pergunta de segurança

A API exige 8 caracteres e o formulário só mostrava "não deu pra criar a conta". Agora a dica mostra
o mínimo e o erro aparece no campo, antes de enviar.

<img src="docs/assets/cadastro-pergunta-8-caracteres.png" alt="Cadastro com o erro "A pergunta precisa de pelo menos 8 caracteres" no campo" width="320">

### Saída do servidor bloqueia a fila — [#150](https://github.com/ljborgess/ProLobby.com/issues/150), em andamento

O bot avisa a API quando alguém sai ou volta ao servidor, por um canal assinado com HMAC. Quem sai
fica impedido de entrar na fila até voltar, sem moderador e sem desfazer o vínculo. A API já está no
[PR #166](https://github.com/ljborgess/ProLobby.com/pull/166); faltam o bot e o aviso na tela.

### Correções da auditoria de 2026-09-21

| Problema | O que mudou |
|---|---|
| Em produção, toda recuperação de conta respondia "recebido" e não abria caso (disco sem permissão, sem volume) | Volume próprio, dono `node` na imagem, e o boot falha se não conseguir gravar |
| Um site de terceiro conseguia logar o visitante na conta do atacante (CSRF de login) | Os proxies `/bff` recusam requisição de outro site e corpo que não seja JSON |
| Com a API fora, o login dizia "senha incorreta" | Resposta 502 e mensagem de erro de conexão |
| Tentativas de login, links de reset e states do Discord nunca eram apagados | Limpeza diária no job de manutenção |
| Caso de falha de entrega ao bot não dizia qual conta foi afetada | O caso grava a conta |
| O e2e apagava o banco usado no `pnpm dev` | O e2e só roda em banco com nome terminado em `_e2e` |

## Arquitetura

```mermaid
flowchart LR
    U[Jogador] --> CF[Cloudflare]
    CF -->|túnel| WEB[apps/web<br/>Next.js]
    CF -->|túnel| API[apps/api<br/>NestJS]
    WEB --> API
    API --> DB[(Neon<br/>Postgres)]
    API -->|webhook assinado| BOT[apps/bot<br/>discord.js]
    BOT --> DC[Discord]
```

A API concentra toda a regra de negócio. O front-end não decide autorização, e o bot só executa
o que a API manda, por webhook assinado com HMAC. Nenhuma porta fica exposta: todo tráfego
entra pelo túnel da Cloudflare.

| Camada | Tecnologia |
|---|---|
| Front-end | Next.js (App Router), React 19, Tailwind CSS |
| API | NestJS, MikroORM, PostgreSQL |
| Bot | Node.js, discord.js |
| Contratos | `packages/types`, schemas zod compartilhados |
| Monorepo | Turborepo, pnpm workspaces |
| Testes | Jest, Vitest, Playwright, e2e contra Postgres real |
| Infraestrutura | Neon (São Paulo), VM Oracle Cloud, Cloudflare Tunnel |

As decisões e seus trade-offs estão nos [ADRs](docs/adr/README.md).

### Estrutura do repositório

```text
apps/
├── web/        # Next.js — interface
├── api/        # NestJS — regra de negócio, autenticação, banco
└── bot/        # discord.js — cargos, canais e notificações
packages/
├── types/      # contratos compartilhados (eventos, assinatura de webhook)
├── eslint-config/
└── tsconfig/
docs/           # dossiê de produto, requisitos, ADRs e guia do time
```

## Começando

### Pré-requisitos

- Node.js 22 (versão fixada em `.nvmrc`)
- pnpm 10
- Docker

### Instalação

```bash
git clone git@github.com:ljborgess/ProLobby.com.git
cd ProLobby.com
git checkout dev
pnpm install
```

### Banco de dados

```bash
docker compose up -d postgres
```

Se a porta 5432 já estiver em uso, suba em outra sem editar arquivo versionado:

```bash
POSTGRES_PORT=5442 docker compose up -d postgres
```

### Variáveis de ambiente

Copie os exemplos e preencha os segredos:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/bot/.env.example apps/bot/.env
```

`JWT_SECRET` e `WEBHOOK_SECRET` são obrigatórios, e a API se recusa a subir com valor vazio ou
de exemplo. Gere cada um com:

```bash
openssl rand -base64 48
```

`EVIDENCE_ENCRYPTION_KEY` e `IDENTITY_HMAC_SECRET` também são obrigatórios, com 32 bytes cada
(`openssl rand -base64 32`). O vínculo com o Discord usa `DISCORD_CLIENT_ID`,
`DISCORD_CLIENT_SECRET` e `DISCORD_REDIRECT_URI` (o Client Secret do aplicativo, não o token do
bot); sem eles, fora de produção, a tela de vínculo responde "indisponível".

### Migrações e execução

```bash
pnpm --filter @prolobby/api mikro-orm migration:up
pnpm dev
```

| Serviço | Endereço |
|---|---|
| Web | `http://localhost:3000` |
| API | `http://localhost:3001` |
| Bot (webhook) | `http://localhost:3002` |

### Qualidade

```bash
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm e2e
```

A suíte e2e roda contra um Postgres real, num banco próprio: ela apaga todas as tabelas e se recusa
a rodar em banco cujo nome não termine em `_e2e`.

```bash
docker compose exec postgres createdb -U prolobby prolobby_e2e   # só em volume antigo
DATABASE_URL=postgres://prolobby:prolobby@localhost:5432/prolobby_e2e pnpm e2e
```

O CI roda o mesmo pipeline em todo pull request.

## Documentação

| Área | Conteúdo |
|---|---|
| [Guia do time](docs/time/README.md) | Primeiro dia, fluxo de issue, regras que já evitaram bugs, uso de IA |
| [Produto](docs/produto/README.md) | Decisões de produto por domínio, com o motivo de cada uma |
| [Parâmetros](docs/produto/parametros.md) | Todos os números do sistema: elo, reputação, prazos e limites |
| [Requisitos](docs/requisitos/README.md) | Requisitos funcionais e não funcionais, estados, modelo de dados |
| [Segurança](docs/requisitos/08-seguranca-checklist.md) | Checklist aplicado a toda mudança de back-end, autenticação, banco ou upload |
| [Decisões de arquitetura](docs/adr/README.md) | ADRs com contexto, alternativas e consequências |
| [Discord](docs/discord/README.md) | Estrutura do servidor, cargos, canais e bot |
| [Negócio](docs/negocio/README.md) | Mercado, sustentabilidade, ordem de implementação e lançamento |

## Contribuindo

- `main` é produção; `dev` é a branch de desenvolvimento e o alvo de todo pull request
- Código em inglês; issues, pull requests, commits e documentação em português
- Todo pull request passa por code review e security review antes do merge

O fluxo completo está no [`CONTRIBUTING.md`](CONTRIBUTING.md). Quem entra no time começa pelo
[guia do time](docs/time/README.md).

## Status

Em desenvolvimento. Conta e autenticação (Fase 2.1) estão concluídas, o vínculo com o Discord
(Fase 2.3) está no ar e a saída do servidor está em andamento. O roadmap completo, fase a fase,
está no [PRD Mestre](https://github.com/ljborgess/ProLobby.com/issues/64).

## Licença

Projeto privado. Todos os direitos reservados aos sócios.

---

<div align="center">
<sub>Luciano · Rafael · João · Felipe</sub>
</div>
