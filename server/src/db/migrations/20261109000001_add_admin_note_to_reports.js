/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasAdminNote = await knex.schema.hasColumn('reports', 'admin_note');
  if (!hasAdminNote) {
    await knex.schema.alterTable('reports', (table) => {
      table.text('admin_note').nullable().after('details');
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasAdminNote = await knex.schema.hasColumn('reports', 'admin_note');
  if (hasAdminNote) {
    await knex.schema.alterTable('reports', (table) => {
      table.dropColumn('admin_note');
    });
  }
}

