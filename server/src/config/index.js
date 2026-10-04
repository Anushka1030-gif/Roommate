import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('3306').transform((v) => parseInt(v, 10)),
  DB_USER: z.string().default('roomie_user'),
  DB_PASSWORD: z.string().default('roomie_secret'),
  DB_NAME: z.string().default('roomiematch'),

  JWT_SECRET: z.string().default('dev_jwt_secret_key_change_in_production_12345'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.string().default('587').transform((v) => parseInt(v, 10)),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default('noreply@roomiematch.edu'),

  LLM_PROVIDER: z.string().default('anthropic'),
  LLM_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  LLM_ENABLED: z.string().default('true').transform((v) => v === 'true'),

  ADMIN_EMAIL: z.string().email().default('admin@roomiematch.edu'),
  ADMIN_PASSWORD: z.string().default('AdminSecurePassword123!'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

export const BLOCKED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'proton.me',
  'protonmail.com',
  'icloud.com',
  'live.com',
  'aol.com',
];

export const SUPPORTED_CITIES = ['Bhopal'];

export const config = {
  port: parsed.data.PORT,
  nodeEnv: parsed.data.NODE_ENV,
  clientUrl: parsed.data.CLIENT_URL,
  db: {
    host: parsed.data.DB_HOST,
    port: parsed.data.DB_PORT,
    user: parsed.data.DB_USER,
    password: parsed.data.DB_PASSWORD,
    name: parsed.data.DB_NAME,
  },
  jwt: {
    secret: parsed.data.JWT_SECRET,
    expiresIn: parsed.data.JWT_EXPIRES_IN,
  },
  smtp: {
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    user: parsed.data.SMTP_USER,
    pass: parsed.data.SMTP_PASS,
    mailFrom: parsed.data.MAIL_FROM,
  },
  llm: {
    provider: parsed.data.LLM_PROVIDER,
    apiKey: parsed.data.LLM_API_KEY,
    model: parsed.data.LLM_MODEL,
    enabled: parsed.data.LLM_ENABLED,
  },
  admin: {
    email: parsed.data.ADMIN_EMAIL,
    password: parsed.data.ADMIN_PASSWORD,
  },
};

export default config;
