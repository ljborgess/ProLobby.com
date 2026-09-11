<!--
PR sem issue vinculada não entra. Se não existe issue, abre a issue primeiro —
é ela que carrega o RF de origem e o critério de aceite.
-->

Closes #

## O que muda

<!-- 2 a 4 linhas. O que passa a funcionar, não a lista de arquivos tocados. -->

## RFs cobertos

<!-- RF-019, RNF-016... e o link pro trecho de docs/requisitos/05-funcionais.md.
     Mudança de infra/processo pode não ter RF — nesse caso, escrever "nenhum" e dizer por quê. -->

## Como testar

<!-- Passo a passo pra quem revisa reproduzir. Se precisa de banco: `docker compose up -d postgres`. -->

## Checklist de segurança

Marcar **só os grupos que a mudança toca**, e só depois de conferir de verdade.
Lista completa e o racional de cada item: [`docs/requisitos/08-seguranca-checklist.md`](../blob/dev/docs/requisitos/08-seguranca-checklist.md).

**Auth e sessão** (itens 6, 7, 9, 10) — toquei em login, token, cookie ou permissão

- [ ] Decisão de "está autenticado" e "pode fazer isso" acontece no NestJS, nunca com dado vindo do client
- [ ] Todo endpoint novo checa quem pode chamar (sem RLS, esta é a única camada de autorização)
- [ ] Cookie de sessão com `HttpOnly`, `Secure`, `SameSite`
- [ ] Senha com bcrypt/argon2 e salt — nunca texto puro nem hash reversível

**Banco e entidade** (itens 8, 13, 17) — criei ou alterei entidade, migration ou query

- [ ] Nenhuma query monta SQL por concatenação de input do usuário
- [ ] Endpoint de update aceita só os campos do formulário (nada de serializar o body inteiro no model)
- [ ] Resposta devolve só os campos que a tela precisa — nunca o objeto inteiro do banco

**Upload** (itens 14, 16) — toquei em envio de print ou arquivo

- [ ] Formato, tamanho e **tipo real** do arquivo validados no servidor (extensão não basta)
- [ ] Teto de volume por hora respeitado ([RF-065](../blob/dev/docs/requisitos/05-funcionais.md))
- [ ] Upload nunca é servido de volta com content-type escolhido pelo navegador

**API pública** (itens 11, 12, 15, 18) — criei rota nova ou mexi em resposta de erro

- [ ] Rate limit por conta e por IP onde faz sentido (login, upload, leitura de perfil)
- [ ] Erro não vaza stack trace, mensagem interna, nem confirma/nega existência de recurso quando isso é regra de negócio ([RF-070](../blob/dev/docs/requisitos/05-funcionais.md), [RF-036](../blob/dev/docs/requisitos/05-funcionais.md))
- [ ] Security headers mantidos (CSP, X-Content-Type-Options, frame-ancestors, HSTS)

**Segredo** (itens 1, 2) — sempre conferir, em qualquer PR

- [ ] Nenhuma chave, token ou `.env` no diff — nem em teste, nem em comentário, nem em fixture

## O que ficou de fora

<!-- O que foi deliberadamente adiado e pra qual issue. "Nada" é resposta válida. -->

---

### Antes do merge — não negociável

Este PR **fica aberto** até passar por duas revisões, mesmo quando o CI está verde e mesmo quando o autor é quem pode mergear:

- [ ] **Code review** — corretude, aderência ao RF de origem, sem duplicação, sem abstração especulativa
- [ ] **Security review** — o recorte marcado acima foi conferido por outra pessoa, não só pelo autor

Branch protection **não é trava técnica** neste repo (privado no plano Free, decidido em [#66](../issues/66) e registrado no [ADR-006](../blob/dev/docs/adr/006-backend-separado-e-tooling.md)): o GitHub deixa mergear sem aprovação. A regra vale por disciplina, e é por isso que ela está escrita aqui.
