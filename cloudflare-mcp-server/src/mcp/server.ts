import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { ToolContext } from "../tools/types";
import { TOOL_REGISTRY } from "../tools/registry";
import { fetchJsonCached } from "../data/fetch";

type DatasetDefinition = {
  key: string;
  uri: string;
  title: string;
  description: string;
  filename: string;
};

const DATASETS: DatasetDefinition[] = [
  {
    key: "encounters",
    uri: "ttrpg://data/encounters",
    title: "Encounter Database",
    description: "Complete database of random encounters organized by environment and difficulty",
    filename: "encounters.json",
  },
  {
    key: "names",
    uri: "ttrpg://data/names",
    title: "Name Database",
    description: "Fantasy name lists organized by race and gender",
    filename: "names.json",
  },
  {
    key: "locations",
    uri: "ttrpg://data/locations",
    title: "Location Names",
    description: "Location name components and templates",
    filename: "locations.json",
  },
  {
    key: "traits",
    uri: "ttrpg://data/traits",
    title: "Personality Traits",
    description: "Personality traits, ideals, bonds, flaws, and quirks for NPCs",
    filename: "traits.json",
  },
  {
    key: "treasure",
    uri: "ttrpg://data/treasure",
    title: "Treasure Tables",
    description: "Treasure and loot tables by challenge rating",
    filename: "treasure.json",
  },
  {
    key: "weather",
    uri: "ttrpg://data/weather",
    title: "Weather Descriptions",
    description: "Weather conditions by climate and season",
    filename: "weather.json",
  },
  {
    key: "plot-hooks",
    uri: "ttrpg://data/plot-hooks",
    title: "Plot Hooks",
    description: "Adventure hooks and quest ideas by theme",
    filename: "plot_hooks.json",
  },
];

const DATASET_BY_KEY = new Map(DATASETS.map((dataset) => [dataset.key, dataset]));

function getDatasetLinkContent(datasetKey: string, overrides?: { title?: string; name?: string }) {
  const dataset = DATASET_BY_KEY.get(datasetKey);
  if (!dataset) return undefined;
  return {
    type: "resource_link" as const,
    uri: dataset.uri,
    name: overrides?.name ?? dataset.key,
    title: overrides?.title ?? dataset.title,
    description: dataset.description,
    mimeType: "application/json",
  };
}

const TOOL_DATASET_KEY: Record<string, string | undefined> = {
  generate_encounter: "encounters",
  generate_npc_name: "names",
  generate_location_name: "locations",
  generate_personality: "traits",
  generate_treasure: "treasure",
  generate_weather: "weather",
  generate_plot_hook: "plot-hooks",
};

const TOOL_TITLES: Record<string, string | undefined> = {
  generate_encounter: "Generate Encounter",
  generate_npc_name: "Generate NPC Name",
  generate_location_name: "Generate Location Name",
  generate_personality: "Generate Personality Traits",
  generate_treasure: "Generate Treasure",
  generate_weather: "Generate Weather",
  generate_plot_hook: "Generate Plot Hook",
};

function isToolErrorResult(value: unknown): value is { error: string } {
  if (!value || typeof value !== "object") return false;
  const maybeError = (value as any).error;
  return typeof maybeError === "string" && maybeError.length > 0;
}

function getDataBaseUrl(env: Env): string {
  const base = env.DATA_BASE_URL?.trim();
  return base && base.length > 0 ? base : "https://ttrpg-mcp.tedt.org/data";
}

function getSiteBaseUrl(env: Env): string {
  const explicit = env.SITE_BASE_URL?.trim();
  if (explicit && explicit.length > 0) return explicit.replace(/\/+$/, "");

  const dataBaseUrl = getDataBaseUrl(env).replace(/\/+$/, "");
  return dataBaseUrl.endsWith("/data") ? dataBaseUrl.slice(0, -"/data".length) : dataBaseUrl;
}

type IconCategory = "tools" | "resources" | "prompts";

function getIconSet(env: Env, category: IconCategory) {
  const base = getSiteBaseUrl(env);
  return [
    {
      src: `${base}/assets/icons/${category}-light.svg`,
      mimeType: "image/svg+xml",
      sizes: ["any"],
      theme: "light" as const,
    },
    {
      src: `${base}/assets/icons/${category}-dark.svg`,
      mimeType: "image/svg+xml",
      sizes: ["any"],
      theme: "dark" as const,
    },
  ];
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
      title: "TTRPG GM Tools",
      icons: getIconSet(env, "tools"),
    },
    {
      instructions: INSTRUCTIONS,
    }
  );

  const toolContext = createToolContext(env, ctx);

  server.registerResource(
    "ttrpg-data",
    new ResourceTemplate("ttrpg://data/{dataset}", {
      list: async () => {
        return {
          resources: DATASETS.map((dataset) => ({
            uri: dataset.uri,
            name: dataset.key,
            title: dataset.title,
            description: dataset.description,
            mimeType: "application/json",
            icons: getIconSet(env, "resources"),
          })),
        };
      },
      complete: {
        dataset: async (value) => {
          const prefix = String(value ?? "").toLowerCase();
          const all = DATASETS.map((dataset) => dataset.key);
          if (!prefix) return all;
          return all.filter((key) => key.startsWith(prefix));
        },
      },
    }),
    {
      title: "TTRPG JSON Datasets",
      description: "Reference datasets for the procedural generation tools.",
      mimeType: "application/json",
      icons: getIconSet(env, "resources"),
    },
    async (uri, variables) => {
      const rawKey = String((variables as any).dataset ?? "").toLowerCase();
      const normalizedKey = rawKey.replace(/_/g, "-");
      const dataset = DATASET_BY_KEY.get(normalizedKey);
      if (!dataset) {
        throw new McpError(ErrorCode.InvalidParams, `Unknown dataset: ${rawKey}`);
      }

      const data = await toolContext.fetchJson(dataset.filename);
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  for (const tool of Object.values(TOOL_REGISTRY)) {
    const datasetKey = TOOL_DATASET_KEY[tool.name];
    const toolTitle = TOOL_TITLES[tool.name];

    server.registerTool(
      tool.name,
      {
        title: toolTitle,
        description: tool.description,
        icons: getIconSet(env, "tools"),
        // These are Zod schemas in our registry.
        inputSchema: tool.inputSchema as any,
        outputSchema: tool.outputSchema as any,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      async (args: unknown, _extra: unknown) => {
        const result = await tool.handler(toolContext, args);
        const structuredContent = result as Record<string, unknown>;
        const isError = isToolErrorResult(result);

        const resourceLink = datasetKey ? getDatasetLinkContent(datasetKey) : undefined;

        return {
          isError,
          content: [
            {
              type: "text" as const,
              text: isError
                ? `Error: ${(result as any).error}\n\n${JSON.stringify(result, null, 2)}`
                : JSON.stringify(result, null, 2),
            },
            ...(resourceLink ? [resourceLink] : []),
          ],
          structuredContent,
        };
      }
    );
  }

  server.registerPrompt(
    "session_prep",
    {
      title: "Session Prep",
      description: "Prepare a complete game session with encounters, NPCs, and plot hooks",
      icons: getIconSet(env, "prompts"),
      argsSchema: {
        party_level: completable(z.number().int().min(1).max(20), (value) => {
          const prefix = String(value ?? "");
          const levels = Array.from({ length: 20 }, (_, idx) => idx + 1);
          if (!prefix) return levels;
          return levels.filter((level) => String(level).startsWith(prefix));
        }),
        session_theme: completable(z.string().min(1), (value) => {
          const themes = [
            "mystery",
            "combat",
            "intrigue",
            "exploration",
            "horror",
            "comedy",
            "romance",
            "rescue",
          ];
          const prefix = String(value ?? "").toLowerCase();
          if (!prefix) return themes;
          return themes.filter((theme) => theme.startsWith(prefix));
        }),
      },
    },
    (args: any) => {
      const { party_level, session_theme } = args;
      return {
        description: `Session preparation for level ${party_level} party with ${session_theme} theme`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Create a complete game session for a level ${party_level} party with a ${session_theme} theme. Include: 1) A main encounter appropriate for the party level, 2) 2-3 NPCs they might meet, 3) A plot hook to drive the session, 4) Potential treasure rewards, 5) Weather/atmosphere description.`,
              },
              ...(getDatasetLinkContent("encounters") ? [getDatasetLinkContent("encounters")!] : []),
              ...(getDatasetLinkContent("names") ? [getDatasetLinkContent("names")!] : []),
              ...(getDatasetLinkContent("traits") ? [getDatasetLinkContent("traits")!] : []),
              ...(getDatasetLinkContent("plot-hooks") ? [getDatasetLinkContent("plot-hooks")!] : []),
              ...(getDatasetLinkContent("treasure") ? [getDatasetLinkContent("treasure")!] : []),
              ...(getDatasetLinkContent("weather") ? [getDatasetLinkContent("weather")!] : []),
            ],
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "quick_npc",
    {
      title: "Quick NPC",
      description: "Generate a complete NPC with name, personality, and background",
      icons: getIconSet(env, "prompts"),
      argsSchema: {
        role: completable(z.string().min(1), (value) => {
          const roles = [
            "innkeeper",
            "merchant",
            "guard",
            "noble",
            "priest",
            "bandit",
            "mage",
            "guide",
          ];
          const prefix = String(value ?? "").toLowerCase();
          if (!prefix) return roles;
          return roles.filter((role) => role.startsWith(prefix));
        }),
      },
    },
    (args: any) => {
      const { role } = args;
      return {
        description: `Generate a complete ${role} NPC`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Create a detailed ${role} NPC including: 1) A fantasy name (choose appropriate race/gender), 2) 2-3 personality traits, 3) A brief backstory (2-3 sentences), 4) What they want from the party, 5) A unique quirk or mannerism.`,
              },
              ...(getDatasetLinkContent("names") ? [getDatasetLinkContent("names")!] : []),
              ...(getDatasetLinkContent("traits") ? [getDatasetLinkContent("traits")!] : []),
            ],
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "dungeon_room",
    {
      title: "Dungeon Room",
      description: "Generate a dungeon room with encounter, treasure, and description",
      icons: getIconSet(env, "prompts"),
      argsSchema: {
        party_level: completable(z.number().int().min(1).max(20), (value) => {
          const prefix = String(value ?? "");
          const levels = Array.from({ length: 20 }, (_, idx) => idx + 1);
          if (!prefix) return levels;
          return levels.filter((level) => String(level).startsWith(prefix));
        }),
        difficulty: completable(
          z.enum(["easy", "medium", "hard", "deadly"]).optional(),
          (value) => {
            const options = ["easy", "medium", "hard", "deadly"] as const;
            const prefix = String(value ?? "").toLowerCase();
            if (!prefix) return [...options];
            return options.filter((opt) => opt.startsWith(prefix));
          }
        ),
      },
    },
    (args: any) => {
      const { party_level, difficulty = "medium" } = args;
      return {
        description: `Generate a dungeon room for level ${party_level} party at ${difficulty} difficulty`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Create a dungeon room for a level ${party_level} party at ${difficulty} difficulty. Include: 1) Room description and atmosphere, 2) An encounter in the room (if any), 3) Treasure or rewards, 4) Potential hazards or traps, 5) Clues or secrets players might discover.`,
              },
              ...(getDatasetLinkContent("encounters") ? [getDatasetLinkContent("encounters")!] : []),
              ...(getDatasetLinkContent("treasure") ? [getDatasetLinkContent("treasure")!] : []),
            ],
          },
        ],
      };
    }
  );

  return server;
}
