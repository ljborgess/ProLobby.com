# Requisitos funcionais

Lista numerada e rastreável. Formato e regras em [README](README.md).

**Status: em construção.** Este arquivo cresce a cada rodada de levantamento. A numeração é estável — **RF nunca é renumerado nem reaproveitado**; requisito derrubado fica marcado como revogado, com o motivo, porque saber o que foi descartado vale tanto quanto saber o que vale.

Cobertura por área, pra saber onde ainda não se olhou:

| Área | Estado |
|---|---|
| Conta e autenticação | não levantado |
| Personagem e verificação | não levantado |
| Fila e matchmaking | **levantado** |
| Lobby | não levantado |
| Resultado e disputa | **parcial** — contestação levantada |
| Perfil, ranking e descoberta | **levantado** |
| Moderação | não levantado |
| Notificação | coberto por [04-notificacoes.md](04-notificacoes.md) |

---

## Fila e matchmaking

### RF-001 · Uma fila ativa por conta
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: conta com entrada de fila ativa recebe recusa ao tentar entrar de novo, com qualquer personagem. Sair da fila libera imediatamente.

### RF-002 · Entrada na fila exige e-mail verificado, personagem verificado e Discord vinculado
**Origem**: [produto/05-produto/01-onboarding.md](../produto/05-produto/01-onboarding.md), [produto/03-partida/03-lobby.md](../produto/03-partida/03-lobby.md)

**Aceite**: faltando qualquer uma das três, a entrada é recusada e a mensagem diz **qual** falta. Conta suspensa, banida, ou fora do servidor Discord também é recusada, com o motivo próprio.

### RF-003 · Banda de elo abre com o tempo
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: busca começa em ±150 do elo congelado na entrada, cresce +50 a cada 2 min, para em ±400 aos 10 min. O elo de referência não muda durante a busca, mesmo que outra partida da pessoa seja resolvida nesse meio.

### RF-004 · Lobby só fecha com simetria por categoria
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: para cada uma das 5 categorias, os dois lados têm o mesmo número de humanos. Excedente sem par na própria categoria permanece na fila.

### RF-005 · Lobby só fecha com piso de 4 humanos por lado
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: com 7 humanos compatíveis, nenhum lobby é criado. Com 8 e simetria satisfeita, é criado.

### RF-006 · Lobby só fecha com candidato a capitão em cada lado
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: se nenhum humano escalado de um dos lados tem clube declarado com vaga, o lobby não é criado e os jogadores seguem na fila.

### RF-007 · Timeout de fila avisa o que falta
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: aos 10 min sem atingir o piso, a pessoa recebe aviso nomeando a categoria sem par ou a ausência de candidato a capitão, com opção de continuar ou sair. Repete a cada 5 min enquanto ela continuar.

### RF-008 · Fila mostra faixa de movimento, nunca número exato
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: cada categoria exibe "pouca gente", "movimentada" ou "cheia". Em nenhuma tela ou resposta de API aparece a contagem de pessoas na fila.

### RF-009 · Recusar ou não confirmar gera timeout progressivo de fila
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: recusa explícita e estouro dos 30 s produzem o mesmo bloqueio — 5 min na 1ª ocorrência, 15 min na 2ª, 30 min na 3ª, 2 h da 4ª em diante. Durante o bloqueio, entrar na fila é recusado com o tempo restante na mensagem.

### RF-010 · Contador de timeout zera com 12 h limpas ou uma partida completada
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: após 12 h sem recusa, a próxima ocorrência volta a valer 5 min. Completar uma partida tem o mesmo efeito, imediatamente.

### RF-011 · Recusar não altera reputação
**Origem**: [produto/03-partida/02-fila.md](../produto/03-partida/02-fila.md)

**Aceite**: nenhuma recusa ou não-confirmação, em qualquer quantidade, gera evento de reputação. **Revoga o desenho anterior** de −3 na 3ª falta em 30 dias — o timeout substituiu.

---

## Resultado e disputa

### RF-012 · Qualquer humano da partida contesta, uma vez cada
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: participante de qualquer um dos dois lados abre contestação dentro das 48 h, inclusive alguém do lado que reportou. A segunda tentativa da mesma pessoa na mesma partida é recusada.

### RF-013 · Contestação abre disputa e volta a bloquear a fila
**Origem**: [produto/03-partida/04-resultado.md](../produto/03-partida/04-resultado.md)

**Aceite**: partida em `nao_confirmado` (fila livre) passa a `em_disputa` e as contas envolvidas voltam a ficar bloqueadas até a moderação resolver — ver [estados](02-estados.md).

---

## Perfil, ranking e descoberta

### RF-014 · Cinco rankings, um por categoria
**Origem**: [produto/02-jogador/03-perfil.md](../produto/02-jogador/03-perfil.md)

**Aceite**: não existe ranking geral combinando categorias. Cada ranking ordena por elo daquela categoria.

### RF-015 · Ranking lista top 50 ativos
**Origem**: [produto/02-jogador/03-perfil.md](../produto/02-jogador/03-perfil.md)

**Aceite**: no máximo 50 posições, e só personagens cuja conta tem partida completada nos últimos 30 dias. Quem passa de 30 dias sem jogar desaparece do ranking sem perder elo por isso (o decaimento é separado, ver RF-017).

### RF-016 · Perfil de terceiro não é pesquisável
**Origem**: [produto/02-jogador/03-perfil.md](../produto/02-jogador/03-perfil.md)

**Aceite**: não existe campo de busca por gamertag em nenhuma tela nem endpoint. Chega-se ao perfil por histórico de partida compartilhada, lobby ativo ou ranking. O perfil em si continua público pra quem chega por esses caminhos.

### RF-017 · Elo decai após 60 dias de inatividade, com piso no seed
**Origem**: [produto/02-jogador/02-ranking.md](../produto/02-jogador/02-ranking.md)

**Aceite**: personagem sem partida por 60 dias perde 25 de elo por mês subsequente, parando no valor do seed original. Jogar uma partida interrompe o decaimento; o elo perdido não é devolvido.

### RF-018 · Histórico de partida não expira
**Origem**: [produto/04-governanca/02-lgpd.md](../produto/04-governanca/02-lgpd.md)

**Aceite**: placar, elo aplicado e escalação de qualquer partida seguem consultáveis indefinidamente. Só a **imagem** do print é apagada aos 90 dias — o registro do envio (hash, confiança, idioma) sobrevive.
