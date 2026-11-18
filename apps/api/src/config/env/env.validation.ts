import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('12h'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  WHATSAPP_PROVIDER: Joi.string().valid('stub').default('stub'),
  // tlds: false — allow custom domains like platform@fisiosuite.admin
  PLATFORM_ADMIN_EMAIL: Joi.string().email({ tlds: { allow: false } }).optional(),
  PLATFORM_ADMIN_PASSWORD: Joi.string().min(8).optional(),
  PLATFORM_ADMIN_NAME: Joi.string().default('Admin Plataforma'),
});
