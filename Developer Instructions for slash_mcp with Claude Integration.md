# Developer Instructions for slash_mcp with Claude Integration

## Introduction

This document provides comprehensive developer instructions for setting up, developing, and testing the `slash_mcp` project with a focus on integrating Anthropic's Claude AI via Windows Subsystem for Linux (WSL) and Ubuntu. It covers environment setup, project structure, development guidelines, unit testing, and GUI testing. The goal is to enable developers to effectively contribute to the `slash_mcp` project and leverage Claude's capabilities within the development workflow.

## 1. Environment Setup

To develop for `slash_mcp` with Claude integration, you will need a Windows machine with WSL (Windows Subsystem for Linux) and an Ubuntu distribution installed. This setup allows you to run a Linux environment directly on Windows, which is necessary for running the Claude CLI and the `mcp-proxy`.

### 1.1. Windows Subsystem for Linux (WSL) and Ubuntu Setup

If you don't have WSL and Ubuntu set up, follow these steps:

1.  **Enable WSL:** Open PowerShell or Command Prompt as an administrator and run:

    ```powershell
    wsl --install
    ```

    This command will enable the necessary WSL features and install the Ubuntu distribution by default. You may need to restart your computer.

2.  **Launch Ubuntu:** After restarting, launch the Ubuntu application from your Start menu. The first time you launch it, you will be prompted to create a Unix username and password.

3.  **Update Ubuntu:** Once logged into your Ubuntu terminal, update your package lists and upgrade existing packages:
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

### 1.2. Node.js and npm Installation in WSL Ubuntu

The `slash_mcp` project is built with Node.js. Install Node.js and npm (Node Package Manager) in your WSL Ubuntu environment:

1.  **Install `curl` (if not already installed):**

    ```bash
    sudo apt install curl -y
    ```

2.  **Install Node.js (LTS version recommended) using `nvm` (Node Version Manager):**
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    source ~/.bashrc
    nvm install --lts
    nvm use --lts
    ```
    Verify the installation:
    ```bash
    node -v
    npm -v
    ```

### 1.3. Claude CLI Installation in WSL Ubuntu

Anthropic's Claude Code CLI is a crucial component for integrating Claude's AI capabilities. Install it within your WSL Ubuntu environment [1]:

1.  **Download the Claude CLI binary:**

    ```bash
    # Replace <version> with the latest version from Anthropic's official releases
    # Example: wget https://github.com/anthropics/claude-code/releases/download/vX.Y.Z/claude-linux-x64
    wget https://github.com/anthropics/claude-code/releases/latest/download/claude-linux-x64 -O ~/Downloads/claude
    ```

2.  **Move and make executable:**

    ```bash
    sudo mv ~/Downloads/claude /usr/local/bin/claude && sudo chmod +x /usr/local/bin/claude
    ```

3.  **Verify installation:**
    ```bash
    claude --version
    ```

### 1.4. `mcp-proxy` Installation in WSL Ubuntu

The `mcp-proxy` acts as a bridge between the `slash_mcp` backend and the Claude CLI. Install it using `pipx` for isolated installation [1]:

1.  **Install `pipx`:**

    ```bash
    sudo apt install -y pipx
    ```

2.  **Install `mcp-proxy`:**
    ```bash
    pipx install "mcp-proxy>=0.8,<1"
    ```
    This will install `mcp-proxy` to `~/.local/bin/mcp-proxy`, which should already be in your PATH.

### 1.5. `slash_mcp` Project Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/mcpmessenger/slash_mcp.git
    cd slash_mcp
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### 1.6. Running the `slash_mcp` Backend with Claude Integration

To run the `slash_mcp` backend with Claude integration, you need to start both the `mcp-proxy` and the `slash_mcp` backend. Ensure you have your Anthropic API key ready.

1.  **Start `mcp-proxy` (in a separate WSL terminal):**

    ```bash
    export ANTHROPIC_API_KEY=<your-anthropic-api-key>
    mcp-proxy \
      --stateless \
      --transport streamablehttp \
      --host 0.0.0.0 \
      --port 8081 \
      -- \
      claude mcp serve
    ```

    This will start the `mcp-proxy` server on port `8081`.

2.  **Start `slash_mcp` backend (in another WSL terminal):**
    Before starting the `slash_mcp` backend, you need to configure it to connect to the `mcp-proxy`. You can do this by setting environment variables. Create a `.env` file in the `slash_mcp` project root or set them directly in your terminal session:

    ```bash
    # In your slash_mcp project directory
    echo "CLAUDE_MCP_URL=http://localhost:8081/mcp/" >> .env
    echo "ANTHROPIC_API_KEY=<your-anthropic-api-key>" >> .env

    npm run backend
    ```

    The `slash_mcp` backend will start, typically on `ws://localhost:8080`.

3.  **Start `slash_mcp` frontend (in yet another WSL terminal):**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, usually accessible at `http://localhost:5173`.

Now, open `http://localhost:5173` in your browser. You should be able to connect to the `slash_mcp` backend and interact with Claude through the terminal.

## 2. Project Structure

The `slash_mcp` project is a monorepo containing both the React frontend and a minimal Node/WebSocket backend. Understanding its structure is crucial for effective development.

```
slash_mcp/
├── .bolt/                  # Bolt.js related configuration (if used)
├── .github/                # GitHub Actions workflows for CI/CD
│   └── workflows/
├── docs/                   # Project documentation (e.g., Claude MCP troubleshooting guide)
├── manus/                  # Documentation specific to Manus AI integration
├── public/                 # Static assets for the frontend
├── scripts/                # Utility scripts
├── server/                 # Node.js WebSocket backend
│   ├── config.js           # Centralized server configuration
│   ├── index.js            # Main backend entry point
│   └── ...
├── src/                    # React frontend source code
│   ├── lib/                # Libraries and utilities (e.g., MCPWebSocketClient.ts)
│   ├── components/         # Reusable React components
│   ├── pages/              # React pages/views
│   ├── App.tsx             # Main React application component
│   ├── main.tsx            # Frontend entry point
│   └── ...
├── storage/                # Placeholder for resource storage (e.g., Supabase integration)
├── .gitignore              # Git ignore file
├── package.json            # Project dependencies and scripts
├── README.md               # Project README
├── vite.config.ts          # Vite configuration for the frontend
└── tsconfig.json           # TypeScript configuration
```

**Key Directories and Files:**

- **`server/`**: This directory contains the Node.js backend. `index.js` is the main server file that handles WebSocket connections and `mcp_` commands. `config.js` manages server configurations, including whitelisted commands and API keys.
- **`src/`**: This is where the React frontend resides. `src/lib/MCPWebSocketClient.ts` is particularly important as it handles the WebSocket communication with the backend. The `components/` and `pages/` directories contain the UI elements and views.
- **`docs/` and `manus/`**: These directories contain various documentation files, including guides related to Claude integration.
- **`package.json`**: Defines all project dependencies and `npm` scripts for running the backend, frontend, linting, and testing.

## 3. Development Guidelines

Developing for `slash_mcp` involves working with both the frontend (React/TypeScript) and the backend (Node.js/JavaScript), with a strong emphasis on the Model Context Protocol (MCP) and Claude integration.

### 3.1. Interacting with Claude via MCP

The core of Claude integration in `slash_mcp` is through the `mcp-proxy` and the `mcp_invokeTool` command. This allows the `slash_mcp` backend to communicate with the Claude CLI.

**Example of invoking a Claude tool from the `slash_mcp` terminal:**

```
tool claude_mcp_invoke {"tool":"Bash","params":{"command":"echo hello","apiKey":"<your-key>"}}
```

This command, when executed in the `slash_mcp` frontend terminal, is sent to the backend, which then forwards it to the `mcp-proxy`. The `mcp-proxy` translates this into a call to the Claude CLI, and the output is streamed back to the `slash_mcp` terminal.

**Key considerations for Claude integration development:**

- **Tool Definitions:** Understand how Claude tools are defined and exposed through the `mcp-proxy`. The `mcp-proxy` documentation and the `slash_mcp` backend code (specifically how it handles `mcp_invokeTool`) are key resources.
- **API Keys:** Ensure secure handling of `ANTHROPIC_API_KEY`. It should be loaded from environment variables and never hardcoded.
- **Streaming Output:** Claude and `mcp-proxy` support streaming output. Your frontend and backend logic should be designed to handle and display streamed responses efficiently for a good user experience.

### 3.2. Coding Style and Best Practices

The `slash_mcp` project uses ESLint and Prettier for code linting and formatting. Adhering to these standards is crucial for maintaining code quality and consistency.

1.  **Linting and Formatting:** Before pushing any changes, always run the lint and test commands:

    ```bash
    npm run lint
    npm run test
    ```

    These commands will help identify and fix common coding style issues and ensure your code passes existing tests.

2.  **TypeScript Usage:** The frontend is written in TypeScript. Leverage TypeScript's static typing to write more robust and maintainable code. Define clear interfaces and types for data structures, especially for MCP messages.

3.  **Modular Design:** Break down complex features into smaller, reusable modules and components. This improves readability, testability, and maintainability.

4.  **Error Handling:** Implement robust error handling in both frontend and backend. Provide clear and informative error messages to users, and log detailed errors for debugging purposes.

5.  **Security:** Pay close attention to security, especially when dealing with shell commands and API keys. The `server/index.js` file has a `ALLOWED_CMDS` whitelist for shell commands. If you need to add new commands, ensure they are safe and add them to this whitelist or configure it via environment variables.

    ```bash
    # Example: Allow extra commands (comma-separated)
    ALLOWED_CMDS="uname,id,who" npm run backend

    # Example: Disable whitelist entirely (for development only!)
    ALLOWED_CMDS=ALL npm run backend
    ```

## 4. Unit Testing

Unit testing is essential for ensuring the correctness and reliability of individual components of the `slash_mcp` project. The project uses `Vitest` for unit testing.

### 4.1. Running Unit Tests

To run all unit tests, navigate to the project root directory and execute:

```bash
npm run test
```

This command will execute all test files (typically ending with `.test.ts` or `.spec.ts`) found within the project. The output will show the test results, including any failures or errors.

### 4.2. Writing Unit Tests

When adding new features or fixing bugs, it is crucial to write corresponding unit tests. Follow these guidelines:

- **Test File Location:** Place test files in the same directory as the code they are testing, or in a dedicated `__tests__` directory within the module.
- **Naming Conventions:** Name test files clearly, typically `[componentName].test.ts` or `[moduleName].spec.ts`.
- **Isolation:** Unit tests should be isolated. They should test a single unit of code (e.g., a function, a class method) independently of other units or external dependencies. Use mocking and stubbing where necessary to achieve isolation.
- **Assertions:** Use `Vitest`'s assertion library to verify the expected behavior of your code. Common assertions include `expect(value).toBe(expected)`, `expect(value).toEqual(expected)`, `expect(function).toThrow()`, etc.
- **Test Cases:** Cover different scenarios, including:
  - **Happy Path:** Expected inputs and outputs.
  - **Edge Cases:** Boundary conditions, empty inputs, maximum/minimum values.
  - **Error Cases:** Invalid inputs, error handling mechanisms.
- **Asynchronous Code:** For asynchronous operations (e.g., API calls, promises), use `async/await` with `Vitest`'s support for asynchronous tests.

**Example Unit Test (src/lib/MCPWebSocketClient.test.ts - conceptual):**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { MCPWebSocketClient } from './MCPWebSocketClient';

describe('MCPWebSocketClient', () => {
  it('should connect to the WebSocket server', async () => {
    // Mock WebSocket constructor
    const mockWebSocket = vi.fn(() => ({
      readyState: 0, // CONNECTING
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      send: vi.fn(),
      close: vi.fn(),
    }));
    vi.stubGlobal('WebSocket', mockWebSocket);

    const client = new MCPWebSocketClient('ws://localhost:8080');
    expect(mockWebSocket).toHaveBeenCalledWith('ws://localhost:8080');

    // Simulate successful connection
    mockWebSocket.mock.calls[0][0].onopen();
    expect(client.isConnected()).toBe(true);
  });

  it('should send messages through the WebSocket', () => {
    const mockSend = vi.fn();
    vi.stubGlobal(
      'WebSocket',
      vi.fn(() => ({
        readyState: 1, // OPEN
        onopen: () => {},
        onmessage: () => {},
        onclose: () => {},
        onerror: () => {},
        send: mockSend,
        close: vi.fn(),
      })),
    );

    const client = new MCPWebSocketClient('ws://localhost:8080');
    client.send('test_message');
    expect(mockSend).toHaveBeenCalledWith('test_message');
  });

  // Add more tests for message parsing, error handling, etc.
});
```

## 5. GUI Testing

GUI (Graphical User Interface) testing for `slash_mcp` can involve both automated smoke tests and manual testing to ensure the user interface functions as expected and provides a seamless experience.

### 5.1. Automated GUI Smoke Tests

The `slash_mcp` project includes automated smoke tests that run in a headless Chrome environment. These tests are designed to quickly verify the core functionality of the UI after changes.

To run the automated smoke tests, execute the following command from the project root:

```bash
npm run smoke
```

This command typically performs the following actions:

1.  Builds the frontend application (`npm run build`).
2.  Starts a temporary server to serve the built application.
3.  Launches a headless Chrome browser.
4.  Executes a set of predefined test scripts that interact with the UI (e.g., navigating to pages, clicking buttons, verifying text).
5.  Shuts down the temporary server and browser.

**Writing Automated GUI Tests:**

The `npm run smoke` script likely uses a testing framework like Playwright or Puppeteer, which are popular for headless browser automation. To write new automated GUI tests, you would typically:

- **Identify Key User Flows:** Determine the critical paths and interactions within the UI that need to be tested (e.g., connecting to the WebSocket, sending a command, viewing streamed output).
- **Locate Elements:** Use CSS selectors or XPath to identify UI elements (buttons, input fields, text areas) that your tests need to interact with.
- **Simulate User Actions:** Write code to simulate user actions like clicking, typing, waiting for elements to appear, and asserting on the visible content.
- **Handle Asynchronicity:** GUI tests often involve waiting for elements to load or for network requests to complete. Use appropriate `await` statements and explicit waits to ensure test stability.

**Example (Conceptual Playwright-like test for `slash_mcp`):**

```typescript
import { test, expect } from '@playwright/test';

test('should connect to backend and send a command', async ({ page }) => {
  // Navigate to the application URL
  await page.goto('http://localhost:5173');

  // Click the Users icon to open the connection manager
  await page.click('text=Users'); // Assuming a text label or accessible name

  // Input the WebSocket URL and connect
  await page.fill('input[placeholder="ws://localhost:8080"]', 'ws://localhost:8080');
  await page.click('button:has-text("Connect")');

  // Wait for connection success indicator (e.g., a green dot or status message)
  await expect(page.locator('text=Connected')).toBeVisible();

  // Click the Terminal icon
  await page.click('text=Terminal'); // Assuming a text label or accessible name

  // Type a command and press Enter
  await page.fill('textarea[aria-label="Terminal input"]', 'echo Hello, Claude!');
  await page.press('textarea[aria-label="Terminal input"]', 'Enter');

  // Verify the output in the terminal
  await expect(page.locator('div.terminal-output')).toContainText('Hello, Claude!');

  // Add more assertions for streamed output, error handling, etc.
});
```

### 5.2. Manual GUI Testing

While automated tests cover critical paths, manual GUI testing is essential for catching visual regressions, usability issues, and unexpected behaviors that automated tests might miss. Perform manual testing regularly, especially after significant UI changes or new feature implementations.

**Key areas for manual GUI testing:**

- **Responsiveness:** Test the application on different screen sizes and orientations (e.g., by resizing the browser window or using browser developer tools to simulate mobile devices) to ensure the layout adapts correctly.
- **Interactive Elements:** Verify that all buttons, links, input fields, and other interactive elements are clickable, responsive, and perform their intended actions.
- **Visual Fidelity:** Check for correct styling, alignment, font rendering, and color schemes across different browsers and operating systems.
- **Error States:** Manually trigger error conditions (e.g., invalid input, network disconnections) to observe how the UI handles and displays error messages.
- **Accessibility:** Consider testing with keyboard navigation only, or using screen readers, to ensure the application is accessible to users with disabilities.
- **Claude Integration Workflow:** Manually test the end-to-end flow of interacting with Claude through the `slash_mcp` terminal, including:
  - Invoking various Claude tools (e.g., code generation, natural language to shell commands).
  - Observing streamed output and ensuring it updates correctly.
  - Testing interactive refinement scenarios.
  - Verifying error messages from Claude or the `mcp-proxy` are displayed appropriately.

## 6. References

[1] Anthropic API. _Set up Claude Code_. Available at: [https://docs.anthropic.com/en/docs/claude-code/setup](https://docs.anthropic.com/en/docs/claude-code/setup)
