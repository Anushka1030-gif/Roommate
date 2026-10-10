import bcrypt from 'bcrypt';
import config from '../../config/index.js';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  const adminEmail = config.admin?.email || process.env.ADMIN_EMAIL || 'admin@roomiematch.edu';
  const adminPassword =
    config.admin?.password || process.env.ADMIN_PASSWORD || 'AdminSecurePassword123!';

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await knex('users').where({ email: adminEmail }).first();

  if (!existingAdmin) {
    const [userId] = await knex('users').insert({
      email: adminEmail,
      password_hash: passwordHash,
      role: 'admin',
      email_verified: true,
      status: 'active',
    });

    await knex('profiles').insert({
      user_id: userId,
      full_name: 'RoomieMatch Administrator',
      profile_completed: true,
    });
  } else {
    await knex('users').where({ id: existingAdmin.id }).update({
      password_hash: passwordHash,
      role: 'admin',
      email_verified: true,
      status: 'active',
    });

    const existingProfile = await knex('profiles').where({ user_id: existingAdmin.id }).first();
    if (!existingProfile) {
      await knex('profiles').insert({
        user_id: existingAdmin.id,
        full_name: 'RoomieMatch Administrator',
        profile_completed: true,
      });
    }
  }
}
