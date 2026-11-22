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

  // Checkout. There is no shipping-rate table yet, so every vendor order costs the same flat fee (VND).
  checkout: {
    shippingFeePerVendor: Number(process.env.SHIPPING_FEE_PER_VENDOR ?? 30000),
  },

  // PayOS (QR bank transfer). The keys stay on the server; QR payment is off while any is missing.
  // Create them in the PayOS dashboard (sandbox/test channel is fine for a demo).
  payos: {
    clientId: process.env.PAYOS_CLIENT_ID ?? '',
    apiKey: process.env.PAYOS_API_KEY ?? '',
    checksumKey: process.env.PAYOS_CHECKSUM_KEY ?? '',
    // How long a QR stays valid, in minutes.
    linkTtlMinutes: Number(process.env.PAYOS_LINK_TTL_MINUTES ?? 15),
  },

  // Email. 'smtp' sends through a mail server (Gmail: smtp.gmail.com with an app password); 'log' only writes the mail
  // in the API log (development, and the default until SMTP_USER is set); 'off' sends and logs nothing.
  mail: {
    provider: process.env.MAIL_PROVIDER || (process.env.SMTP_USER ? 'smtp' : 'log'),
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    // Port 465 is TLS from the start; 587 starts plain and upgrades (STARTTLS), which needs secure=false.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : Number(process.env.SMTP_PORT ?? 465) === 465,
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    // The sender shown to the customer. Gmail only sends as the signed-in address (or an alias set up in Gmail).
    from: process.env.MAIL_FROM || (process.env.SMTP_USER ? `"HaiSan Express" <${process.env.SMTP_USER}>` : '"HaiSan Express" <no-reply@haisanexpress.local>'),
    // Where the links in the mails lead: the address of the website.
    appUrl: (process.env.APP_URL || (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0] || 'http://localhost:3000').trim().replace(/\/+$/, ''),
  },

  // How long the link of a password reset works, in minutes.
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 30),

  // "Sign in with Google". Needs an OAuth client ID (Google Cloud Console, type "Web application"); the button is
  // hidden and the API refuses while it is empty. The client ID is public, there is no secret to keep.
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  },

  // Shared state. Without REDIS_URL the rate limits and the cache live in this process's memory, which is right
  // for one API process; with several processes behind a load balancer set REDIS_URL so they share them.
  redis: {
    url: process.env.REDIS_URL ?? '',
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'haisan:',
  },

  // Requests per IP address and window for every route that has no limit of its own (see @RateLimit).
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    defaultLimit: Number(process.env.RATE_LIMIT_DEFAULT ?? 300),
    defaultWindowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60),
    // Trust the "X-Internal-Request: 1" header, which only nginx's internal port sets (and its public port strips),
    // to leave the website server's own calls out of the per-IP count. They all come from one address on behalf of
    // many visitors, so counting them would put every visitor in one bucket. Switch on only behind that nginx.
    trustInternalHeader: process.env.RATE_LIMIT_TRUST_INTERNAL === 'true',
  },

  // Product search with Elasticsearch: typo-tolerant, accent-free, ranked by relevance, plus suggestions while typing.
  // Without ELASTICSEARCH_URL (or while it is down) the shop searches as before, in memory.
  search: {
    url: process.env.ELASTICSEARCH_URL || '',
    index: process.env.ELASTICSEARCH_INDEX || 'haisan-products',
    timeoutMs: Number(process.env.ELASTICSEARCH_TIMEOUT_MS ?? 1500),
    // How many best matches a search asks Elasticsearch for; the other filters are applied to these.
    maxResults: Number(process.env.SEARCH_MAX_RESULTS ?? 300),
  },

  // Cache of the product catalogue (listing and categories). Short, because stock changes with every order.
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    catalogTtlSeconds: Number(process.env.CACHE_CATALOG_TTL_SECONDS ?? 30),
  },

  // Behind a reverse proxy or load balancer, how many proxies to trust so request.ip is the visitor and not the
  // proxy: a number of hops ("1"), "true", or a list of addresses ("loopback, 10.0.0.0/8"). Empty = no proxy.
  trustProxy: process.env.TRUST_PROXY ?? '',

  // Chatbot (shopping assistant). The key stays on the server.
  // 'off' until GEMINI_API_KEY is set; 'mock' is a local stand-in that needs no key, for development and tests.
  chat: {
    enabled: process.env.CHATBOT_ENABLED !== 'false',
    // `||`, not `??`: an empty CHAT_PROVIDER (as docker compose passes when it is not set) means "not set".
    provider:
      process.env.CHAT_PROVIDER ||
      (process.env.GEMINI_API_KEY ? 'gemini' : 'off'),
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    chatModel: process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash',
    embedModel: process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-001',
    embedDimensions: Number(process.env.GEMINI_EMBED_DIMENSIONS ?? 768),
    timeoutMs: Number(process.env.CHAT_TIMEOUT_MS ?? 30000),
    maxOutputTokens: Number(process.env.CHAT_MAX_OUTPUT_TOKENS ?? 1500),
    // A message longer than this is refused, so one request cannot spend the whole quota.
    maxMessageLength: Number(process.env.CHAT_MAX_MESSAGE_LENGTH ?? 500),
    // Messages per person in the window below (signed-in customers by user id, guests by IP address).
    rateLimitMessages: Number(process.env.CHAT_RATE_LIMIT_MESSAGES ?? 20),
    rateLimitWindowMinutes: Number(process.env.CHAT_RATE_LIMIT_WINDOW_MINUTES ?? 10),
    // Messages the whole shop may send in a day, so a script cannot spend the model quota.
    rateLimitDailyBudget: Number(process.env.CHAT_DAILY_BUDGET ?? 2000),
    // Messages of the conversation sent back to the model each turn.
    historyMessages: Number(process.env.CHAT_HISTORY_MESSAGES ?? 12),
    // How many times the model may call tools before it has to answer.
    maxToolRounds: Number(process.env.CHAT_MAX_TOOL_ROUNDS ?? 4),
  },

  // Smart Import (vendor product drafts from text or voice). The key stays on the server.
  // 'off' until GROQ_API_KEY is set; 'mock' is a local stand-in that needs no key.
  smartImport: {
    provider:
      process.env.SMART_IMPORT_PROVIDER ||
      (process.env.GROQ_API_KEY ? 'groq' : 'off'),
    groqApiKey: process.env.GROQ_API_KEY ?? '',
    transcribeModel:
      process.env.SMART_IMPORT_TRANSCRIBE_MODEL ?? 'whisper-large-v3-turbo',
    extractModel:
      process.env.SMART_IMPORT_EXTRACT_MODEL ?? 'openai/gpt-oss-120b',
    timeoutMs: Number(process.env.SMART_IMPORT_TIMEOUT_MS ?? 20000),
  },

  // Visual Search (customers find seafood from a photo). Uses the same Groq key,
  // which stays on the server. 'off' until GROQ_API_KEY is set; there is no mock.
  visualSearch: {
    provider:
      process.env.VISUAL_SEARCH_PROVIDER ??
      (process.env.GROQ_API_KEY ? 'groq' : 'off'),
    groqApiKey: process.env.GROQ_API_KEY ?? '',
    model: process.env.VISUAL_SEARCH_MODEL ?? 'qwen/qwen3.8-27b',
    timeoutMs: Number(process.env.VISUAL_SEARCH_TIMEOUT_MS ?? 20000),
  },
});
