import { z } from "zod";
import type { ToolContext, ToolDefinition } from "./types";

const toolErrorSchema = z.object({ error: z.string() });

const successSchema = z
  .object({
    environment: z.string(),
    difficulty: z.string(),
    partyLevel: z.number().int(),
  })
  .passthrough();

export const generateEncounterTool: ToolDefinition = {
  name: "generate_encounter",
  description: "Generate a random encounter for a TTRPG session",
  inputSchema: z.object({
    level: z.number().int().min(1).max(20),
    environment: z.enum(["forest", "dungeon", "city", "mountain", "swamp"]),
    difficulty: z.enum(["easy", "medium", "hard", "deadly"]).default("medium"),
  }),
  outputSchema: z.union([successSchema, toolErrorSchema]),
  async handler(ctx: ToolContext, args: unknown): Promise<unknown> {
    const { level, environment, difficulty } = args as any;

    const data = await ctx.fetchJson<any>("encounters.json");
    const normalizedEnv = environment?.toLowerCase();
    const normalizedDiff = (difficulty ?? "medium")?.toLowerCase();

    const encounters = data.encounters[normalizedEnv]?.[normalizedDiff] || [];

    if (encounters.length === 0) {
      return { error: `No encounters found for ${environment} / ${difficulty}` };
    }

    const encounter = encounters[Math.floor(Math.random() * encounters.length)];
    return {
      environment: normalizedEnv,
      difficulty: normalizedDiff,
      partyLevel: level,
      ...encounter,
    };
  },
};
