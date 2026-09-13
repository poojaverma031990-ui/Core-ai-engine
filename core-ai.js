class CoreAIEngine { constructor(config = {}) { this.config = { modelUrl: null,
cacheName: 'core-ai-engine-v1', ...config }; this.modelBuffer = null; }

static async init(config = {}) { const engine = new CoreAIEngine(config); await
engine._bootstrap(); return engine; }

async _bootstrap() { const { modelUrl, cacheName } = this.config;

if (!modelUrl) {
  throw new Error('[CoreAIEngine] Initialization failed: "modelUrl" is required in config.');
}

if (typeof caches === 'undefined') {
  throw new Error('[CoreAIEngine] Cache Storage API is not supported in this environment.');
}

const cache = await caches.open(cacheName);
const cachedResponse = await cache.match(modelUrl);

if (cachedResponse) {
  console.log(`[CoreAIEngine] Instant boot: Found cached model binary for ${modelUrl}`);
  this.modelBuffer = await cachedResponse.arrayBuffer();
  return this.modelBuffer;
}

console.log(`[CoreAIEngine] Model not found locally. Initiating stream download from: ${modelUrl}`);
const response = await fetch(modelUrl);

if (!response.ok) {
  throw new Error(`[CoreAIEngine] Network fetch failed with status: ${response.status} ${response.statusText}`);
}

const contentLengthHeader = response.headers.get('content-length');
const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
const reader = response.body.getReader();
const chunks = [];
let receivedBytes = 0;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  chunks.push(value);
  receivedBytes += value.length;

  if (totalBytes > 0) {
    const percent = ((receivedBytes / totalBytes) * 100).toFixed(2);
    console.log(`[CoreAIEngine] Downloading payload: ${percent}% (${receivedBytes} / ${totalBytes} bytes)`);
  } else {
    console.log(`[CoreAIEngine] Downloading payload: ${(receivedBytes / (1024 * 1024)).toFixed(2)} MB`);
  }
}

const binaryPayload = new Uint8Array(receivedBytes);
let offset = 0;
for (const chunk of chunks) {
  binaryPayload.set(chunk, offset);
  offset += chunk.length;
}

this.modelBuffer = binaryPayload.buffer;

const cacheEntry = new Response(binaryPayload, {
  headers: {
    'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
    'Content-Length': receivedBytes.toString()
  }
});

await cache.put(modelUrl, cacheEntry);
console.log(`[CoreAIEngine] Model binary cached successfully (${(receivedBytes / (1024 * 1024)).toFixed(2)} MB). Engine ready.`);

return this.modelBuffer;

} }

if (typeof module !== 'undefined' && module.exports) { module.exports =
CoreAIEngine; } else if (typeof globalThis !== 'undefined') {
globalThis.CoreAIEngine = CoreAIEngine; }
