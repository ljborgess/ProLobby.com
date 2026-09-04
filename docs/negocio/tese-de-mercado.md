# Tese de mercado — ProLobby

**Uso interno dos 4 (Luciano, Rafael, João, Felipe)** — documento de decisão, não pitch. Tom direto, expõe fraqueza sem medo.

## A dor real

Pro Clubs hoje só tem 3 jeitos de jogar 11v11 (ver [mecânica real do jogo](../produto/dossie/03-partida/00-mecanica-pro-clubs.md)): liga entre clubes já formados, Drop-In (fila pública da própria EA — pareamento aleatório, sem controle de qualidade, sem identidade verificada, sem prestação de conta de comportamento), ou Amistoso marcado manualmente entre dois clubes que já se conhecem. Não existe "pegar 22 estranhos, equilibrar por elo de verdade, e jogar uma partida séria" — é exatamente esse buraco que o ProLobby preenche.

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
3. **Expansão de região** — já desenhado como aditivo no dossiê ([escopo](../produto/dossie/05-produto/08-escopo-plataforma-jogo-regiao.md)), sem travar arquitetura. Fica pra quando BR/América do Sul já estiver validado.

## Risco estrutural — aceito, não resolvido

Plataforma depende 100% de como o Pro Clubs funciona **hoje** — sem contrato ou API oficial da EA (ver [mecânica do jogo](../produto/dossie/03-partida/00-mecanica-pro-clubs.md)). Qualquer patch pode alterar o mecanismo de clube/Amistoso Online que o produto inteiro usa como base.

Não tem como eliminar esse risco — a EA não oferece integração formal pra terceiro pequeno. Mitigação real é **monitorar patch notes e mudança de mecânica, adaptar rápido** quando acontecer — não é uma solução de engenharia, é disciplina operacional contínua. Documentado aqui como risco estrutural do negócio, aceito conscientemente, não ignorado.

## Se estourar

Escala de produtividade não é sobre crescer usuário — é sobre o mecanismo de capitão (convite manual, coordenação humana por partida) aguentar volume sem virar gargalo. Hoje é 100% manual por jogador (capitão de cada lado faz o trabalho). Se a demanda crescer muito além do que 1 lobby por vez aguenta, o próximo gargalo real não é servidor nem banco de dados — é quanto trabalho humano cada partida ainda exige. Vale revisitar automação (bot mais esperto, ferramenta de terceiro, ou pressão pra EA abrir API) só quando esse volume realmente aparecer — não desenhar pra escala hipotética agora.
