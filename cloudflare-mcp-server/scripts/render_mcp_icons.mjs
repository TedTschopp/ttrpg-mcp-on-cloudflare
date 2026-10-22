#!/usr/bin/env node
/**
 * Fetch MCP metadata and render icons into an HTML file you can open locally.
 *
 * Usage:
 *  node scripts/render_mcp_icons.mjs
 *  MCP_URL=https://ttrpg-mcp.tedt.org/mcp node scripts/render_mcp_icons.mjs
 *
 * Output:
 *  ./.tmp/mcp-icons.html
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MCP_URL = (process.env.MCP_URL?.trim() || "https://ttrpg-mcp.tedt.org/mcp").replace(/\s+/g, "");
const OUT_DIR = path.resolve(".tmp");
const OUT_FILE = path.join(OUT_DIR, "mcp-icons.html");

async function postJson(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  return { status: resp.status, json, text, headers: resp.headers };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderIconList(icons) {
  if (!Array.isArray(icons) || icons.length === 0) return "<div class='muted'>No icons</div>";
  const items = icons
    .map((icon) => {
      const src = icon?.src ?? "";
      const mimeType = icon?.mimeType ?? "";
      const theme = icon?.theme ?? "";
      const sizes = Array.isArray(icon?.sizes) ? icon.sizes.join(", ") : "";

      return `
        <div class="icon-card">
          <div class="icon-meta">
            <div><b>theme</b>: ${escapeHtml(theme)}</div>
            <div><b>mimeType</b>: ${escapeHtml(mimeType)}</div>
            <div><b>sizes</b>: ${escapeHtml(sizes)}</div>
          </div>
          <div class="icon-preview">
            <img alt="icon" src="${escapeHtml(src)}" />
          </div>
          <details>
            <summary>src</summary>
            <textarea readonly>${escapeHtml(src)}</textarea>
          </details>
        </div>
      `;
    })
    .join("\n");

  return `<div class="icon-grid">${items}</div>`;
}

const initReq = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "render-mcp-icons", version: "0.0.0" },
  },
};

const toolsReq = { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };

console.log(`Fetching from ${MCP_URL}`);

const initResp = await postJson(MCP_URL, initReq);
const toolsResp = await postJson(MCP_URL, toolsReq);

const serverInfo = initResp.json?.result?.serverInfo;
const serverIcons = serverInfo?.icons;

const tools = toolsResp.json?.result?.tools;
const firstToolWithIcons = Array.isArray(tools)
  ? tools.find((t) => t && typeof t === "object" && Array.isArray(t.icons) && t.icons.length > 0)
  : undefined;

await mkdir(OUT_DIR, { recursive: true });

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MCP Icons Preview</title>
  <style>
    body { font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; margin: 16px; }
    .muted { color: #666; }
    .kv { display: grid; grid-template-columns: 140px 1fr; gap: 8px 12px; max-width: 900px; }
    .section { margin-top: 24px; }
    .icon-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    .icon-card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
    .icon-meta { font-size: 13px; color: #333; }
    .icon-preview { margin: 10px 0; display: flex; align-items: center; gap: 8px; }
    img { width: 48px; height: 48px; border: 1px solid #eee; border-radius: 6px; padding: 6px; background: #fff; }
    textarea { width: 100%; height: 90px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
    details summary { cursor: pointer; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  </style>
</head>
<body>
  <h1>MCP Icons Preview</h1>
  <div class="kv">
    <div><b>MCP URL</b></div><div><code>${escapeHtml(MCP_URL)}</code></div>
    <div><b>initialize status</b></div><div><code>${escapeHtml(initResp.status)}</code></div>
    <div><b>tools/list status</b></div><div><code>${escapeHtml(toolsResp.status)}</code></div>
  </div>

  <div class="section">
    <h2>Server Info</h2>
    ${serverInfo ? `<div class="kv">
        <div><b>name</b></div><div>${escapeHtml(serverInfo.name ?? "")}</div>
        <div><b>title</b></div><div>${escapeHtml(serverInfo.title ?? "")}</div>
        <div><b>version</b></div><div>${escapeHtml(serverInfo.version ?? "")}</div>
      </div>` : `<div class='muted'>No serverInfo in initialize response</div>`}

    <h3>serverInfo.icons</h3>
    ${renderIconList(serverIcons)}
  </div>

  <div class="section">
    <h2>First Tool With Icons</h2>
    ${firstToolWithIcons ? `<div class="kv">
        <div><b>name</b></div><div>${escapeHtml(firstToolWithIcons.name ?? "")}</div>
        <div><b>title</b></div><div>${escapeHtml(firstToolWithIcons.title ?? "")}</div>
      </div>
      <h3>tool.icons</h3>
      ${renderIconList(firstToolWithIcons.icons)}
    ` : `<div class='muted'>No tool icons found in tools/list response.</div>`}
  </div>

  <div class="section">
    <h2>Raw Responses</h2>
    <details>
      <summary>initialize JSON</summary>
      <textarea readonly>${escapeHtml(JSON.stringify(initResp.json ?? initResp.text, null, 2))}</textarea>
    </details>
    <details>
      <summary>tools/list JSON</summary>
      <textarea readonly>${escapeHtml(JSON.stringify(toolsResp.json ?? toolsResp.text, null, 2))}</textarea>
    </details>
  </div>
</body>
</html>`;

await writeFile(OUT_FILE, html, "utf-8");

console.log(`Wrote ${OUT_FILE}`);
console.log(`Open it with: open ${OUT_FILE}`);
