export default () => ({
  port: Number(process.env.PORT ?? 5000),

  frontendUrl:
    process.env.FRONTEND_URL ?? 'http://localhost:3000',

  // Required; validated at startup by validateEnv (no insecure fallback).
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  // Admin sessions are shorter than customer ones.
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN ?? '2h',

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

  // Smart Import (vendor product drafts from text or voice). The key stays on the server.
  // 'off' until GROQ_API_KEY is set; 'mock' is a local stand-in that needs no key.
  smartImport: {
    provider:
      process.env.SMART_IMPORT_PROVIDER ??
      (process.env.GROQ_API_KEY ? 'groq' : 'off'),
    groqApiKey: process.env.GROQ_API_KEY ?? '',
    transcribeModel:
      process.env.SMART_IMPORT_TRANSCRIBE_MODEL ?? 'whisper-large-v3-turbo',
    extractModel:
      process.env.SMART_IMPORT_EXTRACT_MODEL ?? 'openai/gpt-oss-120b',
    timeoutMs: Number(process.env.SMART_IMPORT_TIMEOUT_MS ?? 20000),
    // Who turns speech into text: '' = the same provider as above, or 'local' = our own
    // Python service (ai-service/speech), with Groq as the fallback when it is down.
    speechProvider: process.env.SMART_IMPORT_SPEECH_PROVIDER ?? '',
    aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
    aiServiceToken: process.env.AI_SERVICE_TOKEN ?? '',
    aiServiceTimeoutMs: Number(process.env.AI_SERVICE_TIMEOUT_MS ?? 30000),
  },
});
