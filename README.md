<div align="center">

# 🎮 ProLobby

**Matchmaking e comunidade pra EA FC Pro Clubs**

![Status](https://img.shields.io/badge/status-design%20de%20produto-yellow?style=for-the-badge)
![Stack](https://img.shields.io/badge/stack-a%20definir-lightgrey?style=for-the-badge)

[📋 Sobre](#-sobre-o-projeto) ·
[✨ Funcionalidades](#-funcionalidades) ·
[📁 Documentação](#-documentação) ·
[🚧 Estado atual](#-estado-atual) ·
[👥 Time](#-time)

</div>

---

## 📋 Sobre o projeto

Plataforma de matchmaking e comunidade pra **EA FC Pro Clubs**: cadastro de
personagem verificado por print + OCR, fila automatizada por posição,
formação de times equilibrados, coordenação via Discord, report de resultado
e ranking (elo + reputação).

A identidade visual (cores, fontes, raios, sombras) é herdada do design
system do projeto [`escalacao-brasileirao`](https://github.com/rafaeljs08/escalacao-brasileirao) —
mas ProLobby é um **projeto novo e independente**, sem reaproveitar
backend/dados de lá.

---

## ✨ Funcionalidades

Levantadas e detalhadas no [dossiê de produto](docs/produto/dossie/README.md),
cada uma marcada por fase (MVP / Fase 2 / Futuro):

| Área | Recurso |
|------|---------|
| **Identidade** | Cadastro de personagem verificado por print + OCR |
| **Matchmaking** | Fila automatizada por posição, formação de times equilibrados |
| **Partida** | Coordenação via Discord (notificação, reatribuição de host) |
| **Resultado** | Report de resultado com zero report e bloqueio em disputa |
| **Ranking** | Elo por categoria, reputação, seed inicial, punição a smurfing/conluio |
| **Governança** | Moderação, LGPD, termos de uso e idade mínima |
| **Social** | Perfil e visibilidade social |
| **Onboarding** | Fluxo guiado de entrada na plataforma |

Itens deliberadamente adiados (aposta em dinheiro, moderador comunitário,
fila por time pré-formado, stack técnica) estão listados no
[backlog de fases futuras](docs/produto/dossie/05-produto/10-backlog-fases-futuras.md).

---

## 🎬 Referência visual

ProLobby ainda não tem UI própria — a identidade visual (cores, fontes,
raios, sombras) foi herdada do design system do projeto
[`escalacao-brasileirao`](https://github.com/rafaeljs08/escalacao-brasileirao).
Vídeo e capturas abaixo são as telas **desse** projeto de origem, não do
ProLobby, servindo só de referência de estilo:

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

---

## 📁 Documentação

- [`docs/`](docs/README.md) — índice geral da documentação
- [`docs/produto/dossie/`](docs/produto/dossie/README.md) — dossiê completo de produto, separado por nicho (visão, jogador, partida, governança, escopo)
- [`HANDOFF.md`](HANDOFF.md) — pra retomar o trabalho em outra sessão/máquina, leia primeiro

---

## 🚧 Estado atual

Fase de **design de produto** (levantamento de requisitos) — ainda sem
código de aplicação. Stack técnica e divisão de papéis entre o time são as
próximas decisões grandes em aberto.

Trabalho corre na branch `dev`; `main` só recebe merge quando o time decidir
promover.

---

## 👥 Time

Luciano, Rafael, João, Felipe.

<div align="center">

*Em design de produto · 2026*

</div>
