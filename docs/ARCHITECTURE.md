# GitHub Issue Resolver MCP - Architecture

This document describes the architecture of the GitHub Issue Resolver MCP server.

## System Overview

The GitHub Issue Resolver MCP is structured as a TypeScript-based MCP server that exposes a tool for automatically resolving GitHub issues. The implementation follows a modular, service-oriented architecture to ensure maintainability and extensibility.

## Components

### 1. MCP Server Core

The central component responsible for exposing the MCP interface and tools.

- Uses the `@modelcontextprotocol/typescript-sdk` to implement the MCP server
- Handles tool registration, server configuration, and lifecycle management
- Manages requests and responses to/from LLM clients

### 2. GitHub Service

Handles all interactions with the GitHub API.

- Issue information retrieval
- Repository and codebase analysis
- Pull request creation
- Issue commenting

### 3. Planner Service

Responsible for creating and managing resolution plans.

- Analyzes issues to understand the problem
- Creates structured resolution plans
- Handles plan updates based on user feedback
- Defines implementation steps

### 4. Docker Service

Manages containerized development environments.

- Creates and configures Docker containers
- Executes commands within containers
- Manages container lifecycle (create, start, stop, remove)
- Maps local filesystem into containers

### 5. Implementation Service

Executes the solution implementation process.

- Sets up development environments
- Implements solution steps using codemcp
- Runs tests
- Creates pull requests
- Manages the entire implementation workflow

## Data Flow

1. **Request Ingestion**: The MCP server receives a request to resolve a GitHub issue with a URL.

2. **Issue Analysis**: The GitHub service extracts all relevant information about the issue.

3. **Plan Creation**: The planner service creates a resolution plan.

4. **User Approval**: The plan is presented to the user for approval.

5. **Development Environment Setup**: A Docker container is created with the appropriate tools.

6. **Implementation**: The solution is implemented step by step.

7. **Validation**: Tests are run to validate the solution.

8. **PR Creation**: A pull request is created with the solution.

9. **Issue Update**: The original issue is updated with a comment about the PR.

10. **Response Return**: Results are returned to the client.

## Architecture Diagram

```
┌─────────────────────────────────────┐
│             MCP Server              │
│  ┌─────────────┐    ┌─────────────┐ │
│  │   GitHub    │    │   Planner   │ │
│  │   Service   │    │   Service   │ │
│  └─────────────┘    └─────────────┘ │
│                                     │
│  ┌─────────────┐    ┌─────────────┐ │
│  │    Docker   │    │Implementation│ │
│  │   Service   │    │   Service   │ │
│  └─────────────┘    └─────────────┘ │
└─────────────────────────────────────┘
            │
            │ GitHub API
            ▼
┌─────────────────────────────────────┐
│           GitHub Repos              │
│                                     │
│    Issues, PRs, Code, Comments      │
└─────────────────────────────────────┘
            │
            │ Docker API
            ▼
┌─────────────────────────────────────┐
│        Docker Containers            │
│                                     │
│       Development Environments      │
└─────────────────────────────────────┘
```

## Design Decisions

1. **Modular Services**: Each component is implemented as a separate service to allow for better separation of concerns and easier testing.

2. **Containerized Development**: Using Docker for development environments ensures consistent execution regardless of the underlying system.

3. **GitHub API Abstraction**: All GitHub interactions are centralized in a service to simplify authentication and API usage.

4. **User Approval Loop**: Users must approve plans before implementation to maintain control over automated changes.

5. **Typescript Implementation**: The use of TypeScript provides strong typing and better code organization.

## Error Handling Strategy

- All operations have proper error handling
- Errors are logged centrally
- User-facing errors are appropriately formatted
- Potentially destructive operations require explicit confirmation

## Future Enhancements

1. **Multi-Repository Support**: Handling issues that span multiple repositories.

2. **Advanced Issue Analysis**: Using ML/AI for better issue understanding.

3. **Plan Templates**: Creating pre-defined resolution plans for common issues.

4. **Integration with CI/CD**: Automating the entire process including testing in CI/CD pipelines.

5. **Support for Additional Git Platforms**: Expanding beyond GitHub to support GitLab, Bitbucket, etc.
