# Development Instructions for Slash / MCP (June 24, 2025)

## 1. Introduction

This document provides detailed development instructions for the Slash / MCP project, focusing on achieving core functionality and a proof of concept. The primary goal is to establish a working foundation for the Model Context Protocol (MCP) communication, resource handling, and a basic user interface with light and dark mode capabilities. This guide is intended for the development team to ensure a clear understanding of the immediate priorities and technical approach.

## 2. Project Setup

### 2.1. Repository Cloning and Dependencies

To begin, clone the project repository from GitHub and install the necessary dependencies. The project is a React application, and `npm` (or `yarn`) is used for package management.

```bash
git clone https://github.com/mcpmessenger/slash_mcp.git
cd slash_mcp
npm install
# or yarn install
```

### 2.2. Running the Development Server

Once dependencies are installed, you can start the development server:

```bash
npm run dev
# or yarn dev
```

This will typically open the application in your default web browser at `http://localhost:5173` (or a similar port).

## 3. Core MCP Functionality (Proof of Concept)

The initial focus for MCP functionality should be on establishing basic communication and resource exchange. This involves implementing the client-side JSON-RPC 2.0 messaging and handling of simple resource types.

### 3.1. JSON-RPC 2.0 Communication

Implement a basic JSON-RPC 2.0 client that can send requests to a simulated MCP server and receive responses. For the proof of concept, the server can be a simple mock server or even a set of predefined JSON responses.

**Key tasks:**
*   Create a utility or service for sending JSON-RPC 2.0 requests.
*   Handle basic request/response cycles (e.g., `method` invocation, `params`, `id`).
*   Implement error handling for RPC calls.

### 3.2. Resource Exchange

Focus on exchanging textual data as the primary resource type for the proof of concept. This will demonstrate the ability to send context to the LLM and receive results.

**Key tasks:**
*   Define data structures for MCP resources (e.g., `text`, `json`).
*   Implement serialization and deserialization of these resource types.
*   Integrate resource handling with the JSON-RPC communication.

## 4. Mock Data for Server-Side Development

Since the focus is on the client-side application and proof of concept, a full-fledged MCP server will not be developed at this stage. Instead, mock data will be used to simulate server responses and allow for independent frontend development.

### 4.1. Purpose of Mock Data

Mock data serves several critical purposes:
*   **Decoupling Frontend and Backend:** Allows frontend development to proceed without waiting for the backend server to be fully implemented.
*   **Consistent Testing:** Provides predictable responses for testing various UI states and functionalities.
*   **Rapid Prototyping:** Enables quick iteration on UI/UX designs and user flows.

### 4.2. Mock Data Structure Examples

Mock data should mimic the expected JSON-RPC 2.0 responses from an MCP server. Below are examples for common MCP interactions:

#### 4.2.1. Example: `text` Resource Exchange

**Request (client to server):**

```json
{
    "jsonrpc": "2.0",
    "method": "mcp_sendResource",
    "params": {
        "type": "text",
        "content": "Hello, LLM! Analyze this text."
    },
    "id": 1
}
```

**Mock Response (server to client):**

```json
{
    "jsonrpc": "2.0",
    "result": {
        "resourceId": "res_123",
        "status": "processed",
        "analysis": "The text contains a greeting and a request for analysis."
    },
    "id": 1
}
```

#### 4.2.2. Example: Tool Invocation

**Request (client to server):**

```json
{
    "jsonrpc": "2.0",
    "method": "mcp_invokeTool",
    "params": {
        "toolName": "run_code",
        "parameters": {
            "language": "python",
            "code": "print('Hello from tool!')"
        }
    },
    "id": 2
}
```

**Mock Response (server to client):**

```json
{
    "jsonrpc": "2.0",
    "result": {
        "toolOutput": "Hello from tool!\n",
        "executionStatus": "success"
    },
    "id": 2
}
```

#### 4.2.3. Example: Error Response

**Mock Error Response (server to client):**

```json
{
    "jsonrpc": "2.0",
    "error": {
        "code": -32601,
        "message": "Method not found",
        "data": "The requested MCP method 'mcp_nonExistentMethod' does not exist."
    },
    "id": 3
}
```

### 4.3. Implementation Strategy for Mock Data

Developers can implement mock data using various approaches:

*   **Local JSON Files:** Store mock responses in static JSON files and load them dynamically based on the requested method.
*   **In-memory Objects:** Define mock response objects directly within the client-side code.
*   **Mocking Libraries:** Utilize frontend testing/mocking libraries (e.g., `msw` for React) to intercept network requests and return mock data.

**Recommendation:** For a proof of concept, start with in-memory objects or local JSON files for simplicity. As the project grows, consider integrating a dedicated mocking library.

## 5. User Interface (UI) and User Experience (UX) (Proof of Concept)

Focus on implementing the core UI layout and the light/dark mode switching functionality. Advanced UI components can be deferred to later stages.

### 5.1. General UI/UX Principles

Adhere to the principles outlined in the PRD, specifically focusing on:
*   **Systems Agnostic:** Ensure the UI renders correctly across different browser environments.
*   **Responsive Design:** Implement basic responsiveness for desktop and mobile views.
*   **Intuitive Navigation:** A minimal navigation structure for accessing core functionalities.

### 5.2. Light and Dark Mode Implementation

Implement the theming mechanism to allow users to switch between light and dark modes. The dark mode should incorporate the 


'back glow' effect as described in the PRD.

**Key tasks:**
*   Implement a theme toggler (e.g., a button).
*   Define CSS variables or use a theming solution (e.g., Tailwind CSS dark mode) to manage styles for both modes.
*   Apply the 'back glow' effect to interactive elements in dark mode.

## 6. Branding

Integrate the 'Slash / MCP' branding and 'automationalien.com' developer branding into the application.

**Key tasks:**
*   Display the 'Slash / MCP' logo and name prominently.
*   Include 'automationalien.com' credit in the footer or an 'About' section.

## 7. Next Steps and Deliverables

Upon completion of this proof of concept phase, the development team should be able to demonstrate:

*   Successful JSON-RPC 2.0 communication with mock server responses.
*   Exchange of basic textual resources.
*   A functional UI with the ability to switch between light and dark modes.
*   Integration of project and developer branding.

This foundational work will serve as the basis for future iterations, including advanced MCP functionalities, tool integration, and a more sophisticated user experience.

---

**Author:** Manus AI
**Date:** June 24, 2025


