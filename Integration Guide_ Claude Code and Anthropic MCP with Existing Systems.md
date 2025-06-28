# Integration Guide: Claude Code and Anthropic MCP with Existing Systems

## Introduction

This guide provides a comprehensive overview of integrating Claude Code and Anthropic's Model Context Protocol (MCP) with existing systems, using the `slash_mcp` repository as a practical example. The goal is to enable developers to leverage the power of AI-driven coding assistance and context management within their applications.

## 1. Understanding Claude Code

Claude Code, developed by Anthropic, is an agentic coding tool designed to enhance developer productivity by integrating advanced AI capabilities directly into the coding workflow. It utilizes Claude Opus 4, a powerful large language model, to understand codebases, automate tasks, and assist with various development activities.

**Key Features:**

- **Agentic Capabilities:** Claude Code can autonomously perform coding tasks, from writing new features to debugging and testing, based on high-level instructions.
- **Codebase Awareness:** It possesses a deep understanding of the entire codebase, allowing for context-aware code generation and modifications.
- **Seamless Integration:** Designed for integration with terminals and popular IDEs like VSCode, it streamlines the development process.

For more detailed information, refer to the [Claude Code Summary](claude_code_summary.md).

## 2. Understanding Anthropic Model Context Protocol (MCP)

The Model Context Protocol (MCP) is an open standard by Anthropic that standardizes how applications provide context to Large Language Models (LLMs). It acts as a universal interface, enabling LLMs to access and utilize external data sources, tools, and conversational history in a structured manner.

**Key Benefits of MCP:**

- **Standardized Data Exchange:** Simplifies the process of feeding diverse data and tools to LLMs, reducing integration complexities.
- **Enhanced LLM Performance:** By providing rich context, MCP empowers LLMs to deliver more accurate, relevant, and sophisticated responses.
- **Facilitates AI Agent Development:** It lays the groundwork for building advanced AI agents that can interact intelligently with various systems and data environments.

For more detailed information, refer to the [Anthropic MCP Summary](anthropic_mcp_summary.md).

## 3. Integrating with `slash_mcp` - A Practical Example

The `slash_mcp` repository serves as an excellent prototype for understanding the practical integration of MCP. It demonstrates how a browser client, an AI-assistant workflow, and a thin backend can cooperate through a JSON-RPC 2.0 WebSocket, with explicit support for Claude MCP.

### 3.1 `slash_mcp` Architecture Overview

- **Frontend:** Built with React 18, Vite, Tailwind, and Framer-Motion, providing a user interface for interaction.
- **Transport:** Utilizes JSON-RPC 2.0 over WebSocket for communication between the client and the server.
- **Backend:** A Node 18 server handling MCP requests, including `mcp_sendResource`, `mcp_invokeTool` (which includes `shell_execute`), and `mcp_getCapabilities`.

### 3.2 Setting up Claude MCP Integration with `slash_mcp`

To integrate Claude MCP with your `slash_mcp` instance, follow these steps:

1.  **Install Claude CLI and Start the MCP Bridge:**

    The `slash_mcp` project expects a running Claude MCP bridge. This bridge acts as an intermediary, allowing the `slash_mcp` backend to communicate with Claude Code. You will need to install the Claude CLI and then start the `mcp-proxy`.

    First, ensure you have the Claude CLI installed and your Anthropic API key configured. Then, from your terminal (preferably in a Linux environment or WSL), run the following commands:

    ```bash
    export CLAUDE_BIN=/usr/bin/claude
    export ANTHROPIC_API_KEY=<your-key> # Replace <your-key> with your actual Anthropic API Key
    npx --yes mcp-proxy --stateless --server stream --port 8081 /usr/bin/claude mcp serve
    ```

    This command starts a stateless HTTP bridge on port `8081`. The `mcp-proxy` tool facilitates the communication by switching between server transports, enabling clients like `slash_mcp` to interact with the Claude MCP server.

2.  **Configure `slash_mcp` Backend to Connect to the MCP Bridge:**

    Before starting the `slash_mcp` backend, you need to inform it about the Claude MCP bridge's URL. Set the `CLAUDE_MCP_URL` environment variable:

    ```bash
    export CLAUDE_MCP_URL="http://localhost:8081/mcp"
    npm run backend
    ```

    Ensure that the `npm run backend` command is executed in a separate terminal session after the `mcp-proxy` is successfully running.

3.  **Invoking Claude MCP Tools from `slash_mcp` Terminal:**

    Once both the `mcp-proxy` and the `slash_mcp` backend are running, you can invoke Claude MCP tools directly from the `slash_mcp` user interface (e.g., the terminal within the `slash_mcp` application). The `slash_mcp` project provides a mechanism to call MCP tools using a specific command syntax:

    ```bash
    tool claude_mcp_invoke {"tool":"run_command","params":{"command":"echo hello"}}
    ```

    This command instructs `slash_mcp` to invoke a Claude MCP tool named `run_command` with the parameter `{"command":"echo hello"}`. The output from the Claude CLI (via the MCP bridge) will then stream back into the `slash_mcp` terminal pane.

### 3.3 Understanding `shell_execute` and Command Whitelisting

The `slash_mcp` backend exposes a `shell_execute` tool that allows the execution of shell commands. For security reasons, this tool implements a **command whitelisting** mechanism. By default, only a predefined set of safe commands are permitted.

**Default Allowed Commands:**

`ping`, `dir`, `ls`, `pwd`, `whoami`, `date`, `echo`, `ipconfig`, `id`, `uname`, `cat`, `head`, `tail`, `env`, `who`, `ps`

**Extending Allowed Commands:**

If your integration requires `slash_mcp` to execute additional commands, you can extend the whitelist. This can be done by modifying the `ALLOWED_CMDS` variable in `server/index.js` or by setting an environment variable before starting the `slash_mcp` backend:

```bash
# To allow specific extra commands (comma-separated)
ALLOWED_CMDS="uname,id,who" npm run backend

# To disable the whitelist entirely (for development purposes only, not recommended for production)
ALLOWED_CMDS=ALL npm run backend
```

**Important:** The `slash_mcp` server reloads the `ALLOWED_CMDS` list on startup. Therefore, you **must restart the backend** after making any changes to this configuration.

## 4. Extending the Integration

The `slash_mcp` project provides a foundational example. To build more sophisticated integrations, consider the following:

- **Deeper Claude Code Integration:** Explore how to leverage more advanced Claude Code features beyond simple command execution, such as code generation, refactoring, and testing, by mapping them to MCP tool invocations.
- **Custom MCP Tools:** Define and implement your own MCP tools within your system to expose specific functionalities to Claude Code or other LLMs.
- **Resource Management:** Implement robust mechanisms for `mcp_sendResource` to allow Claude Code to access and manipulate various types of data within your system.
- **Error Handling and Logging:** Implement comprehensive error handling and logging for both the MCP bridge and your `slash_mcp` instance to diagnose and troubleshoot integration issues effectively.
- **Security Considerations:** Beyond command whitelisting, consider other security measures, especially when exposing sensitive operations or data through MCP.

## Conclusion

Integrating Claude Code and Anthropic MCP offers a powerful way to enhance your development workflows with AI-driven capabilities. By understanding the core concepts and leveraging examples like `slash_mcp`, developers can build intelligent, context-aware applications that streamline coding tasks and unlock new possibilities for AI-assisted development. This guide provides the initial steps and considerations for embarking on this integration journey.
