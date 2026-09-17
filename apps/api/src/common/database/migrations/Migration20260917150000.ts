// Menor privilégio para a role da API — ADR-009 decisão 1, itens 3 e 7 do
// checklist de segurança.
import { Migration } from '@mikro-orm/migrations'

/**
 * Role da aplicação. Criada fora daqui — no console da Neon, que gera a senha
 * — porque `CREATE ROLE` exige privilégio que a role dona do schema não tem
 * no plano grátis, e porque uma senha em migration versionada é o item 2 do
 * checklist ao contrário.
 */
const APP_ROLE = 'prolobby_app'

export class Migration20260917150000 extends Migration {
  override async up(): Promise<void> {
    // Todo o bloco é condicional à existência da role: local e CI rodam com
    // um Postgres de container onde ela não existe, e uma migration que
    // falhasse ali tornaria o arranjo de produção impossível de testar sem
    // reproduzir a Neon inteira. Onde a role existe — produção — concede;
    // onde não existe, não faz nada e diz por quê.
    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_roles where rolname = '${APP_ROLE}') then
          raise notice 'role ${APP_ROLE} não existe; permissões não aplicadas (esperado fora de produção)';
          return;
        end if;

        -- Enxergar o schema, sem poder criar objeto nele: é isto que impede
        -- a API de rodar DDL. Uma API comprometida com a role dona do schema
        -- executa DROP TABLE; com esta, no máximo apaga linha — que o backup
        -- diário do ADR-009 devolve.
        grant usage on schema public to ${APP_ROLE};
        revoke create on schema public from ${APP_ROLE};

        -- Dado: ler e escrever. Nunca TRUNCATE nem REFERENCES.
        grant select, insert, update, delete on all tables in schema public to ${APP_ROLE};
        grant usage, select on all sequences in schema public to ${APP_ROLE};

        -- E, o ponto que o ADR faz questão de citar: toda tabela futura já
        -- nasce acessível. Sem isto, a próxima migration criaria uma tabela
        -- que só a role dona enxerga, e a falha apareceria como "permission
        -- denied" em produção depois do deploy, nunca antes.
        alter default privileges in schema public
          grant select, insert, update, delete on tables to ${APP_ROLE};
        alter default privileges in schema public
          grant usage, select on sequences to ${APP_ROLE};
      end
      $$;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_roles where rolname = '${APP_ROLE}') then
          return;
        end if;

        alter default privileges in schema public
          revoke select, insert, update, delete on tables from ${APP_ROLE};
        alter default privileges in schema public
          revoke usage, select on sequences from ${APP_ROLE};
        revoke all on all sequences in schema public from ${APP_ROLE};
        revoke all on all tables in schema public from ${APP_ROLE};
        revoke usage on schema public from ${APP_ROLE};
      end
      $$;
    `)
  }
}
