/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('conversations', (table) => {
    table.increments('id').primary();
    table.integer('user_a_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('user_b_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('last_message_at').nullable();
    table.boolean('contact_revealed_by_a').notNullable().defaultTo(false);
    table.boolean('contact_revealed_by_b').notNullable().defaultTo(false);
    table.enu('roommate_status', ['none', 'pending_a', 'pending_b', 'confirmed', 'declined']).notNullable().defaultTo('none');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['user_a_id', 'user_b_id']);
    table.index('last_message_at');
    table.check('?? < ??', ['user_a_id', 'user_b_id'], 'chk_conversations_user_order');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('conversations');
}
