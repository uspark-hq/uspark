import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "path";

describe("MCP Server Integration Tests", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    // Path to built MCP server
    const serverPath = resolve(
      __dirname,
      "../../../turbo/packages/mcp-server/dist/index.js",
    );

    // Create transport with test environment
    transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      env: {
        USPARK_TOKEN: process.env.USPARK_TOKEN || "test-token",
        USPARK_PROJECT_ID: process.env.USPARK_PROJECT_ID || "test-project",
        USPARK_API_URL: process.env.USPARK_API_URL || "http://localhost:3000",
        USPARK_SYNC_INTERVAL: "3600000",
        USPARK_OUTPUT_DIR: ".uspark-test",
      },
    });

    // Create client and connect
    client = new Client(
      {
        name: "mcp-server-e2e-test",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    await client.connect(transport);
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  describe("Server Information", () => {
    it("should connect successfully", async () => {
      // If we got here, connection succeeded
      expect(client).toBeDefined();
    });
  });

  describe("Tools", () => {
    it("should list available tools", async () => {
      const result = await client.listTools();

      expect(result.tools).toBeDefined();
      expect(result.tools.length).toBeGreaterThan(0);

      // Check for expected tools
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain("uspark_pull");
      expect(toolNames).toContain("uspark_status");
      expect(toolNames).toContain("uspark_list_files");
    });

    it("should execute uspark_status tool", async () => {
      const result = await client.callTool({
        name: "uspark_status",
        arguments: {},
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const statusText = (result.content[0] as { text: string }).text;
      expect(statusText).toContain("uSpark MCP Server Status");
      expect(statusText).toContain("test-project");
    });

    // Note: uspark_pull and uspark_list_files require a real API server
    // These are marked as optional and will be skipped if no API_URL is set
    it.skipIf(!process.env.USPARK_API_URL)(
      "should execute uspark_list_files tool",
      async () => {
        const result = await client.callTool({
          name: "uspark_list_files",
          arguments: {},
        });

        expect(result.isError).toBeFalsy();
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe("text");
      },
    );

    it.skipIf(!process.env.USPARK_API_URL)(
      "should execute uspark_pull tool",
      async () => {
        const result = await client.callTool({
          name: "uspark_pull",
          arguments: {},
        });

        expect(result.isError).toBeFalsy();
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe("text");

        const pullText = (result.content[0] as { text: string }).text;
        expect(pullText).toContain("Successfully pulled");
      },
    );
  });
});
