// Self-contained: serialized into the official Playwright MCP execution context.
export async function installNetworkRecovery(page, options = {}) {
  const context = page.context();
  const timeoutMs = Math.min(60000, Math.max(1000, options.timeoutMs ?? 30000));
  const runtimeTimeoutMs = Math.min(
    120000,
    Math.max(timeoutMs, options.runtimeTimeoutMs ?? 90000),
  );
  if (context.__smartedaNetwork) return context.__smartedaNetwork.report();
  const retries = Math.min(2, Math.max(0, options.retries ?? 2));
  const delayMs = Math.min(2000, Math.max(0, options.delayMs ?? 300));
  const maxCacheBytes = Math.min(
    64 * 1024 * 1024,
    Math.max(0, options.maxCacheBytes ?? 32 * 1024 * 1024),
  );
  const state = {
    requests: 0,
    activeRequests: 0,
    retries: 0,
    hits: 0,
    failures: 0,
    cacheBytes: 0,
    cache: new Map(),
    events: [],
  };
  const record = (kind, status) => {
    state.events.push({
      kind,
      ...(status === undefined ? {} : { status }),
      at: Date.now(),
    });
    if (state.events.length > 30) state.events.shift();
  };
  state.report = () => ({
    enabled: true,
    requests: state.requests,
    activeRequests: state.activeRequests,
    retries: state.retries,
    cacheHits: state.hits,
    failures: state.failures,
    cacheBytes: state.cacheBytes,
    cacheEntries: state.cache.size,
    events: [...state.events],
    policy: {
      maxAttempts: retries + 1,
      timeoutPerAttemptMs: timeoutMs,
      runtimeTimeoutPerAttemptMs: runtimeTimeoutMs,
      maxCacheBytes,
      apiRetries: false,
      writeRetries: false,
      persistentCache: false,
    },
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const official = url.origin === "https://design.ismarteda.com";
    const asset =
      /^\/assets\/[^/]+\.(?:js|css|woff2?|ttf|wasm)$/.test(url.pathname) ||
      /^\/(?:smartEDA\.(?:js|wasm|worker\.js)|qtloader\.js)$/.test(
        url.pathname,
      );
    if (
      request.method() !== "GET" ||
      !official ||
      (!asset &&
        !(
          url.pathname === "/" &&
          !url.search &&
          request.resourceType() === "document"
        ))
    )
      return route.continue();
    state.requests++;
    state.activeRequests++;
    try {
      const immutable =
        asset &&
        /^\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(?:js|css|woff2?|ttf)$/.test(
          url.pathname,
        ) &&
        !url.search;
      const hit = immutable && state.cache.get(url.href);
      if (hit) {
        state.hits++;
        state.cache.delete(url.href);
        state.cache.set(url.href, hit);
        return route.fulfill(hit);
      }
      for (let attempt = 0; attempt <= retries; attempt++) {
        let response;
        try {
          response = await route.fetch({
            timeout: /\.wasm$|^\/smartEDA\.js$/.test(url.pathname)
              ? runtimeTimeoutMs
              : timeoutMs,
            maxRedirects: 0,
            maxRetries: 0,
          });
        } catch {
          if (attempt < retries) {
            state.retries++;
            record("transport-retry");
            await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
            continue;
          }
          state.failures++;
          record("transport-failed");
          return route.abort("failed");
        }
        const status = response.status();
        if (
          [408, 429, 500, 502, 503, 504].includes(status) &&
          attempt < retries
        ) {
          state.retries++;
          record("http-retry", status);
          await response.dispose?.();
          const seconds = Number(response.headers()["retry-after"]);
          const pause =
            Number.isFinite(seconds) && seconds > 0
              ? Math.min(seconds * 1000, 2000)
              : delayMs * (attempt + 1);
          await new Promise((r) => setTimeout(r, pause));
          continue;
        }
        if (status >= 400) {
          state.failures++;
          record("http-failed", status);
        }
        const headers = response.headers(),
          type = headers["content-type"] || "";
        const validMime = url.pathname.endsWith(".js")
          ? /javascript|ecmascript/.test(type)
          : url.pathname.endsWith(".css")
            ? /text\/css/.test(type)
            : /font|woff|octet-stream/.test(type);
        if (
          immutable &&
          status === 200 &&
          validMime &&
          !headers["set-cookie"] &&
          !/(?:\*|cookie|authorization)/i.test(headers["vary"] || "") &&
          !/no-store|private|no-cache/i.test(headers["cache-control"] || "")
        ) {
          const body = await response.body();
          if (body.length <= maxCacheBytes) {
            while (
              state.cacheBytes + body.length > maxCacheBytes &&
              state.cache.size
            ) {
              const key = state.cache.keys().next().value;
              state.cacheBytes -= state.cache.get(key).body.length;
              state.cache.delete(key);
            }
            const cleaned = { ...headers };
            for (const key of [
              "content-encoding",
              "content-length",
              "transfer-encoding",
            ])
              delete cleaned[key];
            if (state.cache.has(url.href))
              state.cacheBytes -= state.cache.get(url.href).body.length;
            state.cache.set(url.href, { status, headers: cleaned, body });
            state.cacheBytes += body.length;
          }
        }
        await route.fulfill({ response });
        await response.dispose?.();
        return;
      }
    } finally {
      state.activeRequests--;
    }
  });
  context.__smartedaNetwork = state;
  return state.report();
}
export function buildNetworkCode(options = {}) {
  return `async(page)=>await (${installNetworkRecovery.toString()})(page,${JSON.stringify(options)})`;
}
