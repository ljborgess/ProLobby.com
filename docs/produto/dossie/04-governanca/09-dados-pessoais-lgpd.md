# 9. Dados pessoais e LGPD

**Fase: MVP**

## Contexto

Plataforma guarda dado sensível o suficiente pra exigir política clara: print (imagem de tela pessoal), foto do personagem, Discord ID, gamertag/PSN. Rodando no Brasil, sujeito à LGPD.

## Retenção

- Prints (evidência de cadastro e de resultado) retidos por **90 dias**, apagados automaticamente depois (job de limpeza roda diariamente, apaga tudo que passou do prazo — sem exclusão manual dependente de alguém lembrar). 90 dias cobre com folga a janela de contestação (48h) e o zero-report (36h), sobrando margem pra investigação de moderação em caso mais raro/demorado.
- Consequência direta: o "histórico de prints" visível pro dono do perfil (ver [Personagens e verificação](../02-jogador/02-personagens-e-verificacao.md)) cobre só o período de retenção — prints mais antigos que o prazo simplesmente não existem mais pra visualizar.

## Exclusão de conta

- Player pode pedir exclusão de conta e dados pessoais (direito LGPD) — inclui remoção (kick) do servidor Discord, já que é saída voluntária da plataforma inteira, diferente de suspensão/banimento (ver [docs/discord/](../../../discord/README.md)).
- Histórico de elo/reputação pode ser mantido de forma **agregada e anonimizada** (sem vincular a print/foto/identidade), pra não perder integridade estatística da plataforma.
