# Infra — runbook do deploy

Como subir, atualizar, derrubar e migrar a ProLobby na VM Oracle, na topologia do [ADR-009](../adr/009-neon-cloudflare-vm.md). Primeiro deploy é manual e segue este arquivo (#121). Automatizar só depois de ter rodado à mão pelo menos uma vez.

```
navegador → Cloudflare → túnel → cloudflared → web:3000 → (BFF) → api:3001
                                  rede interna do Docker, nenhuma porta publicada
api → Neon São Paulo (fora da VM)        api ↔ bot:3002 (só rede interna, HMAC)
```

Tudo roda de `docker-compose.prod.yml`, na raiz do repo. Em todo comando abaixo, `dc` é um atalho:

```sh
alias dc='docker compose -f docker-compose.prod.yml'
```

## As três regras que quebram em silêncio

1. **Nenhum `ports:` em serviço nenhum.** Com uma porta aberta, qualquer um chega na API por fora do túnel e manda o `CF-Connecting-IP` que quiser. O rate limit vira decoração, sem erro e sem log. O túnel só protege enquanto for o **único** caminho.
2. **Nada cutuca o Neon pra "manter quente".** Ele hiberna depois de 5 min, e é isso que mantém o plano grátis. Health check que consulta o banco, pool aberto na subida ou loop periódico derrubam a escolha do ADR-009.
3. **Segredo só no `.env` da VM.** Nunca no compose, nunca no repo (item 1 do [checklist de segurança](../requisitos/08-seguranca-checklist.md)).

## Onde ficam os segredos

- **Na VM:** `.env` ao lado do `docker-compose.prod.yml`, com `chmod 600` e dono o usuário do deploy. O modelo, com o que cada variável é e quais são obrigatórias, está em [`deploy/production.env.example`](../../deploy/production.env.example).
- **Cópia de segurança:** fora da VM, no cofre de senhas das contas do projeto (#130), nunca em chat nem em issue.
- **Onde cada valor nasce:**
  - Neon: as duas URLs, `prolobby_app` com pooler e `prolobby_owner` direta.
  - Discord Developer Portal: OAuth2 e token do bot.
  - Servidor Discord: IDs de canal e de cargo, com o Developer Mode ligado.
  - Cloudflare Zero Trust: token do túnel.
  - Resend: chave de e-mail.
  - Oracle: chaves do Object Storage.
  - `openssl rand`: JWT, webhook, cifra e HMAC.

O compose recusa subir sem cada variável obrigatória e diz qual falta (`X is required`). `WEBHOOK_SECRET` com o valor de exemplo faz a API subir e recusar sozinha, de propósito.

## Primeiro deploy

1. Na VM, com Docker e o plugin do compose instalados:

   ```sh
   git clone <repo> prolobby && cd prolobby
   cp deploy/production.env.example .env && chmod 600 .env
   # preencher o .env
   ```

2. Conferir que nenhuma porta sai publicada. O comando **não pode imprimir nada**:

   ```sh
   dc config | grep -E '^\s+(ports|published):'
   ```

3. Subir. O `api-migrate` roda as migrations contra o Neon (URL direta, `prolobby_owner`) e sai. A API só sobe depois que ele termina com sucesso, e nunca roda migration no próprio processo.

   ```sh
   dc up -d --build
   dc ps        # web, api e bot "healthy"; api-migrate "exited (0)"
   ```

4. No painel do túnel (Cloudflare Zero Trust), apontar o hostname público pra `http://web:3000`, como em [`deploy/cloudflared.yml`](../../deploy/cloudflared.yml). A API não tem hostname: só o BFF da web fala com ela, pela rede interna.

5. Fechar o hostname com o Cloudflare Access, pra só os 4 sócios entrarem enquanto o ambiente for interno (ADR-009).

6. Primeiro admin. Enquanto não existe admin nenhum, o primeiro pode ser criado, e a auditoria registra `cli:bootstrap`:

   ```sh
   dc exec api node dist/modules/account/set-role.cli.js voce@exemplo.com admin voce@exemplo.com
   ```

   O painel de moderação exige 2FA (#311). O código de cadastro sai de `two-factor-enrollment.cli.js <email> <seu email de admin>`, pelo mesmo `dc exec api`.

## Conferir o critério de aceite

- **TLS e os três serviços:** a home responde pelo hostname da Cloudflare com HTTPS, e `dc ps` mostra os três `healthy`.
- **Nenhuma porta publicada:** o passo 2 não imprime nada.
- **API só pelo túnel:** de fora da VM, `curl --max-time 5 http://<IP-da-VM>:3001/api/health` e o mesmo na `:3000` **não conectam**.
- **Neon e migrations:** `dc logs api-migrate` termina em `Successfully migrated up to the latest version`.
- **Hibernação:** deixar tudo parado 6 min e abrir o site. O primeiro request pode demorar, mas não pode dar erro.
- **Nenhum segredo no repo:** o `gitleaks` da CI roda em todo push.

## Atualizar

```sh
git pull --ff-only
dc up -d --build      # o api-migrate roda antes da API, de novo
dc ps
```

## Logs

```sh
dc logs -f --tail=100 api     # ou web, bot, cloudflared
```

## Derrubar

```sh
dc down
```

- **Nunca `dc down -v`**: apaga o volume `api-evidence`, com as provas de recuperação de conta e os prints.
- **Nunca `docker system prune` nem `down` sem o `-f docker-compose.prod.yml`**: a máquina pode ter containers de outros projetos.

## Backup

O dump diário (#123, RNF-007) roda no `api-backup`, fora do processo da API:

```sh
dc --profile backup run --rm api-backup                       # dump
dc --profile backup run --rm api-backup restore <object-key>  # restore
```

A restauração precisa ser testada no primeiro deploy, num projeto Neon novo (ADR-009).

## Botão de pânico

Se houver suspeita de vazamento do banco ou da VM:

1. Na Neon, trocar a senha das roles `prolobby_app` e `prolobby_owner`.
2. Atualizar `DATABASE_URL` e `DATABASE_DIRECT_URL` no `.env`.
3. Se o `.env` pode ter vazado, gerar também `JWT_SECRET` e `WEBHOOK_SECRET` novos. O JWT novo derruba toda sessão aberta. `EVIDENCE_ENCRYPTION_KEY` e `IDENTITY_HMAC_SECRET` **não** se trocam assim: trocar invalida o que já está cifrado e cada hash guardado.
4. Recriar os containers com o `.env` novo:

   ```sh
   dc up -d --force-recreate
   ```
