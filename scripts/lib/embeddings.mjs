import { loadLocalEnv } from "./env.mjs";

export const DEFAULT_EMBEDDING_MODEL = "BAAI/bge-m3";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1024;

function normalizeEmbedding(vector) {
  if (!Array.isArray(vector)) return null;
  if (vector.every((value) => typeof value === "number")) return vector;

  if (Array.isArray(vector[0])) {
    const rows = vector.filter((row) => Array.isArray(row));
    if (!rows.length) return null;
    const dimensions = rows[0].length;
    return Array.from({ length: dimensions }, (_, index) => {
      const sum = rows.reduce((total, row) => total + Number(row[index] ?? 0), 0);
      return sum / rows.length;
    });
  }

  return null;
}

function vectorToSql(vector) {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

function parseEmbeddingResponse(payload) {
  if (payload?.result) {
    return parseEmbeddingResponse(payload.result);
  }

  if (payload?.data && Array.isArray(payload.data) && Array.isArray(payload.data[0])) {
    return payload.data.map(normalizeEmbedding);
  }

  if (payload?.data?.[0]?.embedding) {
    return payload.data.map((item) => normalizeEmbedding(item.embedding));
  }

  if (payload?.embeddings) {
    return payload.embeddings.map(normalizeEmbedding);
  }

  if (Array.isArray(payload) && payload[0]?.embedding) {
    return payload.map((item) => normalizeEmbedding(item.embedding));
  }

  if (Array.isArray(payload) && Array.isArray(payload[0]) && typeof payload[0][0] === "number") {
    return [normalizeEmbedding(payload)];
  }

  if (Array.isArray(payload) && Array.isArray(payload[0]) && Array.isArray(payload[0][0])) {
    return payload.map(normalizeEmbedding);
  }

  return [];
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`Embedding request failed ${response.status}: ${text.slice(0, 300)}`);
  }

  return payload;
}

export function getEmbeddingConfig() {
  loadLocalEnv();
  const model = process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const dimensions = Number(process.env.EMBEDDING_DIMENSIONS || DEFAULT_EMBEDDING_DIMENSIONS);

  return {
    model,
    dimensions,
    apiUrl: process.env.EMBEDDING_API_URL,
    apiKey: process.env.EMBEDDING_API_KEY,
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    cloudflareApiToken: process.env.CLOUDFLARE_AI_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN,
    cloudflareModel: process.env.CLOUDFLARE_AI_EMBEDDING_MODEL || "@cf/baai/bge-m3",
    huggingFaceToken: process.env.HUGGINGFACE_API_TOKEN,
    azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureDeployment: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
    azureApiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-01",
  };
}

export function assertEmbeddingProvider(config = getEmbeddingConfig()) {
  if (
    config.apiUrl ||
    (config.cloudflareAccountId && config.cloudflareApiToken) ||
    config.huggingFaceToken ||
    (config.azureEndpoint && config.azureApiKey && config.azureDeployment)
  ) {
    return;
  }

  throw new Error(
    [
      "No cloud embedding provider configured.",
      "Set one of:",
      "- CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_API_TOKEN for Cloudflare Workers AI BGE-M3",
      "- EMBEDDING_API_URL + EMBEDDING_API_KEY for OpenAI-compatible/TEI endpoint",
      "- HUGGINGFACE_API_TOKEN for Hugging Face BAAI/bge-m3",
      "- AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY + AZURE_OPENAI_EMBEDDING_DEPLOYMENT",
    ].join("\n")
  );
}

export async function embedTexts(texts, config = getEmbeddingConfig()) {
  assertEmbeddingProvider(config);

  if (config.azureEndpoint && config.azureApiKey && config.azureDeployment) {
    const endpoint = config.azureEndpoint.replace(/\/$/, "");
    const url = `${endpoint}/openai/deployments/${encodeURIComponent(config.azureDeployment)}/embeddings?api-version=${encodeURIComponent(config.azureApiVersion)}`;
    const payload = await requestJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.azureApiKey,
      },
      body: JSON.stringify({ input: texts }),
    });
    return parseEmbeddingResponse(payload);
  }

  if (config.cloudflareAccountId && config.cloudflareApiToken) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.cloudflareAccountId)}/ai/run/${config.cloudflareModel}`;
    const payload = await requestJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.cloudflareApiToken}`,
      },
      body: JSON.stringify({ text: texts }),
    });
    return parseEmbeddingResponse(payload);
  }

  if (config.apiUrl) {
    const payload = await requestJson(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        input: texts,
        inputs: texts.length === 1 ? texts[0] : texts,
        model: config.model,
      }),
    });
    return parseEmbeddingResponse(payload);
  }

  const payload = await requestJson(
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${encodeURIComponent(config.model)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.huggingFaceToken}`,
      },
      body: JSON.stringify({
        inputs: texts.length === 1 ? texts[0] : texts,
        options: { wait_for_model: true },
      }),
    }
  );
  return parseEmbeddingResponse(payload);
}

export { vectorToSql };
