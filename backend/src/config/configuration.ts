export default () => ({
  port: Number(process.env.PORT ?? 5000),

  frontendUrl:
    process.env.FRONTEND_URL ?? 'http://localhost:3000',

  jwtSecret: process.env.JWT_SECRET ?? 'haisan-express-jwt-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  nodeEnv: process.env.NODE_ENV ?? 'development',
});
