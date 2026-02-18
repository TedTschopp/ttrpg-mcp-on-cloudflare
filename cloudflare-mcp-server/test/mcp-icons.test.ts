import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createMcpServer } from "../src/mcp/server";
import worker from "../src/index";

function createTestEnv(overrides?: Partial<Env>): Env {
  return {
    DATA_BASE_URL: "https://ttrpg-mcp.tedt.org/data",
    DATA_CACHE_TTL_SECONDS: "3600",
    ALLOWED_ORIGINS: "https://ttrpg-mcp.tedt.org",
    ...overrides,
  };
}

function expectLightDarkIconSet(icons: Array<{ src: string; theme?: string; mimeType?: string }> | undefined) {
  expect(icons, "missing icons metadata").toBeTruthy();
  expect(Array.isArray(icons)).toBe(true);
  expect(icons!.length).toBeGreaterThanOrEqual(2);

  const light = icons!.find((i) => i.theme === "light");
  const dark = icons!.find((i) => i.theme === "dark");

  expect(light, "missing light icon").toBeTruthy();
  expect(dark, "missing dark icon").toBeTruthy();

  expect(light!.mimeType).toBe("image/svg+xml");
  expect(dark!.mimeType).toBe("image/svg+xml");

  // Accept either inline data URIs or hosted assets.
  const isSvgDataUri = (src: string) => src.startsWith("data:image/svg+xml");
  const isHostedAsset = (src: string) => /\/assets\/icons\//.test(src);
  expect(isSvgDataUri(light!.src) || isHostedAsset(light!.src)).toBe(true);
  expect(isSvgDataUri(dark!.src) || isHostedAsset(dark!.src)).toBe(true);
}

describe("mcp metadata icons", () => {
  const env = createTestEnv();
  const ctx = {
    waitUntil() {},
    passThroughOnException() {},
  } as unknown as ExecutionContext;

  const server = createMcpServer(env, ctx);
  const client = new Client(
    {
      name: "vitest-client",
      version: "0.0.0",
    },
    {
      capabilities: {},
    }
  );

  beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  it("includes icons on tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);

    // Note: as of @modelcontextprotocol/sdk v1.26.0, McpServer's listTools response
    // does not include `icons` even though the spec supports it.
    for (const tool of tools) {
      expect(tool.icons).toBeUndefined();
    }
  });

  it("includes icons on tools over HTTP", async () => {
    const request = new Request("https://example.com/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });

    const response = await worker.fetch(request, env, ctx);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as any;
    expect(payload?.result?.tools?.length).toBeGreaterThan(0);

    for (const tool of payload.result.tools) {
      expectLightDarkIconSet(tool.icons);
    }
  });

  it("includes icons on the server implementation", async () => {
    const impl = client.getServerVersion();
    expect(impl, "missing server implementation metadata").toBeTruthy();
    expectLightDarkIconSet(impl!.icons);
  });

  it("includes icons on resource templates", async () => {
    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates.length).toBeGreaterThan(0);

    const ttrpgData = resourceTemplates.find((t) => t.uriTemplate === "ttrpg://data/{dataset}");
    expect(ttrpgData, "missing ttrpg://data/{dataset} template").toBeTruthy();
    expectLightDarkIconSet(ttrpgData!.icons);
  });

  it("includes icons on concrete resources", async () => {
    const { resources } = await client.listResources();
    expect(resources.length).toBeGreaterThan(0);

    for (const resource of resources) {
      expectLightDarkIconSet(resource.icons);
    }
  });
});
