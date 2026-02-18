# TTRPG MCP Server - Cloudflare Worker

This Cloudflare Worker implements a real MCP (Model Context Protocol) server that connects to the static data hosted on GitHub Pages.

## Problem It Solves

GitHub Pages can only serve static files. The MCP protocol requires a real server that can:

- Handle dynamic requests
- Execute tool logic
- Return formatted responses

This worker bridges that gap.

## Setup

### 1. Install Dependencies

```bash
cd cloudflare-mcp-server
npm install
```

### 2. Configure Wrangler

Make sure you're logged into Cloudflare:

```bash
npx wrangler login
```

### 3. Test Locally

```bash
npm run dev
```

Run tests:

```bash
npm test
```

### 4. Deploy to Cloudflare

```bash
npm run deploy
```

### 5. Configure Custom Domain

In Cloudflare Dashboard:

1. Go to Workers & Pages
2. Select your worker
3. Go to Settings → Triggers
4. Add custom domain route: `ttrpg-mcp.tedt.org/mcp`

## MCP Client Configuration

Update your MCP client configuration to use the worker endpoint:

```json
{
  "mcpServers": {
    "ttrpg-gm-tools": {
      "url": "https://ttrpg-mcp.tedt.org/mcp",
      "transport": {
        "type": "http"
      }
    }
  }
}
```

This Worker uses Streamable HTTP transport in **JSON response** mode (no SSE).

## How It Works

1. Worker receives MCP protocol requests
2. Fetches necessary data from GitHub Pages JSON files
3. Executes tool logic (random selection, dice rolling, etc.)
4. Returns formatted MCP responses

## Configuration

Configured via `wrangler.toml` / Cloudflare environment variables:

- `DATA_BASE_URL` (default: `https://ttrpg-mcp.tedt.org/data`)
- `SITE_BASE_URL` (optional; default: derived from `DATA_BASE_URL` by stripping `/data`)
- `DATA_CACHE_TTL_SECONDS` (default: `3600`)
- `ALLOWED_ORIGINS` (default: `https://ttrpg-mcp.tedt.org`, comma-separated)

### Deployment Fingerprint (Optional)

The Worker can include build/version metadata on every response so you can confirm what is currently deployed.

Headers:

- `X-TTRPG-MCP-Version`
- `X-TTRPG-MCP-Commit`
- `X-TTRPG-MCP-Build-Time`

Env vars:

- `BUILD_VERSION` (default: `dev`)
- `BUILD_COMMIT` (optional)
- `BUILD_TIME` (optional)

Verify from your terminal:

```bash
curl -I https://ttrpg-mcp.tedt.org/mcp
```

## Available Tools

All 7 tools are implemented:

- ✅ generate_encounter
- ✅ generate_npc_name
- ✅ generate_location_name
- ✅ generate_personality
- ✅ generate_treasure
- ✅ generate_weather
- ✅ generate_plot_hook

## Resources

This server exposes the underlying JSON datasets as MCP resources.

- `resources/list` returns concrete dataset URIs like `ttrpg://data/encounters`, `ttrpg://data/names`, etc.
- `resources/read` reads any dataset URI and returns `application/json`.

Example `resources/read` request (JSON-RPC over Streamable HTTP):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/read",
  "params": {
    "uri": "ttrpg://data/names"
  }
}
```

## Resource Templates

Datasets are also registered via a resource template:

- Template URI: `ttrpg://data/{dataset}`

Clients can discover templates via `resources/templates/list` and then use `resources/read` with a filled-in URI.

## Completions

The server supports `completion/complete` for:

- Prompt arguments (e.g., `quick_npc.role`, `dungeon_room.difficulty`, `session_prep.session_theme`)
- Resource template variables (the `{dataset}` variable in `ttrpg://data/{dataset}`)

Example: complete a prompt argument:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "completion/complete",
  "params": {
    "ref": { "type": "ref/prompt", "name": "quick_npc" },
    "argument": { "name": "role", "value": "g" }
  }
}
```

Example: complete a resource template variable:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "completion/complete",
  "params": {
    "ref": { "type": "ref/resource", "uri": "ttrpg://data/{dataset}" },
    "argument": { "name": "dataset", "value": "tr" }
  }
}
```

## Resource Links in Results

Tool results and prompt messages may include `resource_link` content blocks that point at the relevant dataset URI (for example, the encounter generator links to `ttrpg://data/encounters`). This helps MCP clients surface “open the underlying data” affordances without the user needing to guess URIs.

## Icons

The server implementation and dataset resources include MCP `icons` metadata (light/dark SVGs) served from the GitHub Pages site under `/assets/icons/`.

## Cost

Cloudflare Workers Free Tier:

- 100,000 requests per day
- More than enough for personal use!
