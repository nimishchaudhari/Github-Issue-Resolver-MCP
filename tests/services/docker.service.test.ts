import { DockerService } from '../../src/services/docker.service';

// Mock Docker
jest.mock('dockerode');

describe('DockerService', () => {
  let dockerService: DockerService;
  
  beforeEach(() => {
    dockerService = new DockerService();
    jest.clearAllMocks();
  });
  
  describe('determineDockerImage', () => {
    it('should select appropriate Docker image based on language', () => {
      expect(dockerService.determineDockerImage('JavaScript')).toBe('node:18');
      expect(dockerService.determineDockerImage('TypeScript')).toBe('node:18');
      expect(dockerService.determineDockerImage('Python')).toBe('python:3.11');
      expect(dockerService.determineDockerImage('Java')).toBe('openjdk:17');
      expect(dockerService.determineDockerImage('Go')).toBe('golang:1.20');
      expect(dockerService.determineDockerImage('Ruby')).toBe('ruby:3.2');
      expect(dockerService.determineDockerImage('PHP')).toBe('php:8.2');
      expect(dockerService.determineDockerImage('Rust')).toBe('rust:1.68');
    });
    
    it('should return ubuntu image for unknown languages', () => {
      expect(dockerService.determineDockerImage('Unknown')).toBe('ubuntu:22.04');
      expect(dockerService.determineDockerImage('C++')).toBe('ubuntu:22.04');
    });
  });
  
  describe('pullImageIfNeeded', () => {
    it('should pull image if it does not exist locally', async () => {
      // Mock Docker listImages method
      const mockListImages = jest.fn().mockResolvedValue([
        { RepoTags: ['existing:latest'] }
      ]);
      
      const mockPull = jest.fn().mockImplementation((image, callback) => {
        callback(null, { on: jest.fn() });
      });
      
      const mockFollowProgress = jest.fn().mockImplementation((stream, callback) => {
        callback(null, []);
      });
      
      // @ts-ignore - Mocking Docker prototype methods
      dockerService.docker = {
        listImages: mockListImages,
        pull: mockPull,
        modem: {
          followProgress: mockFollowProgress
        }
      };
      
      await dockerService.pullImageIfNeeded('new:latest');
      
      expect(mockListImages).toHaveBeenCalled();
      expect(mockPull).toHaveBeenCalledWith('new:latest', expect.any(Function));
      expect(mockFollowProgress).toHaveBeenCalled();
    });
    
    it('should not pull image if it already exists locally', async () => {
      // Mock Docker listImages method
      const mockListImages = jest.fn().mockResolvedValue([
        { RepoTags: ['existing:latest'] }
      ]);
      
      const mockPull = jest.fn();
      
      // @ts-ignore - Mocking Docker prototype methods
      dockerService.docker = {
        listImages: mockListImages,
        pull: mockPull
      };
      
      await dockerService.pullImageIfNeeded('existing:latest');
      
      expect(mockListImages).toHaveBeenCalled();
      expect(mockPull).not.toHaveBeenCalled();
    });
    
    it('should handle errors during image listing', async () => {
      // Mock Docker listImages method to throw error
      const mockListImages = jest.fn().mockRejectedValue(new Error('Docker error'));
      
      // @ts-ignore - Mocking Docker prototype methods
      dockerService.docker = {
        listImages: mockListImages
      };
      
      await expect(dockerService.pullImageIfNeeded('new:latest')).rejects.toThrow('Failed to pull Docker image');
    });
  });
  
  describe('createContainer', () => {
    it('should create and start a container', async () => {
      // Mock Docker methods
      const mockContainer = {
        id: 'container123',
        start: jest.fn().mockResolvedValue(undefined)
      };
      
      const mockCreateContainer = jest.fn().mockResolvedValue(mockContainer);
      
      // Mock pullImageIfNeeded
      jest.spyOn(dockerService, 'pullImageIfNeeded').mockResolvedValue();
      
      // @ts-ignore - Mocking Docker prototype methods
      dockerService.docker = {
        createContainer: mockCreateContainer
      };
      
      const config = {
        image: 'test:latest',
        workdir: '/app',
        env: {
          NODE_ENV: 'test'
        }
      };
      
      const container = await dockerService.createContainer(config);
      
      expect(dockerService.pullImageIfNeeded).toHaveBeenCalledWith('test:latest');
      expect(mockCreateContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: 'test:latest',
        WorkingDir: '/app'
      }));
      expect(mockContainer.start).toHaveBeenCalled();
      expect(container).toBe(mockContainer);
    });
    
    it('should handle errors during container creation', async () => {
      // Mock pullImageIfNeeded
      jest.spyOn(dockerService, 'pullImageIfNeeded').mockResolvedValue();
      
      // Mock Docker createContainer to throw error
      const mockCreateContainer = jest.fn().mockRejectedValue(new Error('Container error'));
      
      // @ts-ignore - Mocking Docker prototype methods
      dockerService.docker = {
        createContainer: mockCreateContainer
      };
      
      const config = {
        image: 'test:latest',
        workdir: '/app'
      };
      
      await expect(dockerService.createContainer(config)).rejects.toThrow('Failed to create and start container');
    });
  });
  
  // Add more tests for other methods as needed
});
