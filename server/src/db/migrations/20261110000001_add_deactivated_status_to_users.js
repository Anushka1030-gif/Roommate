/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw(`
    ALTER TABLE users 
    MODIFY COLUMN status ENUM('active', 'suspended', 'banned', 'deactivated') NOT NULL DEFAULT 'active';
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw(`
    ALTER TABLE users 
    MODIFY COLUMN status ENUM('active', 'suspended', 'banned') NOT NULL DEFAULT 'active';
  `);
}

