export {};

declare global {
  interface Env {
    DATA_BASE_URL: string;
    DATA_CACHE_TTL_SECONDS?: string;
    ALLOWED_ORIGINS?: string;
  }
}
