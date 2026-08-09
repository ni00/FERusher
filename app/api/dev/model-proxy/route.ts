import {
  localModelProxyResponseHeader,
  localModelProxyResponseValue,
  localModelProxyTargetHeader,
} from "@/modules/ai/infrastructure/local-model-proxy-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maxRequestBytes = 4 * 1024 * 1024;

function errorResponse(message: string, status: number): Response {
  return Response.json(
    {
      error: {
        message,
        type: "devrusher_local_proxy_error",
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function isAllowedTarget(value: URL): boolean {
  return (
    (value.protocol === "http:" || value.protocol === "https:") &&
    !value.username &&
    !value.password &&
    value.pathname.replace(/\/+$/, "").endsWith("/chat/completions")
  );
}

function isSameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function isChatCompletionPayload(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const model = Reflect.get(value, "model");
  const messages = Reflect.get(value, "messages");
  return (
    typeof model === "string" && model.trim() !== "" && Array.isArray(messages)
  );
}

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV !== "development") {
    return errorResponse("Not Found", 404);
  }

  if (!isSameOriginRequest(request)) {
    return errorResponse("本地模型代理只接受同源请求。", 403);
  }

  const rawTarget = request.headers.get(localModelProxyTargetHeader);
  if (!rawTarget) {
    return errorResponse("缺少模型端点地址。", 400);
  }

  let target: URL;
  try {
    target = new URL(rawTarget);
  } catch {
    return errorResponse("模型端点地址无效。", 400);
  }

  if (!isAllowedTarget(target)) {
    return errorResponse(
      "本地模型代理只支持 HTTP(S) chat/completions 端点。",
      400
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxRequestBytes) {
    return errorResponse("模型请求体超过 4 MiB 限制。", 413);
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxRequestBytes) {
    return errorResponse("模型请求体超过 4 MiB 限制。", 413);
  }

  try {
    if (!isChatCompletionPayload(JSON.parse(body) as unknown)) {
      return errorResponse("模型请求体不符合 chat/completions 格式。", 400);
    }
  } catch {
    return errorResponse("模型请求体不是有效 JSON。", 400);
  }

  const headers = new Headers({
    Accept: "text/event-stream, application/json",
    "Content-Type": "application/json",
  });
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: request.signal,
    });
  } catch (error) {
    const detail = error instanceof Error ? `：${error.message}` : "";
    return errorResponse(`本地模型代理无法连接上游端点${detail}`, 502);
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return errorResponse(
      "模型端点返回了重定向，请在设置中填写最终 API Base URL。",
      502
    );
  }

  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    [localModelProxyResponseHeader]: localModelProxyResponseValue,
  });
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("Content-Type", contentType);
  const requestId = upstream.headers.get("x-request-id");
  if (requestId) responseHeaders.set("X-Request-Id", requestId);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
