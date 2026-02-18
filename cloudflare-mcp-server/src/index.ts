import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./mcp/server";
import { listToolsForJsonRpc } from "./tools/registry";
import { getInlineIconSet } from "./mcp/icons";
import { TOOL_TITLES } from "./mcp/tool-meta";
import { PROMPT_DEFINITIONS } from "./mcp/prompt-meta";

function parseAllowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function buildCorsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, MCP-Protocol-Version, Mcp-Protocol-Version, Mcp-Session-Id",
    "Access-Control-Expose-Headers": "X-TTRPG-MCP-Version, X-TTRPG-MCP-Commit, X-TTRPG-MCP-Build-Time",
  };

  if (origin && allowedOrigins.length > 0) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return headers;
}

function buildFingerprintHeaders(env: Env): Record<string, string> {
  const version = env.BUILD_VERSION?.trim();
  const commit = env.BUILD_COMMIT?.trim();
  const buildTime = env.BUILD_TIME?.trim();

  const headers: Record<string, string> = {
    "X-TTRPG-MCP-Version": version && version.length > 0 ? version : "unknown",
  };

  if (commit && commit.length > 0) headers["X-TTRPG-MCP-Commit"] = commit;
  if (buildTime && buildTime.length > 0) headers["X-TTRPG-MCP-Build-Time"] = buildTime;

  return headers;
}

function withExtraHeaders(response: Response, extraHeaders: Record<string, string>): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function ensureMcpAcceptHeader(request: Request): Request {
  const accept = request.headers.get("Accept") ?? "";
  const hasJson = /(^|,|\s)application\/json(\s|,|;|$)/i.test(accept);
  const hasSse = /(^|,|\s)text\/event-stream(\s|,|;|$)/i.test(accept);

  if (hasJson && hasSse) return request;

  const headers = new Headers(request.headers);
  const parts = accept
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (!hasJson) parts.push("application/json");
  if (!hasSse) parts.push("text/event-stream");

  headers.set("Accept", parts.join(", "));
  return new Request(request, { headers });
}

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

function jsonRpcResponse(id: JsonRpcRequest["id"], result: unknown): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: id ?? null,
      result,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

async function tryHandleToolsListShim(request: Request): Promise<Response | undefined> {
  // Work around a current limitation in @modelcontextprotocol/sdk v1.26.0:
  // `tools/list` responses drop `icons`, which VS Code relies on for rendering.
  // This shim only intercepts simple, single-call JSON-RPC requests.
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return undefined;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const rpc = body as JsonRpcRequest;
  if (rpc.method !== "tools/list") return undefined;

  const icons = getInlineIconSet("tools");
  const tools = listToolsForJsonRpc().map((t) => ({
    ...t,
    title: TOOL_TITLES[t.name] ?? t.name,
    icons,
  }));

  return jsonRpcResponse(rpc.id, { tools });
}

async function tryHandlePromptsListShim(request: Request): Promise<Response | undefined> {
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return undefined;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const rpc = body as JsonRpcRequest;
  if (rpc.method !== "prompts/list") return undefined;

  const icons = getInlineIconSet("prompts");
  const prompts = PROMPT_DEFINITIONS.map((p) => ({
    name: p.name,
    title: p.title,
    description: p.description,
    arguments: p.arguments,
    icons,
  }));

  return jsonRpcResponse(rpc.id, { prompts });
}

function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  // Non-browser or same-origin requests may omit Origin.
  if (!origin) return true;
  // If allowlist is not configured, preserve prior permissive behavior.
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
}

// Main Worker Handler
export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const env = _env;
    const ctx = _ctx;

    const origin = request.headers.get("Origin");
    const allowedOrigins = parseAllowedOrigins(env);
    const fingerprintHeaders = buildFingerprintHeaders(env);

    if (!isOriginAllowed(origin, allowedOrigins)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...fingerprintHeaders,
        },
      });
    }

    const corsHeaders = buildCorsHeaders(origin, allowedOrigins);
    const extraHeaders = { ...corsHeaders, ...fingerprintHeaders };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: extraHeaders,
      });
    }

    if (url.pathname === "/mcp") {
      if (request.method === "GET") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...extraHeaders,
          },
        });
      }

      if (request.method === "POST") {
        const shimmedToolsList = await tryHandleToolsListShim(request);
        if (shimmedToolsList) return withExtraHeaders(shimmedToolsList, extraHeaders);

        const shimmedPromptsList = await tryHandlePromptsListShim(request);
        if (shimmedPromptsList) return withExtraHeaders(shimmedPromptsList, extraHeaders);

        const transport = new WebStandardStreamableHTTPServerTransport({
          // Stateless mode: create a new transport per request.
          sessionIdGenerator: undefined,
          // Ensure we respond with JSON (no SSE) per your earlier transport decision.
          enableJsonResponse: true,
        });

        const server = createMcpServer(env, ctx);
        await server.connect(transport);

        try {
          const resp = await transport.handleRequest(ensureMcpAcceptHeader(request));
          return withExtraHeaders(resp, extraHeaders);
        } finally {
          await server.close();
        }
      }

      // No redirects for /mcp. Preserve spec clarity.
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...extraHeaders,
        },
      });
    }

    // Redirect root to GitHub Pages
    return withExtraHeaders(Response.redirect("https://ttrpg-mcp.tedt.org/", 302), extraHeaders);
  },
};
