/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('profiles', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.string('full_name', 100).notNullable();
    table.string('phone', 20).nullable();
    table.enu('gender', ['male', 'female', 'non-binary', 'other']).nullable();
    table.date('date_of_birth').nullable();
    table.string('college_name', 150).nullable();
    table.string('major', 100).nullable();
    table.integer('graduation_year').nullable();
    table.text('bio').nullable();
    table.string('avatar_url', 500).nullable();
    table.enu('sleep_schedule', ['early_bird', 'night_owl', 'flexible']).nullable();
    table.integer('cleanliness_level').nullable().defaultTo(3);
    table.enu('study_habits', ['silent', 'background_noise', 'group_study', 'flexible']).nullable();
    table.enu('noise_level', ['quiet', 'moderate', 'social']).nullable();
    table.enu('smoking_preference', ['no', 'outside_only', 'yes', 'flexible']).nullable();
    table.enu('drinking_preference', ['no', 'socially', 'yes', 'flexible']).nullable();
    table.enu('food_preference', ['vegetarian', 'non_vegetarian', 'vegan', 'eggetarian', 'any']).nullable();
    table.enu('pet_preference', ['no_pets', 'dog_friendly', 'cat_friendly', 'flexible']).nullable();
    table.enu('guest_policy', ['rarely', 'weekends_only', 'anytime', 'no_guests']).nullable();
    table.boolean('profile_completed').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index('user_id');
    table.index('college_name');
    table.index('profile_completed');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('profiles');
}
