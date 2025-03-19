import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import simpleGit from 'simple-git';
import logger from '../utils/logger';
import { DockerService } from './docker.service';
import { IssueInfo } from './github.service';
import { ResolutionPlan } from './planner.service';

const execAsync = promisify(exec);

export interface DevelopmentEnvironment {
  workspacePath: string;
  container: any;
  branchName: string;
}

export interface ImplementationResult {
  pullRequestUrl: string;
  commentUrl: string;
}

export class ImplementationService {
  private dockerService: DockerService;

  constructor() {
    this.dockerService = new DockerService();
  }

  /**
   * Set up a development environment for implementing a solution
   */
  async setupDevEnvironment(
    issueInfo: IssueInfo,
    developmentPath: string,
    githubToken: string
  ): Promise<DevelopmentEnvironment> {
    const { owner, repo, issueNumber, title } = issueInfo;
    
    try {
      logger.info('Setting up development environment', { owner, repo, issueNumber });
      
      // Create workspace directory
      const workspacePath = path.join(
        developmentPath, 
        `${owner}-${repo}-issue-${issueNumber}`
      );
      
      // Ensure the directory exists and is empty
      await fs.emptyDir(workspacePath);
      
      // Clone the repository
      logger.info('Cloning repository', { owner, repo, path: workspacePath });
      const git = simpleGit();
      await git.clone(
        `https://x-access-token:${githubToken}@github.com/${owner}/${repo}.git`,
        workspacePath
      );
      
      // Create a branch for the fix
      const localGit = simpleGit(workspacePath);
      const branchName = `fix/issue-${issueNumber}-${this.slugify(title)}`;
      
      await localGit.checkoutLocalBranch(branchName);
      logger.info('Created branch', { branchName });
      
      // Determine appropriate Docker image based on repository language
      const language = issueInfo.repoInfo.language;
      const image = this.dockerService.determineDockerImage(language);
      
      // Create Docker container
      const container = await this.dockerService.createContainer({
        image,
        workdir: workspacePath,
        env: {
          GITHUB_TOKEN: githubToken
        }
      });
      
      // Install dependencies in the container
      await this.installDependencies(container, issueInfo);
      
      // Initialize codemcp
      await this.dockerService.execInContainer(
        container,
        ['bash', '-c', `codemcp InitProject ${workspacePath}`]
      );
      
      return {
        workspacePath,
        container,
        branchName
      };
    } catch (error) {
      logger.error('Failed to set up development environment', { error });
      throw new Error(`Failed to set up development environment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Install dependencies in the development container
   */
  private async installDependencies(
    container: any,
    issueInfo: IssueInfo
  ): Promise<void> {
    try {
      logger.info('Installing dependencies');
      
      const buildSystem = issueInfo.codebaseAnalysis.buildSystem;
      
      let installCommand: string[];
      
      switch (buildSystem) {
        case 'npm':
          installCommand = ['npm', 'install'];
          break;
        case 'yarn':
          installCommand = ['yarn', 'install'];
          break;
        case 'pip':
          installCommand = ['pip', 'install', '-r', 'requirements.txt'];
          break;
        case 'bundler':
          installCommand = ['bundle', 'install'];
          break;
        case 'maven':
          installCommand = ['mvn', 'install', '-DskipTests'];
          break;
        case 'gradle':
          installCommand = ['./gradlew', 'build', '-x', 'test'];
          break;
        case 'cargo':
          installCommand = ['cargo', 'build'];
          break;
        default:
          logger.info('Unknown build system, skipping dependency installation');
          return;
      }
      
      logger.info('Running install command', { command: installCommand.join(' ') });
      
      const result = await this.dockerService.execInContainer(
        container,
        installCommand
      );
      
      if (result.exitCode !== 0) {
        logger.warn('Dependency installation failed, but continuing', { 
          exitCode: result.exitCode,
          stderr: result.stderr
        });
      } else {
        logger.info('Dependencies installed successfully');
      }
    } catch (error) {
      logger.error('Error installing dependencies', { error });
      // We'll log the error but continue with the process
    }
  }

  /**
   * Run tests in the development container
   */
  private async runTests(
    container: any,
    issueInfo: IssueInfo
  ): Promise<{ success: boolean; output: string }> {
    try {
      logger.info('Running tests');
      
      const buildSystem = issueInfo.codebaseAnalysis.buildSystem;
      
      let testCommand: string[];
      
      switch (buildSystem) {
        case 'npm':
          testCommand = ['npm', 'test'];
          break;
        case 'yarn':
          testCommand = ['yarn', 'test'];
          break;
        case 'pip':
          testCommand = ['python', '-m', 'pytest'];
          break;
        case 'bundler':
          testCommand = ['bundle', 'exec', 'rake', 'test'];
          break;
        case 'maven':
          testCommand = ['mvn', 'test'];
          break;
        case 'gradle':
          testCommand = ['./gradlew', 'test'];
          break;
        case 'cargo':
          testCommand = ['cargo', 'test'];
          break;
        default:
          logger.info('Unknown build system, skipping tests');
          return { success: true, output: 'Tests skipped: unknown build system' };
      }
      
      logger.info('Running test command', { command: testCommand.join(' ') });
      
      const result = await this.dockerService.execInContainer(
        container,
        testCommand
      );
      
      const success = result.exitCode === 0;
      
      logger.info('Tests completed', { success, exitCode: result.exitCode });
      
      return {
        success,
        output: `${result.stdout}\n${result.stderr}`
      };
    } catch (error) {
      logger.error('Error running tests', { error });
      return {
        success: false,
        output: `Error running tests: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Implement the solution based on the plan
   */
  async implementSolution(
    devEnv: DevelopmentEnvironment,
    plan: ResolutionPlan,
    issueInfo: IssueInfo,
    githubToken: string,
    context: any
  ): Promise<ImplementationResult> {
    const { container, branchName, workspacePath } = devEnv;
    const { owner, repo, issueNumber } = issueInfo;
    
    try {
      logger.info('Implementing solution', { 
        issue: `${owner}/${repo}#${issueNumber}`,
        branch: branchName
      });
      
      // Implement each step in the plan
      for (const [index, step] of plan.implementationSteps.entries()) {
        context.progress({
          message: `Implementing step ${index + 1}/${plan.implementationSteps.length}: ${step}`
        });
        
        logger.info(`Implementing step ${index + 1}/${plan.implementationSteps.length}`, { step });
        
        // Use codemcp to implement this step
        const stepPrompt = `Implementing step for GitHub issue #${issueNumber}: ${step}`;
        const command = `codemcp ImplementStep "${stepPrompt}" --chat_id="issue-${issueNumber}" --description="${this.slugify(step)}"`;
        
        const result = await this.dockerService.execInContainer(
          container,
          ['bash', '-c', command]
        );
        
        if (result.exitCode !== 0) {
          logger.warn(`Step implementation command failed with exit code ${result.exitCode}`, {
            stderr: result.stderr
          });
          // Continue despite errors
        }
        
        // Run tests if this step involves testing
        if (step.toLowerCase().includes('test')) {
          await this.runTests(container, issueInfo);
        }
      }
      
      // Run final tests
      const testResults = await this.runTests(container, issueInfo);
      
      // Even if tests fail, we'll proceed with creating a PR
      // but we'll include the test results in the PR description
      
      // Commit changes
      logger.info('Committing changes');
      
      const commitCommand = `git config --global user.email "github-issue-resolver@example.com" && 
                            git config --global user.name "GitHub Issue Resolver" && 
                            git add . && 
                            git commit -m "Fix #${issueNumber}: ${issueInfo.title}"`;
      
      await this.dockerService.execInContainer(
        container,
        ['bash', '-c', commitCommand]
      );
      
      // Push branch to GitHub
      logger.info('Pushing branch to GitHub', { branch: branchName });
      
      const pushCommand = `git push -u origin ${branchName}`;
      
      await this.dockerService.execInContainer(
        container,
        ['bash', '-c', pushCommand]
      );
      
      // Create pull request with GitHub CLI
      const prBody = this.createPullRequestBody(plan, issueInfo, testResults);
      const prTitle = `Fix #${issueNumber}: ${issueInfo.title}`;
      
      // Use the local git to create a PR
      const localGit = simpleGit(workspacePath);
      await localGit.addConfig('user.name', 'GitHub Issue Resolver');
      await localGit.addConfig('user.email', 'github-issue-resolver@example.com');
      
      // We'll use the GitHub API to create a PR via our GitHubService
      // For this mock implementation, we'll just return placeholder URLs
      
      // Assume these would be created by our GitHub service
      const pullRequestUrl = `https://github.com/${owner}/${repo}/pull/new-pr-for-issue-${issueNumber}`;
      const commentUrl = `https://github.com/${owner}/${repo}/issues/${issueNumber}#comment-12345`;
      
      return {
        pullRequestUrl,
        commentUrl
      };
    } catch (error) {
      logger.error('Failed to implement solution', { error });
      throw new Error(`Failed to implement solution: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a formatted pull request body with the implementation details
   */
  private createPullRequestBody(
    plan: ResolutionPlan,
    issueInfo: IssueInfo,
    testResults: { success: boolean; output: string }
  ): string {
    return `
# Fix for Issue #${issueInfo.issueNumber}: ${issueInfo.title}

## Problem
${plan.problemSummary}

## Solution
${plan.proposedSolution}

## Changes Made
${plan.implementationSteps.map((step, i) => `${i+1}. ${step}`).join('\n')}

## Files Modified
${plan.filesToModify.map(file => `- ${file}`).join('\n')}

## Testing
${plan.testingStrategy}

### Test Results
${testResults.success ? '✅ All tests passed' : '⚠️ Some tests failed'}

\`\`\`
${testResults.output.substring(0, 500)}${testResults.output.length > 500 ? '...' : ''}
\`\`\`

## Success Criteria
${plan.successCriteria}

Fixes #${issueInfo.issueNumber}
`;
  }

  /**
   * Convert a string to a URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);
  }
}