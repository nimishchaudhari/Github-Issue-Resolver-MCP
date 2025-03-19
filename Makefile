# Makefile for GitHub Issue Resolver MCP

.PHONY: build dev test lint clean docker-build docker-dev docker-test start stop install help

# Variables
NODE_ENV ?= development
PORT ?= 3000

# Colors
COLOR_RESET = \033[0m
COLOR_CYAN = \033[36m
COLOR_GREEN = \033[32m
COLOR_YELLOW = \033[33m

# Help
help:
	@echo "$(COLOR_CYAN)GitHub Issue Resolver MCP$(COLOR_RESET)"
	@echo "$(COLOR_GREEN)Available commands:$(COLOR_RESET)"
	@echo "  $(COLOR_YELLOW)make install$(COLOR_RESET)     - Install dependencies"
	@echo "  $(COLOR_YELLOW)make build$(COLOR_RESET)       - Build the project"
	@echo "  $(COLOR_YELLOW)make dev$(COLOR_RESET)         - Run in development mode with hot reload"
	@echo "  $(COLOR_YELLOW)make test$(COLOR_RESET)        - Run tests"
	@echo "  $(COLOR_YELLOW)make lint$(COLOR_RESET)        - Lint code"
	@echo "  $(COLOR_YELLOW)make start$(COLOR_RESET)       - Start the server"
	@echo "  $(COLOR_YELLOW)make stop$(COLOR_RESET)        - Stop the server"
	@echo "  $(COLOR_YELLOW)make docker-build$(COLOR_RESET) - Build Docker image"
	@echo "  $(COLOR_YELLOW)make docker-dev$(COLOR_RESET)   - Run in Docker development mode"
	@echo "  $(COLOR_YELLOW)make docker-test$(COLOR_RESET)  - Run tests in Docker"
	@echo "  $(COLOR_YELLOW)make clean$(COLOR_RESET)       - Clean build artifacts"

# Install dependencies
install:
	@echo "$(COLOR_CYAN)Installing dependencies...$(COLOR_RESET)"
	npm install

# Build the project
build:
	@echo "$(COLOR_CYAN)Building project...$(COLOR_RESET)"
	npm run build

# Run in development mode
dev:
	@echo "$(COLOR_CYAN)Starting development server...$(COLOR_RESET)"
	npm run dev

# Run tests
test:
	@echo "$(COLOR_CYAN)Running tests...$(COLOR_RESET)"
	npm test

# Run specific tests
test-unit:
	@echo "$(COLOR_CYAN)Running unit tests...$(COLOR_RESET)"
	npm run test:unit

test-integration:
	@echo "$(COLOR_CYAN)Running integration tests...$(COLOR_RESET)"
	npm run test:integration

# Lint code
lint:
	@echo "$(COLOR_CYAN)Linting code...$(COLOR_RESET)"
	npm run lint

# Start the server
start:
	@echo "$(COLOR_CYAN)Starting server...$(COLOR_RESET)"
	npm start

# Stop the server
stop:
	@echo "$(COLOR_CYAN)Stopping server...$(COLOR_RESET)"
	pkill -f "node.*dist/index.js" || true

# Docker commands
docker-build:
	@echo "$(COLOR_CYAN)Building Docker image...$(COLOR_RESET)"
	docker build -t github-issue-resolver-mcp .

docker-dev:
	@echo "$(COLOR_CYAN)Starting Docker development environment...$(COLOR_RESET)"
	docker-compose -f docker-compose.dev.yml up

docker-test:
	@echo "$(COLOR_CYAN)Running tests in Docker...$(COLOR_RESET)"
	docker-compose -f docker-compose.dev.yml run --rm app-dev npm test

# Clean build artifacts
clean:
	@echo "$(COLOR_CYAN)Cleaning build artifacts...$(COLOR_RESET)"
	rm -rf dist
	rm -rf coverage
	rm -rf node_modules/.cache
