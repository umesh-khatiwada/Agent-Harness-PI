/**
 * Pi Agent Harness with NVIDIA Nemotron 3 Super 120B
 *
 * Model: nvidia/nemotron-3-super-120b-a12b
 * Endpoint: https://integrate.api.nvidia.com/v1
 */

import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

// Accept custom prompt from CLI arguments or use default
const prompt = process.argv.slice(2).join(" ") || "Introduce yourself and inspect the files in the current working directory.";

console.log("=== Initializing Pi Agent Harness ===");
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
});

console.log(`Model:    ${session.model?.provider}/${session.model?.id}`);
console.log(`Endpoint: ${session.model?.baseUrl}`);
console.log(`Tools:    ${session.getActiveToolNames().join(", ")}\n`);

// 1. Subscribe to events (streaming text + tool executions)
const unsubscribe = session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  } else if (event.type === "tool_execution_start") {
    console.log(`\n\n⚙️ [Tool Call]: ${event.toolName} ${JSON.stringify(event.params ?? {})}`);
  } else if (event.type === "tool_execution_end") {
    console.log(`✅ [Tool Completed]\n`);
  }
});

try {
  console.log(`👤 User: ${prompt}\n🤖 Agent:`);
  await session.prompt(prompt);
  console.log("\n\n=== Agent Session Complete ===");
} finally {
  unsubscribe();
  session.dispose();
}
