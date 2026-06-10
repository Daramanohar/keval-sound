export const DEFAULT_RERANKER_MODEL = "BAAI/bge-reranker-v2-m3";

export type RerankDocument = {
  id: string;
  text: string;
};

type ParsedRerankResult = {
  index: number;
  score: number;
};

function getScore(item: Record<string, unknown>) {
  const value = item.score ?? item.relevance_score ?? item.relevanceScore;
  return typeof value === "number" ? value : Number(value ?? 0);
}

function parseRerankResponse(payload: unknown): ParsedRerankResult[] {
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "results" in payload && Array.isArray(payload.results)
      ? payload.results
      : payload && typeof payload === "object" && "data" in payload && Array.isArray(payload.data)
        ? payload.data
        : [];

  return items
    .map((item): ParsedRerankResult | null => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      const index = Number(candidate.index ?? candidate.document_index ?? candidate.documentIndex);
      if (!Number.isInteger(index) || index < 0) return null;
      return {
        index,
        score: getScore(candidate),
      };
    })
    .filter((item) => item !== null)
    .sort((left, right) => right.score - left.score);
}

export function isRerankerConfigured() {
  return Boolean(process.env.RERANK_API_URL);
}

export async function rerankDocuments(query: string, documents: RerankDocument[]) {
  const apiUrl = process.env.RERANK_API_URL;
  if (!apiUrl) return documents;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.RERANK_API_KEY ? { Authorization: `Bearer ${process.env.RERANK_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: process.env.RERANKER_MODEL || DEFAULT_RERANKER_MODEL,
      query,
      documents: documents.map((document) => document.text),
      texts: documents.map((document) => document.text),
      raw_scores: false,
      truncate: true,
    }),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`Rerank request failed ${response.status}: ${text.slice(0, 300)}`);
  }

  const parsed = parseRerankResponse(payload);
  if (!parsed.length) return documents;

  const seen = new Set<number>();
  const ordered = parsed
    .map((result) => {
      seen.add(result.index);
      return documents[result.index];
    })
    .filter((document): document is RerankDocument => Boolean(document));

  for (const [index, document] of documents.entries()) {
    if (!seen.has(index)) ordered.push(document);
  }

  return ordered;
}
