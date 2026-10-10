/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('reports', (table) => {
    table.increments('id').primary();
    table.integer('reporter_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('reported_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('reason', 100).notNullable();
    table.text('details').nullable();
    table.enu('status', ['pending', 'reviewed', 'resolved', 'dismissed']).notNullable().defaultTo('pending');
    table.integer('reviewed_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at').nullable().defaultTo(null);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index('status');
    table.index('reporter_id');
    table.index('reported_id');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('reports');
}
