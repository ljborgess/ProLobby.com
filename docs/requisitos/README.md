# Requisitos — ProLobby

Domínio próprio, no mesmo nível de [`produto/`](../produto/README.md), [`discord/`](../discord/README.md) e [`negocio/`](../negocio/README.md). A separação é intencional:

| Domínio | Responde |
|---|---|
| `produto/` | **por que** a regra é assim — decisão, alternativa descartada, motivo |
| `requisitos/` | **o que** o sistema precisa fazer — comportamento verificável, sem rediscutir o motivo |

Quem vai implementar segue esta pasta e consulta `produto/` quando quiser entender a razão de algo. Quem vai decidir produto faz o contrário. Nenhum requisito daqui nasce sozinho: **todo item aponta pra onde foi decidido.**

## Conteúdo

1. [Requisitos transversais](01-transversais.md) — fuso, janela móvel de 30 dias, papéis da plataforma, não-funcionais, idempotência, acessibilidade, inventário de telas
2. [Estados do lobby e da partida](02-estados.md) — os 12 estados, o que prende a fila, efeitos por transição
3. [Modelo de dados](03-dados.md) — entidades e atributos, gamertag por plataforma, o log que o rollback exige
4. [Inventário de notificações](04-notificacoes.md) — todo evento, in-app x DM, o que é urgente
5. [Requisitos funcionais](05-funcionais.md) — a lista numerada e rastreável, com critério de aceite
6. [Requisitos não-funcionais](07-nao-funcionais.md) — RNF-001 a RNF-021: desempenho, capacidade, recuperação, segurança, compatibilidade, operação
7. [Piloto de OCR](06-piloto-ocr.md) — **bloqueador nº 2**: o único risco grande que exige código pra ser medido
8. [Checklist de segurança](08-seguranca-checklist.md) — 18 itens de implementação, regra permanente a partir da 1ª linha de código de backend

## Como ler um requisito funcional

Formato de [`05-funcionais.md`](05-funcionais.md):

```
RF-042 · Título curto
Origem: produto/03-partida/02-fila.md
Aceite: o comportamento observável que prova que está implementado
```

**Origem** é obrigatória. Requisito sem origem é requisito que alguém inventou — se aparecer um, o certo é decidir em `produto/` antes de implementar.

O mesmo formato vale pros [não-funcionais](07-nao-funcionais.md), numerados como RNF.

**Aceite** é escrito como observação, não como intenção: "a fila não fecha" em vez de "o sistema deve garantir que". Se não dá pra observar, não dá pra testar.
