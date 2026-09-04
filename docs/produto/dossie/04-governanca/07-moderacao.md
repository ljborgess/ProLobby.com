# 7. Moderação

**Fase: MVP** (moderação interna) · **Futuro** (moderador comunitário)

## Quem modera

- Fase 1 (MVP): moderação feita pelos 4 (Luciano, Rafael, João, Felipe), com painel simples de fila de casos pendentes. Requisitos de segurança do painel (2FA obrigatório pros 4, log de auditoria de toda ação de moderador) documentados em [Dados pessoais e LGPD](09-dados-pessoais-lgpd.md#requisitos-de-segurança-independentes-de-stack) — o painel é o alvo de maior risco se comprometido (poder de kick/ban/editar disputa).
- **Conflito de interesse**: sem regra formal de impedimento — se um caso envolve diretamente um dos 4 (jogou a partida em disputa, ou é a pessoa denunciada), decidem em conjunto mesmo assim. Aposta no bom senso do grupo pequeno de alta confiança mútua; sem salvaguarda formal caso vire ponto de contestação por outro usuário — revisitar se acontecer.

## Casos que caem em moderação

- Disputa de placar (prints divergentes entre os dois lados)
- Exceção de OCR (falha repetida no reconhecimento do print)
- Denúncia (fraude, desconexão contestada, comportamento)
- Apelação de punição (ver [Ranking, reputação e punição](../02-jogador/06-ranking-reputacao-e-punicao.md))
- Abuso de capitão (recusa convidar sem motivo, remove alguém no meio da formação, trava a limpeza pós-jogo — ver [Mecânica real do EA FC Pro Clubs](../03-partida/00-mecanica-pro-clubs.md))
- Retry de webhook plataforma↔bot esgotado (ver [Integração técnica](../../../discord/04-integracao-tecnica.md))

## Meta de tempo de resposta

- **Disputa de placar e exceção de OCR**: meta de **24 horas** pra primeira resposta (não necessariamente resolução final) — reporter bloqueado de fila enquanto isso, então prioridade alta.
- **Denúncia e apelação de punição**: meta de **48 horas**.
- Meta, não garantia contratual — com só 4 moderadores part-time, serve pra time saber quando um caso já passou do esperado e virar prioridade, não pra prometer SLA externo.

## Escala futura

- Papel de moderador comunitário (voluntário/eleito, painel próprio) só entra quando o volume de casos passar da capacidade dos 4 — decisão deliberadamente adiada, não faz sentido desenhar pra um volume ainda desconhecido.
