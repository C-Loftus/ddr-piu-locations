export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Build upstream URL to ZIV API
    const target = "https://zenius-i-vanisher.com" + url.pathname + url.search;

    // Use Cloudflare's global cache
    const cache = caches.default;
    const cacheKey = new Request(target, request);

    // 1️⃣ Try serving from cache first
    let cached = await cache.match(cacheKey);
    if (cached) {
      return new Response(cached.body, {
        status: cached.status,
        headers: {
          ...Object.fromEntries(cached.headers.entries()),
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Handle OPTIONS (preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      });
    }

    // 2️⃣ Fetch from upstream if not cached
    const upstream = await fetch(target, {
      method: "GET",
    });

    const body = await upstream.text();

    // 3️⃣ Create response so we can store it in cache
    const response = new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=360000", // clients cache 100 hours
        "Access-Control-Allow-Origin": "*",
      },
    });

    // 4️⃣ Put a clone into Cloudflare's cache asynchronously
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  },
};
