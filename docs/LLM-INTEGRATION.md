# Integrating GitHub Issue Resolver MCP with LLMs

This document explains how to integrate the GitHub Issue Resolver MCP server with Large Language Models (LLMs) for automated issue resolution.

## Overview

The GitHub Issue Resolver MCP provides a structured workflow for resolving GitHub issues that can be integrated with LLMs to further automate the process. LLMs can help with:

1. Understanding issue context and requirements
2. Designing appropriate resolution strategies
3. Writing and reviewing code changes
4. Creating clear pull requests and comments

## Prerequisites

- A working installation of the GitHub Issue Resolver MCP server
- Access to an LLM API (e.g., OpenAI, Anthropic, etc.)
- GitHub API token with appropriate permissions

## Integration Approaches

### 1. LLM as a Resolution Planner

In this approach, the LLM helps analyze issues and create resolution plans, which are then executed by the MCP server.

```javascript
const { Configuration, OpenAIApi } = require('openai');
const fetch = require('node-fetch');

// Configure OpenAI
const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

async function createResolutionPlan(issueInfo) {
  // Prepare prompt for the LLM
  const prompt = `
    Create a detailed plan to resolve this GitHub issue:
    
    Issue Title: ${issueInfo.title}
    Description: ${issueInfo.body}
    
    Repository: ${issueInfo.repoInfo.fullName}
    Main Language: ${issueInfo.repoInfo.language}
    
    Please include:
    1. Problem summary
    2. Proposed solution approach
    3. Files that need to be modified
    4. Implementation steps (be specific)
    5. Testing strategy
    6. Success criteria
  `;

  // Call OpenAI API
  const response = await openai.createCompletion({
    model: 'gpt-4',
    prompt,
    max_tokens: 1000,
    temperature: 0.7
  });

  // Parse the response to extract the plan components
  const planText = response.data.choices[0].text.trim();
  
  // Simple parsing logic (can be improved)
  const sections = {
    problemSummary: '',
    proposedSolution: '',
    filesToModify: [],
    implementationSteps: [],
    testingStrategy: '',
    successCriteria: ''
  };
  
  // Extract sections from the LLM response
  // ... parsing logic ...
  
  return sections;
}

// Then use the MCP server to execute the plan
async function resolveIssueWithLLM(issueUrl) {
  // Get issue information
  const issueInfo = await getIssueInfo(issueUrl);
  
  // Create plan using LLM
  const plan = await createResolutionPlan(issueInfo);
  
  // Call MCP server to execute the plan
  // ... MCP API calls ...
}
```

### 2. LLM as a Code Implementation Agent

In this approach, the LLM helps generate the actual code changes based on the resolution plan.

```javascript
async function implementSolution(plan, devEnv, issueInfo) {
  for (const step of plan.implementationSteps) {
    // For each step, use the LLM to generate the code changes
    const prompt = `
      Implement the following change for GitHub issue #${issueInfo.issueNumber}:
      ${step}
      
      The files to modify include:
      ${plan.filesToModify.join('\n')}
      
      Issue title: ${issueInfo.title}
      Issue description: ${issueInfo.body}
    `;
    
    const response = await openai.createCompletion({
      model: 'gpt-4',
      prompt,
      max_tokens: 2000,
      temperature: 0.2
    });
    
    const codeChanges = response.data.choices[0].text.trim();
    
    // Execute the changes in the development environment
    // ... implementation logic ...
  }
}
```

### 3. Complete LLM-Driven Workflow

For a fully automated workflow, the LLM can handle all aspects of issue resolution:

```javascript
async function runLLMResolverWorkflow(issueUrl) {
  // 1. Get issue information
  const issueInfo = await fetchIssueInfo(issueUrl);
  
  // 2. Use LLM to create resolution plan
  const plan = await createLLMResolutionPlan(issueInfo);
  
  // 3. Set up development environment
  const devEnv = await setupDevEnvironment(issueInfo);
  
  // 4. Use LLM to implement each step
  for (const step of plan.implementationSteps) {
    await implementStepWithLLM(step, devEnv, issueInfo);
    
    // Run tests if needed
    if (step.toLowerCase().includes('test')) {
      await runTests(devEnv);
    }
  }
  
  // 5. Use LLM to create PR description and comment
  const prDescription = await createPRDescriptionWithLLM(plan, issueInfo);
  const commentBody = await createCommentWithLLM(plan, issueInfo);
  
  // 6. Create PR and comment on issue
  const prUrl = await createPullRequest(devEnv, prDescription, issueInfo);
  const commentUrl = await commentOnIssue(commentBody, issueInfo);
  
  return {
    success: true,
    pullRequestUrl: prUrl,
    commentUrl: commentUrl
  };
}
```

## Example: Integration with MCP Server

Here's an example of how to replace parts of the MCP server with LLM-powered functions:

```javascript
// In planner.service.ts
async createResolutionPlan(issueInfo: IssueInfo): Promise<ResolutionPlan> {
  try {
    logger.info('Creating resolution plan with LLM', { 
      issue: `${issueInfo.owner}/${issueInfo.repo}#${issueInfo.issueNumber}` 
    });
    
    // Call LLM API
    const llmResponse = await this.callLLMService(issueInfo);
    
    return {
      problemSummary: llmResponse.problemSummary,
      proposedSolution: llmResponse.proposedSolution,
      filesToModify: llmResponse.filesToModify,
      implementationSteps: llmResponse.implementationSteps,
      testingStrategy: llmResponse.testingStrategy,
      successCriteria: llmResponse.successCriteria
    };
  } catch (error) {
    // Fallback to the original implementation if LLM fails
    logger.warn('LLM planning failed, using fallback method', { error });
    return this.createFallbackResolutionPlan(issueInfo);
  }
}

// LLM service call
private async callLLMService(issueInfo: IssueInfo): Promise<any> {
  // Implementation depends on the LLM API being used
  // ... API call implementation ...
}
```

## Best Practices

1. **Prompt Engineering**: Design clear, detailed prompts that provide all necessary context to the LLM.

2. **Error Handling**: Always implement fallbacks in case the LLM generates invalid or inappropriate responses.

3. **Review and Validation**: For critical changes, add human review steps before committing or creating pull requests.

4. **Iterative Refinement**: If the LLM's first solution isn't optimal, use the feedback to refine the prompts.

5. **Context Management**: Ensure the LLM has access to relevant code snippets and issue details to generate accurate fixes.

6. **Security**: Never expose sensitive information in prompts, and ensure generated code is scanned for vulnerabilities.

## Example API Integration

Here's an example of integrating with Anthropic's Claude API:

```javascript
const anthropic = require('@anthropic-ai/sdk');
const client = new anthropic.Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateResolutionPlanWithClaude(issueInfo) {
  const prompt = `
    Human: You are a GitHub issue resolution assistant. I need you to analyze the following GitHub issue and create a detailed plan to resolve it.
    
    Issue Title: ${issueInfo.title}
    Description: ${issueInfo.body}
    Repository: ${issueInfo.repoInfo.fullName}
    Language: ${issueInfo.repoInfo.language}
    
    Please provide a resolution plan with the following sections:
    - Problem Summary
    - Proposed Solution
    - Files to Modify
    - Implementation Steps (numbered list)
    - Testing Strategy
    - Success Criteria
    
    Assistant:
  `;
  
  const response = await client.completions.create({
    model: 'claude-2',
    prompt,
    max_tokens_to_sample: 1000,
    temperature: 0.5
  });
  
  // Parse the response to extract the plan
  // ... parsing logic ...
  
  return plan;
}
```

## Conclusion

Integrating the GitHub Issue Resolver MCP with LLMs can significantly improve the automation and effectiveness of issue resolution. By leveraging LLM capabilities for understanding context, designing solutions, and generating code, you can create a more robust and versatile issue resolution system.

Remember to maintain appropriate human oversight, especially for complex issues or critical codebases, and to continuously refine your prompts and integration based on the results.
