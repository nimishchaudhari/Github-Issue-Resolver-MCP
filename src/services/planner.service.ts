import logger from '../utils/logger';
import { IssueInfo } from './github.service';

export interface ResolutionPlan {
  problemSummary: string;
  proposedSolution: string;
  filesToModify: string[];
  implementationSteps: string[];
  testingStrategy: string;
  successCriteria: string;
}

export class PlannerService {
  /**
   * Create a resolution plan for an issue
   */
  async createResolutionPlan(issueInfo: IssueInfo): Promise<ResolutionPlan> {
    try {
      logger.info('Creating resolution plan', { 
        issue: `${issueInfo.owner}/${issueInfo.repo}#${issueInfo.issueNumber}` 
      });
      
      // In a real implementation, this would call an AI service
      // For now, we'll create a mock plan based on the issue information
      
      const issueWords = `${issueInfo.title} ${issueInfo.body}`.toLowerCase();
      
      let problemSummary = `Issue #${issueInfo.issueNumber}: ${issueInfo.title}`;
      let proposedSolution = 'Implement a fix based on the issue description';
      let filesToModify: string[] = [];
      let implementationSteps: string[] = [];
      let testingStrategy = 'Write unit tests to verify the fix works as expected';
      let successCriteria = 'All tests pass and the issue is resolved';
      
      // Identify relevant files to modify based on issue content
      // This is a simple example - a real AI would be much more sophisticated
      const fileStructure = issueInfo.codebaseAnalysis.fileStructure || [];
      const relevantFiles = this.findRelevantFiles(fileStructure, issueWords);
      filesToModify = relevantFiles.map(file => file.path);
      
      // Create implementation steps
      implementationSteps = [
        'Understand the issue by analyzing the code',
        'Create a branch for the fix',
        'Implement necessary changes',
        'Add or update tests',
        'Verify the fix resolves the issue',
        'Create a pull request'
      ];
      
      return {
        problemSummary,
        proposedSolution,
        filesToModify,
        implementationSteps,
        testingStrategy,
        successCriteria
      };
    } catch (error) {
      logger.error('Failed to create resolution plan', { error });
      throw new Error(`Failed to create resolution plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find files in the repository that might be relevant to the issue
   */
  private findRelevantFiles(fileStructure: any[], issueWords: string): any[] {
    const relevantFiles: any[] = [];
    
    const searchFiles = (files: any[]) => {
      for (const file of files) {
        if (file.type === 'file') {
          // Check if file name or content might be relevant to the issue
          const isRelevant = file.name.toLowerCase().split('.').some((part: string) => 
            issueWords.includes(part)
          );
          
          if (isRelevant) {
            relevantFiles.push(file);
          } else if (file.content) {
            // If file has content, check if any keywords from the issue appear in it
            const contentMatches = issueWords.split(' ').some(word => 
              word.length > 4 && file.content.toLowerCase().includes(word)
            );
            
            if (contentMatches) {
              relevantFiles.push(file);
            }
          }
        }
        
        if (file.children && file.children.length > 0) {
          searchFiles(file.children);
        }
      }
    };
    
    searchFiles(fileStructure);
    
    // If no relevant files found, return some common files that might need modification
    if (relevantFiles.length === 0) {
      const commonFiles = fileStructure.filter(file => 
        file.type === 'file' && (
          file.name.includes('index') || 
          file.name.includes('main') || 
          file.name.includes('app')
        )
      );
      
      return commonFiles.length > 0 ? commonFiles : [];
    }
    
    return relevantFiles;
  }

  /**
   * Update a plan with user modifications
   */
  async updatePlanWithModifications(
    originalPlan: ResolutionPlan, 
    modifications: string
  ): Promise<ResolutionPlan> {
    try {
      logger.info('Updating plan with user modifications');
      
      // In a real implementation, this would use an AI to merge the original
      // plan with the user's requested modifications
      
      // For this implementation, we'll parse the modifications in a simple way
      const updatedPlan = { ...originalPlan };
      
      // Look for specific sections in the modifications
      if (modifications.includes('Problem Summary:')) {
        const match = modifications.match(/Problem Summary:(.*?)(?=Proposed Solution:|$)/s);
        if (match && match[1].trim()) {
          updatedPlan.problemSummary = match[1].trim();
        }
      }
      
      if (modifications.includes('Proposed Solution:')) {
        const match = modifications.match(/Proposed Solution:(.*?)(?=Files to Modify:|$)/s);
        if (match && match[1].trim()) {
          updatedPlan.proposedSolution = match[1].trim();
        }
      }
      
      if (modifications.includes('Files to Modify:')) {
        const match = modifications.match(/Files to Modify:(.*?)(?=Implementation Steps:|$)/s);
        if (match && match[1].trim()) {
          updatedPlan.filesToModify = match[1]
            .trim()
            .split('\n')
            .map(line => line.replace(/^-\s*/, '').trim())
            .filter(Boolean);
        }
      }
      
      if (modifications.includes('Implementation Steps:')) {
        const match = modifications.match(/Implementation Steps:(.*?)(?=Testing Strategy:|$)/s);
        if (match && match[1].trim()) {
          updatedPlan.implementationSteps = match[1]
            .trim()
            .split('\n')
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(Boolean);
        }
      }
      
      if (modifications.includes('Testing Strategy:')) {
        const match = modifications.match(/Testing Strategy:(.*?)(?=Success Criteria:|$)/s);
        if (match && match[1].trim()) {
          updatedPlan.testingStrategy = match[1].trim();
        }
      }
      
      if (modifications.includes('Success Criteria:')) {
        const match = modifications.match(/Success Criteria:(.*?)(?=$)/s);
        if (match && match[1].trim()) {
          updatedPlan.successCriteria = match[1].trim();
        }
      }
      
      return updatedPlan;
    } catch (error) {
      logger.error('Failed to update plan with modifications', { error });
      throw new Error(`Failed to update plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
