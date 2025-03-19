#!/usr/bin/env node

const fetch = require('node-fetch');
require('dotenv').config();

async function main() {
  if (!process.env.GITHUB_TOKEN) {
    console.error('Error: GITHUB_TOKEN environment variable is not set.');
    console.error('Please create a .env file with your GitHub token.');
    process.exit(1);
  }

  if (process.argv.length < 3) {
    console.error('Usage: node test-client.js <github-issue-url>');
    console.error('Example: node test-client.js https://github.com/owner/repo/issues/123');
    process.exit(1);
  }

  const issueUrl = process.argv[2];
  
  console.log(`Testing GitHub Issue Resolver MCP with issue: ${issueUrl}`);
  
  try {
    const response = await fetch('http://localhost:3000/tools/resolve_github_issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        issue_url: issueUrl,
        github_token: process.env.GITHUB_TOKEN
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Server returned ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    console.log('\nServer response:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\nSUCCESS! The issue resolution process has started.');
      console.log(`Check the pull request at: ${result.pull_request_url}`);
    } else {
      console.log('\nERROR: The issue resolution process failed.');
      console.log(`Error message: ${result.error}`);
    }
  } catch (error) {
    console.error(`\nFailed to communicate with the MCP server: ${error.message}`);
    console.error('Make sure the server is running on http://localhost:3000');
  }
}

main().catch(console.error);
