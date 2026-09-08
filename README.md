<div align="center">

# PROLOBBY

**Matchmaking e comunidade competitiva pra EA FC Pro Clubs**

![Status](https://img.shields.io/badge/STATUS-SCAFFOLD-0c1322?style=for-the-badge&labelColor=070b14&color=22c55e)
![Fase](https://img.shields.io/badge/FASE-MVP-0c1322?style=for-the-badge&labelColor=070b14&color=f5b841)
![Stack](https://img.shields.io/badge/STACK-NEXT.JS%20%2B%20NESTJS%20%2B%20DISCORD.JS-0c1322?style=for-the-badge&labelColor=070b14&color=6b7a94)

`fila` → `lobby` → `capitão` → `partida` → `resultado` → `ranking` → `antifraude`

</div>

<br>

## Sistema

ProLobby transforma fila em partida real de Pro Clubs. Jogador entra por
posição, o sistema monta dois lados equilibrados por elo — de 4 a 11 humanos
cada, com a IA do próprio jogo cobrindo o resto dos 11 — e coordena tudo:
Discord, resultado, ranking. A partida em si roda dentro do EA FC.

Identidade visual herdada do design system de
[`escalacao-brasileirao`](https://github.com/rafaeljs08/escalacao-brasileirao).
ProLobby é projeto novo e independente — nada de backend/dados de lá.

<br>

## Pipeline

<table>
<tr><td width="90"><code>01</code></td><td><b>Cadastro</b></td><td>Personagem verificado por print + OCR — EA FC não tem API pública, toda verificação é evidência enviada pelo jogador</td></tr>
<tr><td><code>02</code></td><td><b>Fila</b></td><td>Escolhe posição (goleiro / zaga / meio / ponta / ataque), entra na fila individual por categoria</td></tr>
<tr><td><code>03</code></td><td><b>Lobby</b></td><td>8 a 22 humanos, simetria por categoria entre os lados — a IA do próprio jogo cobre as vagas restantes dos 11</td></tr>
<tr><td><code>04</code></td><td><b>Capitão</b></td><td>1 jogador real por lado, escolhido por reputação, empresta o próprio clube EA — sem host de rede, Pro Clubs roda em servidor dedicado</td></tr>
<tr><td><code>05</code></td><td><b>Partida</b></td><td>Amistoso Online entre os dois clubes, dentro do jogo — plataforma não executa, só coordena</td></tr>
<tr><td><code>06</code></td><td><b>Resultado</b></td><td>Print + OCR confirmam placar, elo e reputação atualizam por categoria</td></tr>
<tr><td><code>07</code></td><td><b>Antifraude</b></td><td>Hash antes do OCR, roster do print final conferido contra o lobby, timeout progressivo por recusa</td></tr>
</table>

<details>
<summary><b>Por que "capitão" e não "host"?</b></summary>
<br>

O produto assumia originalmente que um jogador criava uma sala privada e
convidava os outros 21. Pesquisa confirmou que **esse mecanismo não existe**
em Pro Clubs — o jogo só permite liga, Drop-In (fila da própria EA) ou
Amistoso Online entre clubes. Como Pro Clubs roda em servidor dedicado (não
P2P), também não existe "host" cujo ping afete os outros.

O mecanismo real: cada lado do lobby usa o clube pessoal de um dos próprios
jogadores humanos daquele lado — o **capitão**, escolhido por maior reputação
entre quem tem clube com vaga. Detalhe completo, achados de pesquisa e checklist de teste
prático em
[`docs/produto/03-partida/01-mecanica.md`](docs/produto/03-partida/01-mecanica.md).

</details>

<br>

## Módulos

<table>
<tr><th align="left">Módulo</th><th align="left">Cobre</th></tr>
<tr><td><b>Identidade</b></td><td>Personagem verificado por print + OCR em 3 idiomas, até 5 categorias por conta, atributos travados, 1 gamertag por plataforma</td></tr>
<tr><td><b>Matchmaking</b></td><td>Fila por posição, equilíbrio por elo categoria-contra-categoria, timeout com feedback de categoria faltante</td></tr>
<tr><td><b>Partida</b></td><td>Capitão dinâmico, formação votada, coordenação via Discord (canais de voz por time + texto compartilhado)</td></tr>
<tr><td><b>Resultado</b></td><td>Report com print/OCR, validação de clube e de roster, zero-report penalizado só se a partida aconteceu, contestação de 48h, disputa sem prova anula a partida</td></tr>
<tr><td><b>Ranking</b></td><td>Elo por categoria, reputação por conta, seed inicial por overall, rollback retroativo, punição a smurfing/conluio</td></tr>
<tr><td><b>Governança</b></td><td>Moderação, LGPD, retenção de dados, termos de uso, idade mínima 16 anos</td></tr>
<tr><td><b>Social</b></td><td>Perfil público (elo, reputação, histórico agregado) — print e Discord ID continuam privados</td></tr>
<tr><td><b>Onboarding</b></td><td>Conta → personagem → Discord, cada etapa desbloqueia acesso incremental</td></tr>
</table>

Detalhado por fase (MVP / Fase 2 / Futuro) no
[dossiê de produto](docs/produto/README.md). Itens deliberadamente
adiados — moderador comunitário, fila por time pré-formado, torneio, stack
técnica — no
[backlog](docs/produto/05-produto/03-backlog.md).

<br>

## Discord

Servidor da comunidade é domínio próprio — cargos, canais, e o bot que
automatiza tudo (cargo Verificado, canais de lobby, notificações,
moderação):

<table>
<tr><td><b>Cargos</b></td><td>Admin / Moderador fixos, cargo funcional Verificado (gate real de acesso)</td></tr>
<tr><td><b>Canais</b></td><td>Estrutura unificada + 3 temporários por lobby (2 voz privados por time, 1 texto compartilhado)</td></tr>
<tr><td><b>Bot</b></td><td>Motor único de automação — plataforma decide, bot executa. Kick/ban sempre manual</td></tr>
<tr><td><b>Integração</b></td><td>Webhook plataforma → bot, OAuth2 pro vínculo de conta, retry se o bot cair</td></tr>
</table>

→ [`docs/discord/`](docs/discord/README.md)

<br>

## Preview

Artifact navegável — fila, lobby (capitão + 2 times), report de resultado,
perfil público e ranking, com o design system real do projeto. Dados de
exemplo.

[Abrir a pré-visualização](https://claude.ai/code/artifact/8cde45d1-3279-4503-93f2-b1ccfdb86e6d) — atualizada conforme o design evolui.

<br>

## Referência visual

ProLobby ainda não tem UI própria — a identidade abaixo (cores, fontes,
raios, sombras) é herdada do design system de `escalacao-brasileirao`. As
telas são do projeto de origem, servindo só de referência de estilo:

<p align="center">
  <video src="docs/assets/demo-escalacao.mp4" width="920" autoplay loop muted playsinline></video>
</p>

<p align="center">
  <img src="docs/assets/demo-lista-times.png" alt="Design system de origem — lista de times" width="440">
  <img src="docs/assets/demo-campo.png" alt="Design system de origem — campo" width="440">
</p>
<p align="center">
  <img src="docs/assets/demo-catalogo-atletas.png" alt="Design system de origem — catálogo" width="440">
  <img src="docs/assets/demo-busca-elenco.png" alt="Design system de origem — busca" width="440">
</p>

<br>

## Documentação

<table>
<tr><td><a href="docs/README.md"><code>docs/</code></a></td><td>Índice geral</td></tr>
<tr><td><a href="docs/produto/README.md"><code>docs/produto/</code></a></td><td>Decisões de produto e o motivo de cada uma, por domínio</td></tr>
<tr><td><a href="docs/produto/parametros.md"><code>parametros.md</code></a></td><td>Todos os números do sistema num lugar só (elo, reputação, prazos, limites)</td></tr>
<tr><td><a href="docs/requisitos/README.md"><code>docs/requisitos/</code></a></td><td>O que o sistema faz: RF-001 a RF-073, RNF-001 a RNF-020, estados, modelo de dados, checklist de segurança</td></tr>
<tr><td><a href="docs/adr/README.md"><code>docs/adr/</code></a></td><td>Decisão de arquitetura, com supersessão explícita — só o que custa refatoração pra desfazer</td></tr>
<tr><td><a href="docs/negocio/README.md"><code>docs/negocio/</code></a></td><td>Tese de mercado, sustentabilidade, ordem de implementação e plano de lançamento</td></tr>
<tr><td><a href="docs/discord/README.md"><code>docs/discord/</code></a></td><td>Estrutura do servidor Discord e do bot</td></tr>
<tr><td><a href="HANDOFF.md"><code>HANDOFF.md</code></a></td><td>Pra retomar o trabalho em outra sessão/máquina — leia primeiro</td></tr>
</table>

<br>

## Estado atual

Design de produto e requisitos fechados. Stack decidida ([ADR-005](docs/adr/005-stack-tecnica.md),
[ADR-006](docs/adr/006-backend-separado-e-tooling.md)) e scaffold do monorepo criado —
`apps/web` (Next.js), `apps/api` (NestJS + MikroORM), `apps/bot` (Node.js + discord.js),
Turborepo + pnpm workspaces, testes (Vitest/Jest/Playwright) e CI (GitHub Actions) rodando.
Nenhum RF implementado ainda — é fundação, não funcionalidade.

Nove áreas de requisito levantadas, com RF e RNF numerados e rastreáveis em
[`docs/requisitos/`](docs/requisitos/README.md).

**Dois bloqueadores, decisão de seguir com a stack antes deles rodarem
([ADR-005](docs/adr/005-stack-tecnica.md)):**

1. **[Checklist no jogo](docs/produto/03-partida/05-checklist.md)** — 8 testes,
   custa minutos, valida o mecanismo de capitão/clube em que todo o fluxo de
   partida se apoia. RF-051/052/055 podem exigir retrabalho quando rodar.
2. **[Piloto de OCR](docs/requisitos/06-piloto-ocr.md)** — um script sobre 50
   prints reais de estranhos, sem conta e sem banco. Dos cinco riscos do
   projeto, é o único grande que exige código pra ser medido.

Divisão de papéis no time já fechada — sem papel fixo, trabalho em conjunto.
Desenvolvimento de código é solo.

Trabalho corre em `dev`; `main` só recebe merge quando o time decidir
promover.

<br>

<div align="center">

**Luciano · Rafael · João · Felipe**

<sub>em design de produto — 2026</sub>

</div>
