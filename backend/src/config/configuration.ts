export default () => ({
  port: Number(process.env.PORT ?? 5000),

  frontendUrl:
    process.env.FRONTEND_URL ?? 'http://localhost:3000',

  // Required; validated at startup by validateEnv (no insecure fallback).
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  nodeEnv: process.env.NODE_ENV ?? 'development',
});
