export default () => ({
  port: Number(process.env.PORT ?? 5000),

  frontendUrl:
    process.env.FRONTEND_URL ?? 'http://localhost:3000',

  // Required; validated at startup by validateEnv (no insecure fallback).
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Swagger UI at /api/docs: on outside production unless API_DOCS_ENABLED says otherwise.
  apiDocsEnabled: process.env.API_DOCS_ENABLED
    ? process.env.API_DOCS_ENABLED === 'true'
    : (process.env.NODE_ENV ?? 'development') !== 'production',

  // Review photos are uploaded straight from the browser with a signature
  // from this API; uploads are disabled while these are missing.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
});
