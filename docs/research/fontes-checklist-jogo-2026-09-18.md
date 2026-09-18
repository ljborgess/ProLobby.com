# Levantamento por fonte pública — checklist no jogo (2026-09-18)

**O que é**: pré-voo do [checklist de teste no jogo](../produto/03-partida/05-checklist.md) ([#63](https://github.com/ljborgess/ProLobby.com/issues/63)), feito só com fonte pública, porque ninguém do time conseguiu rodar a sessão ainda.

**O que não é**: resultado de teste. **Nenhuma linha daqui vai pro `05-checklist.md` como confirmada** e nenhuma derruba ou promove premissa de [Mecânica](../produto/03-partida/01-mecanica.md). O critério de aceite da #63 pede medição em FC 27, e o FC 27 entrou em acesso antecipado hoje — fonte pública sobre Clubs dentro do hub "The Grounds" quase não existe.

**Serve pra**: encurtar a sessão no jogo. Sete dos oito testes continuam sem resposta em fonte; a sessão agora sabe onde gastar o tempo.

## Escala usada

| Nível | Significa |
|---|---|
| **Fonte EA** | Documentado pela EA (pitch notes). Ainda assim precisa confirmação se for FC 26. |
| **Fonte terceira** | Guia, site de comunidade ou fórum. Indício, não fato. |
| **Sem fonte** | Nada encontrado. Só o jogo responde. |

Tudo abaixo marcado como FC 26 **não vale pro produto** ([recado de 2026-09-16](../time/05-recados.md)): serve pra formular a pergunta, não pra responder.

## Resultado por teste

### 1 · Convite pra dentro do clube — **sem fonte** (no que importa)

O mecanismo de convidar quem não é membro existe e está documentado em guia de FC 26 (fonte terceira). **O que o teste mede — quanto tempo do convite até jogável — não aparece em fonte nenhuma.** Cronômetro na mão, na sessão.

### 2 · Saída do clube / cooldown — **fonte EA parcial, risco parece baixo**

Nenhuma fonte descreve cooldown pra sair de um clube e entrar em outro. Em FC 26 a EA documenta que dá pra manter **"up to three clubs at any time"** e trocar entre eles, e guia de comunidade descreve virar free agent como processo rápido. O cooldown que aparece em FC 26 é **outra coisa**: penalidade por abandonar partida no Ultimate Team (~15 min, número não confirmado pela EA).

**Achado que o dossiê não modela**: o limite de 3 clubes por conta. Se ele existir em FC 27, é restrição real na rotatividade da fila — um jogador frequente enche as 3 vagas e passa a precisar sair de clube antes de cada lobby novo, que é exatamente a fricção investigada pelo teste 2. Medir isso também.

### 3 · Amistoso Online entre 2 clubes — **fonte EA em FC 26, silêncio em FC 27** ⚠️

Em FC 26 a EA lista "Friendly matches" entre os formatos de Clubs. O fluxo, por fonte terceira: clube em League, escolher posição, `Settings → Match Type = Club Friendly`, dois jogadores por lado, convidar.

**O silêncio é o problema**: as pitch notes de FC 27 (deep dive de The Grounds e launch update) citam **League, Playoffs, Rush e Club Tournaments 11v11 — e não citam amistoso**. Não é evidência de que saiu; é evidência de que ninguém de fora confirmou que ficou. Como todo o fluxo de partida do produto é montado em cima do Amistoso Online, isto sobe pra **segunda prioridade da sessão**, atrás só do teste 6.

### 4 · Coordenação dos 2 capitães — **sem fonte**

Nada. Só o jogo.

### 5 · Tempo total do ciclo — **sem fonte**

Nada. É medição por natureza.

### 6 · Vaga com IA — **fonte EA, e ela é favorável** ✅

Melhor achado do levantamento. EA, Clubs Deep Dive de FC 26, texto exato:

> "a team of two human players minimum can proceed with AI teammates filling the open spots."

E o guia de Club Friendly (fonte terceira) fala em "two players per side", coerente com isso.

**Consequência**: o piso de 4 humanos por lado do dossiê tem folga grande — o piso do jogo em FC 26 seria 2. A solução de cold start e a meta de 8 na fila **não estão ameaçadas por esta evidência**, e o plano B do Rush (5v5) não precisa ser acionado por enquanto.

**O que esta citação não resolve** — e por isso o teste 6 continua o mais crítico:

- É **FC 26**, e The Grounds reescreveu Clubs.
- A redação é genérica de Clubs. **Não diz "em Amistoso especificamente"** — que é exatamente a dúvida original do checklist.
- **Alguém sair no meio da partida**: zero fonte.
- **Dono do clube anfitrião desconectar**: zero fonte.
- **Nome da IA na tela de fim de partida ser distinguível de gamertag humano**: zero fonte. É o que [RF-066](../requisitos/05-funcionais.md) precisa, e continua 100% descoberto.

### 7 · Virtual Pro: um só ou vários? — **fonte EA em FC 27, e o modelo de 5 sobrevive** ✅

A EA documenta, pra FC 27: todos os arquétipos **desbloqueados por padrão**, reset de arquétipo **sem custo** de Coins nem consumível, e ajuste de **atributo individual** em vez de resetar o build inteiro. Fonte terceira acrescenta dois pontos: **"one pro everywhere"** (o XP de qualquer canto de The Grounds alimenta o mesmo Virtual Pro, e o personagem que anda pelo hub é o mesmo que entra no 11v11) e **loadouts salváveis**, trocáveis dentro do jogo.

**Consequência**: é o cenário do meio que o checklist previu. Um Virtual Pro por conta, vários builds salvos dele. O modelo de "até 5 personagens" ([Personagens](../produto/02-jogador/01-verificacao.md)) não cai — vira **5 loadouts verificados do mesmo Pro**, como o próprio checklist já admitia.

**Confirmar no jogo**: loadout salvável é fonte terceira ("reported feature"), não EA. E o furo de segurança do checklist **continua inteiro**: reset grátis e ajuste fino barato significam que trocar de build é fácil, logo verificar um build e jogar com outro é fácil. Medir o tempo de troca; se for questão de segundos, o reforço por print de fim de partida (nota e posição de cada um) deixa de ser opcional.

### 8 · Unicidade de nome de clube — **sem fonte**

Zero fonte sobre duplicata de nome. O que existe em fórum de FC 26 é outro assunto: nome recusado por filtro de conteúdo e falha ao salvar. Teste barato, mantém na sessão.

## Achado fora do checklist: existe ecossistema de API de Clubs

Vários serviços de terceiro servem estatística de partida de Clubs por clube e por jogador (`proclubstracker.com`, `proclubshead.com`, `proclubstats.com`, além de apps de loja). Isso indica endpoint público ou semipúblico de partida da EA.

**Por que importa**: se esse endpoint devolver o roster da partida, [RF-066](../requisitos/05-funcionais.md) pode não precisar de OCR da tela final — e "IA é distinguível de humano na tela" deixa de ser o único caminho. Não muda nada hoje, mas vale uma issue de investigação antes da Fase 4.1. **Não confundir com o [piloto de OCR](https://github.com/ljborgess/ProLobby.com/issues/50)**, que é de cadastro (tela do Virtual Pro) e segue necessário.

## Ordem sugerida pra sessão no jogo

Por quanto de incerteza cada teste remove, não pela numeração:

1. **Teste 6, as sub-perguntas** — saída no meio, dono desconectando, nome da IA na tela final. O piso de humanos já tem apoio de fonte; o resto não tem nada e é o que trava RF-066.
2. **Teste 3** — Amistoso ainda existe em FC 27 e como se chama dentro de The Grounds. Se não existir, o resto do checklist muda de forma.
3. **Teste 8** — barato, isolado, zero fonte.
4. **Teste 2 + limite de 3 clubes** — cooldown e o achado novo.
5. **Teste 7** — confirmar loadout salvável e cronometrar a troca.
6. **Testes 1, 4 e 5** — cronômetro; saem juntos na mesma partida.

## Fontes

- [EA SPORTS FC 27 — The Grounds & Clubs Deep Dive (EA, pitch notes)](https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-the-grounds-deep-dive)
- [EA SPORTS FC 27 — Launch Update (EA, pitch notes)](https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-launch-update)
- [EA SPORTS FC 26 — Clubs Deep Dive (EA, pitch notes)](https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-clubs-deep-dive)
- [Is Pro Clubs Gone in FC 27? The Grounds Explained (Pro Clubs HQ)](https://proclubshq.com/blog/fc27-the-grounds-pro-clubs-explained/)
- [EA Reveals The Grounds and Clubs Changes for EA FC 27 (Operation Sports)](https://www.operationsports.com/ea-reveals-the-grounds-and-clubs-changes-for-ea-fc-27/)
- [EA FC 26: How to Invite Friends to Your Pro Club (Magic Game World)](https://www.magicgameworld.com/ea-fc-26-how-to-invite-friends-to-your-pro-club-in-clubs/)
- [EA FC 26: How to Leave a Club in Clubs Mode (Magic Game World)](https://www.magicgameworld.com/ea-fc-26-how-to-leave-a-club-in-clubs-mode/)
- [EA Sports FC 26 to Introduce Match Quit Penalties in Ultimate Team (Fenix Bazaar)](https://fenixbazaar.com/2025/07/24/ea-sports-fc-26-ultimate-team-quit-penalty/)
- [Pro Clubs Tracker](https://proclubstracker.com/) · [Pro Clubs Head](https://proclubshead.com/) · [Pro Clubs Stats](https://proclubstats.com/)
