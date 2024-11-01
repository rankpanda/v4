export const GROQ_CONFIG = {
  API_KEY: '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',
  MODELS_CACHE_KEY: 'groq_models',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  BATCH_SIZE: 2,
  BATCH_DELAY: 3000, // 3 seconds between batches
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second between retries
  DEFAULT_MODEL: 'mixtral-8x7b-32768'
};