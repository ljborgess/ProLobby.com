# Checklist de teste no jogo

**Status: pendente — ninguém do time rodou ainda.**

Este é o **bloqueador nº 1 do projeto**. Custa minutos e nenhum dinheiro, mas valida (ou derruba) o mecanismo em que todo o fluxo de partida está apoiado — ver [Mecânica real do EA FC Pro Clubs](01-mecanica.md).

Fazer isso **antes** de escrever código: gastar engenharia no fluxo de capitão/clube sem confirmar que ele funciona é o jeito mais caro de descobrir que precisa mudar.

## Preparo

- **Quem**: qualquer um dos 4. Não precisa de todos.
- **Contas**: 4 bastam (os sócios) — não precisa de 22 pessoas, o objetivo é validar o mecanismo, não simular lobby cheio.
- **Pré-requisito**: 2 clubes existentes (os times pessoais dos sócios servem, ou clubes criados na hora).

## Os 7 testes

### 1 · Convite pra dentro do clube
Dono/gerente do Clube A convida uma conta que **não** é membro (por EA ID/gamertag/PSN, sem ela ter aplicado antes).

**Medir**: quanto tempo do convite até a pessoa estar jogável no clube.

### 2 · Saída do clube
A pessoa convidada sai (ou é removida pelo capitão).

**Confirmar**: sai limpo, **sem cooldown** pra entrar em outro clube depois.
**Por que importa**: se houver cooldown de saída, o jogador convidado fica impedido de participar de outro lobby logo em seguida — quebra a rotatividade da fila.

### 3 · Amistoso Online entre os 2 clubes
Com os times minimamente povoados (não precisa 11), dispara um Amistoso do Clube A contra o Clube B.

**Confirmar**: dá pra marcar/iniciar em poucos minutos, ou tem fricção (agendamento, aprovação do outro lado)?

### 4 · Coordenação dos 2 capitães
Cada capitão loga na própria conta normalmente (sem alternância de perfil — é o clube pessoal de cada um, não conta de serviço compartilhada).

**Confirmar**: os dois conseguem se encontrar e aceitar o Amistoso em tempo hábil.

### 5 · Tempo total do ciclo
Soma dos passos 1 + 3 + 4: do convite até a bola rolar.

**Comparar** com a janela de confirmação já definida (30s pra aceitar + tempo de entrar na call — ver [Fila](02-fila.md) e [Lobby](03-lobby.md)). Se o ciclo do clube for mais lento que a paciência de um lobby cheio esperando, o mecanismo não serve como está.

### 6 · Vaga com IA — **o teste mais crítico de todos**
Confirmar que a IA cobre vaga vazia **em Amistoso Online especificamente** (a documentação pública fala quase só de Liga/Drop-In), e **com quantas vagas vazias o jogo ainda aceita iniciar** a partida.

**Por que é o mais crítico**: todo o modelo de fila depende disso. Se o Amistoso exigir os 11 humanos, o piso de 4 por lado não funciona e a meta de fila volta de 8 pra 22 pessoas — o que derruba a solução de cold start inteira (ver [tese de mercado](../../negocio/01-mercado.md)).

**Testar também**: alguém sai no meio da partida — a IA assume a posição e o jogo continua, ou a partida quebra? Presumido que assume (mesma mecânica), sem confirmação em fonte (ver [Resultado](04-resultado.md)).

### 7 · Unicidade de nome de clube
Criar clube com nome comum (ex.: "Real Madrid"), tentar criar um segundo com o mesmo nome exato.

**Se aceitar os dois**: buscar esse nome na tela de Amistoso — aparece lista com vários resultados (capitão escolhe visualmente por brasão/membros), ou só o primeiro?
**Decide**: se a validação de nome de clube no OCR ([Resultado](04-resultado.md)) precisa de reforço — ex.: capitão confirmar visualmente o clube certo antes do amistoso, camada humana além do texto.

## O que fazer com o resultado

| Resultado do teste | Consequência |
|---|---|
| Convite/saída rápidos (minutos), sem cooldown, Amistoso inicia sem fricção | Mecanismo viável como desenhado — seguir pra decisão de stack |
| Cooldown de saída significativo, ou convite/Amistoso com fricção grande | Revisar o desenho: prazo maior na janela de confirmação, ou repensar o mecanismo |
| **Teste 6 falha** (Amistoso exige os 11 humanos) | Grave — cai o piso de 8, cai a solução de cold start. Avaliar **Rush (5v5)** como plano B, que precisa de menos gente por desenho |
| Teste 7 mostra nome de clube ambíguo | Reforçar validação com confirmação visual do capitão |

Depois de rodar: anotar os resultados aqui mesmo, e atualizar [Mecânica](01-mecanica.md) trocando as premissas presumidas pelo que foi confirmado.
