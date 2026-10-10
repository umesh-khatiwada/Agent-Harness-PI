/**
 * Complete Pi Agent Harness with MCP (Model Context Protocol) & NVIDIA Nemotron
 *
 * Demonstrates:
 * 1. Native MCP extension integration via `createMcpExtension()`
 * 2. In-memory dynamic registration via `pi.registerMcpServer()`
 * 3. Connecting to a local Stdio MCP server ('mcp-server.ts')
 * 4. The LLM (Nemotron) invoking MCP tools directly and streaming the answer.
 */

import {
  createAgentSession,
  createMcpExtension,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpServerScript = path.join(__dirname, "mcp-server.ts");

console.log("=== Initializing Pi Harness with MCP ===");

// 1. Setup ResourceLoader with MCP Extension & Dynamic Registration
const resourceLoader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  extensionFactories: [
    // Native MCP Extension
    createMcpExtension(),
    // Extension that registers our custom Stdio MCP server
    (pi) => {
      pi.registerMcpServer("finance", {
        command: "npx",
        args: ["tsx", mcpServerScript],
        exposure: "direct", // Directly exposes tools to the LLM
        description: "Provides real-time stock market quotes and host server performance metrics",
      });
    },
  ],
});
await resourceLoader.reload();

const settingsManager = SettingsManager.create(process.cwd());

// 2. Create Agent Session with Nemotron model
const { session } = await createAgentSession({
  resourceLoader,
  settingsManager,
  sessionManager: SessionManager.inMemory(),
});

// 3. Bind extensions (establishes stdio connection with the MCP server)
console.log("Connecting to MCP servers...");
await session.bindExtensions({});

// Brief pause for stdio handshake
await new Promise((resolve) => setTimeout(resolve, 1200));

console.log(`Model:    ${session.model?.provider}/${session.model?.id}`);
console.log(`Active Tools: ${session.getActiveToolNames().join(", ")}\n`);

// 4. Subscribe to events (stream tokens and observe tool calls)
const unsubscribe = session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  } else if (event.type === "tool_execution_start") {
    console.log(`\n\n⚙️ [MCP Tool Call]: ${event.toolName}`);
    console.log(`   Arguments: ${JSON.stringify(event.params)}`);
  } else if (event.type === "tool_execution_end") {
    console.log(`   Result:    ${JSON.stringify(event.result)}`);
    console.log(`✅ [Tool Execution Finished]\n`);
  }
});

const userPrompt = process.argv.slice(2).join(" ") || "What is the current stock price of NVDA and what is the system uptime?";

try {
  console.log(`👤 User: ${userPrompt}\n🤖 Agent:`);
  await session.prompt(userPrompt);
  console.log("\n\n=== Session Completed Successfully ===");
} finally {
  unsubscribe();
  session.dispose();
  process.exit(0);
}
