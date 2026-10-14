/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Drop unique constraint on user_id if it exists
  try {
    await knex.schema.alterTable('requirements', (table) => {
      table.dropUnique(['user_id']);
    });
  } catch {
    // Unique constraint may have a different name or was already dropped
    try {
      await knex.raw('ALTER TABLE requirements DROP INDEX requirements_user_id_unique');
    } catch {
      // Ignore if index did not exist
    }
  }

  // Ensure user_id has an index
  try {
    await knex.schema.alterTable('requirements', (table) => {
      table.index('user_id');
    });
  } catch {
    // Index may already exist
  }

  // 2. Add PRD requirement columns if missing
  const hasGenderPref = await knex.schema.hasColumn('requirements', 'gender_preference');
  if (!hasGenderPref) {
    await knex.schema.alterTable('requirements', (table) => {
      table.enu('gender_preference', ['same_gender_only', 'any']).notNullable().defaultTo('any');
    });
  }

  const hasSleepSchedule = await knex.schema.hasColumn('requirements', 'preferred_sleep_schedule');
  if (!hasSleepSchedule) {
    await knex.schema.alterTable('requirements', (table) => {
      table.string('preferred_sleep_schedule', 30).notNullable().defaultTo('any');
    });
  }

  const hasCleanlinessMin = await knex.schema.hasColumn('requirements', 'preferred_cleanliness_min');
  if (!hasCleanlinessMin) {
    await knex.schema.alterTable('requirements', (table) => {
      table.tinyint('preferred_cleanliness_min').notNullable().defaultTo(1);
    });
  }

  const hasSmokingOk = await knex.schema.hasColumn('requirements', 'smoking_ok');
  if (!hasSmokingOk) {
    await knex.schema.alterTable('requirements', (table) => {
      table.boolean('smoking_ok').notNullable().defaultTo(false);
    });
  }

  const hasDrinkingOk = await knex.schema.hasColumn('requirements', 'drinking_ok');
  if (!hasDrinkingOk) {
    await knex.schema.alterTable('requirements', (table) => {
      table.boolean('drinking_ok').notNullable().defaultTo(false);
    });
  }

  const hasFoodPref = await knex.schema.hasColumn('requirements', 'food_preference');
  if (!hasFoodPref) {
    await knex.schema.alterTable('requirements', (table) => {
      table.string('food_preference', 30).notNullable().defaultTo('any');
    });
  }

  const hasGuestsOk = await knex.schema.hasColumn('requirements', 'guests_ok');
  if (!hasGuestsOk) {
    await knex.schema.alterTable('requirements', (table) => {
      table.enu('guests_ok', ['rarely', 'sometimes', 'often']).notNullable().defaultTo('sometimes');
    });
  }

  const hasNoiseTolerance = await knex.schema.hasColumn('requirements', 'noise_tolerance');
  if (!hasNoiseTolerance) {
    await knex.schema.alterTable('requirements', (table) => {
      table.string('noise_tolerance', 20).notNullable().defaultTo('any');
    });
  }

  const hasDealBreakers = await knex.schema.hasColumn('requirements', 'deal_breakers');
  if (!hasDealBreakers) {
    await knex.schema.alterTable('requirements', (table) => {
      table.string('deal_breakers', 400).nullable();
    });
  }

  const hasImportanceWeights = await knex.schema.hasColumn('requirements', 'importance_weights');
  if (!hasImportanceWeights) {
    await knex.schema.alterTable('requirements', (table) => {
      table.json('importance_weights').nullable();
    });
  }

  const hasIsActive = await knex.schema.hasColumn('requirements', 'is_active');
  if (!hasIsActive) {
    await knex.schema.alterTable('requirements', (table) => {
      table.boolean('is_active').notNullable().defaultTo(true);
      table.index(['city', 'is_active'], 'idx_city_active');
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const columnsToDrop = [
    'is_active',
    'importance_weights',
    'deal_breakers',
    'noise_tolerance',
    'guests_ok',
    'food_preference',
    'drinking_ok',
    'smoking_ok',
    'preferred_cleanliness_min',
    'preferred_sleep_schedule',
    'gender_preference',
  ];

  for (const col of columnsToDrop) {
    const exists = await knex.schema.hasColumn('requirements', col);
    if (exists) {
      await knex.schema.alterTable('requirements', (table) => {
        table.dropColumn(col);
      });
    }
  }
}
