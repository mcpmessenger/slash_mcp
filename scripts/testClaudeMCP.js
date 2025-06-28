// scripts/testClaudeMCP.js
// Simple sanity check that the Claude MCP bridge at localhost:8081/mcp is reachable
// and our API key works. Prints the JSON-RPC response.

import fetch from "node-fetch";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Set ANTHROPIC_API_KEY env-var first");
  process.exit(1);
}

const url = process.env.CLAUDE_MCP_URL || "http://localhost:8081/mcp";

const body = {
  jsonrpc: "2.0",
  id: Date.now(),
  method: "mcp_invokeTool",
  params: {
    toolName: "run_command",
    parameters: { command: "echo hi" },
  },
};

const headers = {
  "Content-Type": "application/json",
  "x-api-key": apiKey,
  "anthropic-version": "2023-06-01",
};

(async () => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log("HTTP", res.status);
    console.log(text);
  } catch (err) {
    console.error("Request failed", err);
    process.exit(1);
  }
})(); 