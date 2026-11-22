// Imported first by run-eval.ts: the configuration reads these when the app module loads, and the eval sends
// far more messages than a person would, so the limits are lifted for this process only.
process.env.CHAT_RATE_LIMIT_MESSAGES ??= '10000';
process.env.CHAT_DAILY_BUDGET ??= '100000';
process.env.CHAT_RATE_LIMIT_WINDOW_MINUTES ??= '1';
process.env.CHAT_TIMEOUT_MS ??= '60000';
