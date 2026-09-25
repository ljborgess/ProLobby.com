# 8. Escopo de plataforma, jogo e região

**Fase: MVP**

## Plataformas (console/PC)

- **Crossplay unificado** (PS5, Xbox Series, PC) — sem separar fila por plataforma.
- Cadastro guarda a plataforma real de cada personagem, pra permitir segmentar depois se necessário (ex: se surgir problema de conexão entre plataformas específicas).
- **Sem suporte a geração antiga** (PS4, Xbox One) — fora do escopo, mesmo que o próprio EA FC ainda permita.
- **Troca de plataforma pelo jogador** (vende PS5, migra pra PC): como identidade é única por combinação plataforma+gamertag e personagem fica vinculado à plataforma (ver [Personagens e verificação](../02-jogador/01-verificacao.md)), jogador cadastra personagem novo na plataforma nova — **elo começa no baseline (1000)**, como qualquer personagem novo. **Reputação da conta continua intacta** (reputação é por conta, elo é por personagem/categoria). Mesmo racional já aplicado a edição nova do jogo, logo abaixo.

> Nota: crossplay em Pro Clubs no EA FC hoje funciona entre mesma geração (PS5/Xbox Series/PC), com PS4/Xbox One num pool à parte, e é configurável dentro do jogo — pode mudar por versão/patch, não é regra fixa garantida ano a ano.

## Edições do jogo

- **Toda edição atual e futuras do FIFA/EA FC são suportadas** — plataforma não trava numa versão só.
- Personagem fica vinculado à edição do jogo em que foi verificado.
- Quando sai edição nova: personagens da edição anterior são **arquivados** (saem da fila ativa, não são deletados), exigindo reverificação pra edição nova. Cargo Verificado do Discord cai junto até reverificar (ver [docs/discord/](../../discord/README.md)).
- Motivo: arquétipos e a tela verificada mudam de edição pra edição — não é o mesmo dado, precisa de print novo.
- **Elo/rating e reputação carregam entre edições** (medem a pessoa, não o jogo) — não resetam a cada lançamento. Só o **arquétipo do personagem** reseta, porque são dado extraído do print, específico da edição.

## Região

- **Só Brasil / América do Sul no MVP** — evita problema de ping/latência misturando regiões distantes, mesmo com elo equilibrado.
- Expansão de região é aditiva (mais um filtro na fila), não trava arquitetura — fica pra quando fizer sentido.

## Idioma

- **Português e espanhol desde o MVP** — a região do escopo (Brasil / América do Sul) inclui Argentina, Chile, Uruguai e Paraguai, onde o espanhol é a língua principal. Lançar só em português contradiria o próprio escopo de região já fechado.
- Vale pra interface, mensagens do bot e Termos de Uso. Comunidade Discord continua unificada (ver [docs/discord/](../../discord/README.md)) — sem canal separado por idioma no MVP, mesmo racional de não fragmentar comunidade pequena.
- Inglês fica fora do MVP — entra junto com expansão de região pra fora da América do Sul, se acontecer.
