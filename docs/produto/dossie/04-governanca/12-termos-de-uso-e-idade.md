# 12. Termos de uso e idade mínima

**Fase: MVP** (antes do primeiro usuário externo real)

## Idade mínima

- **16 anos** — acompanha a classificação do próprio EA FC, mas com corte mais alto que o padrão Discord (13) porque envolve chat de voz com estranhos via Pro Clubs.
- **Verificação**: campo de **data de nascimento** no cadastro (não checkbox genérico "sou maior de 16") — sistema calcula a idade e bloqueia o cadastro na hora se der menos de 16 anos, sem depender de o jogador fazer conta sozinho. Sem verificação documental. Mesmo padrão de mercado usado por plataformas sociais/gaming (o próprio Discord funciona assim); verificação documental é atrito e custo de compliance desproporcional pro MVP.

## Termos de Uso / Política de Privacidade

- Obrigatórios **antes do primeiro usuário externo ao time** (não precisa ser documento jurídico complexo no dia 1, mas precisa existir).
- **Aceite versionado**: plataforma registra qual versão do ToS cada jogador aceitou e quando. Mudança material (ex.: quando entrar monetização) exige novo aceite antes de continuar usando — exigência prática de LGPD, já que consentimento precisa ser rastreável. Barato se o schema nascer com o campo (ver [Onboarding](../05-produto/11-onboarding.md)).
- Publicados em **português e espanhol**, acompanhando o idioma da plataforma (ver [Escopo de plataforma, jogo e região](../05-produto/08-escopo-plataforma-jogo-regiao.md)).
- Motivo: coleta de print, foto, Discord ID e gamertag sem aviso formal é risco jurídico direto, não só decisão de produto — complementa a política de retenção/exclusão de [Dados pessoais e LGPD](09-dados-pessoais-lgpd.md).
- Cobre também o consentimento de **uso do clube EA declarado pelo jogador** (ver [Personagens e verificação](../02-jogador/02-personagens-e-verificacao.md)) — ao declarar clube com vaga, jogador é avisado explicitamente que autoriza até 10 jogadores de outro lobby serem convidados temporariamente pro clube quando escolhido capitão.
