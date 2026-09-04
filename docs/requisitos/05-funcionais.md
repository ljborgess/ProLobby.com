# Requisitos funcionais

Lista numerada e rastreável. Formato e regras em [README](README.md).

**Status: em construção.** Este arquivo cresce a cada rodada de levantamento. A numeração é estável — **RF nunca é renumerado nem reaproveitado**; requisito derrubado fica marcado como revogado, com o motivo, porque saber o que foi descartado vale tanto quanto saber o que vale.

Cobertura por área, pra saber onde ainda não se olhou:

| Área | Estado |
|---|---|
| Conta e autenticação | não levantado |
| Personagem e verificação | não levantado |
| Fila e matchmaking | **em levantamento** |
| Lobby | não levantado |
| Resultado e disputa | não levantado |
| Perfil, ranking e descoberta | não levantado |
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
