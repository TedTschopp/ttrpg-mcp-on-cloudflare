import { z } from "zod";
import type { ToolContext, ToolDefinition } from "./types";

const treasureOutputSchema = z
  .object({
    challengeRating: z.number().int(),
    type: z.string(),
    coins: z.record(z.number()),
    items: z.array(z.string()),
  })
  .passthrough();

export const generateTreasureTool: ToolDefinition = {
  name: "generate_treasure",
  description: "Generate treasure based on challenge rating",
  inputSchema: z.object({
    cr: z.number().int().min(0).max(30),
    type: z.enum(["individual", "hoard"]).default("individual"),
  }),
  outputSchema: treasureOutputSchema,
  async handler(ctx: ToolContext, args: unknown): Promise<unknown> {
    const { cr, type = "individual" } = args as any;

    const data = await ctx.fetchJson<any>("treasure.json");

    let crRange = "cr0-4";
    if (cr >= 17) crRange = "cr17+";
    else if (cr >= 11) crRange = "cr11-16";
    else if (cr >= 5) crRange = "cr5-10";

    const treasureData = data.treasure[type][crRange];
    const items = data.treasure.items;

    const coins: Record<string, number> = {};
    if (treasureData) {
      for (const [coinType, diceData] of Object.entries<any>(treasureData)) {
        if (coinType !== "items") {
          const rolls = (diceData.dice as string).split("d");
          const numDice = parseInt(rolls[0]);
          const diceSize = parseInt(rolls[1]);
          let total = 0;
          for (let i = 0; i < numDice; i++) {
            total += Math.floor(Math.random() * diceSize) + 1;
          }
          coins[coinType] = total * (diceData.multiplier as number);
        }
      }
    }

    const treasureItems: string[] = [];
    const normalizedType = type?.toLowerCase();
    if (normalizedType === "hoard" && cr >= 5) {
      const itemPool = cr >= 11 ? items.magic_major : items.magic_medium;
      const numItems = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numItems; i++) {
        treasureItems.push(itemPool[Math.floor(Math.random() * itemPool.length)]);
      }
    }

    return {
      challengeRating: cr,
      type: normalizedType,
      coins,
      items: treasureItems,
    };
  },
};
