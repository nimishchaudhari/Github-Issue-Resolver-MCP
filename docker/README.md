# Docker Workspace

This directory contains the Docker configuration for the Github Issue Resolver MCP project.

## Usage

To start the Docker workspace:

```bash
cd docker
docker-compose up -d
docker-compose exec app bash
```

This will give you a bash shell in the Ubuntu-based workspace with all necessary tools installed.

## Installed Tools

The Docker workspace comes with the following tools pre-installed:

- Git
- Curl
- Wget
- Python 3 and pip
- Node.js and npm

## Development Workflow

1. Start the Docker workspace using the commands above
2. Your local directory will be mounted to `/app` in the container
3. Make changes to the code in the container or on your local machine
4. Run tests and build the project within the container
