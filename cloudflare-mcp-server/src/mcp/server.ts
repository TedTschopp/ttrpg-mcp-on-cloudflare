import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../tools/types";
import { TOOL_REGISTRY } from "../tools/registry";
import { fetchJsonCached } from "../data/fetch";

function getDataBaseUrl(env: Env): string {
  const base = env.DATA_BASE_URL?.trim();
  return base && base.length > 0 ? base : "https://ttrpg-mcp.tedt.org/data";
}

function getDataCacheTtlSeconds(env: Env): number {
  const raw = env.DATA_CACHE_TTL_SECONDS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 60 * 60;
}

function buildDataUrl(env: Env, filename: string): string {
  const base = getDataBaseUrl(env).replace(/\/+$/, "");
  return `${base}/${filename}`;
}

function createToolContext(env: Env, ctx: ExecutionContext): ToolContext {
  const ttlSeconds = getDataCacheTtlSeconds(env);

  return {
    fetchJson: async <T = unknown>(filename: string): Promise<T> => {
      const url = buildDataUrl(env, filename);
      return await fetchJsonCached<T>(url, { ttlSeconds, ctx });
    },
  };
}

const INSTRUCTIONS = `TTRPG GM Tools MCP Server\n\nThis server provides procedural generation utilities and reference data for tabletop RPG session prep.\n\nAvailable Features:\n- Tools: Generate encounters, NPC names, location names, personality traits, treasure, weather, and plot hooks.\n- Resources: Read underlying JSON datasets (encounters, names, locations, traits, treasure, weather, plot hooks).\n- Prompts: High-level prompt templates (session_prep, quick_npc, dungeon_room).\n\nUsage Guidelines:\n1. List tools with 'tools/list' then call via 'tools/call' with required arguments. Input matching is case-insensitive (values are normalized).\n2. Use 'resources/read' to inspect raw datasets for context or custom logic.\n3. Prompts provide structured starting points—fetch with 'prompts/get' then expand.\n4. Randomness: Each generator selects uniformly from the relevant pool; treasure uses simple dice simulation.\n5. Error Handling: If a combination has no data (e.g., unsupported environment/difficulty), you'll receive an error object instead of content.\n\nNotes:\n- Data is sourced live from GitHub Pages (https://ttrpg-mcp.tedt.org/data).\n- Transport is stateless Streamable HTTP (JSON responses).`;

export function createMcpServer(env: Env, ctx: ExecutionContext): McpServer {
  const server = new McpServer(
    {
      name: "ttrpg-gm-tools",
      version: "1.0.0",
    },
    {
      instructions: INSTRUCTIONS,
    }
  );

  const toolContext = createToolContext(env, ctx);

  for (const tool of Object.values(TOOL_REGISTRY)) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        // These are Zod schemas in our registry.
        inputSchema: tool.inputSchema as any,
        outputSchema: tool.outputSchema as any,
      },
      async (args: unknown, _extra: unknown) => {
        const result = await tool.handler(toolContext, args);
        const structuredContent = result as Record<string, unknown>;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent,
        };
      }
    );
  }

  const resourceMap: Array<{
    uri: string;
    name: string;
    description: string;
    filename: string;
  }> = [
    {
      uri: "ttrpg://data/encounters",
      name: "Encounter Database",
      description: "Complete database of random encounters organized by environment and difficulty",
      filename: "encounters.json",
    },
    {
      uri: "ttrpg://data/names",
      name: "Name Database",
      description: "Fantasy name lists organized by race and gender",
      filename: "names.json",
    },
    {
      uri: "ttrpg://data/locations",
      name: "Location Names",
      description: "Location name components and templates",
      filename: "locations.json",
    },
    {
      uri: "ttrpg://data/traits",
      name: "Personality Traits",
      description: "Personality traits, ideals, bonds, and flaws for NPCs",
      filename: "traits.json",
    },
    {
      uri: "ttrpg://data/treasure",
      name: "Treasure Tables",
      description: "Treasure and loot tables by challenge rating",
      filename: "treasure.json",
    },
    {
      uri: "ttrpg://data/weather",
      name: "Weather Descriptions",
      description: "Weather conditions by climate and season",
      filename: "weather.json",
    },
    {
      uri: "ttrpg://data/plot-hooks",
      name: "Plot Hooks",
      description: "Adventure hooks and quest ideas by theme",
      filename: "plot_hooks.json",
    },
  ];

  for (const resource of resourceMap) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        description: resource.description,
        mimeType: "application/json",
      },
      async () => {
        const data = await toolContext.fetchJson(resource.filename);
        return {
          contents: [
            {
              uri: resource.uri,
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
    );
  }

  server.registerPrompt(
    "session_prep",
    {
      description: "Prepare a complete game session with encounters, NPCs, and plot hooks",
      argsSchema: {
        party_level: z.number(),
        session_theme: z.string(),
      },
    },
    (args: any) => {
      const { party_level, session_theme } = args;
      return {
        description: `Session preparation for level ${party_level} party with ${session_theme} theme`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Create a complete game session for a level ${party_level} party with a ${session_theme} theme. Include: 1) A main encounter appropriate for the party level, 2) 2-3 NPCs they might meet, 3) A plot hook to drive the session, 4) Potential treasure rewards, 5) Weather/atmosphere description.`,
            },
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "quick_npc",
    {
      description: "Generate a complete NPC with name, personality, and background",
      argsSchema: {
        role: z.string(),
      },
    },
    (args: any) => {
      const { role } = args;
      return {
        description: `Generate a complete ${role} NPC`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Create a detailed ${role} NPC including: 1) A fantasy name (choose appropriate race/gender), 2) 2-3 personality traits, 3) A brief backstory (2-3 sentences), 4) What they want from the party, 5) A unique quirk or mannerism.`,
            },
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "dungeon_room",
    {
      description: "Generate a dungeon room with encounter, treasure, and description",
      argsSchema: {
        party_level: z.number(),
        difficulty: z.string().optional(),
      },
    },
    (args: any) => {
      const { party_level, difficulty = "medium" } = args;
      return {
        description: `Generate a dungeon room for level ${party_level} party at ${difficulty} difficulty`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Create a dungeon room for a level ${party_level} party at ${difficulty} difficulty. Include: 1) Room description and atmosphere, 2) An encounter in the room (if any), 3) Treasure or rewards, 4) Potential hazards or traps, 5) Clues or secrets players might discover.`,
            },
          },
        ],
      };
    }
  );

  return server;
}
