import db from './index.js';

async function resetDatabase() {
  try {
    console.log('🔄 Rolling back all migrations...');
    await db.migrate.rollback(undefined, true);
    console.log('✅ Rollback complete.');

    console.log('🔄 Running latest migrations...');
    await db.migrate.latest();
    console.log('✅ Migrations complete.');

    console.log('🌱 Seeding database...');
    await db.seed.run();
    console.log('✅ Seeding complete.');

    console.log('🎉 Database reset successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

resetDatabase();
