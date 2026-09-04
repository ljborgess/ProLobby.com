# Tese de mercado — ProLobby

**Uso interno dos 4 (Luciano, Rafael, João, Felipe)** — documento de decisão, não pitch. Tom direto, expõe fraqueza sem medo.

## A dor real

Pro Clubs hoje só tem 3 jeitos de jogar 11v11 (ver [mecânica real do jogo](../produto/03-partida/01-mecanica.md)): liga entre clubes já formados, Drop-In (fila pública da própria EA — pareamento aleatório, sem controle de qualidade, sem identidade verificada, sem prestação de conta de comportamento), ou Amistoso marcado manualmente entre dois clubes que já se conhecem. Não existe "pegar 22 estranhos, equilibrar por elo de verdade, e jogar uma partida séria" — é exatamente esse buraco que o ProLobby preenche.

Comunidade BR de Pro Clubs é ativa (servidores Discord, grupos, criadores de conteúdo) mas desorganizada — sem ferramenta que padronize matchmaking justo com identidade real por trás.

## Panorama competitivo (pesquisado, não achado por achismo)

Existe concorrência — não é campo vazio:

- **Pro Clubs Hub** / **Pro Clubs Finder** — descoberta e recrutamento de clube (achar time pra entrar, achar jogador pra reforçar clube). Resolve um problema diferente: "onde encontro um clube", não "quero jogar uma partida balanceada agora".
- **Servidores Discord com bot Disporty** — copas e torneios organizados, stat tracking, reputação de time. Foco em competição estruturada (bracket, temporada), não pickup casual sob demanda.
- **Bots genéricos de elo pra Discord** (Team Up, Elo Ranking) — sistema de rating desacoplado do jogo, sem verificação de identidade, sem integração real com Pro Clubs.

**Diferencial real do ProLobby**: fila individual → matchmaking automático por elo/categoria → identidade verificada por print+OCR (não auto-declarada) → reputação com consequência real (escada de punição). Nenhum concorrente encontrado faz essa combinação específica. Isso não significa ausência de risco competitivo — significa que o nicho exato ainda tá aberto.

## Caminho de crescimento

Três frentes, não mutuamente exclusivas:

1. **Orgânico via comunidade** — boca a boca dentro dos servidores/grupos de Pro Clubs BR já existentes. Sem custo de aquisição, crescimento lento, depende de quem já usa recomendar.
2. **Parceria com criador de conteúdo/streamer** de Pro Clubs BR — acelera adoção, mas depende de relação externa (e possivelmente custo de patrocínio). Vale explorar quando a plataforma já tiver uso real pra mostrar, não antes.
3. **Expansão de região** — já desenhado como aditivo no dossiê ([escopo](../produto/05-produto/02-escopo.md)), sem travar arquitetura. Fica pra quando BR/América do Sul já estiver validado.

## Métricas de sucesso do MVP

Como saber se funcionou, sem esperar "sentir no feeling":

1. **Partidas completadas por semana** — sinal básico de uso real (não só cadastro, partida de verdade acontecendo).
2. **% de resultado confirmado sem disputa** — sinal de que o fluxo de OCR/report funciona sem fricção (muita disputa = fluxo ruim ou fraude, não só "gente brigando").
3. **Retenção simples**: % de jogador que voltou pra fila numa segunda partida — sinal de que valeu a pena, não só experimentou uma vez e sumiu.

Sem dashboard sofisticado — só acordo prévio do que conta como "funcionou", pra não decidir depois olhando pro número que dá na telha.

### Meta numérica — proposta, a confirmar entre os 4

Métrica sem número não decide nada: "partidas por semana" sem um valor-alvo é exatamente o "olhar pro número que dá na telha" que o parágrafo acima quis evitar. Proposta de corte, medida **90 dias depois do primeiro usuário externo**:

| Métrica | Funcionou | Ambíguo | Não funcionou |
|---|---|---|---|
| Partidas completadas por semana | 10+ | 3 a 9 | menos de 3 |
| Resultado confirmado sem disputa | 85%+ | 70% a 84% | abaixo de 70% |
| Voltou pra uma 2ª partida | 40%+ | 25% a 39% | abaixo de 25% |

Racional dos números: 10 partidas/semana significa a fila fechando quase todo dia — o mínimo pra alguém entrar e encontrar gente. Abaixo de 3, a plataforma está tecnicamente viva e socialmente morta. 40% de retenção é padrão de produto de comunidade que pegou; abaixo de 25% quer dizer que a partida em si decepcionou, e o problema não é aquisição.

### Critério de desistir

O que nenhum documento tinha: **quando parar**. Sem isso, projeto sem tração não morre — só consome tempo indefinidamente.

- **Zona "não funcionou" nas 3 métricas aos 90 dias, com o teste no jogo já aprovado e o produto completo no ar**: o desenho não é o problema, a demanda é. Parar, ou reduzir a um servidor Discord de organização manual (que custa zero e mantém a comunidade).
- **Zona ambígua**: mais 90 dias, com uma frente de crescimento ativa (parceria com criador de conteúdo) — não mais que isso sem revisão.
- Decisão é dos 4 em conjunto, mas com o critério escrito **antes** de haver apego ao que foi construído.

## Entidade legal — pendência

Termos de Uso ([03-termos.md](../produto/04-governanca/03-termos.md)) precisam existir antes do primeiro usuário externo — mas **não existe CNPJ/MEI formado ainda**. Não bloqueia MVP gratuito com poucos usuários de teste, mas é pré-requisito real antes de: (a) o próprio ToS ter peso jurídico de verdade, (b) qualquer monetização futura (assinatura/prioridade/cosmético — já adiada no [backlog](../produto/05-produto/03-backlog.md)), já que pagamento exige CNPJ. Registrado aqui como pendência, não decisão tomada.

## Cold start — o risco de produto mais subestimado

Uma partida 11v11 completa exigiria 22 pessoas simultâneas na fila com a distribuição certa de categoria — inviável numa base nova, mesmo com centenas de cadastrados. Fila que não fecha vira boca-a-boca negativo ("entrei lá, não tinha ninguém").

**O que resolve de fato: a IA do próprio jogo preenche as vagas vazias.** Recurso padrão do modo Clubes (ver [mecânica real do jogo](../produto/03-partida/01-mecanica.md)) — o EA FC completa o time automaticamente quando o clube entra em partida sem os 11 humanos. Isso não é feature da plataforma nem gambiarra: é comportamento do jogo, e a plataforma só decide quando fechar o lobby.

Com isso, a meta de fila cai de 22 pra **8 pessoas** (piso de 4 humanos por lado, com simetria obrigatória entre os times — ver [Fila e matchmaking](../produto/03-partida/02-fila.md)). Diferença entre inviável e alcançável já na primeira semana.

**Complemento — plataforma completa, largada coordenada**:

- A plataforma **não tem limitação técnica nenhuma**: fila contínua, aberta 24/7 desde o dia 1, produto inteiro funcionando como desenhado. Nada é cortado ou simplificado pro lançamento.
- Enquanto a base for pequena, o time anuncia horários de concentração no Discord ("hoje 20h, todo mundo na fila") — quanto mais gente na mesma janela, mais humanos por partida e menos IA. Isso vive fora do produto: é organização social, não feature, e some sozinho conforme o volume cresce.

## Custo operacional — a estimar junto com a stack

Nunca estimado, e depende de decisões que ainda não foram tomadas:

- **OCR** é o item mais imprevisível: serviço pago por chamada (Google Vision, AWS Textract) custa por print processado e escala com o uso — cada verificação de personagem e cada report de resultado é uma chamada. Biblioteca local (Tesseract) é grátis mas exige mais trabalho de ajuste e servidor próprio pra rodar.
- **Storage de prints** com retenção de 90 dias ([LGPD](../produto/04-governanca/02-lgpd.md)) — volume cresce com partidas, mas o corte automático limita o teto.
- **Hospedagem** da plataforma + bot.

**Quem paga — pendência separada do teto.** O teto responde "quanto"; falta responder "de quem sai". Sem CNPJ formado (pendência acima), não existe conta da empresa — então alguém dos 4 vai pagar do próprio bolso e os outros ressarcem, com tudo no nome dessa pessoa (cartão, domínio, provedor de nuvem, conta do OCR).

- Precisa de acordo explícito **antes** do primeiro gasto recorrente: quem é o titular das contas, como o rateio acontece (mensal, por trimestre), e o que acontece se alguém sair do time.
- Vale o mesmo racional já usado pra propriedade do servidor Discord ([docs/discord/](../discord/README.md)): credencial e titularidade em nome de uma pessoa só é risco de continuidade. Aqui não dá pra resolver com "conta separada não pessoal" porque envolve dinheiro real — resolve de vez quando o CNPJ existir.

**Estimado e resolvido**: o custo real do MVP é de **R$ 50-90/mês**, e cai pra ~R$ 3/mês em free tier — com o OCR saindo de graça, porque o volume do MVP cabe no free tier do provedor. O detalhamento, o caminho de custo zero no dia 1 e o modelo de assinatura estão em [Sustentabilidade](03-sustentabilidade.md). Consequência: o teto de gasto mensal na prática é **R$ 0 no MVP**, o que restringe a escolha de stack (favorece o que roda inteiro num host só, sem serviço gerenciado pago).

**Pendência**: combinar entre os 4 um **teto de gasto mensal aceitável antes de escolher a stack** — a escolha de OCR pago vs. local pode ser decidida por esse teto, não o contrário. Registrado aqui pra não virar surpresa depois de já estar construído.

## Risco estrutural — aceito, não resolvido

Plataforma depende 100% de como o Pro Clubs funciona **hoje** — sem contrato ou API oficial da EA (ver [mecânica do jogo](../produto/03-partida/01-mecanica.md)). Qualquer patch pode alterar o mecanismo de clube/Amistoso Online que o produto inteiro usa como base.

Não tem como eliminar esse risco — a EA não oferece integração formal pra terceiro pequeno. Mitigação real é **monitorar patch notes e mudança de mecânica, adaptar rápido** quando acontecer — não é uma solução de engenharia, é disciplina operacional contínua. Documentado aqui como risco estrutural do negócio, aceito conscientemente, não ignorado.

## Se estourar

Escala de produtividade não é sobre crescer usuário — é sobre o mecanismo de capitão (convite manual, coordenação humana por partida) aguentar volume sem virar gargalo. Hoje é 100% manual por jogador (capitão de cada lado faz o trabalho). Se a demanda crescer muito além do que 1 lobby por vez aguenta, o próximo gargalo real não é servidor nem banco de dados — é quanto trabalho humano cada partida ainda exige. Vale revisitar automação (bot mais esperto, ferramenta de terceiro, ou pressão pra EA abrir API) só quando esse volume realmente aparecer — não desenhar pra escala hipotética agora.
