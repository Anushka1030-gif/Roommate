/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('blocks', (table) => {
    table.increments('id').primary();
    table.integer('blocker_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('blocked_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('reason', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['blocker_id', 'blocked_id']);
    table.index('blocker_id');
    table.index('blocked_id');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('blocks');
}
