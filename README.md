# GitHub Issue Resolver MCP

A Model Context Protocol (MCP) server for automatically resolving GitHub issues. This server provides an MCP tool that can analyze GitHub issues, create resolution plans, and implement solutions with user approval.

## Features

- Automatic analysis of GitHub issues
- AI-powered solution planning
- Interactive user approval workflow
- Containerized development environments
- Automatic code implementation using `codemcp`
- Pull request creation and issue updates

## How It Works

1. **Issue Analysis**: The tool analyzes a GitHub issue to understand the problem
2. **Resolution Planning**: It creates a detailed plan for solving the issue
3. **User Approval**: The user reviews and approves (or modifies) the plan
4. **Development Environment**: A Docker container is set up for development
5. **Implementation**: The solution is implemented automatically using `codemcp`
6. **Pull Request**: A pull request is created with the solution

## Prerequisites

- Node.js 18 or higher
- Docker
- Python 3.8 or higher (for codemcp)
- GitHub API token with appropriate permissions

## Installation

### Using Docker (Recommended)

1. Clone this repository:
   ```bash
   git clone https://github.com/nimishchaudhari/Github-Issue-Resolver-MCP.git
   cd Github-Issue-Resolver-MCP
   ```

2. Create a `.env` file with your GitHub token:
   ```bash
   cp .env.example .env
   # Edit .env and add your GitHub token
   ```

3. Build and start the Docker container:
   ```bash
   docker-compose up -d
   ```

### Manual Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/nimishchaudhari/Github-Issue-Resolver-MCP.git
   cd Github-Issue-Resolver-MCP
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install codemcp:
   ```bash
   pip install codemcp
   ```

4. Create a `.env` file with your configuration:
   ```bash
   cp .env.example .env
   # Edit .env and add your GitHub token
   ```

5. Build the TypeScript project:
   ```bash
   npm run build
   ```

6. Start the server:
   ```bash
   npm start
   ```

## Usage

Once the server is running, you can use the `resolve_github_issue` tool to automatically resolve GitHub issues:

### Using the Test Client

```bash
node scripts/test-client.js https://github.com/owner/repo/issues/123
```

### Using the MCP SDK

```javascript
import { MCPClient } from '@modelcontextprotocol/typescript-sdk';

const client = new MCPClient('http://localhost:3000');
const result = await client.callTool('resolve_github_issue', {
  issue_url: 'https://github.com/owner/repo/issues/123'
});

console.log(result);
```

## Documentation

- [API Documentation](docs/API.md) - Detailed API documentation
- [Architecture](docs/ARCHITECTURE.md) - System architecture overview
- [Setup Guide](SETUP.md) - Detailed setup instructions
- [Roadmap](roadmap.md) - Project roadmap and milestones

## Development

### Running Tests

```bash
npm test
```

### Building the Project

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

## License

MIT
