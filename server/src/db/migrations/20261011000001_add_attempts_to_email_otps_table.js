/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('email_otps', 'attempts');
  if (!hasColumn) {
    await knex.schema.alterTable('email_otps', (table) => {
      table.integer('attempts').notNullable().defaultTo(0).after('type');
    });
  }
  await knex.schema.alterTable('email_otps', (table) => {
    table.datetime('expires_at').notNullable().alter();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('email_otps', 'attempts');
  if (hasColumn) {
    await knex.schema.alterTable('email_otps', (table) => {
      table.dropColumn('attempts');
    });
  }
}
