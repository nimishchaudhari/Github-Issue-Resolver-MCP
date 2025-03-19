import { GitHubService } from '../../src/services/github.service';
import nock from 'nock';

describe('GitHubService', () => {
  const mockToken = 'mock-token';
  let githubService: GitHubService;

  beforeEach(() => {
    githubService = new GitHubService(mockToken);
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('parseIssueUrl', () => {
    it('should correctly parse a valid GitHub issue URL', () => {
      const url = 'https://github.com/owner/repo/issues/123';
      const result = githubService.parseIssueUrl(url);
      
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        issueNumber: 123
      });
    });

    it('should throw an error for invalid GitHub issue URL', () => {
      const url = 'https://github.com/owner/repo/pulls/123';
      
      expect(() => {
        githubService.parseIssueUrl(url);
      }).toThrow('Invalid GitHub issue URL');
    });
  });

  describe('getIssueInfo', () => {
    it('should fetch and return issue information', async () => {
      // Mock the GitHub API responses
      nock('https://api.github.com')
        .get('/repos/owner/repo/issues/123')
        .reply(200, {
          title: 'Test Issue',
          body: 'This is a test issue',
          state: 'open',
          labels: []
        });

      nock('https://api.github.com')
        .get('/repos/owner/repo')
        .reply(200, {
          name: 'repo',
          full_name: 'owner/repo',
          language: 'TypeScript',
          default_branch: 'main',
          has_issues: true
        });

      nock('https://api.github.com')
        .get('/repos/owner/repo/issues/123/comments')
        .reply(200, []);

      nock('https://api.github.com')
        .get('/repos/owner/repo/contents/')
        .reply(200, []);

      const issueInfo = await githubService.getIssueInfo('https://github.com/owner/repo/issues/123');
      
      expect(issueInfo.owner).toBe('owner');
      expect(issueInfo.repo).toBe('repo');
      expect(issueInfo.issueNumber).toBe(123);
      expect(issueInfo.title).toBe('Test Issue');
      expect(issueInfo.repoInfo.language).toBe('TypeScript');
    });

    it('should handle errors when fetching issue information', async () => {
      nock('https://api.github.com')
        .get('/repos/owner/repo/issues/123')
        .replyWithError('API error');

      await expect(
        githubService.getIssueInfo('https://github.com/owner/repo/issues/123')
      ).rejects.toThrow('Failed to fetch issue information');
    });
  });

  describe('commentOnIssue', () => {
    it('should post a comment to an issue', async () => {
      nock('https://api.github.com')
        .post('/repos/owner/repo/issues/123/comments', {
          body: 'Test comment'
        })
        .reply(201, {
          html_url: 'https://github.com/owner/repo/issues/123#comment-1'
        });

      const result = await githubService.commentOnIssue(
        'owner',
        'repo',
        123,
        'Test comment'
      );
      
      expect(result.url).toBe('https://github.com/owner/repo/issues/123#comment-1');
    });

    it('should handle errors when commenting on an issue', async () => {
      nock('https://api.github.com')
        .post('/repos/owner/repo/issues/123/comments')
        .replyWithError('API error');

      await expect(
        githubService.commentOnIssue('owner', 'repo', 123, 'Test comment')
      ).rejects.toThrow('Failed to comment on issue');
    });
  });

  // Add more tests as needed
});
