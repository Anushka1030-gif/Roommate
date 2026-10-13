/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasUserPhone = await knex.schema.hasColumn('users', 'phone');
  if (!hasUserPhone) {
    await knex.schema.alterTable('users', (table) => {
      table.string('phone', 20).nullable();
    });
  }

  const hasProfileAge = await knex.schema.hasColumn('profiles', 'age');
  if (!hasProfileAge) {
    await knex.schema.alterTable('profiles', (table) => {
      table.integer('age').nullable();
    });
  }

  const hasProfileCity = await knex.schema.hasColumn('profiles', 'city');
  if (!hasProfileCity) {
    await knex.schema.alterTable('profiles', (table) => {
      table.string('city', 100).nullable();
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasProfileCity = await knex.schema.hasColumn('profiles', 'city');
  if (hasProfileCity) {
    await knex.schema.alterTable('profiles', (table) => {
      table.dropColumn('city');
    });
  }

  const hasProfileAge = await knex.schema.hasColumn('profiles', 'age');
  if (hasProfileAge) {
    await knex.schema.alterTable('profiles', (table) => {
      table.dropColumn('age');
    });
  }

  const hasUserPhone = await knex.schema.hasColumn('users', 'phone');
  if (hasUserPhone) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('phone');
    });
  }
}
