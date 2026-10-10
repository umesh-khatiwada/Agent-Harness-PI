/**
 * Trivy Agent with MCP integration
 *
 * This agent sets up the Trivy MCP server for security scanning capabilities.
 */

import {
	createAgentSession,
	createMcpExtension,
	DefaultResourceLoader,
	getAgentDir,
	SessionManager,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";

const cwd = process.cwd();

const resourceLoader = new DefaultResourceLoader({
	cwd,
	agentDir: getAgentDir(),
	extensionFactories: [
		// MCP extension reads mcp.json from agent directory and trusted project
		createMcpExtension(),
	],
});
await resourceLoader.reload();

const settingsManager = SettingsManager.create(cwd);
// Keep the default tools (read, bash, edit, write) etc.
settingsManager.applyOverrides({ defaultTools: ["read", "bash", "edit", "write"] });

const { session } = await createAgentSession({
	resourceLoader,
	settingsManager,
	sessionManager: SessionManager.inMemory(),
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
} finally {
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