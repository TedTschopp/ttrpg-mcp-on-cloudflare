import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { TOOL_REGISTRY } from "../src/tools/registry";
import type { ToolContext } from "../src/tools/types";

import encounters from "../../data/encounters.json";
import locations from "../../data/locations.json";
import names from "../../data/names.json";
import plotHooks from "../../data/plot_hooks.json";
import traits from "../../data/traits.json";
import treasure from "../../data/treasure.json";
import weather from "../../data/weather.json";

const FIXTURES: Record<string, unknown> = {
  "encounters.json": encounters,
  "locations.json": locations,
  "names.json": names,
  "plot_hooks.json": plotHooks,
  "traits.json": traits,
  "treasure.json": treasure,
  "weather.json": weather,
};

async function loadFixtureJson(filename: string): Promise<unknown> {
  const value = FIXTURES[filename];
  if (value === undefined) {
    throw new Error(`Missing fixture: ${filename}`);
  }
  return value;
}

describe("tools smoke", () => {
  it("runs all tools with deterministic randomness", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const fixtureCache = new Map<string, unknown>();
    const ctx: ToolContext = {
      fetchJson: async <T = unknown>(filename: string): Promise<T> => {
        if (!fixtureCache.has(filename)) {
          fixtureCache.set(filename, await loadFixtureJson(filename));
        }
        return fixtureCache.get(filename) as T;
      },
    };

    const cases: Array<{ toolName: string; args: unknown }> = [
      {
        toolName: "generate_encounter",
        args: { level: 5, environment: "forest", difficulty: "medium" },
      },
      {
        toolName: "generate_npc_name",
        args: { race: "elf", gender: "female" },
      },
      {
        toolName: "generate_location_name",
        args: { type: "tavern" },
      },
      {
        toolName: "generate_personality",
        args: { count: 3 },
      },
      {
        toolName: "generate_treasure",
        args: { cr: 0, type: "individual" },
      },
      {
        toolName: "generate_weather",
        args: { climate: "temperate", season: "summer" },
      },
      {
        toolName: "generate_plot_hook",
        args: { theme: "mystery", level: 5 },
      },
    ];

    for (const testCase of cases) {
      const tool = TOOL_REGISTRY[testCase.toolName];
      expect(tool, `missing tool ${testCase.toolName}`).toBeTruthy();

      const result = await tool.handler(ctx, testCase.args);
      const schema = tool.outputSchema as z.ZodTypeAny;
      const parsed = schema.safeParse(result);
      expect(parsed.success, `${testCase.toolName} output schema mismatch`).toBe(true);

      // These inputs should exist in fixtures; ensure we didn't hit a "no data" error path.
      if (typeof result === "object" && result !== null && "error" in result) {
        throw new Error(`${testCase.toolName} returned error: ${(result as any).error}`);
      }
    }
  });
});
