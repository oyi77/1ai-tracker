// ─────────────────────────────────────────────────────────────
// Shared HTTP Client for External API Integrations
// Provides: retry with exponential backoff, timeout, rate limiting
// ─────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1_000;

interface FetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  cacheSec?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
}

/** Fetch with exponential backoff retry and timeout */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    headers = {},
    method = "GET",
    body,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method,
        headers: { Accept: "application/json", ...headers },
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.status === 429) {
        // Rate limited — respect Retry-After header or use exponential backoff
        const retryAfter = parseInt(res.headers.get("Retry-After") || "0", 10);
        const delayMs = retryAfter > 0 ? retryAfter * 1000 : baseDelayMs * Math.pow(2, attempt);
        console.warn(`[http] rate limited on ${url}, retrying in ${delayMs}ms`);
        await delay(delayMs);
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText} from ${url}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (lastError.name === "AbortError") {
        lastError = new Error(`Timeout (${timeoutMs}ms) fetching ${url}`);
      }

      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.warn(`[http] attempt ${attempt + 1} failed for ${url}: ${lastError.message}, retrying in ${delayMs}ms`);
        await delay(delayMs);
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url} after ${maxRetries + 1} attempts`);
}


/** Simple JSON fetch without retry (non-Next.js context) */
export async function fetchJson<T = unknown>(
  url: string,
  headers: Record<string, string> = {}
): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return (await res.json()) as T;
}

/** JSON-RPC call with retry (for blockchain RPC endpoints) */
export async function rpcCall<T = unknown>(
  url: string,
  method: string,
  params: unknown[],
  options: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<T> {
  const result = await fetchWithRetry<{ result?: T; error?: { message: string } }>(url, {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  if (result.error) {
    throw new Error(`RPC ${method}: ${result.error.message}`);
  }

  return result.result as T;
}

/**
 * Rate-limited sequential executor.
 * Ensures `fn` is called at most `maxCalls` times per `windowMs`.
 */
export function createRateLimiter(maxCalls: number, windowMs: number) {
  const timestamps: number[] = [];

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    // Remove timestamps outside the window
    while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
      timestamps.shift();
    }

    if (timestamps.length >= maxCalls) {
      const waitMs = timestamps[0] + windowMs - now + 10;
      if (waitMs > 0) await delay(waitMs);
    }

    timestamps.push(Date.now());
    return fn();
  };
}

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}
