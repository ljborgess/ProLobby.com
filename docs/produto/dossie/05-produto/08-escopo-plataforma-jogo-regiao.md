# 8. Escopo de plataforma, jogo e região

**Fase: MVP**

## Plataformas (console/PC)

- **Crossplay unificado** (PS5, Xbox Series, PC) — sem separar fila por plataforma.
- Cadastro guarda a plataforma real de cada personagem, pra permitir segmentar depois se necessário (ex: se surgir problema de conexão entre plataformas específicas).
- **Sem suporte a geração antiga** (PS4, Xbox One) — fora do escopo, mesmo que o próprio EA FC ainda permita.

> Nota: crossplay em Pro Clubs no EA FC hoje funciona entre mesma geração (PS5/Xbox Series/PC), com PS4/Xbox One num pool à parte, e é configurável dentro do jogo — pode mudar por versão/patch, não é regra fixa garantida ano a ano.

## Edições do jogo

- **Toda edição atual e futuras do FIFA/EA FC são suportadas** — plataforma não trava numa versão só.
- Personagem fica vinculado à edição do jogo em que foi verificado.
- Quando sai edição nova: personagens da edição anterior são **arquivados** (saem da fila ativa, não são deletados), exigindo reverificação pra edição nova. Cargo Verificado do Discord cai junto até reverificar (ver [docs/discord/](../../../discord/README.md)).
- Motivo: atributos/overall mudam de edição pra edição — não é o mesmo dado, precisa de print novo.
- **Elo/rating e reputação carregam entre edições** (medem a pessoa, não o jogo) — não resetam a cada lançamento. Só **overall/atributos do personagem** resetam, porque são dado extraído do print, específico da edição.

## Região

- **Só Brasil / América do Sul no MVP** — evita problema de ping/latência misturando regiões distantes, mesmo com elo/overall equilibrados.
- Expansão de região é aditiva (mais um filtro na fila), não trava arquitetura — fica pra quando fizer sentido.
