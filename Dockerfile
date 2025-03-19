FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install essential tools
RUN apt-get update && apt-get install -y \
    curl \
    git \
    nodejs \
    npm \
    python3 \
    python3-pip \
    docker.io \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Install TypeScript and ts-node globally
RUN npm install -g typescript ts-node

# Install codemcp
RUN pip3 install codemcp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set up a non-root user
RUN useradd -m -s /bin/bash developer \
    && echo "developer ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/developer \
    && chmod 0440 /etc/sudoers.d/developer \
    && chown -R developer:developer /app

# Switch to non-root user
USER developer

# Install Node.js dependencies
RUN npm install

# Copy the rest of the code
COPY --chown=developer:developer . .

# Expose port
EXPOSE 3000

# Command to keep the container running
CMD ["bash"]
