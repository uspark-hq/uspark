import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import type { UsparkConfig } from "./config.js";
import { handleUsparkPull } from "./tools/pull.js";
import { handleUsparkStatus } from "./tools/status.js";
import { handleUsparkListFiles } from "./tools/list-files.js";

/**
 * Create and configure the uSpark MCP server
 */
function createServer(config: UsparkConfig): Server {
  const server = new Server(
    {
      name: "uspark-mcp-server",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Define available tools
  const tools: Tool[] = [
    {
      name: "uspark_pull",
      description:
        "Pull files from the configured uSpark project to the local .uspark directory. " +
        "This will sync all files from the remote project.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "uspark_status",
      description:
        "Get the current sync status and configuration information for the uSpark MCP server.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "uspark_list_files",
      description:
        "List all files in the configured uSpark project on the remote server.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  ];

  // Register list_tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Register call_tool handler
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const { name } = request.params;

      switch (name) {
        case "uspark_pull":
          return await handleUsparkPull(config);

        case "uspark_status":
          return await handleUsparkStatus(config);

        case "uspark_list_files":
          return await handleUsparkListFiles(config);

        default:
          return {
            content: [
              {
                type: "text",
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }
    },
  );

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(config: UsparkConfig): Promise<void> {
  const server = createServer(config);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log to stderr (stdout is used for MCP communication)
  console.error("uSpark MCP server running on stdio");
  console.error(`Project ID: ${config.projectId}`);
  console.error(`Output directory: ${config.outputDir}`);
}
