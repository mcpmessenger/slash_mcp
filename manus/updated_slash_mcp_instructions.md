# Updated Instructions and Backend Server Requirements for Slash / MCP

## 1. Introduction

This document provides updated instructions and clarifies the necessity of a backend server for the `slash_mcp` project. Based on the provided `pasted_content.txt` and the `slash_mcp_prd.md` from the GitHub repository, the `slash_mcp` application is a frontend client designed to interact with a Model Context Protocol (MCP) compatible backend server.

## 2. Why a Backend Server is Necessary

The `slash_mcp` frontend application, built with React, is designed to communicate with a backend server using JSON-RPC 2.0 over WebSockets. While the client-side is "socket-ready" and includes mock implementations for development and testing, a genuine, functional MVP (Minimum Viable Product) requires a live backend server. The `pasted_content.txt` explicitly states:

> "To move from “all-mock” to a genuinely functional MVP we need two things:
> A real transport layer that speaks JSON-RPC 2.0 over a WebSocket.
> A real MCP-compatible server (or a thin adapter around whatever backend you have)."

This confirms that the frontend is dependent on a separate backend service to perform its core functionalities, such as sending and receiving resources, invoking tools, and handling recursive LLM interactions. The mock data and functionalities currently present in the frontend are placeholders that need to be replaced by actual server-side logic.

## 3. Key Backend Server Requirements

Based on the analysis of the `slash_mcp` project, the backend server must fulfill the following requirements:

### 3.1. MCP Protocol Implementation

*   **JSON-RPC 2.0 over WebSocket:** The server must expose a WebSocket endpoint that accepts and processes JSON-RPC 2.0 messages. This is the primary communication protocol between the `slash_mcp` client and the backend.
*   **Method Handling:** The server needs to handle specific methods that the client sends. The `pasted_content.txt` highlights the following minimum methods:
    *   `mcp_sendResource` (for text and binary data)
    *   `mcp_invokeTool` (for terminal commands, code analysis, etc.)
*   **Response Formatting:** The server must return responses in the shapes that the UI expects. The `mockServer.ts` file in the `slash_mcp` repository can serve as a concrete example for the expected response structures.

### 3.2. Core Functionalities

*   **Resource Management:** Ability to receive, store, and manage various data types (textual, structured, binary, including images/screenshots) as MCP resources.
*   **Tool Invocation:** A mechanism for the backend to execute commands or invoke external tools based on `mcp_invokeTool` requests from the client. This could involve shelling out commands on the host system or interacting with other services.
*   **LLM Integration (Future):** While not explicitly part of the immediate MVP, the ultimate goal of MCP is to facilitate interactions with Large Language Models (LLMs). The backend should be designed with future integration with LLMs in mind, allowing it to process LLM-related requests and return responses.
*   **Capability Reporting:** The server should ideally provide a mechanism to report its capabilities (e.g., available resources, tools, and prompts) to the client upon connection. This would allow the client to dynamically populate its UI elements.

### 3.3. Deployment and Testing

*   **Local Development:** The backend server should be runnable locally (e.g., `ws://localhost:8080`) to allow for easy development and testing with the `slash_mcp` frontend.
*   **Containerization/Deployment:** For staging and production environments, the backend should be containerized (e.g., using Docker) and deployable to a suitable hosting environment. The user's preference for Amazon S3 for website hosting suggests a cloud-based deployment strategy might be preferred for the backend as well, though S3 is typically for static assets.
*   **Environment Variables:** Support for environment variables to configure backend endpoints (e.g., for connecting to different staging or production environments).

## 4. Updated Instructions for Development

To get a genuinely functional MVP of `slash_mcp` working, follow these updated instructions:

1.  **Set up the Frontend:**
    *   Clone the `slash_mcp` repository if you haven't already: `git clone https://github.com/mcpmessenger/slash_mcp.git`
    *   Navigate into the project directory: `cd slash_mcp`
    *   Install dependencies: `npm install` (or `yarn install`)
    *   Start the development server: `npm run dev`

2.  **Develop the Backend Server:**
    *   Choose a suitable backend technology (e.g., Node.js with WebSockets, Python with FastAPI/Flask and WebSockets).
    *   Implement a WebSocket server that adheres to the JSON-RPC 2.0 specification.
    *   Implement the `mcp_sendResource` and `mcp_invokeTool` methods as a minimum, ensuring they return data in the format expected by the `slash_mcp` frontend (refer to `src/lib/mockServer.ts` in the frontend repository).
    *   Ensure the backend server listens on a specific port (e.g., 8080) and is accessible from the frontend.

3.  **Connect Frontend to Backend:**
    *   Once your backend server is running, open the `slash_mcp` frontend in your browser.
    *   In the `MultiClientManager` (accessible via the "Users" icon), enter the WebSocket URL of your running backend server (e.g., `ws://localhost:8080`) and click "Connect".
    *   The frontend should now attempt to establish a live WebSocket connection to your backend.

4.  **Client-Side Polish (Optional but Recommended):**
    *   Update the `Terminal` component in the frontend to route commands through `mcp_invokeTool` on the live connection instead of the local mock lookup. For example, `invokeTool(connectionId, 'shell_execute', { command })`.
    *   Display any `stdout`/`stderr` strings returned by the server in the terminal.
    *   Implement logic to populate resources, tools, and prompts arrays from a server "capability" call once you define one (this can be done within the `connect` function after the socket opens).

## 5. Conclusion

To move beyond the mock implementation and achieve a functional `slash_mcp` application, a dedicated backend server is essential. This server will handle the core MCP communication and logic, allowing the frontend to interact with real data and functionalities. The provided requirements and updated instructions should guide the development of this crucial backend component. If a quick Node/Express proof-of-concept server is desired, Manus AI can assist in scaffolding that next.

