import { registry } from '../ToolRegistry.js';
import { z } from 'zod';
import { spawn } from 'child_process';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// GitHub MCP Tool - Integrates with GitHub's official MCP server
// This tool acts as a bridge between the MCP Hub and GitHub's MCP server

let githubMCPProcess = null;
let isInitialized = false;

// Initialize GitHub MCP server process
async function initializeGitHubMCP(token) {
  if (isInitialized && githubMCPProcess) {
    return true;
  }

  try {
    // Check if Docker is available, otherwise use local binary
    const useDocker = process.env.GITHUB_MCP_USE_DOCKER !== 'false';
    
    if (useDocker) {
      // Use Docker container
      githubMCPProcess = spawn('docker', [
        'run',
        '-i',
        '--rm',
        '-e',
        'GITHUB_PERSONAL_ACCESS_TOKEN=' + token,
        'ghcr.io/github/github-mcp-server'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else {
      // Use local binary (assumes github-mcp-server is in PATH)
      githubMCPProcess = spawn('github-mcp-server', ['stdio'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GITHUB_PERSONAL_ACCESS_TOKEN: token,
          GITHUB_TOOLSETS: process.env.GITHUB_TOOLSETS || 'repos,issues,pull_requests,actions,context'
        }
      });
    }

    githubMCPProcess.on('error', (err) => {
      console.error('GitHub MCP server error:', err);
      isInitialized = false;
    });

    githubMCPProcess.on('exit', (code) => {
      console.log('GitHub MCP server exited with code:', code);
      isInitialized = false;
      githubMCPProcess = null;
    });

    isInitialized = true;
    console.log('GitHub MCP server initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize GitHub MCP server:', error);
    return false;
  }
}

// Send MCP request to GitHub server
async function sendMCPRequest(request) {
  if (!githubMCPProcess) {
    throw new Error('GitHub MCP server not initialized');
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('GitHub MCP request timeout'));
    }, 30000);

    let responseBuffer = '';
    
    const onData = (data) => {
      responseBuffer += data.toString();
      try {
        const response = JSON.parse(responseBuffer);
        clearTimeout(timeout);
        githubMCPProcess.stdout.off('data', onData);
        resolve(response);
      } catch (e) {
        // Continue accumulating data
      }
    };

    githubMCPProcess.stdout.on('data', onData);
    githubMCPProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

// Schema for GitHub operations
const githubSchema = z.object({
  operation: z.enum([
    'list_repositories',
    'get_repository',
    'create_issue',
    'list_issues',
    'get_issue',
    'create_pull_request',
    'list_pull_requests',
    'get_pull_request',
    'get_file_contents',
    'create_file',
    'update_file',
    'list_branches',
    'create_branch',
    'get_workflow_runs',
    'trigger_workflow'
  ]).default('list_repositories'),
  
  // Repository parameters
  owner: z.string().optional(),
  repo: z.string().optional(),
  
  // Issue parameters
  title: z.string().optional(),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  issue_number: z.number().optional(),
  
  // Pull request parameters
  head: z.string().optional(),
  base: z.string().optional(),
  
  // File parameters
  path: z.string().optional(),
  content: z.string().optional(),
  message: z.string().optional(),
  branch: z.string().optional(),
  
  // Workflow parameters
  workflow_id: z.string().optional(),
  ref: z.string().optional(),
  inputs: z.record(z.any()).optional(),
  
  // Authentication
  github_token: z.string().optional()
});

registry.register({
  name: 'github_mcp_tool',
  description: 'Interact with GitHub repositories, issues, pull requests, and workflows using GitHub\'s official MCP server',
  inputSchema: githubSchema,
  handler: async (params) => {
    const { operation, github_token, ...operationParams } = params;
    
    // Use provided token or environment variable
    const token = github_token || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (!token) {
      throw { code: -32602, message: 'GitHub Personal Access Token required' };
    }

    // Initialize GitHub MCP server if needed
    const initialized = await initializeGitHubMCP(token);
    if (!initialized) {
      throw { code: -32603, message: 'Failed to initialize GitHub MCP server' };
    }

    try {
      let mcpRequest;
      
      switch (operation) {
        case 'list_repositories':
          mcpRequest = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
              name: 'get_user_repositories',
              arguments: operationParams
            }
          };
          break;
          
        case 'get_repository':
          if (!operationParams.owner || !operationParams.repo) {
            throw { code: -32602, message: 'owner and repo parameters required' };
          }
          mcpRequest = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
              name: 'get_repository',
              arguments: {
                owner: operationParams.owner,
                repo: operationParams.repo
              }
            }
          };
          break;
          
        case 'create_issue':
          if (!operationParams.owner || !operationParams.repo || !operationParams.title) {
            throw { code: -32602, message: 'owner, repo, and title parameters required' };
          }
          mcpRequest = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
              name: 'create_issue',
              arguments: {
                owner: operationParams.owner,
                repo: operationParams.repo,
                title: operationParams.title,
                body: operationParams.body || '',
                labels: operationParams.labels || [],
                assignees: operationParams.assignees || []
              }
            }
          };
          break;
          
        case 'list_issues':
          if (!operationParams.owner || !operationParams.repo) {
            throw { code: -32602, message: 'owner and repo parameters required' };
          }
          mcpRequest = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
              name: 'list_issues',
              arguments: {
                owner: operationParams.owner,
                repo: operationParams.repo
              }
            }
          };
          break;
          
        case 'get_file_contents':
          if (!operationParams.owner || !operationParams.repo || !operationParams.path) {
            throw { code: -32602, message: 'owner, repo, and path parameters required' };
          }
          mcpRequest = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
              name: 'get_file_contents',
              arguments: {
                owner: operationParams.owner,
                repo: operationParams.repo,
                path: operationParams.path,
                ref: operationParams.branch || 'main'
              }
            }
          };
          break;
          
        case 'create_pull_request':
          if (!operationParams.owner || !operationParams.repo || !operationParams.title || !operationParams.head || !operationParams.base) {
            throw { code: -32602, message: 'owner, repo, title, head, and base parameters required' };
          }
          mcpRequest = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
              name: 'create_pull_request',
              arguments: {
                owner: operationParams.owner,
                repo: operationParams.repo,
                title: operationParams.title,
                body: operationParams.body || '',
                head: operationParams.head,
                base: operationParams.base
              }
            }
          };
          break;
          
        default:
          throw { code: -32602, message: `Unsupported operation: ${operation}` };
      }

      const response = await sendMCPRequest(mcpRequest);
      
      if (response.error) {
        throw { code: response.error.code || -32603, message: response.error.message || 'GitHub MCP server error' };
      }

      return {
        operation,
        success: true,
        data: response.result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      if (error.code) {
        throw error;
      }
      throw { code: -32603, message: `GitHub operation failed: ${error.message}` };
    }
  }
});

// Cleanup function
process.on('exit', () => {
  if (githubMCPProcess) {
    githubMCPProcess.kill();
  }
});

export { initializeGitHubMCP, sendMCPRequest };

