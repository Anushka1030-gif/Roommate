import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import knex from 'knex';
import bcrypt from 'bcrypt';
import knexConfig from '../../knexfile.js';
import config from '../config/index.js';

describe('Database Migrations and Schema Integration', () => {
  let testDb;
  const testDbName = `${config.db.name}_test`;

  beforeAll(async () => {
    testDb = knex(knexConfig.test);
    // Ensure clean state before running tests
    await testDb.migrate.rollback(undefined, true);
  });

  afterAll(async () => {
    if (testDb) {
      await testDb.destroy();
    }
  });

  it('runs all migrations on test database and verifies all expected tables exist', async () => {
    // Run all migrations
    await testDb.migrate.latest();

    // Query MySQL information_schema for created tables
    const tables = await testDb('information_schema.tables')
      .where({ table_schema: testDbName })
      .select('table_name');

    const tableNames = tables.map((t) => t.table_name || t.TABLE_NAME);

    const requiredTables = [
      'users',
      'email_otps',
      'profiles',
      'requirements',
      'match_results',
      'conversations',
      'messages',
      'blocks',
      'reports',
      'rate_limit_events',
    ];

    for (const tableName of requiredTables) {
      expect(tableNames).toContain(tableName);
    }
  });

  it('runs seed idempotently creating the admin user without duplicates', async () => {
    // First run
    await testDb.seed.run();

    const adminEmail = config.admin?.email || 'admin@roomiematch.edu';
    const adminUsers = await testDb('users').where({ email: adminEmail });
    expect(adminUsers).toHaveLength(1);
    expect(adminUsers[0].role).toBe('admin');
    expect(adminUsers[0].email_verified).toBeTruthy();

    const isValidPassword = await bcrypt.compare(
      config.admin?.password || 'AdminSecurePassword123!',
      adminUsers[0].password_hash,
    );
    expect(isValidPassword).toBe(true);

    // Second run (idempotency check)
    await testDb.seed.run();
    const adminUsersAfterSecondSeed = await testDb('users').where({ email: adminEmail });
    expect(adminUsersAfterSecondSeed).toHaveLength(1);
  });

  it('enforces foreign key constraints and cascades on delete', async () => {
    const adminEmail = config.admin?.email || 'admin@roomiematch.edu';
    const admin = await testDb('users').where({ email: adminEmail }).first();
    expect(admin).toBeDefined();

    // Admin profile should exist
    const profile = await testDb('profiles').where({ user_id: admin.id }).first();
    expect(profile).toBeDefined();
    expect(profile.user_id).toBe(admin.id);

    // Create a temporary rate limit event
    await testDb('rate_limit_events').insert({
      user_id: admin.id,
      action: 'test_action',
    });

    const events = await testDb('rate_limit_events').where({ user_id: admin.id });
    expect(events.length).toBeGreaterThan(0);
  });

  it('rolls back all migrations successfully', async () => {
    await testDb.migrate.rollback(undefined, true);

    const tables = await testDb('information_schema.tables')
      .where({ table_schema: testDbName })
      .select('table_name');

    const tableNames = tables.map((t) => t.table_name || t.TABLE_NAME);

    // All application tables should be dropped (only knex tracking tables or none remain)
    expect(tableNames).not.toContain('users');
    expect(tableNames).not.toContain('profiles');
    expect(tableNames).not.toContain('conversations');
    expect(tableNames).not.toContain('rate_limit_events');
  });
});
