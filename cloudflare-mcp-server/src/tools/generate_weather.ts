import { z } from "zod";
import type { ToolContext, ToolDefinition } from "./types";

const toolErrorSchema = z.object({ error: z.string() });

const successSchema = z
  .object({
    climate: z.string(),
    season: z.string().nullable().optional(),
    description: z.string(),
  })
  .passthrough();

export const generateWeatherTool: ToolDefinition = {
  name: "generate_weather",
  description: "Generate weather conditions",
  inputSchema: z.object({
    climate: z.enum(["temperate", "arctic", "tropical", "desert", "mountain"]),
    season: z.enum(["spring", "summer", "autumn", "winter"]).optional(),
  }),
  outputSchema: z.union([successSchema, toolErrorSchema]),
  async handler(ctx: ToolContext, args: unknown): Promise<unknown> {
    const { climate, season } = args as any;

    const data = await ctx.fetchJson<any>("weather.json");
    const normalizedClimate = climate?.toLowerCase();
    const normalizedSeason = season?.toLowerCase();

    const weatherOptions =
      normalizedSeason && data.weather[normalizedClimate]?.[normalizedSeason]
        ? data.weather[normalizedClimate][normalizedSeason]
        : data.weather[normalizedClimate]?.any || [];

    if (weatherOptions.length === 0) {
      return { error: `No weather found for ${climate} / ${season}` };
    }

    const description = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
    return { climate: normalizedClimate, season: normalizedSeason, description };
  },
};
