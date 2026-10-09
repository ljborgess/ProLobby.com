// #243: log de auditoria da moderação, só de acréscimo.
import { Migration } from '@mikro-orm/migrations'

const APP_ROLE = 'prolobby_app'

export class Migration20261009120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "audit_entry" ("id" uuid not null, "action" text check ("action" in ('role_changed', 'case_resolved')) not null, "actor_id" uuid null, "actor_label" varchar(120) not null, "target_account_id" uuid null, "case_id" uuid null, "before" jsonb null, "after" jsonb null, "created_at" timestamptz not null, constraint "audit_entry_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "audit_entry_target_account_id_created_at_index" on "audit_entry" ("target_account_id", "created_at");`,
    )

    // Só acréscimo, para qualquer role, inclusive a dona: uma API comprometida
    // não reescreve o que fez. Desligar exige DDL, que a role da API não tem.
    this.addSql(`
      create or replace function audit_entry_is_append_only() returns trigger
      language plpgsql as $$
      begin
        raise exception 'audit_entry is append-only (%)', tg_op;
      end;
      $$;
    `)
    this.addSql(
      `create trigger "audit_entry_no_change" before update or delete on "audit_entry" for each row execute function audit_entry_is_append_only();`,
    )
    this.addSql(
      `create trigger "audit_entry_no_truncate" before truncate on "audit_entry" for each statement execute function audit_entry_is_append_only();`,
    )

    // As permissões padrão dão update/delete em toda tabela nova para a role
    // da API; aqui ela fica só com select e insert. Fora de produção a role
    // não existe e o bloco não faz nada.
    this.addSql(`
      do $$
      begin
        if exists (select 1 from pg_roles where rolname = '${APP_ROLE}') then
          revoke update, delete, truncate on "audit_entry" from ${APP_ROLE};
        end if;
      end
      $$;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "audit_entry" cascade;`)
    this.addSql(`drop function if exists audit_entry_is_append_only();`)
  }
}
