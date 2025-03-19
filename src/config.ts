import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

interface Config {
  port: number;
  logLevel: string;
  githubToken: string;
  developmentPath: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  githubToken: process.env.GITHUB_TOKEN || '',
  developmentPath: process.env.DEVELOPMENT_PATH || path.join(__dirname, '../workspace')
};

// Validate required configuration
if (!config.githubToken) {
  console.warn('Warning: GITHUB_TOKEN environment variable is not set');
}

export default config;