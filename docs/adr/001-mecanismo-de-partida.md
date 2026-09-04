# ADR-001 · Amistoso Online entre clubes pessoais de capitães

**Status**: aceita — pendente de confirmação em campo ([checklist](../produto/03-partida/05-checklist.md))
**Data**: 2026-09-04 (decisão tomada antes, registrada aqui retroativamente)

## Contexto

O produto precisa transformar uma fila de indivíduos numa partida 11v11 de Pro Clubs. O desenho original assumia que um jogador criava uma sala privada e convidava os outros 21.

Pesquisa em fontes públicas mostrou que **esse mecanismo não existe**. EA FC Pro Clubs oferece exatamente três formas de jogar 11v11:

1. **Liga/divisão** — matchmaking da EA acha outro clube inteiro, não indivíduos.
2. **Drop-In** — fila pública da própria EA, que sorteia posição e lado; ninguém de fora controla pareamento.
3. **Amistoso Online** — convida-se um clube específico por EA ID. Sempre clube contra clube.

Não há API pública da EA, então a plataforma não consegue criar nem consultar partida. E clube é entidade **persistente**, não algo criado por partida.

## Decisão

Cada lado do lobby usa o **clube pessoal de um dos próprios jogadores humanos daquele lado** — o **capitão** — escolhido por maior reputação entre quem declarou clube com vaga. Os dois capitães coordenam um Amistoso Online entre seus clubes.

## Alternativas descartadas

**Clubes-casa fixos administrados pelos 4 sócios.** Era o desenho anterior. Caiu porque criava **gargalo serial**: um par de clubes atende um lobby por vez, e os sócios precisariam estar presentes em toda partida. Com clube de jogador, múltiplos lobbies rodam em paralelo sem esperar recurso liberar.

**Drop-In como mecanismo.** Caiu porque destrói a premissa do produto: a EA sorteia posição e adversário, então não há matchmaking por elo nem por categoria — sobraria uma plataforma que não decide nada.

**Liga/divisão.** Exige clube inteiro pré-formado enfrentando outro, o que é o oposto de fila individual.

**Conta de serviço da plataforma como dona dos clubes.** Mais confiável que jogador comum, mas concentra a operação em credencial compartilhada e reintroduz o gargalo serial.

## Consequências

- **A plataforma nunca executa a partida**, só coordena. Toda ação dentro do jogo é manual, feita pelo capitão humano — o que também mantém o produto longe da proibição de acesso automatizado nos [Termos da EA](../produto/03-partida/01-mecanica.md).
- **Surge um papel com poder real dentro do jogo**: o capitão convida, escala e remove. Isso abriu uma classe de abuso que não existia com conta de serviço, tratada por confirmação de convite recebido e caso de abuso de capitão.
- **A validação de resultado passa a ser dinâmica**: o par de clubes muda a cada lobby, então o OCR compara contra o par capturado na escolha dos capitães, não contra lista fixa.
- **Candidato a capitão vira recurso escasso**, e virou critério de fechamento de lobby ([RF-006](../requisitos/05-funcionais.md)).
- **"Clube com vaga" não é "clube sem outros humanos"** — consequência descoberta só na revisão adversarial, e a razão de existir a validação de roster ([RF-066](../requisitos/05-funcionais.md)).
- Continua **pendente de teste em campo**. Tempo de convite, cooldown de saída e fricção do Amistoso são premissas, não fatos.
