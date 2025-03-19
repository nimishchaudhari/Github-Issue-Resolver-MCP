import Docker from 'dockerode';
import logger from '../utils/logger';

export interface ContainerConfig {
  image: string;
  workdir: string;
  env?: Record<string, string>;
  command?: string[];
}

export interface ContainerExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Pull a Docker image if it doesn't exist locally
   */
  async pullImageIfNeeded(imageName: string): Promise<void> {
    try {
      // Check if image exists
      const images = await this.docker.listImages();
      const imageExists = images.some(img => 
        img.RepoTags && img.RepoTags.includes(imageName)
      );
      
      if (!imageExists) {
        logger.info(`Pulling Docker image: ${imageName}`);
        
        return new Promise((resolve, reject) => {
          this.docker.pull(imageName, (err: any, stream: any) => {
            if (err) {
              logger.error(`Failed to pull image ${imageName}`, { error: err });
              return reject(err);
            }
            
            this.docker.modem.followProgress(stream, (err: any, output: any) => {
              if (err) {
                logger.error(`Error during image pull ${imageName}`, { error: err });
                return reject(err);
              }
              
              logger.info(`Successfully pulled image ${imageName}`);
              resolve();
            });
          });
        });
      } else {
        logger.info(`Image ${imageName} already exists locally`);
      }
    } catch (error) {
      logger.error(`Error checking/pulling image ${imageName}`, { error });
      throw new Error(`Failed to pull Docker image ${imageName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create and start a new container
   */
  async createContainer(config: ContainerConfig): Promise<Docker.Container> {
    try {
      // Pull the image if needed
      await this.pullImageIfNeeded(config.image);
      
      // Prepare environment variables
      const env = config.env 
        ? Object.entries(config.env).map(([key, value]) => `${key}=${value}`)
        : [];
      
      logger.info('Creating Docker container', { image: config.image, workdir: config.workdir });
      
      // Create the container
      const container = await this.docker.createContainer({
        Image: config.image,
        WorkingDir: config.workdir,
        Tty: true,
        OpenStdin: true,
        Env: env,
        HostConfig: {
          Binds: [`${config.workdir}:${config.workdir}`],
          NetworkMode: 'bridge'
        },
        Cmd: config.command
      });
      
      // Start the container
      await container.start();
      logger.info('Container started', { containerId: container.id });
      
      return container;
    } catch (error) {
      logger.error('Failed to create and start container', { config, error });
      throw new Error(`Failed to create and start container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a command in a running container
   */
  async execInContainer(
    container: Docker.Container, 
    command: string[]
  ): Promise<ContainerExecutionResult> {
    try {
      logger.info('Executing command in container', { 
        containerId: container.id, 
        command: command.join(' ') 
      });
      
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true
      });
      
      return new Promise((resolve, reject) => {
        exec.start({}, (err, stream) => {
          if (err) {
            logger.error('Failed to start exec', { error: err });
            return reject(err);
          }
          
          let stdout = '';
          let stderr = '';
          
          stream.on('data', (chunk: Buffer) => {
            const str = chunk.toString();
            stdout += str;
          });
          
          stream.on('end', async () => {
            const inspectData = await exec.inspect();
            const exitCode = inspectData.ExitCode;
            
            logger.info('Command execution completed', { 
              containerId: container.id, 
              exitCode 
            });
            
            resolve({
              stdout,
              stderr,
              exitCode
            });
          });
          
          stream.on('error', (err) => {
            logger.error('Stream error during exec', { error: err });
            reject(err);
          });
        });
      });
    } catch (error) {
      logger.error('Failed to execute command in container', { 
        containerId: container.id, 
        command, 
        error 
      });
      throw new Error(`Failed to execute command in container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop and remove a container
   */
  async removeContainer(container: Docker.Container): Promise<void> {
    try {
      logger.info('Stopping container', { containerId: container.id });
      
      // Check if container is running
      const data = await container.inspect();
      if (data.State.Running) {
        await container.stop();
        logger.info('Container stopped', { containerId: container.id });
      }
      
      // Remove container
      await container.remove();
      logger.info('Container removed', { containerId: container.id });
    } catch (error) {
      logger.error('Failed to remove container', { containerId: container.id, error });
      throw new Error(`Failed to remove container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Determine the appropriate Docker image based on repository language
   */
  determineDockerImage(language: string): string {
    const imageMap: Record<string, string> = {
      'JavaScript': 'node:18',
      'TypeScript': 'node:18',
      'Python': 'python:3.11',
      'Java': 'openjdk:17',
      'Go': 'golang:1.20',
      'Rust': 'rust:1.68',
      'PHP': 'php:8.2',
      'Ruby': 'ruby:3.2'
    };
    
    return imageMap[language] || 'ubuntu:22.04';
  }
}