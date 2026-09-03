# Dossiê — ProLobby

Time: Luciano, Rafael, João, Felipe — desenvolvimento em conjunto, sem divisão fixa de papéis definida ainda.

Status: levantamento de requisitos e design de produto. Sem código além do reaproveitamento do front-end (design system) do projeto `escalacao-brasileirao`.

## 1. Relação com o projeto atual

Projeto novo e independente do `escalacao-brasileirao` (domínios diferentes: um é dado real de campeonato via API, o outro é matchmaking/comunidade de Pro Clubs). Nenhuma decisão de stack tomada ainda — deliberadamente adiada.

Reaproveitamento aprovado: **identidade visual (design system) do front-end atual** — não o backend/dados.

### Design system herdado (`futebol/static/futebol/css/app.css`)
- Fontes: `Sora` (display/headings), `Inter` (texto)
- Paleta escura: fundo `#070b14` / `#0c1322`, superfícies translúcidas brancas (4.5%–8% opacidade)
- Cores de destaque: verde `#22c55e` (+ `#15803d` escuro), dourado `#f5b841`, vermelho `#f26d6d`
- Texto: `#e8edf7` (principal), `#9aa8bf` (suave), `#6b7a94` (fraco)
- Raios de borda: 10px / 16px / 22px (sm / padrão / lg)
- Sombras: duas escalas (padrão e sm), pretas translúcidas

## 2. Personagens (perfis de jogador dentro do jogo)

- EA FC Pro Clubs **não tem API pública** — nenhuma integração automática com dado oficial é possível.
- Um **personagem = 1 posição fixa**, com atributos/overall próprios (reflete como o Virtual Pro funciona no jogo).
- **1 conta (vinculada a Discord) pode ter até 5 personagens**, um por categoria de posição:
  1. Goleiro (GK)
  2. Zaga/Lateral (CB, LB, RB)
  3. Meio-campo (CDM, CM, CAM)
  4. Ponta (LM, RM, LW, RW)
  5. Ataque (ST, CF)
- Sem limite de recriação dentro de uma categoria — mas 1 personagem ativo por categoria.

### Verificação / cadastro de atributos
- Cadastro via **print in-game** processado por **OCR**, preenchendo automaticamente nome, posição, atributos, foto.
- Campos extraídos por OCR (atributos, overall, posição) ficam **travados** — não editáveis manualmente. Único jeito de corrigir/atualizar é **reenviar novo print** (reprocessado, substitui os dados, mantém histórico).
- Antes de salvar, tela de confirmação mostra dado extraído + nível de confiança do OCR — player confirma ou reenvia.
- Exceção: se OCR falhar repetidamente, abre **chamado pra moderação** corrigir manualmente (caso raro, auditável).
- **Cooldown entre atualizações** (ex.: 1x a cada 24–48h) — evita spam de prints tentando "sorte" no OCR.
- **Snapshot travado durante fila/lobby ativo** — update de atributos só aplica depois que sai da fila/partida.
- Nome/foto: editáveis livremente (baixo risco competitivo). Atributos de jogo: só via novo print.
- Histórico de prints: visível só pro dono do perfil e pra moderação (não público) — evita vazamento de dado da tela (ex.: infos da conta EA).

## 3. Fila / Matchmaking

- Fila **individual por posição** (MVP) — cada personagem entra na fila da sua posição. Fila por time pré-formado (grupos de amigos) fica pra fase 2.
- **1 fila ativa por conta** (não dá pra colocar 2 personagens em filas simultâneas).
- Antes de entrar na fila, player escolhe **qual personagem** (logo, qual posição) vai usar.
- Formação dos 22: sistema busca **equilibrar overall médio entre os dois times** — prioriza qualidade de partida sobre velocidade de entrada.
- **Elo/rating de desempenho pesa mais que overall** no equilíbrio; overall é critério de desempate entre players de elo parecido (overall é auto-declarado via print, elo vem de resultado real dentro da plataforma — mais confiável).

## 4. Discord (obrigatório)

- Vínculo de conta Discord é **obrigatório** no cadastro (pré-requisito pra fila) — sem isso não tem como coordenar a sala (EA não expõe API pra criar sala automaticamente).
- Bot de Discord, ao lobby fechar (22 confirmados):
  - Cria canal de voz temporário do lobby
  - Posta host + gamertag/PSN ID de todos (visível só dentro do lobby, não público no perfil geral)
  - Pinga os 22 automaticamente
  - Timer pra todos entrarem (ausência afeta reputação)
- Critério de escolha do host: reputação + histórico de conexão estável (não aleatório).
- Sala em si (dentro do jogo) é sempre criada **manualmente** pelo host, dentro do console — plataforma não automatiza isso.

## 5. Resultado da partida

- Sem API da EA, resultado também depende de **report manual com print**.
- **Qualquer um dos 22** (não precisa ser o host) pode mandar o print do placar final.
- Gatilho de validade do print (evita fraude/troll terminando partida cedo):
  1. **Piso de tempo mínimo** desde o lobby fechado — print enviado antes disso é rejeitado automaticamente.
  2. **OCR valida que é a tela de "fim de partida"** (placar final + estatísticas), não HUD de jogo em andamento.
- Validação cruzada entre os dois lados: **placar bate** + **timestamps de envio próximos** entre si.
- **ID da partida = o próprio lobby** gerado pela plataforma — não depende de nada lido do jogo.
- Se só um lado mandar dentro da janela (15 min), aceita como válido com flag "não confirmado", sujeito a contestação.
- Se os dois lados mandarem placares divergentes: cai em **disputa/moderação**.
- **Conta fica bloqueada de nova fila até a partida anterior ser reportada e resolvida** — incentivo estrutural, tira a responsabilidade da plataforma de "garantir" que alguém reporte.

## 6. Ranking / Reputação

Dois eixos separados:
- **Reputação** — mede comportamento (reportou certo, não sumiu, print bateu, entrou no lobby a tempo). Afeta prioridade/acesso à fila.
- **Elo/rating** — mede desempenho competitivo (vitória/derrota real). Usado no equilíbrio de times, pesa mais que overall.

## 7. Itens explicitamente adiados (não resolvidos agora)

- **Forma de pagamento por jogador em cada lobby** — mencionado pelo time como algo a existir, mas discussão adiada pra próxima seção de planejamento.
- Stack técnica (backend, banco, infra) — deliberadamente não decidida ainda.
- Fila por time pré-formado (fase 2).
- Divisão de papéis entre Luciano, Rafael, João e Felipe — time decidiu trabalhar em conjunto, sem divisão fixa por ora.
