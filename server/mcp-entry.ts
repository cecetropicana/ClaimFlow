import { startMcpServer } from "./mcp-server";

startMcpServer().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
