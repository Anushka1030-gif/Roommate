import path from 'path';
import { fileURLToPath } from 'url';
import config from './src/config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const knexConfig = {
  development: {
    client: 'mysql2',
    connection: {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      charset: 'utf8mb4',
    },
    migrations: {
      directory: path.join(__dirname, 'src/db/migrations'),
      loadExtensions: ['.js', '.mjs', '.cjs'],
    },
    seeds: {
      directory: path.join(__dirname, 'src/db/seeds'),
      loadExtensions: ['.js', '.mjs', '.cjs'],
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
  test: {
    client: 'mysql2',
    connection: {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: `${config.db.name}_test`,
      charset: 'utf8mb4',
    },
    migrations: {
      directory: path.join(__dirname, 'src/db/migrations'),
      loadExtensions: ['.js', '.mjs', '.cjs'],
    },
    seeds: {
      directory: path.join(__dirname, 'src/db/seeds'),
      loadExtensions: ['.js', '.mjs', '.cjs'],
    },
    pool: {
      min: 1,
      max: 5,
    },
  },
  production: {
    client: 'mysql2',
    connection: {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      charset: 'utf8mb4',
      ssl: { rejectUnauthorized: true },
    },
    migrations: {
      directory: path.join(__dirname, 'src/db/migrations'),
      loadExtensions: ['.js', '.mjs', '.cjs'],
    },
    seeds: {
      directory: path.join(__dirname, 'src/db/seeds'),
      loadExtensions: ['.js', '.mjs', '.cjs'],
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default knexConfig;
