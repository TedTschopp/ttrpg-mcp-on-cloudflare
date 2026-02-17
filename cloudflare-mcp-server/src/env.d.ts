export {};

declare global {
  interface Env {
    DATA_BASE_URL: string;
    DATA_CACHE_TTL_SECONDS?: string;
    ALLOWED_ORIGINS?: string;
    BUILD_VERSION?: string;
    BUILD_COMMIT?: string;
    BUILD_TIME?: string;
  }
}
