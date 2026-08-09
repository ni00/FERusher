import { isAiEndpointReady, type AiSettings } from "../domain/settings";
import {
  localModelProxyPath,
  localModelProxyTargetHeader,
} from "./local-model-proxy-contract";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StreamChatOptions {
  settings: AiSettings;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onText: (text: string) => void;
}

type CreateOpenAICompatible =
  typeof import("@ai-sdk/openai-compatible").createOpenAICompatible;

class ModelNetworkError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ModelNetworkError";
  }
}

class ModelHttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ModelHttpError";
  }
}

function getProviderEndpoint(baseUrl: string): {
  baseURL: string;
  queryParams?: Record<string, string>;
} {
  const url = new URL(baseUrl);
  const pathname = url.pathname.replace(/\/+$/, "");
  url.pathname = pathname.endsWith("/chat/completions")
    ? pathname.slice(0, -"/chat/completions".length)
    : pathname;

  const queryParams = Object.fromEntries(url.searchParams);
  url.search = "";
  url.hash = "";

  return {
    baseURL: url.toString(),
    ...(Object.keys(queryParams).length > 0 ? { queryParams } : {}),
  };
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function shouldUseLocalDevelopmentProxy(endpoint: string): boolean {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
    return false;
  }
  return new URL(endpoint).origin !== window.location.origin;
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  return (
    signal?.aborted === true ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

function findModelNetworkError(error: unknown): ModelNetworkError | undefined {
  const visited = new Set<unknown>();
  let current = error;

  while (current && typeof current === "object" && !visited.has(current)) {
    if (current instanceof ModelNetworkError) return current;
    visited.add(current);
    current = Reflect.get(current, "cause");
  }

  return undefined;
}

function isRetryableModelError(error: unknown): boolean {
  if (findModelNetworkError(error)) return true;
  return (
    error instanceof ModelHttpError &&
    (error.status === 408 || error.status === 429 || error.status >= 500)
  );
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(
      signal.reason ?? new DOMException("请求已取消", "AbortError")
    );
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal?.reason ?? new DOMException("请求已取消", "AbortError"));
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function modelFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const endpoint = getRequestUrl(input);
  const useLocalProxy = shouldUseLocalDevelopmentProxy(endpoint);

  try {
    if (!useLocalProxy) return await fetch(input, init);

    const request = new Request(input, init);
    const headers = new Headers(request.headers);
    headers.set(localModelProxyTargetHeader, endpoint);

    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer();

    return await fetch(localModelProxyPath, {
      method: request.method,
      headers,
      body,
      signal: request.signal,
      cache: "no-store",
      credentials: "same-origin",
      redirect: "manual",
    });
  } catch (error) {
    if (isAbortError(error, init?.signal ?? undefined)) throw error;
    throw new ModelNetworkError(
      useLocalProxy
        ? "本地开发代理无法连接模型端点，请检查 Base URL、网络和服务商状态。"
        : "浏览器无法连接模型端点。请确认服务商允许当前站点跨域访问，或使用同源网关。",
      { cause: error }
    );
  }
}

function createModel(
  settings: AiSettings,
  createOpenAICompatible: CreateOpenAICompatible
) {
  const endpoint = getProviderEndpoint(settings.baseUrl);
  const provider = createOpenAICompatible({
    name: "devrusher",
    ...endpoint,
    ...(settings.requiresApiKey ? { apiKey: settings.apiKey } : {}),
    fetch: modelFetch,
  });

  return provider(settings.model);
}

function getChatCompletionsUrl(baseUrl: string): string {
  const endpoint = getProviderEndpoint(baseUrl);
  const url = new URL(endpoint.baseURL);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/chat/completions`;
  for (const [key, value] of Object.entries(endpoint.queryParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function getReasoningEffort(settings: AiSettings): string | undefined {
  return settings.reasoningEffort === "auto"
    ? undefined
    : settings.reasoningEffort;
}

function getTextContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";

  return value
    .map(item => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      const text = Reflect.get(item, "text");
      return typeof text === "string" ? text : "";
    })
    .join("");
}

function getPayloadErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const error = Reflect.get(value, "error");
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return undefined;
  const message = Reflect.get(error, "message");
  return typeof message === "string" ? message : undefined;
}

function getPayloadText(value: unknown, streaming: boolean): string {
  if (!value || typeof value !== "object") return "";
  const choices = Reflect.get(value, "choices");
  if (!Array.isArray(choices) || !choices[0]) return "";
  const choice = choices[0];
  if (!choice || typeof choice !== "object") return "";
  const container = Reflect.get(choice, streaming ? "delta" : "message");
  if (!container || typeof container !== "object") return "";
  return getTextContent(Reflect.get(container, "content"));
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

async function readCompatibleEventStream({
  response,
  signal,
  onText,
}: {
  response: Response;
  signal?: AbortSignal;
  onText: (text: string) => void;
}): Promise<string> {
  if (!response.body) throw new Error("模型响应没有可读取的内容");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let finished = false;

  const consumeEvent = (event: string): boolean => {
    const data = event
      .split(/\r?\n/)
      .filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).trimStart())
      .join("\n");
    if (!data) return false;
    if (data.trim() === "[DONE]") return true;

    const payload = parseJson(data);
    const errorMessage = getPayloadErrorMessage(payload);
    if (errorMessage) throw new Error(errorMessage);

    const delta = getPayloadText(payload, true);
    if (delta) {
      text += delta;
      onText(text);
    }
    return false;
  };

  try {
    while (!finished) {
      const chunk = await reader.read();
      if (chunk.done) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(chunk.value, { stream: true });

      let boundary = /\r?\n\r?\n/.exec(buffer);
      while (boundary) {
        const event = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (consumeEvent(event)) {
          finished = true;
          break;
        }
        boundary = /\r?\n\r?\n/.exec(buffer);
      }
    }

    if (!finished && buffer.trim()) consumeEvent(buffer);
    if (finished) await reader.cancel().catch(() => undefined);
  } finally {
    reader.releaseLock();
  }

  if (signal?.aborted) {
    throw signal.reason ?? new DOMException("请求已取消", "AbortError");
  }
  if (!text) throw new Error("模型响应没有文本内容");
  return text;
}

async function streamOpenAiCompatibleChat({
  settings,
  messages,
  signal,
  onText,
}: StreamChatOptions): Promise<string> {
  const headers = new Headers({
    Accept: "text/event-stream, application/json",
    "Content-Type": "application/json",
  });
  if (settings.requiresApiKey) {
    headers.set("Authorization", `Bearer ${settings.apiKey}`);
  }

  const response = await modelFetch(getChatCompletionsUrl(settings.baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: settings.model,
      messages,
      stream: true,
      ...(getReasoningEffort(settings)
        ? { reasoning_effort: getReasoningEffort(settings) }
        : {}),
    }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text();
    const message = getPayloadErrorMessage(parseJson(body));
    throw new ModelHttpError(
      message ?? `模型请求失败（HTTP ${response.status}）`,
      response.status
    );
  }

  if (response.headers.get("content-type")?.includes("application/json")) {
    const payload = (await response.json()) as unknown;
    const errorMessage = getPayloadErrorMessage(payload);
    if (errorMessage) throw new Error(errorMessage);
    const text = getPayloadText(payload, false);
    if (!text) throw new Error("模型响应没有文本内容");
    onText(text);
    return text;
  }

  return readCompatibleEventStream({ response, signal, onText });
}

function rethrowModelError(error: unknown, signal?: AbortSignal): never {
  if (isAbortError(error, signal)) throw error;

  const networkError = findModelNetworkError(error);
  if (networkError) throw networkError;

  if (error instanceof Error) throw error;
  throw new Error("模型请求失败");
}

export async function streamCompatibleChat({
  settings,
  messages,
  signal,
  onText,
}: StreamChatOptions): Promise<string> {
  if (!isAiEndpointReady(settings)) throw new Error("请先配置 API Key");
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException("请求已取消", "AbortError");
  }

  if (settings.streamResponse) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let receivedText = false;
      try {
        return await streamOpenAiCompatibleChat({
          settings,
          messages,
          signal,
          onText: text => {
            receivedText = true;
            onText(text);
          },
        });
      } catch (error) {
        const shouldRetry =
          attempt < 2 &&
          !receivedText &&
          !isAbortError(error, signal) &&
          isRetryableModelError(error);
        if (!shouldRetry) rethrowModelError(error, signal);
        await waitForRetry(400 * 2 ** attempt, signal);
      }
    }
    throw new Error("模型请求失败");
  }

  const [{ createOpenAICompatible }, { generateText }] = await Promise.all([
    import("@ai-sdk/openai-compatible"),
    import("ai"),
  ]);
  const model = createModel(settings, createOpenAICompatible);

  try {
    const { text } = await generateText({
      model,
      messages,
      allowSystemInMessages: true,
      abortSignal: signal,
      maxRetries: 2,
      ...(getReasoningEffort(settings)
        ? {
            providerOptions: {
              devrusher: {
                reasoningEffort: getReasoningEffort(settings),
              },
            },
          }
        : {}),
    });
    if (!text) throw new Error("模型响应没有文本内容");
    onText(text);
    return text;
  } catch (error) {
    rethrowModelError(error, signal);
  }
}
