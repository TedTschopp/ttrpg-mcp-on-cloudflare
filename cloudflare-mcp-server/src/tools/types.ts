export type ToolContext = {
  fetchJson: <T = unknown>(filename: string) => Promise<T>;
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
  handler: (ctx: ToolContext, args: unknown) => Promise<unknown>;
};
