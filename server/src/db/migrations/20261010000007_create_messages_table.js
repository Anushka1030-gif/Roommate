/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('messages', (table) => {
    table.increments('id').primary();
    table.integer('conversation_id').unsigned().notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.integer('sender_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('content').notNullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('read_at').nullable().defaultTo(null);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['conversation_id', 'created_at']);
    table.index('sender_id');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('messages');
}
