import { Tool } from '@modelcontextprotocol/typescript-sdk';
import logger from '../utils/logger';
import config from '../config';
import { GitHubService } from '../services/github.service';
import { PlannerService } from '../services/planner.service';
import { ImplementationService } from '../services/implementation.service';

interface ResolveGitHubIssueParams {
  issue_url: string;
  github_token?: string;
  development_path?: string;
}

interface ResolveGitHubIssueContext {
  progress: (data: { message: string }) => void;
  requestUserInput: (data: any) => Promise<any>;
  error: (message: string) => void;
}

/**
 * MCP Tool for resolving GitHub issues
 */
export const resolveGitHubIssueTool: Tool = {
  name: 'resolve_github_issue',
  description: 'Analyzes and resolves GitHub issues by following a structured workflow',
  parameters: {
    type: 'object',
    properties: {
      issue_url: {
        type: 'string',
        description: 'URL of the GitHub issue to resolve'
      },
      github_token: {
        type: 'string',
        description: 'GitHub API token with appropriate permissions'
      },
      development_path: {
        type: 'string',
        description: 'Local path for development workspace'
      }
    },
    required: ['issue_url']
  },
  execute: async (params: ResolveGitHubIssueParams, context: ResolveGitHubIssueContext) => {
    const { issue_url } = params;
    const githubToken = params.github_token || config.githubToken;
    const developmentPath = params.development_path || config.developmentPath;
    
    try {
      // Initialize services
      const githubService = new GitHubService(githubToken);
      const plannerService = new PlannerService();
      const implementationService = new ImplementationService();
      
      // Step 1: Identify issue information
      context.progress({ message: 'Identifying issue information...' });
      logger.info('Identifying issue information', { issue_url });
      const issueInfo = await githubService.getIssueInfo(issue_url);
      
      // Step 2: Create resolution plan
      context.progress({ message: 'Creating resolution plan...' });
      logger.info('Creating resolution plan');
      const plan = await plannerService.createResolutionPlan(issueInfo);
      
      // Step 3: Get user approval
      context.progress({ message: 'Waiting for user approval...' });
      logger.info('Requesting user approval for plan');
      
      // Format the plan for display
      const formattedPlan = `
# Issue Resolution Plan

## Problem Summary
${plan.problemSummary}

## Proposed Solution
${plan.proposedSolution}

## Files to Modify
${plan.filesToModify.map(file => `- ${file}`).join('\n')}

## Implementation Steps
${plan.implementationSteps.map((step, i) => `${i+1}. ${step}`).join('\n')}

## Testing Strategy
${plan.testingStrategy}

## Success Criteria
${plan.successCriteria}
      `;
      
      // Request user approval
      const response = await context.requestUserInput({
        type: 'approval',
        message: formattedPlan,
        options: ['Approve', 'Modify', 'Reject']
      });
      
      let approvedPlan = plan;
      
      if (response === 'Approve') {
        logger.info('Plan approved by user');
      } else if (response === 'Modify') {
        // Get modifications from user
        logger.info('User requested modifications to plan');
        
        const modifications = await context.requestUserInput({
          type: 'text',
          message: 'Please provide modifications to the plan:',
        });
        
        // Update plan with user modifications
        approvedPlan = await plannerService.updatePlanWithModifications(plan, modifications);
        
        // Get approval for the updated plan
        const updatedResponse = await context.requestUserInput({
          type: 'approval',
          message: `
# Updated Issue Resolution Plan

## Problem Summary
${approvedPlan.problemSummary}

## Proposed Solution
${approvedPlan.proposedSolution}

## Files to Modify
${approvedPlan.filesToModify.map(file => `- ${file}`).join('\n')}

## Implementation Steps
${approvedPlan.implementationSteps.map((step, i) => `${i+1}. ${step}`).join('\n')}

## Testing Strategy
${approvedPlan.testingStrategy}

## Success Criteria
${approvedPlan.successCriteria}
          `,
          options: ['Approve', 'Reject']
        });
        
        if (updatedResponse !== 'Approve') {
          throw new Error('Updated plan rejected by user');
        }
        
        logger.info('Updated plan approved by user');
      } else {
        throw new Error('Plan rejected by user');
      }
      
      // Step 4: Initialize development environment
      context.progress({ message: 'Setting up development environment...' });
      logger.info('Setting up development environment');
      
      const devEnv = await implementationService.setupDevEnvironment(
        issueInfo,
        developmentPath,
        githubToken
      );
      
      // Step 5: Implement solution
      context.progress({ message: 'Implementing solution...' });
      logger.info('Implementing solution based on approved plan');
      
      const result = await implementationService.implementSolution(
        devEnv,
        approvedPlan,
        issueInfo,
        githubToken,
        context
      );
      
      // Add a comment to the original issue
      context.progress({ message: 'Adding comment to issue...' });
      logger.info('Adding comment to original issue');
      
      const commentBody = `
Hello! 👋

I've created a pull request to resolve this issue: ${result.pullRequestUrl}

The implementation follows this plan:

## Problem
${approvedPlan.problemSummary}

## Solution
${approvedPlan.proposedSolution}

Please review the pull request and let me know if you need any adjustments.
      `;
      
      const comment = await githubService.commentOnIssue(
        issueInfo.owner,
        issueInfo.repo,
        issueInfo.issueNumber,
        commentBody
      );
      
      // Return success result
      logger.info('Issue resolution completed successfully', {
        pullRequestUrl: result.pullRequestUrl,
        commentUrl: comment.url
      });
      
      return {
        success: true,
        issue_details: {
          owner: issueInfo.owner,
          repo: issueInfo.repo,
          issue_number: issueInfo.issueNumber,
          title: issueInfo.title
        },
        plan: approvedPlan,
        pull_request_url: result.pullRequestUrl,
        comment_url: comment.url
      };
    } catch (error) {
      logger.error('Error resolving issue', { issue_url, error });
      context.error(`Error resolving issue: ${error instanceof Error ? error.message : String(error)}`);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};