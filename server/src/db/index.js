import knex from 'knex';
import knexConfig from '../../knexfile.js';
import config from '../config/index.js';

const environment = config.nodeEnv || 'development';
const dbConfig = knexConfig[environment] || knexConfig.development;

const db = knex(dbConfig);

export default db;
export { db };
