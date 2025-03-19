/**
 * Simple client for the GitHub Issue Resolver MCP
 * 
 * This example demonstrates how to use the MCP server to resolve a GitHub issue.
 */

const readline = require('readline');
const fetch = require('node-fetch');
require('dotenv').config();

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for user input
const prompt = (question) => new Promise((resolve) => {
  rl.question(question, (answer) => resolve(answer));
});

async function resolveGitHubIssue() {
  try {
    console.log('\n=== GitHub Issue Resolver MCP Client ===\n');
    
    // Get issue URL from user if not provided
    const issueUrl = await prompt('Enter GitHub issue URL: ');
    
    if (!issueUrl) {
      console.error('Error: Issue URL is required');
      process.exit(1);
    }
    
    // Check if GitHub token is available
    if (!GITHUB_TOKEN) {
      console.error('Error: GITHUB_TOKEN environment variable is not set');
      process.exit(1);
    }
    
    console.log(`\nConnecting to MCP server at ${MCP_SERVER_URL}...\n`);
    
    // Start a conversation
    const startResponse = await fetch(`${MCP_SERVER_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!startResponse.ok) {
      throw new Error(`Failed to start conversation: ${startResponse.status} ${startResponse.statusText}`);
    }
    
    const { conversationId } = await startResponse.json();
    console.log(`Started conversation: ${conversationId}\n`);
    
    // Call the tool
    console.log('Calling resolve_github_issue tool...\n');
    
    const toolResponse = await fetch(`${MCP_SERVER_URL}/conversations/${conversationId}/tools/resolve_github_issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        params: {
          issue_url: issueUrl,
          github_token: GITHUB_TOKEN
        }
      })
    });
    
    if (!toolResponse.ok) {
      throw new Error(`Tool execution failed: ${toolResponse.status} ${toolResponse.statusText}`);
    }
    
    // Handle the tool execution flow
    let toolResult = await toolResponse.json();
    
    // Process the result until completion
    while (toolResult.status === 'awaiting_user_input' || toolResult.status === 'in_progress') {
      if (toolResult.status === 'awaiting_user_input') {
        console.log(`\nUser input requested: ${toolResult.request.type}`);
        console.log(`\n${toolResult.request.message}\n`);
        
        let userResponse;
        
        if (toolResult.request.type === 'approval') {
          const options = toolResult.request.options.join(', ');
          userResponse = await prompt(`Please choose one of the following options [${options}]: `);
          
          // Validate the response
          while (!toolResult.request.options.includes(userResponse)) {
            console.log(`Invalid option. Please choose one of: ${options}`);
            userResponse = await prompt(`Please choose one of the following options [${options}]: `);
          }
        } else if (toolResult.request.type === 'text') {
          console.log('Enter your response (type END on a new line to finish):');
          let lines = [];
          let line;
          
          while ((line = await prompt('')) !== 'END') {
            lines.push(line);
          }
          
          userResponse = lines.join('\n');
        } else {
          userResponse = await prompt('Enter your response: ');
        }
        
        // Send the user input back to the server
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
      } else if (toolResult.status === 'in_progress') {
        // Show progress updates
        if (toolResult.progress && toolResult.progress.message) {
          console.log(`Progress: ${toolResult.progress.message}`);
        }
        
        // Wait for a moment and then check the status again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await fetch(`${MCP_SERVER_URL}/conversations/${conversationId}/status`);
        if (!statusResponse.ok) {
          throw new Error(`Failed to check status: ${statusResponse.status} ${statusResponse.statusText}`);
        }
        
        toolResult = await statusResponse.json();
      }
    }
    
    // Process final result
    if (toolResult.status === 'completed') {
      console.log('\n=== Issue Resolution Completed ===\n');
      
      if (toolResult.result.success) {
        console.log('Resolution successful!\n');
        console.log(`Issue: ${toolResult.result.issue_details.title}`);
        console.log(`Pull Request: ${toolResult.result.pull_request_url}`);
        console.log(`Comment: ${toolResult.result.comment_url}`);
      } else {
        console.log(`Resolution failed: ${toolResult.result.error}`);
      }
    } else if (toolResult.status === 'failed') {
      console.log(`\nError: ${toolResult.error}`);
    } else {
      console.log(`\nUnexpected status: ${toolResult.status}`);
    }
  } catch (error) {
    console.error(`\nError: ${error.message}`);
  } finally {
    rl.close();
  }
}

resolveGitHubIssue();
