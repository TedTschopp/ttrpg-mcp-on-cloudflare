import { z } from "zod";
import type { ToolContext, ToolDefinition } from "./types";

const toolErrorSchema = z.object({ error: z.string() });

const successSchema = z
  .object({
    theme: z.string(),
    suggestedLevel: z.number().int().optional(),
    hook: z.string(),
  })
  .passthrough();

export const generatePlotHookTool: ToolDefinition = {
  name: "generate_plot_hook",
  description: "Generate adventure hooks and quest ideas",
  inputSchema: z.object({
    theme: z.enum([
      "mystery",
      "combat",
      "intrigue",
      "exploration",
      "horror",
      "comedy",
      "romance",
      "rescue",
    ]),
    level: z.number().int().min(1).max(20).optional(),
  }),
  outputSchema: z.union([successSchema, toolErrorSchema]),
  async handler(ctx: ToolContext, args: unknown): Promise<unknown> {
    const { theme, level } = args as any;

    const data = await ctx.fetchJson<any>("plot_hooks.json");
    const normalizedTheme = theme?.toLowerCase();
    const hooks = data.plot_hooks[normalizedTheme] || [];

    if (hooks.length === 0) {
      return { error: `No plot hooks found for theme: ${theme}` };
    }

    const hook = hooks[Math.floor(Math.random() * hooks.length)];
    return {
      theme: normalizedTheme,
      suggestedLevel: level,
      hook,
    };
  },
};
