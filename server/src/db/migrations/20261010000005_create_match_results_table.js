/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('match_results', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('matched_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('compatibility_score', 5, 2).notNullable();
    table.json('score_breakdown').nullable();
    table.text('ai_summary').nullable();
    table.json('ai_pros').nullable();
    table.json('ai_cons').nullable();
    table.json('ai_icebreakers').nullable();
    table.enu('status', ['suggested', 'liked', 'skipped', 'connected']).notNullable().defaultTo('suggested');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['user_id', 'matched_user_id']);
    table.index(['user_id', 'status']);
    table.index(['user_id', 'compatibility_score']);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('match_results');
}
