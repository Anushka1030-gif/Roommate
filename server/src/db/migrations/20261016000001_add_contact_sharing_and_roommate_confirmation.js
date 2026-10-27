/**
 * Migration to add contact sharing and roommate confirmation columns to conversations table.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasAShares = await knex.schema.hasColumn('conversations', 'a_shares_contact');
  if (!hasAShares) {
    await knex.schema.table('conversations', (table) => {
      table.boolean('a_shares_contact').notNullable().defaultTo(false);
      table.boolean('b_shares_contact').notNullable().defaultTo(false);
      table.boolean('a_confirmed_roommates').notNullable().defaultTo(false);
      table.boolean('b_confirmed_roommates').notNullable().defaultTo(false);
    });

    // Populate from legacy columns if present
    const hasLegacyA = await knex.schema.hasColumn('conversations', 'contact_revealed_by_a');
    if (hasLegacyA) {
      await knex('conversations').update({
        a_shares_contact: knex.ref('contact_revealed_by_a'),
        b_shares_contact: knex.ref('contact_revealed_by_b'),
      });
    }

    // Populate confirmed flags if legacy roommate_status was 'confirmed'
    const hasStatus = await knex.schema.hasColumn('conversations', 'roommate_status');
    if (hasStatus) {
      await knex('conversations')
        .where({ roommate_status: 'confirmed' })
        .update({
          a_confirmed_roommates: 1,
          b_confirmed_roommates: 1,
        });
    }
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasAShares = await knex.schema.hasColumn('conversations', 'a_shares_contact');
  if (hasAShares) {
    await knex.schema.table('conversations', (table) => {
      table.dropColumn('a_shares_contact');
      table.dropColumn('b_shares_contact');
      table.dropColumn('a_confirmed_roommates');
      table.dropColumn('b_confirmed_roommates');
    });
  }
}
