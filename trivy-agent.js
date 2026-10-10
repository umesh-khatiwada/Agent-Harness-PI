"use strict";
/**
 * Trivy Agent with MCP integration
 *
 * This agent sets up the Trivy MCP server for security scanning capabilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const pi_coding_agent_1 = require("@earendil-works/pi-coding-agent");
const cwd = process.cwd();
const resourceLoader = new pi_coding_agent_1.DefaultResourceLoader({
    cwd,
    agentDir: (0, pi_coding_agent_1.getAgentDir)(),
    extensionFactories: [
        // MCP extension reads mcp.json from agent directory and trusted project
        (0, pi_coding_agent_1.createMcpExtension)(),
    ],
});
await resourceLoader.reload();
const settingsManager = pi_coding_agent_1.SettingsManager.create(cwd);
// Keep the default tools (read, bash, edit, write) etc.
settingsManager.applyOverrides({ defaultTools: ["read", "bash", "edit", "write"] });
const { session } = await (0, pi_coding_agent_1.createAgentSession)({
    resourceLoader,
    settingsManager,
    sessionManager: pi_coding_agent_1.SessionManager.inMemory(),
});
try {
    // Emits session_start, which connects the MCP servers in the background.
    await session.bindExtensions({});
    console.log("=== Trivy Agent Initialized ===");
    console.log("Active tools:", session.getActiveToolNames().join(", "));
    console.log("\nYou can now ask security-related questions, e.g.:");
    console.log("  'Are there any vulnerabilities in this project?'");
    console.log("  'Scan this container image for issues.'");
    console.log("\nAgent is ready. Enter your prompt (or Ctrl+C to exit).\n");
    // Read from stdin and prompt the agent
    const { stdin } = process;
    stdin.setEncoding("utf8");
    let buffer = "";
    stdin.on("data", (chunk) => {
        buffer += chunk;
        if (buffer.endsWith("\n")) {
            const prompt = buffer.trim();
            buffer = "";
            if (prompt.toLowerCase() === "exit" || prompt.toLowerCase() === "quit") {
                stdin.pause();
                return;
            }
            console.log(`👤 User: ${prompt}`);
            console.log("🤖 Agent:");
            session.prompt(prompt).then(() => {
                console.log("\n🤖 Agent (complete):");
            });
        }
    });
    // Keep the process alive until stdin ends
    stdin.on("end", () => {
        console.log("\nExiting...");
    });
    stdin.on("close", () => {
        console.log("\nExiting...");
    });
}
finally {
    // Note: we won't dispose session here because we want it to stay alive for stdin prompts.
    // We'll dispose on process exit.
    process.on("exit", () => {
        session.dispose();
    });
    process.on("SIGINT", () => {
        session.dispose();
        process.exit(0);
    });
}
