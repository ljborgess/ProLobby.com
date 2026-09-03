# Discord — estrutura de servidor e bot

Documenta a estrutura do servidor Discord da comunidade ProLobby: cargos, canais, permissões do bot. Domínio próprio, separado do dossiê de produto (`docs/produto/dossie/`) — aqui é infraestrutura de comunidade, não fluxo de produto. Onde os dois se cruzam (ex.: bot cria canal de lobby, notifica resultado), o dossiê de produto (ver [Discord e lobby](../produto/dossie/03-partida/04-discord-e-lobby.md)) linka pra cá.

## Conteúdo

1. [Cargos e verificação](01-cargos-e-verificacao.md)
2. [Canais](02-canais.md)
3. [Bot: permissões e integração com moderação](03-bot-e-moderacao.md)

## Propriedade e convite do servidor

- **Servidor pertence a uma conta Discord separada, não pessoal** (não a conta de nenhum dos 4 sócios) — credencial documentada/compartilhada entre os 4. Evita risco de continuidade se alguém sair do time.
- **Convite é link fixo público** — não precisa ser controlado pelo onboarding da plataforma. A hierarquia de cargo já resolve o controle de acesso: quem entra pelo link sem ter criado conta/verificado personagem fica preso nos canais de entrada (regras, tags sociais), sem acesso a nada funcional — o convite em si não precisa ser o mecanismo de controle.
