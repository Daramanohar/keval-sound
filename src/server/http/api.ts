import "server-only";

import crypto from "node:crypto";
import { ZodError, type ZodType } from "zod";

type ErrorDetails = Record<string, unknown> | Array<Record<string, unknown>>;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ErrorDetails;

  constructor(status: number, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getRequestId(request: Request) {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && /^[A-Za-z0-9._:-]{8,128}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

export function apiJson(body: unknown, status = 200, requestId?: string) {
  const headers = new Headers({
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  if (requestId) headers.set("X-Request-Id", requestId);

  return Response.json(body, { status, headers });
}

export function assertTrustedMutationOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    throw new ApiError(403, "cross_site_request_blocked", "Cross-site mutations are not allowed.");
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    throw new ApiError(403, "origin_required", "A trusted request origin is required.");
  }

  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : requestOrigin;
  const allowedOrigins = new Set([requestOrigin, configuredOrigin]);

  if (process.env.NODE_ENV !== "production") {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.hostname === "localhost" || parsedOrigin.hostname === "127.0.0.1") {
      return;
    }
  }

  if (!allowedOrigins.has(origin)) {
    throw new ApiError(403, "origin_not_allowed", "The request origin is not allowed.");
  }
}

export async function readJson<T>(request: Request, schema: ZodType<T>, maxBytes = 32_768) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Content-Type must be application/json.");
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maxBytes) {
    throw new ApiError(413, "request_too_large", "The request body is too large.");
  }

  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    throw new ApiError(400, "invalid_json", "The request body is not valid JSON.");
  }

  return schema.parse(value);
}

type ApiHandler<TContext> = (request: Request, context: TContext, requestId: string) => Promise<Response>;

export function withApiHandler<TContext>(handler: ApiHandler<TContext>) {
  return async (request: Request, context: TContext) => {
    const requestId = getRequestId(request);

    try {
      const response = await handler(request, context, requestId);
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("Cache-Control", response.headers.get("Cache-Control") ?? "no-store, max-age=0");
      response.headers.set("X-Content-Type-Options", "nosniff");
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        return apiJson(
          {
            error: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
            requestId,
          },
          error.status,
          requestId
        );
      }

      if (error instanceof ZodError) {
        return apiJson(
          {
            error: "invalid_request",
            message: "One or more request fields are invalid.",
            details: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
            requestId,
          },
          400,
          requestId
        );
      }

      console.error("[api] unhandled request failure", {
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        error,
      });

      return apiJson(
        {
          error: "internal_server_error",
          message: "The request could not be completed.",
          requestId,
        },
        500,
        requestId
      );
    }
  };
}
