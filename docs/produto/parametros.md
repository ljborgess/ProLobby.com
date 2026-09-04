# Parâmetros do sistema

Todos os números do produto num lugar só. **Este arquivo não decide nada** — cada valor é decidido e justificado no arquivo linkado; aqui é só consolidação, pra quem for implementar não precisar caçar em 8 arquivos e pra evitar que dois lugares divirjam.

> Se um número mudar, mudar aqui **e** no arquivo de origem.

## Elo

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Baseline | 1000 | [Ranking](02-jogador/02-ranking.md) |
| Seed por overall — piso | overall 50 → elo ~600 | [Ranking](02-jogador/02-ranking.md) |
| Seed por overall — teto | overall 99 → elo ~1400 | [Ranking](02-jogador/02-ranking.md) |
| Decaimento do seed | 12,5 pontos percentuais por partida (100% → 0% na 9ª) | [Ranking](02-jogador/02-ranking.md) |
| K-factor — calibrando | 32 (primeiras 9 partidas na categoria) | [Ranking](02-jogador/02-ranking.md) |
| K-factor — estabilizado | 20 (a partir da 10ª) | [Ranking](02-jogador/02-ranking.md) |
| Granularidade | por personagem/categoria (não por conta) | [Ranking](02-jogador/02-ranking.md) |

## Reputação

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Escala | 0–100 | [Ranking](02-jogador/02-ranking.md) |
| Valor inicial | 70 | [Ranking](02-jogador/02-ranking.md) |
| Limiar — prioridade pior na fila | abaixo de 55 | [Ranking](02-jogador/02-ranking.md) |
| Limiar — suspensão (7 dias) | abaixo de 40 | [Ranking](02-jogador/02-ranking.md) |
| Limiar — banimento permanente | abaixo de 25 | [Ranking](02-jogador/02-ranking.md) |
| Granularidade | por conta (não por personagem) | [Ranking](02-jogador/02-ranking.md) |

### Eventos que alteram reputação

| Evento | Efeito | Onde é decidido |
|---|---|---|
| Partida limpa (sem incidente) | +1, teto em 70 | [Ranking](02-jogador/02-ranking.md) |
| Joinha de companheiro | +1, direto (único caminho acima de 70) | [Ranking](02-jogador/02-ranking.md) |
| Não confirmar lobby (3ª vez em 30 dias) | −3 | [Fila](03-partida/02-fila.md) |
| Zero-report (3ª vez em 30 dias) | −3 | [Resultado](03-partida/04-resultado.md) |
| Desconexão/rage quit confirmado | −8 | [Resultado](03-partida/04-resultado.md) |
| Não-joinha (report de companheiro) | 0 direto — acumula, 5 em 30 dias (pessoas/partidas diferentes) abre caso de moderação | [Ranking](02-jogador/02-ranking.md) |

## Fila e lobby

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Forma do time | 1 GK + 4 zaga/lateral + 2 meio + 2 ponta + 2 ataque = 11 | [Fila](03-partida/02-fila.md) |
| Mínimo de humanos por lado | 4 (8 no total) | [Fila](03-partida/02-fila.md) |
| Máximo de humanos por lado | 11 | [Fila](03-partida/02-fila.md) |
| Simetria entre os lados | obrigatória **por categoria** (não só pelo total) | [Fila](03-partida/02-fila.md) |
| Candidatos a capitão pra fechar lobby | ao menos 1 por lado (clube declarado com vaga) | [Fila](03-partida/02-fila.md) |
| Vagas restantes | preenchidas pela IA do próprio jogo | [Mecânica](03-partida/01-mecanica.md) |
| Banda de elo inicial | ±150 por categoria | [Fila](03-partida/02-fila.md) |
| Expansão da banda | +50 a cada 2 min, desde o início | [Fila](03-partida/02-fila.md) |
| Teto da banda | ±400 (atingido aos 10 min) | [Fila](03-partida/02-fila.md) |
| Timeout de fila | 10 min (aviso repete a cada 5 min) | [Fila](03-partida/02-fila.md) |
| Janela de confirmação do jogador | 30 s | [Fila](03-partida/02-fila.md) |
| Janela de confirmação do capitão | 30 s (separada, após a dos jogadores) | [Discord e lobby](03-partida/03-lobby.md) |
| Janela de confirmação de convite recebido | 5 min após o lobby fechar | [Discord e lobby](03-partida/03-lobby.md) |
| Cancelamento por silêncio total | 60 min após o lobby fechar (a calibrar com o teste 5) | [Discord e lobby](03-partida/03-lobby.md) |
| Prazo de votação de formação | 60 s | [Fila](03-partida/02-fila.md) |
| Contas da plataforma por Discord ID | 1 (exclusivo) | [Discord e lobby](03-partida/03-lobby.md) |
| Validade de reivindicação de gamertag não verificada | 7 dias | [Personagens](02-jogador/01-verificacao.md) |
| Filas simultâneas por conta | 1 | [Fila](03-partida/02-fila.md) |
| Canais temporários por lobby | 3 (2 voz por time + 1 texto compartilhado) | [Discord e lobby](03-partida/03-lobby.md) |

## Verificação e OCR

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Formatos aceitos | JPG, PNG, WEBP | [Personagens](02-jogador/01-verificacao.md) |
| Tamanho máximo do arquivo | 10 MB | [Personagens](02-jogador/01-verificacao.md) |
| Confiança mínima do OCR | 85% | [Personagens](02-jogador/01-verificacao.md) |
| Falhas seguidas → moderação | 3 (mesmo personagem, mesmo dia) | [Personagens](02-jogador/01-verificacao.md) |
| Cooldown entre atualizações aceitas | 24 h | [Personagens](02-jogador/01-verificacao.md) |
| Personagens por conta | até 5 (1 por categoria) | [Personagens](02-jogador/01-verificacao.md) |
| Nome de clube — limite | 20 caracteres | [Personagens](02-jogador/01-verificacao.md) |
| Anti-reuso de print | hash do arquivo | [Resultado](03-partida/04-resultado.md) |

## Resultado de partida

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Piso de tempo mínimo pra reportar | 5 min após lobby fechar | [Resultado](03-partida/04-resultado.md) |
| Janela de report do 2º lado | 15 min a partir do 1º print aceito | [Resultado](03-partida/04-resultado.md) |
| Placar válido | inteiro, 0–20 por lado | [Resultado](03-partida/04-resultado.md) |
| Janela de contestação | 48 h | [Resultado](03-partida/04-resultado.md) |
| Expiração por zero-report (partida que aconteceu) | 36 h | [Resultado](03-partida/04-resultado.md) |
| Assinatura do bug de perda de controle | nota individual 0.0 | [Resultado](03-partida/04-resultado.md) |

## Conta e governança

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Idade mínima | 16 anos (data de nascimento no cadastro) | [Termos](04-governanca/03-termos.md) |
| Validade do link de redefinição de senha | 30 min | [Onboarding](05-produto/01-onboarding.md) |
| Retenção de prints | 90 dias (limpeza diária automática) | [LGPD](04-governanca/02-lgpd.md) |
| Retenção de comprovante de pagamento | nenhuma — descartado na confirmação | [LGPD](04-governanca/02-lgpd.md) |
| Retenção de registro fiscal de transação | 5 anos (exceção à exclusão de conta) | [LGPD](04-governanca/02-lgpd.md) |
| Meta de resposta — disputa e OCR | 24 h | [Moderação](04-governanca/01-moderacao.md) |
| Meta de resposta — denúncia e apelação | 48 h | [Moderação](04-governanca/01-moderacao.md) |
| Idiomas da interface | português e espanhol | [Escopo](05-produto/02-escopo.md) |
| Idiomas que o OCR reconhece | português, espanhol e inglês (detecção automática) | [Personagens](02-jogador/01-verificacao.md) |
| Fuso dos prazos e contadores | UTC interno, local na tela | [Requisitos transversais](06-requisitos/01-transversais.md) |
| Contadores de "30 dias" | janela móvel, não mês do calendário | [Requisitos transversais](06-requisitos/01-transversais.md) |
| Definição de conta ativa | 1+ partida completada nos últimos 30 dias | [Requisitos transversais](06-requisitos/01-transversais.md) |
| Alvo de processamento do OCR | menos de 15 s, com progresso | [Requisitos transversais](06-requisitos/01-transversais.md) |

## Sustentabilidade

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Custo mensal do MVP | R$ 50–90 (≈R$ 3 em free tier) | [Sustentabilidade](../negocio/03-sustentabilidade.md) |
| Fundador — preço | R$ 49, pagamento único | [Sustentabilidade](../negocio/03-sustentabilidade.md) |
| Fundador — janela | 30 dias ou 50 pessoas (o que vier primeiro) | [Sustentabilidade](../negocio/03-sustentabilidade.md) |
| Fundador — pré-venda | última semana do beta, aos ~24 convidados, preço cheio | [Lançamento](../negocio/04-lancamento.md) |
| Apoiador — mensalidade | R$ 9,90 | [Sustentabilidade](../negocio/03-sustentabilidade.md) |
| Torneio — inscrição | R$ 10 por pessoa (adiado, fora do lançamento) | [Sustentabilidade](../negocio/03-sustentabilidade.md) |
| Torneio — divisão | 70% premiação / 30% plataforma | [Sustentabilidade](../negocio/03-sustentabilidade.md) |
| Gatilho de assinatura recorrente | 300 contas ativas (≈700 se a entidade legal for ME, não MEI), ou custo estourar o free tier | [Sustentabilidade](../negocio/03-sustentabilidade.md) |
| Reembolso | nenhum (enquadrado como apoio; banimento revoga cargo sem devolver) | [Termos](04-governanca/03-termos.md) |

## Integração com o bot

| Parâmetro | Valor | Onde é decidido |
|---|---|---|
| Timeout de resposta do bot | 10 s | [Integração técnica](../discord/04-integracao.md) |
| Tentativas de reenvio | 3 (10s, 20s, 40s) | [Integração técnica](../discord/04-integracao.md) |
| Retry esgotado | vira caso de moderação | [Integração técnica](../discord/04-integracao.md) |
| Deleção de canal — call vazia por | 10 min | [Canais](../discord/02-canais.md) |
| Deleção de canal — piso | 15 min após lobby fechar | [Canais](../discord/02-canais.md) |
| Deleção de canal — teto | 3 h após lobby fechar | [Canais](../discord/02-canais.md) |
| Faxina de canal órfão | de hora em hora | [Canais](../discord/02-canais.md) |
| Alerta de limite de canais | acima de 400 (teto do Discord: 500) | [Canais](../discord/02-canais.md) |
