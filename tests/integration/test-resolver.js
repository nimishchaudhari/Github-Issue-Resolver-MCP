/**
 * Integration test for the GitHub Issue Resolver MCP
 * 
 * This script simulates a request to the MCP server to resolve a GitHub issue.
 * Make sure the server is running before executing this script.
 */

const fetch = require('node-fetch');
require('dotenv').config();

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const TEST_ISSUE_URL = process.env.TEST_ISSUE_URL || 'https://github.com/testuser/testrepo/issues/123';

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Mock user input for the test
const USER_RESPONSES = {
  'approval': 'Approve',
  'text': 'No modifications needed'
};

async function testResolveGitHubIssue() {
  console.log(`${COLORS.cyan}=== GitHub Issue Resolver MCP Integration Test ===${COLORS.reset}`);
  console.log(`${COLORS.blue}Server URL: ${MCP_SERVER_URL}${COLORS.reset}`);
  console.log(`${COLORS.blue}Test Issue: ${TEST_ISSUE_URL}${COLORS.reset}`);
  
  if (!GITHUB_TOKEN) {
    console.error(`${COLORS.red}Error: GITHUB_TOKEN environment variable is not set${COLORS.reset}`);
    process.exit(1);
  }
  
  try {
    // Check if the server is running
    console.log(`${COLORS.yellow}Checking if the MCP server is running...${COLORS.reset}`);
    
    const healthResponse = await fetch(`${MCP_SERVER_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Server health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
    }
    
    const healthData = await healthResponse.json();
    console.log(`${COLORS.green}Server is running: ${JSON.stringify(healthData)}${COLORS.reset}`);
    
    // Get available tools
    console.log(`${COLORS.yellow}Checking available tools...${COLORS.reset}`);
    
    const toolsResponse = await fetch(`${MCP_SERVER_URL}/tools`);
    if (!toolsResponse.ok) {
      throw new Error(`Failed to get tools: ${toolsResponse.status} ${toolsResponse.statusText}`);
    }
    
    const toolsData = await toolsResponse.json();
    console.log(`${COLORS.green}Available tools: ${JSON.stringify(toolsData)}${COLORS.reset}`);
    
    // Check if resolve_github_issue tool is available
    if (!toolsData.tools.some(tool => tool.name === 'resolve_github_issue')) {
      throw new Error('resolve_github_issue tool is not available');
    }
    
    // Make a request to the resolve_github_issue tool
    console.log(`${COLORS.yellow}Calling resolve_github_issue tool...${COLORS.reset}`);
    
    // Start a conversation to handle user input requests
    const startResponse = await fetch(`${MCP_SERVER_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!startResponse.ok) {
      throw new Error(`Failed to start conversation: ${startResponse.status} ${startResponse.statusText}`);
    }
    
    const { conversationId } = await startResponse.json();
    console.log(`${COLORS.green}Started conversation: ${conversationId}${COLORS.reset}`);
    
    // Call the tool
    const toolResponse = await fetch(`${MCP_SERVER_URL}/conversations/${conversationId}/tools/resolve_github_issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        params: {
          issue_url: TEST_ISSUE_URL,
          github_token: GITHUB_TOKEN
        }
      })
    });
    
    // Handle user input requests
    let toolResult = await toolResponse.json();
    
    while (toolResult.status === 'awaiting_user_input') {
      console.log(`${COLORS.yellow}User input requested: ${toolResult.request.type}${COLORS.reset}`);
      console.log(`${COLORS.yellow}Message: ${toolResult.request.message}${COLORS.reset}`);
      
      const userResponse = USER_RESPONSES[toolResult.request.type] || 'Approve';
      console.log(`${COLORS.blue}Responding with: ${userResponse}${COLORS.reset}`);
      
      const inputResponse = await fetch(`${MCP_SERVER_URL}/conversations/${conversationId}/user-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: toolResult.request.id,
          response: userResponse
        })
      });
      
      if (!inputResponse.ok) {
        throw new Error(`Failed to provide user input: ${inputResponse.status} ${inputResponse.statusText}`);
      }
      
      toolResult = await inputResponse.json();
    }
    
    // Process final result
    if (toolResult.status === 'completed') {
      console.log(`${COLORS.green}Tool execution completed successfully${COLORS.reset}`);
      console.log(`${COLORS.green}Result: ${JSON.stringify(toolResult.result, null, 2)}${COLORS.reset}`);
      
      // Verify the result structure
      if (!toolResult.result.success) {
        throw new Error(`Tool execution was not successful: ${toolResult.result.error}`);
      }
      
      if (!toolResult.result.pull_request_url) {
        throw new Error('No pull request URL in the result');
      }
      
      console.log(`${COLORS.green}Pull Request URL: ${toolResult.result.pull_request_url}${COLORS.reset}`);
      console.log(`${COLORS.green}Comment URL: ${toolResult.result.comment_url}${COLORS.reset}`);
    } else if (toolResult.status === 'failed') {
      throw new Error(`Tool execution failed: ${toolResult.error}`);
    } else {
      throw new Error(`Unexpected tool status: ${toolResult.status}`);
    }
    
    console.log(`${COLORS.green}Integration test completed successfully${COLORS.reset}`);
  } catch (error) {
    console.error(`${COLORS.red}Error: ${error.message}${COLORS.reset}`);
    process.exit(1);
  }
}

testResolveGitHubIssue();
