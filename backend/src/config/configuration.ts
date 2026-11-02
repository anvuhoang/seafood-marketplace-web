export default () => ({
  port: Number(process.env.PORT ?? 5000),

  frontendUrl:
    process.env.FRONTEND_URL ?? 'http://localhost:3000',

  jwtSecret: process.env.JWT_SECRET ?? 'haisan-express-jwt-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Review photos are uploaded straight from the browser with a signature
  // from this API; uploads are disabled while these are missing.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
});
