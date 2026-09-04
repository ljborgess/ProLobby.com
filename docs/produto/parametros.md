# Parâmetros do sistema

Todos os números do produto num lugar só. **Este arquivo não decide nada** — cada valor é decidido e justificado no arquivo linkado; aqui é só consolidação, pra quem for implementar não precisar caçar em 8 arquivos e pra evitar que dois lugares divirjam.

> Se um número mudar, mudar aqui **e** no arquivo de origem.

## Elo

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Baseline | 1000 | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| Seed por overall — piso | overall 50 → elo ~600 | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| Seed por overall — teto | overall 99 → elo ~1400 | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| Decaimento do seed | 12,5 pontos percentuais por partida (100% → 0% na 9ª) | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| K-factor — calibrando | 32 (primeiras 9 partidas na categoria) | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| K-factor — estabilizado | 20 (a partir da 10ª) | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| Granularidade | por personagem/categoria (não por conta) | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |

## Reputação

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Escala | 0–100 | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| Valor inicial | 70 | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| Limiar — prioridade pior na fila | abaixo de 55 | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| Limiar — suspensão (7 dias) | abaixo de 40 | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| Limiar — banimento permanente | abaixo de 25 | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| Granularidade | por conta (não por personagem) | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |

### Eventos que alteram reputação

| Evento | Efeito | Onde é decidido |
|---|---|---|
| Joinha de companheiro | +1, direto | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |
| Não confirmar lobby (3ª vez em 30 dias) | −3 | [Fila](03-partida/02-fila-e-matchmaking.md) |
| Zero-report (3ª vez em 30 dias) | −3 | [Resultado](03-partida/04-resultado-de-partida.md) |
| Desconexão/rage quit confirmado | −8 | [Resultado](03-partida/04-resultado-de-partida.md) |
| Não-joinha (report de companheiro) | 0 direto — acumula, 5 em 30 dias (pessoas/partidas diferentes) abre caso de moderação | [Ranking](02-jogador/02-ranking-reputacao-e-punicao.md) |

## Fila e lobby

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Forma do time | 1 GK + 4 zaga/lateral + 2 meio + 2 ponta + 2 ataque = 11 | [Fila](03-partida/02-fila-e-matchmaking.md) |
| Mínimo de humanos por lado | 4 (8 no total) | [Fila](03-partida/02-fila-e-matchmaking.md) |
| Máximo de humanos por lado | 11 | [Fila](03-partida/02-fila-e-matchmaking.md) |
| Simetria entre os lados | obrigatória (mesmo nº de humanos) | [Fila](03-partida/02-fila-e-matchmaking.md) |
| Vagas restantes | preenchidas pela IA do próprio jogo | [Mecânica](03-partida/01-mecanica-pro-clubs.md) |
| Banda de elo inicial | ±150 por categoria | [Fila](03-partida/02-fila-e-matchmaking.md) |
| Expansão da banda | +50 a cada 2 min, desde o início | [Fila](03-partida/02-fila-e-matchmaking.md) |
| Teto da banda | ±400 (atingido aos 10 min) | [Fila](03-partida/02-fila-e-matchmaking.md) |
| Timeout de fila | 10 min (aviso repete a cada 5 min) | [Fila](03-partida/02-fila-e-matchmaking.md) |
| Janela de confirmação do jogador | 30 s | [Fila](03-partida/02-fila-e-matchmaking.md) |
| Janela de confirmação do capitão | 30 s (separada, após a dos jogadores) | [Discord e lobby](03-partida/03-discord-e-lobby.md) |
| Filas simultâneas por conta | 1 | [Fila](03-partida/02-fila-e-matchmaking.md) |
| Canais temporários por lobby | 3 (2 voz por time + 1 texto compartilhado) | [Discord e lobby](03-partida/03-discord-e-lobby.md) |

## Verificação e OCR

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Formatos aceitos | JPG, PNG, WEBP | [Personagens](02-jogador/01-personagens-e-verificacao.md) |
| Tamanho máximo do arquivo | 10 MB | [Personagens](02-jogador/01-personagens-e-verificacao.md) |
| Confiança mínima do OCR | 85% | [Personagens](02-jogador/01-personagens-e-verificacao.md) |
| Falhas seguidas → moderação | 3 (mesmo personagem, mesmo dia) | [Personagens](02-jogador/01-personagens-e-verificacao.md) |
| Cooldown entre atualizações aceitas | 24 h | [Personagens](02-jogador/01-personagens-e-verificacao.md) |
| Personagens por conta | até 5 (1 por categoria) | [Personagens](02-jogador/01-personagens-e-verificacao.md) |
| Nome de clube — limite | 20 caracteres | [Personagens](02-jogador/01-personagens-e-verificacao.md) |
| Anti-reuso de print | hash do arquivo | [Resultado](03-partida/04-resultado-de-partida.md) |

## Resultado de partida

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Piso de tempo mínimo pra reportar | 5 min após lobby fechar | [Resultado](03-partida/04-resultado-de-partida.md) |
| Janela de report normal | 15 min | [Resultado](03-partida/04-resultado-de-partida.md) |
| Distância máxima entre timestamps dos 2 lados | 10 min | [Resultado](03-partida/04-resultado-de-partida.md) |
| Placar válido | inteiro, 0–20 por lado | [Resultado](03-partida/04-resultado-de-partida.md) |
| Janela de contestação | 48 h | [Resultado](03-partida/04-resultado-de-partida.md) |
| Expiração por zero-report | 36 h | [Resultado](03-partida/04-resultado-de-partida.md) |
| Assinatura do bug de perda de controle | nota individual 0.0 | [Resultado](03-partida/04-resultado-de-partida.md) |

## Conta e governança

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Idade mínima | 16 anos (data de nascimento no cadastro) | [Termos](04-governanca/03-termos-de-uso-e-idade.md) |
| Validade do link de redefinição de senha | 30 min | [Onboarding](05-produto/01-onboarding.md) |
| Retenção de prints | 90 dias (limpeza diária automática) | [LGPD](04-governanca/02-dados-pessoais-lgpd.md) |
| Meta de resposta — disputa e OCR | 24 h | [Moderação](04-governanca/01-moderacao.md) |
| Meta de resposta — denúncia e apelação | 48 h | [Moderação](04-governanca/01-moderacao.md) |
| Idiomas | português e espanhol | [Escopo](05-produto/02-escopo-plataforma-jogo-regiao.md) |

## Integração com o bot

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Timeout de resposta do bot | 10 s | [Integração técnica](../discord/04-integracao-tecnica.md) |
| Tentativas de reenvio | 3 (10s, 20s, 40s) | [Integração técnica](../discord/04-integracao-tecnica.md) |
| Retry esgotado | vira caso de moderação | [Integração técnica](../discord/04-integracao-tecnica.md) |
