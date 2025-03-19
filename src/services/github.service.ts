import { Octokit } from '@octokit/rest';
import logger from '../utils/logger';

export interface IssueInfo {
  owner: string;
  repo: string;
  issueNumber: number;
  title: string;
  body: string;
  labels: any[];
  state: string;
  comments: any[];
  repoInfo: {
    name: string;
    fullName: string;
    language: string;
    defaultBranch: string;
    hasIssues: boolean;
  };
  codebaseAnalysis: any;
}

export interface FileStructure {
  type: string;
  path: string;
  name: string;
  children?: FileStructure[];
  content?: string;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Parse GitHub issue URL to extract owner, repo, and issue number
   */
  parseIssueUrl(issueUrl: string): { owner: string; repo: string; issueNumber: number } {
    try {
      const url = new URL(issueUrl);
      const pathParts = url.pathname.split('/');
      
      // Expected format: /owner/repo/issues/number
      if (pathParts.length < 5 || pathParts[3] !== 'issues') {
        throw new Error('Invalid GitHub issue URL format');
      }
      
      return {
        owner: pathParts[1],
        repo: pathParts[2],
        issueNumber: parseInt(pathParts[4], 10)
      };
    } catch (error) {
      logger.error('Failed to parse GitHub issue URL', { issueUrl, error });
      throw new Error(`Invalid GitHub issue URL: ${issueUrl}`);
    }
  }

  /**
   * Get detailed information about a GitHub issue
   */
  async getIssueInfo(issueUrl: string): Promise<IssueInfo> {
    const { owner, repo, issueNumber } = this.parseIssueUrl(issueUrl);
    
    try {
      logger.info('Fetching issue details', { owner, repo, issueNumber });
      
      // Get issue details
      const { data: issue } = await this.octokit.issues.get({
        owner,
        repo,
        issue_number: issueNumber
      });
      
      // Get repository information
      const { data: repoInfo } = await this.octokit.repos.get({
        owner,
        repo
      });
      
      // Get issue comments
      const { data: comments } = await this.octokit.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber
      });
      
      // Analyze codebase structure
      const codebaseAnalysis = await this.analyzeCodebase(owner, repo);
      
      return {
        owner,
        repo,
        issueNumber,
        title: issue.title,
        body: issue.body || '',
        labels: issue.labels,
        state: issue.state,
        comments,
        repoInfo: {
          name: repoInfo.name,
          fullName: repoInfo.full_name,
          language: repoInfo.language || 'Unknown',
          defaultBranch: repoInfo.default_branch,
          hasIssues: repoInfo.has_issues
        },
        codebaseAnalysis
      };
    } catch (error) {
      logger.error('Failed to fetch issue information', { owner, repo, issueNumber, error });
      throw new Error(`Failed to fetch issue information: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Analyze repository codebase structure
   */
  private async analyzeCodebase(owner: string, repo: string): Promise<any> {
    try {
      logger.info('Analyzing codebase structure', { owner, repo });
      
      // Get repository content (root directory)
      const { data: rootContents } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: ''
      });
      
      // Build file structure
      const fileStructure = await this.buildFileStructure(owner, repo, rootContents);
      
      // Detect main language, build system, etc.
      const buildSystem = this.detectBuildSystem(fileStructure);
      const dependencies = await this.detectDependencies(owner, repo, fileStructure);
      
      return {
        fileStructure,
        buildSystem,
        mainLanguage: this.detectMainLanguage(fileStructure),
        dependencies
      };
    } catch (error) {
      logger.error('Failed to analyze codebase', { owner, repo, error });
      return {
        fileStructure: [],
        buildSystem: 'unknown',
        mainLanguage: 'unknown',
        dependencies: []
      };
    }
  }

  /**
   * Build a hierarchical file structure of the repository
   */
  private async buildFileStructure(
    owner: string, 
    repo: string, 
    contents: any[], 
    path: string = ''
  ): Promise<FileStructure[]> {
    const structure: FileStructure[] = [];
    
    for (const item of contents) {
      const fileStructure: FileStructure = {
        type: item.type,
        path: item.path,
        name: item.name
      };
      
      if (item.type === 'dir') {
        try {
          const { data: dirContents } = await this.octokit.repos.getContent({
            owner,
            repo,
            path: item.path
          });
          
          // Only recurse into important directories to avoid API rate limits
          if (this.isImportantDirectory(item.name)) {
            fileStructure.children = await this.buildFileStructure(
              owner, 
              repo, 
              Array.isArray(dirContents) ? dirContents : [dirContents],
              item.path
            );
          }
        } catch (error) {
          logger.warn(`Failed to get contents of directory: ${item.path}`, { error });
        }
      } else if (item.type === 'file' && this.isImportantFile(item.name)) {
        try {
          // Get content of important files
          const { data: fileContent } = await this.octokit.repos.getContent({
            owner,
            repo,
            path: item.path
          });
          
          if ('content' in fileContent && typeof fileContent.content === 'string') {
            fileStructure.content = Buffer.from(fileContent.content, 'base64').toString('utf-8');
          }
        } catch (error) {
          logger.warn(`Failed to get content of file: ${item.path}`, { error });
        }
      }
      
      structure.push(fileStructure);
    }
    
    return structure;
  }

  /**
   * Check if a directory is important for analysis
   */
  private isImportantDirectory(name: string): boolean {
    const importantDirs = [
      'src', 'lib', 'app', 'config', 
      'test', 'tests', 'spec', 'scripts',
      '.github'
    ];
    
    return importantDirs.includes(name.toLowerCase()) ||
           name.toLowerCase().includes('src') ||
           name.toLowerCase().includes('lib');
  }

  /**
   * Check if a file is important for analysis
   */
  private isImportantFile(name: string): boolean {
    const importantFiles = [
      'package.json', 'package-lock.json', 'yarn.lock',
      'tsconfig.json', 'tslint.json', 'eslintrc.json', '.eslintrc.js',
      'Gemfile', 'Gemfile.lock', 'requirements.txt', 'setup.py',
      'build.gradle', 'pom.xml', 'Cargo.toml',
      'Dockerfile', 'docker-compose.yml',
      'README.md', 'LICENSE'
    ];
    
    const importantExtensions = [
      '.ts', '.js', '.jsx', '.tsx', '.py', '.java', '.rb', '.go', '.rs'
    ];
    
    return importantFiles.includes(name) || 
           importantExtensions.some(ext => name.endsWith(ext));
  }

  /**
   * Detect the build system based on file structure
   */
  private detectBuildSystem(fileStructure: FileStructure[]): string {
    const fileNames = fileStructure.map(f => f.name.toLowerCase());
    
    if (fileNames.includes('package.json')) return 'npm';
    if (fileNames.includes('yarn.lock')) return 'yarn';
    if (fileNames.includes('pom.xml')) return 'maven';
    if (fileNames.includes('build.gradle')) return 'gradle';
    if (fileNames.includes('requirements.txt') || fileNames.includes('setup.py')) return 'pip';
    if (fileNames.includes('cargo.toml')) return 'cargo';
    if (fileNames.includes('gemfile')) return 'bundler';
    
    return 'unknown';
  }

  /**
   * Detect the main language based on file structure
   */
  private detectMainLanguage(fileStructure: FileStructure[]): string {
    const languageCounts: Record<string, number> = {};
    
    const getExtension = (filename: string): string => {
      const parts = filename.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
    };
    
    const extensionToLanguage: Record<string, string> = {
      '.ts': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.rb': 'Ruby',
      '.java': 'Java',
      '.go': 'Go',
      '.rs': 'Rust',
      '.php': 'PHP',
      '.c': 'C',
      '.cpp': 'C++',
      '.cs': 'C#',
      '.swift': 'Swift',
      '.kt': 'Kotlin'
    };
    
    const countLanguage = (structures: FileStructure[]) => {
      for (const item of structures) {
        if (item.type === 'file') {
          const extension = getExtension(item.name);
          const language = extensionToLanguage[extension];
          
          if (language) {
            languageCounts[language] = (languageCounts[language] || 0) + 1;
          }
        }
        
        if (item.children) {
          countLanguage(item.children);
        }
      }
    };
    
    countLanguage(fileStructure);
    
    // Find the language with the highest count
    let maxCount = 0;
    let mainLanguage = 'Unknown';
    
    for (const [language, count] of Object.entries(languageCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mainLanguage = language;
      }
    }
    
    return mainLanguage;
  }

  /**
   * Detect dependencies from package.json, requirements.txt, etc.
   */
  private async detectDependencies(
    owner: string, 
    repo: string, 
    fileStructure: FileStructure[]
  ): Promise<any> {
    const dependencies: any = {};
    
    const findFile = (name: string, structures: FileStructure[]): FileStructure | undefined => {
      for (const item of structures) {
        if (item.type === 'file' && item.name === name) {
          return item;
        }
        
        if (item.children) {
          const found = findFile(name, item.children);
          if (found) return found;
        }
      }
      
      return undefined;
    };
    
    // Check for package.json
    const packageJson = findFile('package.json', fileStructure);
    if (packageJson && packageJson.content) {
      try {
        const content = JSON.parse(packageJson.content);
        dependencies.npm = {
          dependencies: content.dependencies || {},
          devDependencies: content.devDependencies || {}
        };
      } catch (error) {
        logger.warn('Failed to parse package.json', { error });
      }
    }
    
    // Check for requirements.txt
    const requirementsTxt = findFile('requirements.txt', fileStructure);
    if (requirementsTxt && requirementsTxt.content) {
      const lines = requirementsTxt.content.split('\n');
      const pythonDeps: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          pythonDeps.push(trimmed);
        }
      }
      
      dependencies.python = pythonDeps;
    }
    
    return dependencies;
  }

  /**
   * Create a pull request for an issue
   */
  async createPullRequest(
    owner: string,
    repo: string,
    issueNumber: number,
    title: string,
    head: string,
    base: string,
    body: string
  ): Promise<{ url: string }> {
    try {
      logger.info('Creating pull request', { owner, repo, head, base });
      
      const { data: pullRequest } = await this.octokit.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body,
        issue: issueNumber
      });
      
      return { url: pullRequest.html_url };
    } catch (error) {
      logger.error('Failed to create pull request', { owner, repo, error });
      throw new Error(`Failed to create pull request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add a comment to a GitHub issue
   */
  async commentOnIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<{ url: string }> {
    try {
      logger.info('Adding comment to issue', { owner, repo, issueNumber });
      
      const { data: comment } = await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body
      });
      
      return { url: comment.html_url };
    } catch (error) {
      logger.error('Failed to comment on issue', { owner, repo, issueNumber, error });
      throw new Error(`Failed to comment on issue: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
