# Detailed Setup Guide

This guide will walk you through setting up the GitHub Issue Resolver MCP server from scratch, including all necessary dependencies and configuration.

## System Requirements

- Linux, macOS, or Windows with WSL2
- Docker and Docker Compose
- Node.js 18+
- Python 3.8+
- Git

## Step 1: Install Dependencies

### Ubuntu/Debian

```bash
# Update package lists
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker

# Install Python and pip
sudo apt install -y python3 python3-pip

# Add current user to the docker group to run Docker without sudo
sudo usermod -aG docker $USER
# You may need to log out and back in for this to take effect
```

### macOS

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@18

# Install Docker Desktop
brew install --cask docker

# Install Python
brew install python
```

## Step 2: Install codemcp

codemcp is a Python tool used by the GitHub Issue Resolver to implement solutions:

```bash
pip install codemcp
```

## Step 3: Clone the Repository

```bash
git clone https://github.com/nimishchaudhari/Github-Issue-Resolver-MCP.git
cd Github-Issue-Resolver-MCP
```

## Step 4: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cat > .env << EOL
# GitHub personal access token with repo scope
GITHUB_TOKEN=your_github_token

# Server port
PORT=3000

# Logging level (debug, info, warn, error)
LOG_LEVEL=info

# Path for development workspaces
DEVELOPMENT_PATH=./workspace
EOL
```

Make sure your GitHub token has the following permissions:
- `repo` scope (full control of private repositories)
- `workflow` scope (if you need to update GitHub Actions)

## Step 5: Docker Setup (Recommended)

The easiest way to run the GitHub Issue Resolver MCP is using Docker Compose:

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f
```

The server will be available at http://localhost:3000.

## Step 6: Manual Setup (Alternative)

If you prefer to run the server without Docker:

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Start the server
npm start
```

## Step 7: Verify Installation

Check that the server is running:

```bash
curl http://localhost:3000/health
```

You should see a response like:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "name": "GitHub Issue Resolver"
}
```

## Step 8: Test with Sample Issue

You can test the MCP server using a simple client script:

```bash
cat > test-client.js << EOL
const fetch = require('node-fetch');

async function main() {
  const response = await fetch('http://localhost:3000/tools/resolve_github_issue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      issue_url: 'https://github.com/yourusername/testrepo/issues/1',
      github_token: process.env.GITHUB_TOKEN
    })
  });
  
  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
EOL

# Run the test client
node test-client.js
```

## Troubleshooting

### Docker Permission Issues

If you encounter permission issues with Docker:

```bash
# Make sure your user is in the docker group
sudo usermod -aG docker $USER

# Apply the changes without logging out
newgrp docker
```

### GitHub API Rate Limiting

If you see GitHub API rate limit errors:

1. Make sure you're using a valid GitHub token
2. Check your rate limit status: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit`

### Node.js Memory Issues

If the Node.js process runs out of memory:

```bash
# Increase Node.js memory limit
export NODE_OPTIONS=--max_old_space_size=4096
```

### Docker Container Access Issues

If the Docker container can't access GitHub:

1. Check if your network has any proxy requirements
2. Ensure DNS resolution works within the container
3. Verify that the GitHub token has required permissions

## Next Steps

Now that you have the GitHub Issue Resolver MCP server running, you can:

1. Integrate it with your AI systems
2. Customize the planning and implementation logic
3. Add support for additional languages and frameworks
4. Improve error handling and robustness

For more information, see the [README.md](README.md) file.