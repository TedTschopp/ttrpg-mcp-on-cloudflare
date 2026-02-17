import { z } from "zod";
import type { ToolContext, ToolDefinition } from "./types";

const traitsSchema = z
  .object({
    traits: z.array(z.string()),
  })
  .passthrough();

export const generatePersonalityTool: ToolDefinition = {
  name: "generate_personality",
  description: "Generate personality traits for an NPC",
  inputSchema: z
    .object({
      count: z.number().int().min(1).max(10).default(4),
    })
    .default({}),
  outputSchema: traitsSchema,
  async handler(ctx: ToolContext, args: unknown): Promise<unknown> {
    const { count = 4 } = (args ?? {}) as any;

    const data = await ctx.fetchJson<any>("traits.json");
    const allTraits = [
      ...data.traits,
      ...data.ideals,
      ...data.bonds,
      ...data.flaws,
      ...data.quirks,
    ];

    const selected: string[] = [];
    for (let i = 0; i < Math.min(count, allTraits.length); i++) {
      const trait = allTraits[Math.floor(Math.random() * allTraits.length)];
      if (!selected.includes(trait)) {
        selected.push(trait);
      }
    }

    return { traits: selected };
  },
};
