import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ToolContext, ToolDefinition } from "./types";

import { generateEncounterTool } from "./generate_encounter";
import { generateLocationNameTool } from "./generate_location_name";
import { generateNpcNameTool } from "./generate_npc_name";
import { generatePersonalityTool } from "./generate_personality";
import { generatePlotHookTool } from "./generate_plot_hook";
import { generateTreasureTool } from "./generate_treasure";
import { generateWeatherTool } from "./generate_weather";

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  [generateEncounterTool.name]: generateEncounterTool,
  [generateNpcNameTool.name]: generateNpcNameTool,
  [generateLocationNameTool.name]: generateLocationNameTool,
  [generatePersonalityTool.name]: generatePersonalityTool,
  [generateTreasureTool.name]: generateTreasureTool,
  [generateWeatherTool.name]: generateWeatherTool,
  [generatePlotHookTool.name]: generatePlotHookTool,
};

export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY[name];
}

export function listToolsForJsonRpc(): Array<{
  name: string;
  description: string;
  inputSchema: unknown;
}> {
  return Object.values(TOOL_REGISTRY).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toJsonSchema(tool.inputSchema),
  }));
}

export async function callTool(ctx: ToolContext, name: string, args: unknown): Promise<unknown> {
  const tool = getTool(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return await tool.handler(ctx, args);
}

function toJsonSchema(schema: unknown): unknown {
  // Input schemas are Zod schemas today.
  // Later, when integrating the MCP SDK, we can pass Zod directly where supported.
  const zodSchema = schema as z.ZodTypeAny;
  return zodToJsonSchema(zodSchema, {
    $refStrategy: "none",
    errorMessages: true,
  });
}
