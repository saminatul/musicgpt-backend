import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { IPromptRepository } from '@domain/repositories/prompt.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { IJobQueueService } from '@shared/interfaces/job-queue.interface';
import { Prompt, PromptStatus } from '@domain/entities/prompt.entity';
import { User } from '@domain/entities/user.entity';
import { SubscriptionStatus } from '@domain/entities/user.entity';

describe('PromptService', () => {
  let service: PromptService;
  let promptRepository: jest.Mocked<IPromptRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let jobQueueService: jest.Mocked<IJobQueueService>;

  const mockUser: User = new User(
    'user-id-123',
    'test@example.com',
    'hashed-password',
    'Test User',
    SubscriptionStatus.FREE,
    new Date(),
    new Date(),
  );

  const mockPrompt: Prompt = new Prompt(
    'prompt-id-123',
    'user-id-123',
    'Generate a song',
    PromptStatus.PENDING,
    new Date(),
    new Date(),
  );

  beforeEach(async () => {
    const mockPromptRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
    };

    const mockUserRepository = {
      findById: jest.fn(),
    };

    const mockJobQueueService = {
      addJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptService,
        {
          provide: 'IPromptRepository',
          useValue: mockPromptRepository,
        },
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
        {
          provide: 'IJobQueueService',
          useValue: mockJobQueueService,
        },
      ],
    }).compile();

    service = module.get<PromptService>(PromptService);
    promptRepository = module.get('IPromptRepository') as jest.Mocked<IPromptRepository>;
    userRepository = module.get('IUserRepository') as jest.Mocked<IUserRepository>;
    jobQueueService = module.get('IJobQueueService') as jest.Mocked<IJobQueueService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a prompt', async () => {
      const createDto = {
        text: 'Generate a relaxing jazz melody',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      promptRepository.create.mockResolvedValue(mockPrompt);

      const result = await service.create('user-id-123', createDto);

      expect(userRepository.findById).toHaveBeenCalledWith('user-id-123');
      expect(promptRepository.create).toHaveBeenCalledWith({
        userId: 'user-id-123',
        text: createDto.text,
        status: PromptStatus.PENDING,
      });
      expect(result).toHaveProperty('id', mockPrompt.id);
      expect(result).toHaveProperty('text', mockPrompt.text);
      expect(result).toHaveProperty('status', PromptStatus.PENDING);
      // Job should NOT be enqueued here (handled by cron)
      expect(jobQueueService.addJob).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const createDto = {
        text: 'Generate a song',
      };

      userRepository.findById.mockResolvedValue(null);

      await expect(service.create('non-existent-user', createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(promptRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return prompt if it belongs to the user', async () => {
      promptRepository.findById.mockResolvedValue(mockPrompt);

      const result = await service.findById('prompt-id-123', 'user-id-123');

      expect(promptRepository.findById).toHaveBeenCalledWith('prompt-id-123');
      expect(result).toHaveProperty('id', mockPrompt.id);
      expect(result).toHaveProperty('text', mockPrompt.text);
    });

    it('should throw NotFoundException if prompt does not exist', async () => {
      promptRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-prompt', 'user-id-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if prompt belongs to different user', async () => {
      const otherUserPrompt = new Prompt(
        'prompt-id-456',
        'other-user-id',
        'Other user prompt',
        PromptStatus.PENDING,
        new Date(),
        new Date(),
      );

      promptRepository.findById.mockResolvedValue(otherUserPrompt);

      await expect(service.findById('prompt-id-456', 'user-id-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUserId', () => {
    it('should return paginated prompts for a user', async () => {
      const prompts = [mockPrompt];
      const total = 1;

      promptRepository.findByUserId.mockResolvedValue({
        prompts,
        total,
      });

      const result = await service.findByUserId('user-id-123', 1, 10);

      expect(promptRepository.findByUserId).toHaveBeenCalledWith('user-id-123', 1, 10);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should calculate totalPages correctly', async () => {
      const prompts = Array(25).fill(mockPrompt);
      const total = 25;

      promptRepository.findByUserId.mockResolvedValue({
        prompts,
        total,
      });

      const result = await service.findByUserId('user-id-123', 1, 10);

      expect(result.meta.totalPages).toBe(3); // 25 / 10 = 2.5, ceil = 3
    });

    it('should use default pagination values', async () => {
      promptRepository.findByUserId.mockResolvedValue({
        prompts: [],
        total: 0,
      });

      await service.findByUserId('user-id-123');

      expect(promptRepository.findByUserId).toHaveBeenCalledWith('user-id-123', 1, 10);
    });
  });

  describe('toDto', () => {
    it('should convert prompt entity to DTO correctly', async () => {
      promptRepository.findById.mockResolvedValue(mockPrompt);

      const result = await service.findById('prompt-id-123', 'user-id-123');

      expect(result).toEqual({
        id: mockPrompt.id,
        text: mockPrompt.text,
        status: mockPrompt.status,
        createdAt: mockPrompt.createdAt,
        updatedAt: mockPrompt.updatedAt,
      });
      // Should not include userId in DTO
      expect(result).not.toHaveProperty('userId');
    });
  });
});
