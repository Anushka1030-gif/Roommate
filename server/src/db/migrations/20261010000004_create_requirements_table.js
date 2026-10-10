/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('requirements', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.string('city', 100).notNullable().defaultTo('Bhopal');
    table.string('preferred_locations', 255).nullable();
    table.decimal('budget_min', 10, 2).notNullable().defaultTo(0);
    table.decimal('budget_max', 10, 2).notNullable();
    table.enu('room_type', ['single', 'shared', 'any']).notNullable().defaultTo('any');
    table.boolean('has_room').notNullable().defaultTo(false);
    table.date('move_in_date').nullable();
    table.integer('lease_duration_months').nullable().defaultTo(12);
    table.enu('preferred_gender', ['male', 'female', 'any', 'no_preference']).notNullable().defaultTo('any');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index('user_id');
    table.index('city');
    table.index(['budget_min', 'budget_max']);
    table.index('has_room');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('requirements');
}
