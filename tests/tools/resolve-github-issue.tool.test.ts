import { resolveGitHubIssueTool } from '../../src/tools/resolve-github-issue.tool';
import { GitHubService } from '../../src/services/github.service';
import { PlannerService } from '../../src/services/planner.service';
import { ImplementationService } from '../../src/services/implementation.service';

// Mock the services
jest.mock('../../src/services/github.service');
jest.mock('../../src/services/planner.service');
jest.mock('../../src/services/implementation.service');

describe('resolveGitHubIssueTool', () => {
  // Mock context
  const mockContext = {
    progress: jest.fn(),
    requestUserInput: jest.fn(),
    error: jest.fn()
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (GitHubService.prototype.getIssueInfo as jest.Mock).mockResolvedValue({
      owner: 'owner',
      repo: 'repo',
      issueNumber: 123,
      title: 'Test Issue',
      body: 'Test Body',
      labels: [],
      state: 'open',
      comments: [],
      repoInfo: {
        name: 'repo',
        fullName: 'owner/repo',
        language: 'TypeScript',
        defaultBranch: 'main',
        hasIssues: true
      },
      codebaseAnalysis: {
        fileStructure: [],
        buildSystem: 'npm',
        mainLanguage: 'TypeScript',
        dependencies: {}
      }
    });
    
    (PlannerService.prototype.createResolutionPlan as jest.Mock).mockResolvedValue({
      problemSummary: 'Problem summary',
      proposedSolution: 'Proposed solution',
      filesToModify: ['src/file.ts'],
      implementationSteps: ['Step 1', 'Step 2'],
      testingStrategy: 'Testing strategy',
      successCriteria: 'Success criteria'
    });
    
    (ImplementationService.prototype.setupDevEnvironment as jest.Mock).mockResolvedValue({
      workspacePath: '/tmp/workspace',
      container: {},
      branchName: 'fix/issue-123'
    });
    
    (ImplementationService.prototype.implementSolution as jest.Mock).mockResolvedValue({
      pullRequestUrl: 'https://github.com/owner/repo/pull/456',
      commentUrl: 'https://github.com/owner/repo/issues/123#comment-789'
    });
    
    (GitHubService.prototype.commentOnIssue as jest.Mock).mockResolvedValue({
      url: 'https://github.com/owner/repo/issues/123#comment-789'
    });
    
    // Mock user approving the plan
    mockContext.requestUserInput.mockResolvedValue('Approve');
  });
  
  it('should execute the complete workflow', async () => {
    // Execute the tool
    const result = await resolveGitHubIssueTool.execute(
      { issue_url: 'https://github.com/owner/repo/issues/123', github_token: 'token' },
      mockContext as any
    );
    
    // Verify that all services were called
    expect(GitHubService.prototype.getIssueInfo).toHaveBeenCalledWith(
      'https://github.com/owner/repo/issues/123'
    );
    
    expect(PlannerService.prototype.createResolutionPlan).toHaveBeenCalled();
    expect(mockContext.requestUserInput).toHaveBeenCalled();
    expect(ImplementationService.prototype.setupDevEnvironment).toHaveBeenCalled();
    expect(ImplementationService.prototype.implementSolution).toHaveBeenCalled();
    expect(GitHubService.prototype.commentOnIssue).toHaveBeenCalled();
    
    // Verify progress updates were sent
    expect(mockContext.progress).toHaveBeenCalledTimes(5);
    
    // Check result structure
    expect(result).toEqual({
      success: true,
      issue_details: {
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        title: 'Test Issue'
      },
      plan: expect.any(Object),
      pull_request_url: 'https://github.com/owner/repo/pull/456',
      comment_url: 'https://github.com/owner/repo/issues/123#comment-789'
    });
  });
  
  it('should handle plan modification', async () => {
    // Mock user requesting modifications
    mockContext.requestUserInput
      .mockResolvedValueOnce('Modify')  // First call - request modification
      .mockResolvedValueOnce('Updated plan')  // Second call - provide modifications
      .mockResolvedValueOnce('Approve');  // Third call - approve updated plan
    
    (PlannerService.prototype.updatePlanWithModifications as jest.Mock).mockResolvedValue({
      problemSummary: 'Updated problem summary',
      proposedSolution: 'Updated proposed solution',
      filesToModify: ['src/updated-file.ts'],
      implementationSteps: ['Updated Step 1', 'Updated Step 2'],
      testingStrategy: 'Updated testing strategy',
      successCriteria: 'Updated success criteria'
    });
    
    // Execute the tool
    const result = await resolveGitHubIssueTool.execute(
      { issue_url: 'https://github.com/owner/repo/issues/123', github_token: 'token' },
      mockContext as any
    );
    
    // Verify that plan was updated
    expect(PlannerService.prototype.updatePlanWithModifications).toHaveBeenCalledWith(
      expect.any(Object),
      'Updated plan'
    );
    
    // Verify that implementation used the updated plan
    expect(ImplementationService.prototype.implementSolution).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        problemSummary: 'Updated problem summary'
      }),
      expect.any(Object),
      expect.any(String),
      expect.any(Object)
    );
    
    expect(result.success).toBe(true);
  });
  
  it('should handle errors during execution', async () => {
    // Mock an error in GitHub service
    (GitHubService.prototype.getIssueInfo as jest.Mock).mockRejectedValue(
      new Error('API error')
    );
    
    // Execute the tool
    const result = await resolveGitHubIssueTool.execute(
      { issue_url: 'https://github.com/owner/repo/issues/123', github_token: 'token' },
      mockContext as any
    );
    
    // Verify error handling
    expect(mockContext.error).toHaveBeenCalledWith(
      expect.stringContaining('Error resolving issue')
    );
    
    expect(result).toEqual({
      success: false,
      error: 'API error'
    });
  });
  
  it('should handle plan rejection', async () => {
    // Mock user rejecting the plan
    mockContext.requestUserInput.mockResolvedValueOnce('Reject');
    
    // Execute the tool
    const result = await resolveGitHubIssueTool.execute(
      { issue_url: 'https://github.com/owner/repo/issues/123', github_token: 'token' },
      mockContext as any
    );
    
    // Verify that implementation was not called
    expect(ImplementationService.prototype.setupDevEnvironment).not.toHaveBeenCalled();
    expect(ImplementationService.prototype.implementSolution).not.toHaveBeenCalled();
    
    expect(result).toEqual({
      success: false,
      error: 'Plan rejected by user'
    });
  });
});
