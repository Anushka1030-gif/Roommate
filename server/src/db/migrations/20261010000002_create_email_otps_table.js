/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('email_otps', (table) => {
    table.increments('id').primary();
    table.string('email', 255).notNullable();
    table.string('otp_code', 255).notNullable();
    table.enu('type', ['registration', 'password_reset', 'login']).notNullable().defaultTo('registration');
    table.datetime('expires_at').notNullable();
    table.datetime('consumed_at').nullable().defaultTo(null);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['email', 'type']);
    table.index('expires_at');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('email_otps');
}
