type CacheEntry<T> = {
  expiresAtMs: number;
  value: T;
};

type InFlightEntry<T> = Promise<T>;

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, InFlightEntry<unknown>>();

function nowMs(): number {
  return Date.now();
}

function clampTtlSeconds(ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds)) return 0;
  return Math.max(0, Math.floor(ttlSeconds));
}

function withCacheControl(response: Response, ttlSeconds: number): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${ttlSeconds}`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function getDefaultCache(): Promise<Cache | undefined> {
  if (typeof caches === "undefined") return undefined;

  const cfCaches = caches as unknown as {
    default?: Cache;
    open?: (cacheName: string) => Promise<Cache>;
  };

  if (cfCaches.default) return cfCaches.default;
  if (cfCaches.open) return await cfCaches.open("default");
  return undefined;
}

export type FetchJsonCachedOptions = {
  ttlSeconds: number;
  ctx?: ExecutionContext;
};

export async function fetchJsonCached<T>(url: string, options: FetchJsonCachedOptions): Promise<T> {
  const ttlSeconds = clampTtlSeconds(options.ttlSeconds);
  const cacheKey = url;

  if (ttlSeconds > 0) {
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAtMs > nowMs()) {
      return cached.value as T;
    }
  }

  const existing = inFlight.get(cacheKey);
  if (existing) return (await existing) as T;

  const loadPromise = (async (): Promise<T> => {
    const request = new Request(url, { method: "GET" });

    const cache = ttlSeconds > 0 ? await getDefaultCache() : undefined;

    if (cache) {
      const hit = await cache.match(request);
      if (hit) {
        const json = (await hit.json()) as T;
        memoryCache.set(cacheKey, { expiresAtMs: nowMs() + ttlSeconds * 1000, value: json });
        return json;
      }
    }

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const responseForJson = response.clone();
    const responseForCache = response.clone();

    const json = (await responseForJson.json()) as T;

    if (ttlSeconds > 0) {
      memoryCache.set(cacheKey, { expiresAtMs: nowMs() + ttlSeconds * 1000, value: json });

      if (cache) {
        const putPromise = cache.put(request, withCacheControl(responseForCache, ttlSeconds));
        if (options.ctx) options.ctx.waitUntil(putPromise);
        else await putPromise;
      }
    }

    return json;
  })();

  inFlight.set(cacheKey, loadPromise as InFlightEntry<unknown>);

  try {
    return await loadPromise;
  } finally {
    inFlight.delete(cacheKey);
  }
}
