/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasSource = await knex.schema.hasColumn('match_results', 'source');
  if (!hasSource) {
    await knex.schema.alterTable('match_results', (table) => {
      table.enu('source', ['llm', 'fallback']).notNullable().defaultTo('fallback');
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasSource = await knex.schema.hasColumn('match_results', 'source');
  if (hasSource) {
    await knex.schema.alterTable('match_results', (table) => {
      table.dropColumn('source');
    });
  }
}
