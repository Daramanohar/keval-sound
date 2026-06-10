export const DEFAULT_EMBEDDING_MODEL = "BAAI/bge-m3";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1024;

export type EmbeddingConfig = {
  model: string;
  dimensions: number;
  apiUrl?: string;
  apiKey?: string;
  huggingFaceToken?: string;
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeployment?: string;
  azureApiVersion: string;
};

function normalizeEmbedding(vector: unknown): number[] | null {
  if (!Array.isArray(vector)) return null;
  if (vector.every((value) => typeof value === "number")) return vector as number[];

  if (Array.isArray(vector[0])) {
    const rows = vector.filter((row): row is number[] => Array.isArray(row));
    if (!rows.length) return null;
    const dimensions = rows[0]?.length ?? 0;
    return Array.from({ length: dimensions }, (_, index) => {
      const sum = rows.reduce((total, row) => total + Number(row[index] ?? 0), 0);
      return sum / rows.length;
    });
  }

  return null;
}

function parseEmbeddingResponse(payload: unknown): Array<number[] | null> {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray(payload.data)
  ) {
    return payload.data.map((item: unknown) => {
      if (item && typeof item === "object" && "embedding" in item) {
        return normalizeEmbedding(item.embedding);
      }
      return null;
    });
  }

  if (
    payload &&
    typeof payload === "object" &&
    "embeddings" in payload &&
    Array.isArray(payload.embeddings)
  ) {
    return payload.embeddings.map(normalizeEmbedding);
  }

  if (Array.isArray(payload) && payload[0] && typeof payload[0] === "object" && "embedding" in payload[0]) {
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

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`Embedding request failed ${response.status}: ${text.slice(0, 300)}`);
  }

  return payload;
}

export function getEmbeddingConfig(): EmbeddingConfig {
  return {
    model: process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
    dimensions: Number(process.env.EMBEDDING_DIMENSIONS || DEFAULT_EMBEDDING_DIMENSIONS),
    apiUrl: process.env.EMBEDDING_API_URL,
    apiKey: process.env.EMBEDDING_API_KEY,
    huggingFaceToken: process.env.HUGGINGFACE_API_TOKEN,
    azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureDeployment: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
    azureApiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-01",
  };
}

export function isEmbeddingProviderConfigured(config = getEmbeddingConfig()) {
  return Boolean(
    config.apiUrl ||
      config.huggingFaceToken ||
      (config.azureEndpoint && config.azureApiKey && config.azureDeployment)
  );
}

export function vectorToSql(vector: number[]) {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

export async function embedTexts(texts: string[], config = getEmbeddingConfig()) {
  if (!isEmbeddingProviderConfigured(config)) {
    throw new Error("No cloud embedding provider configured");
  }

  if (config.azureEndpoint && config.azureApiKey && config.azureDeployment) {
    const endpoint = config.azureEndpoint.replace(/\/$/, "");
    const url = `${endpoint}/openai/deployments/${encodeURIComponent(
      config.azureDeployment
    )}/embeddings?api-version=${encodeURIComponent(config.azureApiVersion)}`;
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
