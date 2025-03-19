# GitHub Issue Resolver MCP Makefile

.PHONY: all build start dev test lint docker-build docker-up docker-down

all: build

# Build the TypeScript code
build:
	npm run build

# Start the server
start:
	npm start

# Start the server in development mode
dev:
	npm run dev

# Run tests
test:
	npm test

# Run linting
lint:
	npm run lint

# Build Docker image
docker-build:
	docker-compose build

# Start Docker containers
docker-up:
	docker-compose up -d

# Stop Docker containers
docker-down:
	docker-compose down

# Clean build artifacts
clean:
	rm -rf dist coverage

# Create workspace directory
workspace:
	mkdir -p workspace

# Install dependencies
install:
	npm install

# Show logs
logs:
	docker-compose logs -f

# Full setup for development
setup: install workspace docker-build

# Run the full workflow
workflow: docker-up logs