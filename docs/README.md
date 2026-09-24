# Documentação — ProLobby

- [time/](time/README.md) — **guia de quem coda no projeto**: primeiro dia, fluxo de uma issue, regras que já pegaram bug e como trabalhar com IA (Claude Code ou Cursor). Comece por aqui se você acabou de entrar.

- [produto/](produto/README.md) — decisões de produto e o motivo de cada uma, por domínio (visão, jogador, partida, governança, escopo) + [parâmetros do sistema](produto/parametros.md).
- [discord/](discord/README.md) — estrutura do servidor Discord da comunidade (cargos, canais, permissões do bot).
- [requisitos/](requisitos/README.md) — o que o sistema precisa fazer: transversais, estados, modelo de dados, notificações e requisitos funcionais rastreáveis.
- [adr/](adr/README.md) — decisão técnica difícil de reverter: mecanismo de partida, log de evento, webhook, UTC, stack técnica (005/006, decidida em 2026-09-08 antes dos bloqueadores).
- [negocio/](negocio/README.md) — tese de mercado: oportunidade, concorrência, crescimento, risco.
- [research/](research/auditoria-2026-09-11.md) — auditorias do dossiê: [investigação de design (2026-09-04)](research/investigacao-design-2026-09-04.md) e [auditoria de fluxo (2026-09-11)](research/auditoria-2026-09-11.md), que mudou regra de comportamento (RF-074 a RF-080), não só texto. Também o [levantamento por fonte pública do checklist no jogo (2026-09-18)](research/fontes-checklist-jogo-2026-09-18.md) — pré-voo da #63, não resultado de teste — e as [fontes públicas de print de FC 27 (2026-09-18)](research/fontes-de-print-fc27-2026-09-18.md), pra coleta do piloto de OCR. E a [investigação da API de partida de Clubs da EA (2026-09-21)](research/api-clubs-ea-2026-09-21.md) — fechou o caminho alternativo da RF-066: o endpoint existe, mas os termos da EA proíbem acesso automatizado e a resposta não distingue jogador de IA. E a [busca pela aba Home do Virtual Pro em FC 27 (2026-09-24)](research/fc27-virtual-pro-tela-home.md), da #164: nenhuma fonte pública diz se ela mostra gamertag ou overall.
