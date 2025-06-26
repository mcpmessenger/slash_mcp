# Claude Code MCP Specification Review and Proof-of-Concept Implementation Instructions

## 1. Introduction

This document provides a detailed review of the Model Context Protocol (MCP) specifications as implemented by Anthropic's Claude Code. It also outlines instructions for developing a small proof-of-concept (PoC) to establish communication between `slash_mcp` and Claude Code via MCP, focusing on key functionalities such as executing simple commands.

## 2. Model Context Protocol (MCP) Overview

MCP is an open protocol designed to enable Large Language Models (LLMs) to access external tools and data sources. It functions as a plugin system, allowing LLMs to extend their capabilities by interacting with various external systems through standardized interfaces. Claude Code leverages MCP to integrate with development environments, understand codebases, and perform coding tasks.

### 2.1. Client-Server Architecture

MCP operates on a client-server architecture. Claude Code can act as both an MCP client (connecting to external MCP servers) and an MCP server (exposing its own tools and capabilities to other MCP clients). This dual role is crucial for flexible integration scenarios.

### 2.2. Transport Types

Claude Code supports different transport types for MCP communication:

*   **stdio:** A simpler transport for local development, where the MCP server communicates via standard input/output streams.
*   **SSE (Server-Sent Events):** A real-time, one-way communication protocol where the server pushes updates to the client. This is suitable for continuous data streams.
*   **Streamable HTTP:** A more flexible HTTP-based transport that allows for both request-response and streaming communication.

### 2.3. MCP Server Scopes

MCP server configurations in Claude Code can be managed at three different scope levels, each with distinct purposes and precedence:

*   **Local (default):** Configuration is stored in project-specific user settings, private to the individual and accessible only within the current project directory. Ideal for personal development or sensitive credentials.
*   **Project:** Configuration is stored in a `.mcp.json` file at the project's root directory, designed to be checked into version control and shared with all team members. Claude Code prompts for approval before using project-scoped servers.
*   **User:** Configuration is available across all projects on the user's machine, remaining private to the user account. Suitable for personal utility servers or frequently used development tools.

When servers with the same name exist at multiple scopes, the precedence is `local` > `project` > `user`.

### 2.4. Authentication

MCP servers can be provided with environment variables for authentication (e.g., API keys). Claude Code also supports OAuth 2.0 authentication flows for secure connections to remote MCP servers. Authentication tokens are securely stored and automatically refreshed.

## 3. Claude Code MCP Interface and Data Structures

While a full, formal JSON schema for the Claude Code MCP is not explicitly provided as a single downloadable document, the Anthropic documentation [1] illustrates the command-line interface for adding and managing MCP servers, which implicitly defines the expected structure for server configuration and interaction.

### 3.1. Adding an MCP Server (Command Line Syntax)

The basic syntax for adding an MCP server to Claude Code is:

```bash
claude mcp add <name> <command> [args...]
```

For `stdio` servers, the `<command>` is the executable path of the MCP server program. For `SSE` or `HTTP` servers, it's the URL of the endpoint.

**Example: Adding a local `stdio` server**

```bash
claude mcp add my-server /path/to/my/mcp-server-executable
```

**Example: Adding an `SSE` server**

```bash
claude mcp add --transport sse my-sse-server https://example.com/sse-endpoint
```

**Example: Adding an `HTTP` server with authentication header**

```bash
claude mcp add --transport http secure-server https://api.example.com/mcp --header "Authorization: Bearer <token>"
```

### 3.2. `.mcp.json` Structure (for Project-Scoped Servers)

When a project-scoped server is added, Claude Code creates or updates a `.mcp.json` file with a structure similar to this:

```json
{
  "mcpServers": [
    {
      "name": "my-project-server",
      "transport": "stdio",
      "command": "./scripts/my-mcp-server.js",
      "args": ["--config", "./config.json"],
      "env": {
        "API_KEY": "your_api_key"
      }
    },
    {
      "name": "remote-api-server",
      "transport": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "X-Custom-Header": "value"
      }
    }
  ]
}
```

**Key fields within `mcpServers` array:**

*   `name` (string, required): A unique identifier for the MCP server.
*   `transport` (string, required): Specifies the communication protocol (`stdio`, `sse`, `http`).
*   `command` (string, required for `stdio`): The executable path for the `stdio` server.
*   `url` (string, required for `sse`, `http`): The endpoint URL for `SSE` or `HTTP` servers.
*   `args` (array of strings, optional): Command-line arguments to pass to the `stdio` server executable.
*   `env` (object, optional): Key-value pairs for environment variables to set for the `stdio` server process.
*   `headers` (object, optional): Key-value pairs for HTTP headers to send with requests for `HTTP` servers.

### 3.3. Interaction and Capabilities

Claude Code interacts with MCP servers to:

*   **List available resources:** By typing `@` in the prompt, users can see resources from connected MCP servers, which appear alongside files in the autocomplete menu. Resources can be referenced using `@server:protocol://resource/path`.
*   **Invoke tools:** MCP servers expose tools that Claude Code can call. The exact JSON-RPC messages for tool invocation are not explicitly detailed in the public documentation but follow the general MCP specification (which is JSON-RPC based).
*   **Stream output:** For real-time communication, especially with `SSE` and `Streamable HTTP` transports, Claude Code expects streamed output from the MCP server.

## 4. Proof-of-Concept (PoC) Implementation Instructions

The goal of this PoC is to establish basic communication between `slash_mcp` and Claude Code via MCP, demonstrating `slash_mcp`'s ability to act as an MCP client and execute a simple command through Claude Code.

### 4.1. Prerequisites

*   **Node.js and npm:** Ensure Node.js (v18 or later) and npm are installed on your development machine.
*   **`slash_mcp` repository:** Have a working clone of the `slash_mcp` repository.
*   **Claude Code:** Install Claude Code globally:
    ```bash
    npm install -g @anthropic-ai/claude-code
    ```
    Ensure you have authenticated Claude Code with your Anthropic API key.

### 4.2. PoC Architecture

We will implement `slash_mcp` as an MCP client that communicates with Claude Code, which will act as an MCP server. `slash_mcp` will send a request to Claude Code to execute a simple shell command (e.g., `ls` or `echo`), and Claude Code will return the output.



### 4.3. Step-by-Step Implementation

#### Step 1: Configure Claude Code as an MCP Server

First, we need to start Claude Code in MCP server mode. This will expose Claude Code's capabilities as an MCP server that `slash_mcp` can connect to. For simplicity, we'll use the `stdio` transport for the PoC, as it's easier to set up for local testing.

Open a new terminal and run Claude Code as an MCP server:

```bash
claude mcp add claude-poc-server "claude --mcp-server"
```

This command adds a new MCP server named `claude-poc-server` to your Claude Code configuration. The `"claude --mcp-server"` part tells Claude Code to run itself in MCP server mode. By default, this will use `stdio` transport if no `--transport` flag is specified.

#### Step 2: Modify `slash_mcp` Backend to Act as an MCP Client

Navigate to your `slash_mcp` project directory. We need to modify the `server/index.js` (or relevant backend file) to establish a connection to the Claude Code MCP server and send requests.

**A. Install a JSON-RPC Client Library (if not already present):**

If `slash_mcp` doesn't have a built-in JSON-RPC client for external communication, you might need to install one. For Node.js, `jsonrpc-lite` or `node-json-rpc` are options. However, given `slash_mcp` already uses JSON-RPC over WebSocket, it might have internal utilities that can be adapted.

For this PoC, let's assume we'll use a simple HTTP client to interact with Claude Code if we configure it as an HTTP MCP server. If we stick to `stdio`, we'd need to spawn a child process and manage its `stdin`/`stdout`.

Given `slash_mcp`'s existing WebSocket for client-backend communication, a more robust integration would involve `slash_mcp`'s backend acting as an HTTP/SSE client to Claude Code's MCP server.

Let's adjust Step 1 to make Claude Code run as an HTTP MCP server for easier integration from `slash_mcp`'s Node.js backend.

**Revised Step 1: Configure Claude Code as an HTTP MCP Server**

Open a new terminal and run Claude Code as an HTTP MCP server on a specific port (e.g., 8081):

```bash
claude mcp add claude-http-server --transport http --url http://localhost:8081 --command "claude --mcp-server --http-port 8081"
```

This command tells Claude Code to run an HTTP MCP server on `http://localhost:8081`. The `--command` flag is used here to specify the actual command that starts the Claude Code MCP server process, ensuring it listens on the correct port.

#### Step 3: Implement MCP Client Logic in `slash_mcp` Backend

In `server/index.js` (or a new dedicated module for MCP interactions), you'll need to add logic to:

1.  **Make HTTP requests:** Use Node.js's built-in `http` or `https` module, or a library like `axios`, to send POST requests to `http://localhost:8081`.
2.  **Construct JSON-RPC requests:** MCP is built on JSON-RPC. A basic request to invoke a tool (e.g., `shell_execute` which Claude Code exposes) would look like this:

    ```json
    {
      "jsonrpc": "2.0",
      "method": "tool_code",
      "params": {
        "tool_name": "shell_execute",
        "args": {
          "command": "ls -l"
        }
      },
      "id": 1
    }
    ```
    *Note: The exact method name and `params` structure for `shell_execute` or other tools exposed by Claude Code as an MCP server might need to be confirmed from more detailed Claude Code MCP documentation or by inspecting its behavior.* For this PoC, `tool_code` is a common pattern for invoking code execution tools.

3.  **Handle JSON-RPC responses:** Parse the JSON response from Claude Code and extract the result.

**Example Snippet for `server/index.js` (Conceptual):**

```javascript
// Assuming you have an existing WebSocket server setup in slash_mcp
// and a way to handle incoming messages from the frontend.

const http = require('http');

// Function to send a command to Claude Code via MCP
async function sendClaudeCodeCommand(command) {
  const postData = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tool_code', // Or the actual method for shell execution
    params: {
      tool_name: 'shell_execute',
      args: {
        command: command
      }
    },
    id: 1 // Request ID
  });

  const options = {
    hostname: 'localhost',
    port: 8081,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          if (parsedData.error) {
            reject(new Error(parsedData.error.message));
          } else {
            resolve(parsedData.result);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Example of how you might integrate this into an existing message handler
// This is highly conceptual and depends on your existing slash_mcp architecture.

// In your WebSocket message handler (e.g., for 'mcp_invokeTool' from frontend)
// if (message.method === 'mcp_invokeTool' && message.params.tool === 'claude_code_shell') {
//   const commandToExecute = message.params.args.command;
//   try {
//     const result = await sendClaudeCodeCommand(commandToExecute);
//     // Send result back to frontend via WebSocket
//     // ws.send(JSON.stringify({ jsonrpc: '2.0', result: result, id: message.id }));
//   } catch (error) {
//     // Handle error and send back to frontend
//     // ws.send(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: error.message }, id: message.id }));
//   }
// }

// For a simple PoC, you could even add a direct test route or function call
// For example, in your server's main execution flow:
// (async () => {
//   try {
//     console.log('Sending test command to Claude Code...');
//     const output = await sendClaudeCodeCommand('echo Hello from Claude Code!');
//     console.log('Claude Code Output:', output);
//   } catch (error) {
//     console.error('Error communicating with Claude Code:', error);
//   }
// })();
```

#### Step 4: Test the PoC

1.  **Start Claude Code MCP Server:** In a dedicated terminal, run the command from Revised Step 1:
    ```bash
    claude mcp add claude-http-server --transport http --url http://localhost:8081 --command "claude --mcp-server --http-port 8081"
    ```
    Verify that Claude Code starts listening on port 8081.

2.  **Start `slash_mcp` Backend:** In another terminal, start your `slash_mcp` backend. Ensure that the modifications from Step 3 are active.

3.  **Observe Output:** Check the console output of your `slash_mcp` backend. If the integration is successful, you should see the output from the `echo` command (or `ls -l`) executed by Claude Code.

### 4.4. Key Functionalities for PoC

For the initial PoC, focus on these core functionalities:

*   **Tool Invocation:** Successfully sending a request to Claude Code to execute a predefined tool (e.g., `shell_execute` for running a simple command).
*   **Context Passing (Implicit):** While not explicitly demonstrated in the simple `echo` example, understand that the MCP allows for passing context (e.g., current file, selected code) within the `params` of the JSON-RPC request. For a more advanced PoC, you could try to pass a file path for Claude Code to `View` or `Edit`.
*   **Response Handling:** Correctly receiving and parsing the JSON-RPC response from Claude Code, including both successful results and error messages.

## 5. Further Considerations for Full Integration

*   **Error Handling and Robustness:** Implement comprehensive error handling, including network issues, invalid MCP responses, and Claude Code-specific errors.
*   **Security:** Reinforce `slash_mcp`'s whitelisting mechanisms to control which commands Claude Code can execute, especially if exposing `shell_execute` directly. Consider sandboxing Claude Code's execution environment.
*   **Context Synchronization:** Develop a robust mechanism to synchronize the development context (open files, active project, selected code) between `slash_mcp`'s frontend, backend, and Claude Code.
*   **Streaming Output:** For long-running operations or continuous feedback, leverage `SSE` or `Streamable HTTP` transports to stream output from Claude Code back to the `slash_mcp` frontend in real-time.
*   **Tool Discovery:** Explore how `slash_mcp` can dynamically discover the tools exposed by Claude Code's MCP server, rather than hardcoding them.
*   **User Interface Integration:** Design intuitive UI elements within `slash_mcp`'s dual-terminal to allow users to trigger Claude Code functionalities and view its responses seamlessly.

## 6. References

[1] Model Context Protocol (MCP) - Anthropic API: https://docs.anthropic.com/en/docs/claude-code/mcp


