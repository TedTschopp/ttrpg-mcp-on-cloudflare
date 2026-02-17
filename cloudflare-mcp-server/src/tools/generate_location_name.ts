import { z } from "zod";
import type { ToolContext, ToolDefinition } from "./types";

const toolErrorSchema = z.object({ error: z.string() });

const successSchema = z
  .object({
    name: z.string(),
    type: z.string(),
  })
  .passthrough();

export const generateLocationNameTool: ToolDefinition = {
  name: "generate_location_name",
  description: "Generate a name for a location",
  inputSchema: z.object({
    type: z.enum([
      "tavern",
      "inn",
      "city",
      "town",
      "village",
      "dungeon",
      "castle",
      "shop",
      "guild",
      "temple",
    ]),
  }),
  outputSchema: z.union([successSchema, toolErrorSchema]),
  async handler(ctx: ToolContext, args: unknown): Promise<unknown> {
    const { type } = args as any;

    const data = await ctx.fetchJson<any>("locations.json");
    const normalizedType = type?.toLowerCase();
    const location = data.locations[normalizedType];

    if (!location) {
      return { error: `No location type found: ${type}` };
    }

    const prefix = location.prefixes[Math.floor(Math.random() * location.prefixes.length)];
    const suffix = location.suffixes[Math.floor(Math.random() * location.suffixes.length)];

    return {
      name: `${prefix} ${suffix}`,
      type: normalizedType,
    };
  },
};
