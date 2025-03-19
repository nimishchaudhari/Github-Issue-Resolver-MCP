import { PlannerService } from '../../src/services/planner.service';
import { IssueInfo } from '../../src/services/github.service';

describe('PlannerService', () => {
  let plannerService: PlannerService;
  
  beforeEach(() => {
    plannerService = new PlannerService();
  });
  
  const mockIssueInfo: IssueInfo = {
    owner: 'owner',
    repo: 'repo',
    issueNumber: 123,
    title: 'Fix login bug',
    body: 'There is a bug in the login form that prevents users from logging in',
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
      fileStructure: [
        {
          type: 'file',
          path: 'src/login.ts',
          name: 'login.ts',
          content: 'export function login() { /* buggy code */ }'
        },
        {
          type: 'file',
          path: 'src/index.ts',
          name: 'index.ts'
        }
      ],
      buildSystem: 'npm',
      mainLanguage: 'TypeScript',
      dependencies: {}
    }
  };
  
  describe('createResolutionPlan', () => {
    it('should create a resolution plan for an issue', async () => {
      const plan = await plannerService.createResolutionPlan(mockIssueInfo);
      
      expect(plan).toBeDefined();
      expect(plan.problemSummary).toContain('123');
      expect(plan.problemSummary).toContain('Fix login bug');
      expect(plan.filesToModify).toHaveLength(1);
      expect(plan.filesToModify[0]).toBe('src/login.ts');
      expect(plan.implementationSteps).toHaveLength(6);
      expect(plan.testingStrategy).toBeDefined();
      expect(plan.successCriteria).toBeDefined();
    });
    
    it('should handle issues with no relevant files', async () => {
      const issueInfo = {
        ...mockIssueInfo,
        codebaseAnalysis: {
          ...mockIssueInfo.codebaseAnalysis,
          fileStructure: []
        }
      };
      
      const plan = await plannerService.createResolutionPlan(issueInfo);
      
      expect(plan).toBeDefined();
      expect(plan.filesToModify).toHaveLength(0);
    });
  });
  
  describe('updatePlanWithModifications', () => {
    it('should update a plan with user modifications', async () => {
      const originalPlan = await plannerService.createResolutionPlan(mockIssueInfo);
      
      const modifications = `
Problem Summary:
Updated problem summary

Proposed Solution:
Better solution approach

Implementation Steps:
1. First improved step
2. Second improved step
3. Third improved step

Testing Strategy:
Improved testing strategy

Success Criteria:
Better success criteria
      `;
      
      const updatedPlan = await plannerService.updatePlanWithModifications(
        originalPlan,
        modifications
      );
      
      expect(updatedPlan.problemSummary).toBe('Updated problem summary');
      expect(updatedPlan.proposedSolution).toBe('Better solution approach');
      expect(updatedPlan.implementationSteps).toEqual([
        'First improved step',
        'Second improved step',
        'Third improved step'
      ]);
      expect(updatedPlan.testingStrategy).toBe('Improved testing strategy');
      expect(updatedPlan.successCriteria).toBe('Better success criteria');
    });
    
    it('should keep original values when modifications are incomplete', async () => {
      const originalPlan = await plannerService.createResolutionPlan(mockIssueInfo);
      
      const modifications = `
Problem Summary:
Updated problem summary

Implementation Steps:
1. First improved step
      `;
      
      const updatedPlan = await plannerService.updatePlanWithModifications(
        originalPlan,
        modifications
      );
      
      expect(updatedPlan.problemSummary).toBe('Updated problem summary');
      expect(updatedPlan.proposedSolution).toBe(originalPlan.proposedSolution);
      expect(updatedPlan.implementationSteps).toEqual(['First improved step']);
      expect(updatedPlan.testingStrategy).toBe(originalPlan.testingStrategy);
      expect(updatedPlan.successCriteria).toBe(originalPlan.successCriteria);
    });
  });
});
