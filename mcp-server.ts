/**
 * Sample Custom MCP Server
 *
 * Implements standard Model Context Protocol (MCP) over stdio.
 * Provides custom tools: 'get_stock_quote' and 'get_system_stats'.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import os from "node:os";

const server = new McpServer({
  name: "company-tools",
  version: "1.0.0",
});

// Tool 1: Stock Quote
server.tool(
  "get_stock_quote",
  "Fetch latest stock price and market statistics for a ticker symbol",
  {
    symbol: z.string().describe("Stock ticker symbol, e.g. NVDA, AAPL, MSFT"),
  },
  async ({ symbol }) => {
    const prices: Record<string, number> = {
      NVDA: 138.25,
      AAPL: 228.50,
      MSFT: 418.10,
      GOOGL: 165.75,
    };
    const ticker = symbol.toUpperCase();
    const price = prices[ticker] ?? (100 + Math.random() * 50).toFixed(2);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            symbol: ticker,
            price,
            currency: "USD",
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    };
  }
);

// Tool 2: System Stats
server.tool(
  "get_system_stats",
  "Returns live system performance metrics including memory, CPU load, and uptime",
  {},
  async () => {
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + " GB";
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + " GB";
    const uptimeHours = (os.uptime() / 3600).toFixed(1) + " hours";

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            platform: os.platform(),
            architecture: os.arch(),
            cpuCount: os.cpus().length,
            totalMemory: totalMem,
            freeMemory: freeMem,
            uptime: uptimeHours,
          }),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
