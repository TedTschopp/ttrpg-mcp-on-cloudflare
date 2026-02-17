import { z } from "zod";
import type { ToolContext, ToolDefinition } from "./types";

const toolErrorSchema = z.object({ error: z.string() });

const successSchema = z
  .object({
    name: z.string(),
    race: z.string(),
    gender: z.string(),
  })
  .passthrough();

export const generateNpcNameTool: ToolDefinition = {
  name: "generate_npc_name",
  description: "Generate an NPC name for a fantasy character",
  inputSchema: z.object({
    race: z.enum([
      "human",
      "elf",
      "dwarf",
      "halfling",
      "gnome",
      "half-elf",
      "half-orc",
      "tiefling",
      "dragonborn",
      "orc",
      "goblin",
    ]),
    gender: z.enum(["male", "female"]),
  }),
  outputSchema: z.union([successSchema, toolErrorSchema]),
  async handler(ctx: ToolContext, args: unknown): Promise<unknown> {
    const { race, gender } = args as any;

    const data = await ctx.fetchJson<any>("names.json");
    const normalizedRace = race?.toLowerCase();
    const normalizedGender = gender?.toLowerCase();
    const names = data.names[normalizedRace]?.[normalizedGender] || [];

    if (names.length === 0) {
      return { error: `No names found for ${race} / ${gender}` };
    }

    const name = names[Math.floor(Math.random() * names.length)];
    return { name, race: normalizedRace, gender: normalizedGender };
  },
};
