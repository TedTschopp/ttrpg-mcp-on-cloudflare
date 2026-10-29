# TTRPG GM Tools MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) server for tabletop RPG game masters.

## 🏗️ Architecture

This project uses a two-part architecture:

1. **GitHub Pages** - Hosts static data files (encounters, names, treasures, etc.) at `https://ttrpg-mcp.tedt.org/`
2. **Cloudflare Worker** - Implements the MCP protocol and executes tool logic at `https://ttrpg-mcp.tedt.org/mcp`

> **Note:** GitHub Pages can only serve static files. The MCP protocol requires a real server to handle dynamic requests, which is why we need the Cloudflare Worker.

## 🎲 Features

This MCP server provides tools for game masters:

- **Random Encounter Generator** - Generate random encounters based on difficulty and environment
- **NPC Name Generator** - Create character names for various fantasy races
- **Location Name Generator** - Generate tavern, city, and dungeon names
- **Personality Trait Generator** - Create NPC personalities and quirks
- **Treasure Generator** - Generate loot and treasure hoards
- **Weather Generator** - Create atmospheric weather descriptions
- **Plot Hook Generator** - Generate adventure hooks and quest ideas

## 🔧 Setup

### Prerequisites

1. **Deploy the Cloudflare Worker** (see `cloudflare-mcp-server/README.md`)
2. **Configure your MCP client**

### For MCP Clients (Claude Desktop, etc.)

Add this to your MCP client configuration:

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

**Important:**
- The URL is `https://ttrpg-mcp.tedt.org/mcp` (not `mcp.json`)
- Transport is Streamable HTTP (JSON responses), not SSE
- You must deploy the Cloudflare Worker first (see `cloudflare-mcp-server/` folder)

### Local Development

1. Clone this repository
2. Install Ruby 3.1+ (system Ruby 2.6/2.7 is often too old for `github-pages`)
3. Install Bundler (if needed): `gem install bundler`
4. Install site dependencies: `bundle install`
5. Run locally (from the repo root): `bundle exec jekyll serve`
6. Visit: `http://localhost:4000/`

## 📁 Structure

```
├── _config.yml              # Jekyll configuration
├── data/                    # JSON data files for generators
│   ├── encounters.json      # Encounter data
│   ├── names.json           # NPC names by race
│   ├── locations.json       # Location names
│   ├── traits.json          # Personality traits
│   ├── treasure.json        # Treasure tables
│   ├── weather.json         # Weather descriptions
│   └── plot_hooks.json      # Adventure hooks
├── cloudflare-mcp-server/   # Cloudflare Worker implementation
│   ├── src/index.ts         # Worker entrypoint (/mcp)
│   ├── src/mcp/server.ts    # MCP SDK server registration (tools/resources/prompts)
│   ├── src/tools/           # Central registry + per-tool modules
│   ├── src/data/fetch.ts    # JSON fetch + Cloudflare caching
│   └── test/                # Vitest smoke tests
├── demo.md                  # Interactive demo page
└── index.md                 # Landing page
```

## 🚀 Usage

Once configured in your MCP client, you can use natural language to invoke tools:

- "Generate a random encounter for a level 5 party in a forest"
- "Give me a dwarf name for my NPC"
- "Create a tavern name"
- "Generate some personality traits for my villain"

## 🛠️ Technology Stack

- **Jekyll/Liquid** - Static site generation
- **GitHub Pages** - Hosting
- **JSON** - Data storage and API responses
- **MCP SDK** - MCP server implementation (`@modelcontextprotocol/sdk`)

## ⚙️ Runtime Behavior

- `/mcp` accepts `POST` only; `GET /mcp` returns `405`
- CORS is restricted via `ALLOWED_ORIGINS` (missing `Origin` is allowed for non-browser clients)
- Data reads are cached (in-memory + Cloudflare Cache API)
- The server supports `completion/complete` for prompt args and for the resource template variable in `ttrpg://data/{dataset}`
- Tool results and prompt messages may include `resource_link` content blocks pointing at related datasets
- The server and dataset resources include MCP `icons` metadata (light/dark SVGs)

## 📝 License

MIT License - Feel free to use and modify for your campaigns!

## 🤝 Contributing

Contributions welcome! Add more:
- Encounter types
- Name lists for different cultures/races
- Treasure items
- Plot hooks
- New tool types

## 🔗 Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Jekyll Documentation](https://jekyllrb.com/)
- [GitHub Pages](https://pages.github.com/)

## Shared TedT.org Navigation

The global header loads `https://tedt.org/assets/global-header/v1/header.js`. Menu changes belong in the TedT.org repository, rather than in this site. The small local fallback and pre-paint bootstrap keep navigation and appearance usable while loading. The shared `tedt-appearance` cookie and `tedt:theme-change` event synchronize appearance; keep local site navigation and application controls separate. See https://tedt.org/docs/global-header.md for the embed contract.
