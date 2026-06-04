// Request deduplication and caching to prevent redundant API calls

interface CachedRequest {
  promise: Promise<any>;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const requestCache = new Map<string, CachedRequest>();
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Generate cache key from URL and params
 */
function getCacheKey(url: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }
  const queryString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join('&');
  return `${url}?${queryString}`;
}

/**
 * Check if cached entry is still valid
 */
function isCacheValid(cached: CachedRequest): boolean {
  return Date.now() - cached.timestamp < cached.ttl;
}

/**
 * Get from cache or make request, deduplicating in-flight requests
 */
export async function cachedRequest<T>(
  fn: () => Promise<T>,
  key: string,
  options: { ttl?: number; skipCache?: boolean } = {}
): Promise<T> {
  const { ttl = 5 * 60 * 1000, skipCache = false } = options; // Default 5 min TTL

  // Check if request is already in flight (deduplication)
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  // Check cache (if not skipped)
  if (!skipCache && requestCache.has(key)) {
    const cached = requestCache.get(key)!;
    if (isCacheValid(cached)) {
      return cached.promise;
    }
  }

  // Make request
  const promise = fn();

  // Store as pending
  pendingRequests.set(key, promise);

  try {
    const result = await promise;

    // Store in cache
    requestCache.set(key, {
      promise: Promise.resolve(result),
      timestamp: Date.now(),
      ttl,
    });

    return result;
  } finally {
    // Remove from pending
    pendingRequests.delete(key);
  }
}

/**
 * Clear all cached requests
 */
export function clearCache() {
  requestCache.clear();
}

/**
 * Clear cache for specific pattern
 */
export function clearCachePattern(pattern: string | RegExp) {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  for (const key of requestCache.keys()) {
    if (regex.test(key)) {
      requestCache.delete(key);
    }
  }
}

/**
 * Get cache size
 */
export function getCacheSize() {
  return requestCache.size;
}

/**
 * Get pending requests count
 */
export function getPendingRequestsCount() {
  return pendingRequests.size;
}

/**
 * Monitor cache stats (for debugging)
 */
export function getCacheStats() {
  return {
    cacheSize: requestCache.size,
    pendingRequests: pendingRequests.size,
    cacheKeys: Array.from(requestCache.keys()),
  };
}
