# GitHub Issue Resolver MCP - API Documentation

This document describes the API provided by the GitHub Issue Resolver MCP server.

## MCP Tool: `resolve_github_issue`

The main tool exposed by this MCP server is `resolve_github_issue`, which automatically analyzes and resolves GitHub issues.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_url` | string | Yes | URL of the GitHub issue to resolve |
| `github_token` | string | No | GitHub API token with appropriate permissions (defaults to environment variable) |
| `development_path` | string | No | Local path for development workspace (defaults to environment variable) |

### Response

The tool returns a JSON object with the following structure:

```json
{
  "success": true,
  "issue_details": {
    "owner": "string",
    "repo": "string",
    "issue_number": 123,
    "title": "string"
  },
  "plan": {
    "problemSummary": "string",
    "proposedSolution": "string",
    "filesToModify": ["string"],
    "implementationSteps": ["string"],
    "testingStrategy": "string",
    "successCriteria": "string"
  },
  "pull_request_url": "string",
  "comment_url": "string"
}
```

In case of error:

```json
{
  "success": false,
  "error": "string"
}
```

### User Interactions

During execution, the tool will pause and wait for user input at these points:

1. **Plan Approval**: The user is presented with the resolution plan and asked to approve, modify, or reject it.
2. **Plan Modification**: If the user chooses to modify the plan, they are prompted to provide modifications.
3. **Implementation Updates**: The user receives progress updates during implementation.

### Example Usage

Using the MCP client:

```typescript
import { MCPClient } from '@modelcontextprotocol/typescript-sdk';

const client = new MCPClient('http://localhost:3000');

const result = await client.callTool('resolve_github_issue', {
  issue_url: 'https://github.com/owner/repo/issues/123',
  github_token: 'your_github_token'
});

console.log(result);
```

Using direct HTTP:

```bash
curl -X POST http://localhost:3000/tools/resolve_github_issue \
  -H "Content-Type: application/json" \
  -d '{
    "issue_url": "https://github.com/owner/repo/issues/123",
    "github_token": "your_github_token"
  }'
```

## Health Check Endpoint

The server also provides a health check endpoint:

```
GET /health
```

Response:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "name": "GitHub Issue Resolver"
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Successful operation |
| 400 | Invalid request parameters |
| 401 | Unauthorized (invalid GitHub token) |
| 404 | Issue not found |
| 422 | Unable to process issue (e.g., already closed) |
| 500 | Internal server error |

## Required GitHub Token Permissions

The GitHub token used with this tool must have the following permissions:

- `repo` scope (for accessing private repositories)
- `workflow` scope (if updating GitHub Actions workflows)

## Rate Limiting

The tool respects GitHub's API rate limits and will pause operations if limits are reached. For high-volume usage, consider implementing a token rotation strategy.

## Security Considerations

1. The tool requires access to GitHub repositories and will create branches and pull requests.
2. The Docker container will have access to the local filesystem.
3. GitHub tokens should be kept secure and not committed to source control.
4. Consider using repository-specific tokens with limited scope.