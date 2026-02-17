import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./mcp/server";

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
  };

  if (origin && allowedOrigins.length > 0) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return headers;
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

    if (!isOriginAllowed(origin, allowedOrigins)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/mcp") {
      if (request.method === "GET") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }

      if (request.method === "POST") {
        const transport = new WebStandardStreamableHTTPServerTransport({
          // Stateless mode: create a new transport per request.
          sessionIdGenerator: undefined,
          // Ensure we respond with JSON (no SSE) per your earlier transport decision.
          enableJsonResponse: true,
        });

        const server = createMcpServer(env, ctx);
        await server.connect(transport);

        try {
          const resp = await transport.handleRequest(request);
          // Ensure CORS headers are present on SDK responses.
          const headers = new Headers(resp.headers);
          for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
          return new Response(resp.body, { status: resp.status, headers });
        } finally {
          await server.close();
        }
      }

      // No redirects for /mcp. Preserve spec clarity.
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Redirect root to GitHub Pages
    return Response.redirect("https://ttrpg-mcp.tedt.org/", 302);
  },
};
