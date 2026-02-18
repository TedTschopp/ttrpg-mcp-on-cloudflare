#!/usr/bin/env node
/**
 * Option B helper: query MCP endpoints directly via JSON-RPC.
 *
 * Usage:
 *  node scripts/mcp_option_b.mjs
 *  FIGMA_TOKEN=... node scripts/mcp_option_b.mjs
 *  FIGMA_TOKEN=... node scripts/mcp_option_b.mjs --batch
 *
 * Env:
 *  TTRPG_MCP_URL (default: https://ttrpg-mcp.tedt.org/mcp)
 *  FIGMA_MCP_URL (default: https://mcp.figma.com/mcp)
 *  FIGMA_TOKEN   (optional)
 */

const DEFAULT_TTRPG_URL = "https://ttrpg-mcp.tedt.org/mcp";
const DEFAULT_FIGMA_URL = "https://mcp.figma.com/mcp";

function getArgFlag(name) {
  return process.argv.includes(name);
}

function safeHeaderDump(headers) {
  const interesting = [
    "content-type",
    "www-authenticate",
    "mcp-protocol-version",
    "mcp-session-id",
    "x-ttrpg-mcp-version",
    "x-ttrpg-mcp-commit",
    "x-ttrpg-mcp-build-time",
  ];
  const out = {};
  for (const key of interesting) {
    const val = headers.get(key);
    if (val) out[key] = val;
  }
  return out;
}

async function postJsonRpc(url, body, { token } = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let json = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    // leave json undefined
  }

  return {
    status: resp.status,
    headers: safeHeaderDump(resp.headers),
    text,
    json,
  };
}

function firstToolWithIcons(payloadJson) {
  const tools = payloadJson?.result?.tools;
  if (!Array.isArray(tools)) return undefined;
  return tools.find((t) => t && typeof t === "object" && Array.isArray(t.icons) && t.icons.length > 0);
}

function printSection(title) {
  process.stdout.write(`\n=== ${title} ===\n`);
}

const TTRPG_MCP_URL = process.env.TTRPG_MCP_URL?.trim() || DEFAULT_TTRPG_URL;
const FIGMA_MCP_URL = process.env.FIGMA_MCP_URL?.trim() || DEFAULT_FIGMA_URL;
const FIGMA_TOKEN = process.env.FIGMA_TOKEN?.trim();

const batch = getArgFlag("--batch");

const toolsListCall = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {},
};

const body = batch ? [toolsListCall] : toolsListCall;

printSection("Request");
console.log(JSON.stringify(body, null, 2));

printSection(`TTRPG (${TTRPG_MCP_URL})`);
try {
  const ttrpg = await postJsonRpc(TTRPG_MCP_URL, body);
  console.log("status:", ttrpg.status);
  console.log("headers:", JSON.stringify(ttrpg.headers, null, 2));

  if (ttrpg.json) {
    const tool = firstToolWithIcons(ttrpg.json);
    if (tool) {
      console.log("first tool with icons:");
      console.log(JSON.stringify(tool, null, 2));
    } else {
      console.log("No tool with `icons` found in JSON payload.");
      console.log("Top-level keys:", Object.keys(ttrpg.json));
    }
  } else {
    console.log("Non-JSON response body (first 500 chars):");
    console.log(ttrpg.text.slice(0, 500));
  }
} catch (err) {
  console.error("Request failed:", err?.message || err);
}

printSection(`Figma (${FIGMA_MCP_URL})`);
try {
  const figma = await postJsonRpc(FIGMA_MCP_URL, body, { token: FIGMA_TOKEN });
  console.log("status:", figma.status);
  console.log("headers:", JSON.stringify(figma.headers, null, 2));

  if (figma.json) {
    const tool = firstToolWithIcons(figma.json);
    if (tool) {
      console.log("first tool with icons:");
      console.log(JSON.stringify(tool, null, 2));
    } else {
      console.log("No tool with `icons` found in JSON payload.");
      console.log("Top-level keys:", Object.keys(figma.json));
    }
  } else {
    console.log("Non-JSON response body (first 500 chars):");
    console.log(figma.text.slice(0, 500));
  }
} catch (err) {
  console.error("Request failed:", err?.message || err);
}
