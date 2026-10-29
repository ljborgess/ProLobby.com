// Kit Lab (2026-10-29): the declared club's kit, a closed set of colours,
// patterns and crest shapes. Existing clubs get the default kit.
import { Migration } from '@mikro-orm/migrations'

const COLORS = `'white', 'black', 'red', 'claret', 'orange', 'yellow', 'green', 'sky', 'blue', 'navy', 'purple', 'grey'`

export class Migration20261029120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "declared_club" add column "kit_primary" text check ("kit_primary" in (${COLORS})) not null default 'white', add column "kit_secondary" text check ("kit_secondary" in (${COLORS})) not null default 'navy', add column "kit_pattern" text check ("kit_pattern" in ('plain', 'stripes', 'hoops', 'halves', 'sash')) not null default 'plain', add column "crest_shape" text check ("crest_shape" in ('shield', 'round', 'diamond')) not null default 'shield';`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "declared_club" drop column "kit_primary", drop column "kit_secondary", drop column "kit_pattern", drop column "crest_shape";`,
    )
  }
}
