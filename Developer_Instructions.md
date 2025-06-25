# Developer Instructions: Implementing Drag-and-Drop for MCP Components in `slash_mcp`

## Introduction

This document provides detailed developer instructions for integrating drag-and-drop functionality for Model Context Protocol (MCP) resources, tools, and prompts into the existing `mcpmessenger/slash_mcp` dual terminal setup. The goal is to enhance the user experience by allowing intuitive workflow creation through visual manipulation of MCP components.

## 1. Architectural Overview and Integration Points

The `slash_mcp` repository implements a full-stack prototype of the Model Context Protocol, featuring a React frontend and a Node.js WebSocket backend. Communication between the client and server adheres to the JSON-RPC 2.0 specification.

### 1.1 Frontend Architecture (React)

The frontend is built with React, Vite, Tailwind CSS, and Framer-Motion. Key areas for integration include:

*   **Component Structure**: The application likely uses a component-based architecture. We need to identify the components responsible for displaying the current resources, tools, and prompts, and the components that will serve as the drag-and-drop targets (e.g., the terminal or a dedicated workflow canvas).
*   **State Management**: Understanding how the application manages its state (e.g., connected MCP servers, available capabilities, terminal content) is crucial for updating the UI based on drag-and-drop actions.
*   **Communication Layer**: The `src/lib/MCPWebSocketClient.ts` handles client-side communication with the MCP server. Drag-and-drop actions will ultimately translate into calls to this client to invoke MCP methods.

### 1.2 Backend Architecture (Node.js WebSocket)

The backend, implemented in Node.js with the `ws` library, serves as the MCP server. Relevant files include `server/index.js`, which handles incoming WebSocket connections and processes JSON-RPC 2.0 messages. Key backend integration points are:

*   **MCP Method Handlers**: The server exposes methods like `mcp_sendResource`, `mcp_invokeTool` (for `shell_execute`), and `mcp_getCapabilities`. Drag-and-drop actions will trigger these or new MCP methods.
*   **Command Whitelist**: The `server/index.js` includes a `ALLOWED_CMDS` array for `shell_execute`. Any new tools or actions introduced via drag-and-drop that involve server-side execution must adhere to or extend this security measure.

### 1.3 Dual Terminal Setup

The `slash_mcp` project features a dual-terminal view. The drag-and-drop functionality should ideally allow users to drag MCP components directly into one or both terminals, or into a separate workflow builder area that then translates into terminal commands or other MCP actions.

## 2. Frontend Implementation Steps (Drag-and-Drop UI)

This section outlines the steps to implement the drag-and-drop user interface in the React frontend.

### 2.1 Identify Draggable Components

Locate the React components that render the lists of available resources, tools, and prompts. Each item in these lists will need to be made draggable.

*   **HTML `draggable` attribute**: Set `draggable="true"` on the root HTML element of each resource, tool, or prompt item.
*   **`onDragStart` Event Handler**: Attach an `onDragStart` event handler to these elements. This handler will be responsible for setting the data that will be transferred during the drag operation. The data should include the MCP component's type (resource, tool, prompt) and its unique identifier (ID).

    ```jsx
    // Example for a draggable item
    <div
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({ id: item.id, type: item.type, name: item.name })
        );
      }}
    >
      {/* Item content */}
    </div>
    ```

### 2.2 Define Drop Targets

Determine where the MCP components can be dropped. This could be the terminal input area, a dedicated workflow canvas, or both.

*   **`onDragOver` Event Handler**: Attach an `onDragOver` event handler to the drop target element. This handler must call `event.preventDefault()` to allow the drop to occur.
*   **`onDrop` Event Handler**: Attach an `onDrop` event handler to the drop target. This handler will retrieve the data set during `onDragStart` and process the dropped item.

    ```jsx
    // Example for a drop target
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const data = e.dataTransfer.getData("application/json");
        if (data) {
          const droppedItem = JSON.parse(data);
          // Process the dropped item (e.g., add to workflow, generate command)
          console.log("Dropped item:", droppedItem);
        }
      }}
    >
      {/* Drop target content */}
    </div>
    ```

### 2.3 Visual Feedback

Provide visual cues to the user during the drag-and-drop operation.

*   **Drag Feedback**: Optionally, use `onDragEnd` to clean up any visual feedback. CSS classes can be applied during `onDragStart` and removed on `onDragEnd` to change the appearance of the dragged item.
*   **Drop Target Highlight**: Change the styling of the drop target when a draggable item is hovered over it (`onDragEnter`, `onDragLeave`, `onDragOver` events) to indicate that it's a valid drop zone.

### 2.4 Integrating with the Terminal

If the terminal is the drop target, the `onDrop` handler will need to translate the dropped MCP component into a command or action that can be executed in the terminal.

*   **Command Generation**: For tools like `shell_execute`, construct the appropriate shell command based on the dropped tool and any default or configurable parameters. For example, dragging a 


tool might generate `ls -l` or `ping google.com`.
*   **Prompt Insertion**: For prompts, the dropped item could insert a pre-defined prompt template into the terminal input, allowing the user to fill in the arguments.
*   **Resource Context**: Dragging a resource could insert a reference to that resource into the terminal, perhaps as a special command or a placeholder for a file path.

### 2.5 Workflow Canvas (Optional but Recommended)

Instead of directly dropping into the terminal, consider implementing a separate visual workflow canvas (similar to the concept explored in the previous task). This would provide a more intuitive and flexible way to build complex MCP workflows.

*   **Node-based UI**: Libraries like React Flow [4] can be used to create a node-based interface where each dropped MCP component becomes a node. Users can then connect these nodes to define the flow of information and execution.
*   **Workflow Definition**: The canvas would visually represent a sequence of MCP actions. When the user 


is satisfied with the workflow, a "Run Workflow" button could translate the visual flow into a series of MCP calls.
*   **Configuration Panels**: Clicking on a dropped component (node) on the canvas could open a configuration panel, allowing the user to specify parameters for that resource, tool, or prompt.

## 3. Backend Integration Steps (Workflow Execution)

This section outlines the necessary backend modifications to support the drag-and-drop functionality, particularly for executing workflows defined on the frontend.

### 3.1 New MCP Method for Workflow Execution

Consider adding a new MCP method, e.g., `mcp_executeWorkflow`, to the `server/index.js` [5]. This method would receive a structured representation of the workflow defined on the frontend.

*   **Workflow Structure**: The workflow object passed to `mcp_executeWorkflow` could be an array of steps, where each step specifies an MCP component (resource, tool, or prompt) and its associated parameters.

    ```json
    [
      {
        "type": "tool",
        "name": "shell_execute",
        "params": {"command": "ls", "args": ["-l"]}
      },
      {
        "type": "prompt",
        "name": "summarize_output",
        "params": {"text": "{{previous_output}}"}
      }
    ]
    ```

### 3.2 Workflow Orchestration

The `mcp_executeWorkflow` handler on the server would be responsible for orchestrating the execution of the steps defined in the workflow. This involves:

*   **Parsing Workflow**: Iterating through the workflow steps and identifying the MCP component (tool, resource, prompt) and its parameters.
*   **Dynamic Invocation**: Dynamically calling the appropriate internal server functions or external APIs based on the component type and name. This might involve reusing existing handlers for `mcp_invokeTool` or `mcp_sendResource`.
*   **Parameter Mapping**: Mapping the parameters from the workflow step to the expected arguments of the invoked MCP method. This is where the structured parameter definitions from the MCP specification become crucial.
*   **Output Chaining**: If a workflow step produces an output that needs to be used as an input for a subsequent step (e.g., the output of `shell_execute` becoming the input for `summarize_output`), the server needs to manage this chaining. This could involve temporary storage of intermediate results or a more sophisticated data flow mechanism.
*   **Error Handling**: Implementing robust error handling for each step in the workflow. If a step fails, the server should capture the error and potentially stop the workflow or attempt recovery based on predefined rules.

### 3.3 Security Considerations

*   **Input Validation**: Thoroughly validate all inputs received in the `mcp_executeWorkflow` method to prevent malicious injections or unexpected behavior.
*   **Command Whitelist**: Ensure that any `shell_execute` commands triggered by the workflow adhere to the existing `ALLOWED_CMDS` whitelist. If new commands are required, they must be carefully reviewed and added to the whitelist.
*   **Authorization**: If the `slash_mcp` project implements authentication, ensure that users are authorized to execute the tools and access the resources specified in the workflow.

## 4. Compile and Deliver Comprehensive Developer Instructions

Once the frontend and backend integration points are clear, and the conceptual design for drag-and-drop is established, the final step is to compile these into a comprehensive set of developer instructions.

### 4.1 Document Structure

The instructions should be structured logically, covering:

*   **Prerequisites**: List any necessary software, libraries, or configurations.
*   **Frontend Development**: Detailed steps for modifying React components, implementing drag-and-drop handlers, and integrating with the terminal or workflow canvas.
*   **Backend Development**: Instructions for adding new MCP methods, implementing workflow orchestration logic, and addressing security concerns.
*   **Testing**: Guidance on how to test the new functionality, including unit tests, integration tests, and end-to-end tests.
*   **Deployment**: Instructions for deploying the updated `slash_mcp` application.

### 4.2 Code Examples

Include clear and concise code examples for key functionalities, such as:

*   Making a component draggable.
*   Handling drop events.
*   Constructing and parsing workflow objects.
*   Implementing a new MCP method.

### 4.3 Visual Aids

Where appropriate, include diagrams or screenshots to illustrate complex concepts, such as the workflow canvas layout or the data flow between frontend and backend.

### 4.4 Version Control and Collaboration

Advise developers on best practices for version control (e.g., creating a new branch for the feature, regular commits) and collaboration (e.g., code reviews, clear pull request descriptions).

## References

[1] `MCPWebSocketClient.ts` in `slash_mcp` repository: https://github.com/mcpmessenger/slash_mcp/blob/main/src/lib/MCPWebSocketClient.ts
[2] `index.js` in `slash_mcp` repository: https://github.com/mcpmessenger/slash_mcp/blob/main/server/index.js
[3] JSON-RPC 2.0 Specification: https://www.jsonrpc.org/specification
[4] React Flow: Node-Based UIs in React. Available at: https://reactflow.dev/
[5] `server/index.js` in `slash_mcp` repository: https://github.com/mcpmessenger/slash_mcp/blob/main/server/index.js


