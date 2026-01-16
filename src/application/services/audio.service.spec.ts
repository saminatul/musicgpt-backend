import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AudioService } from './audio.service';
import { IAudioRepository } from '@domain/repositories/audio.repository.interface';
import { ICacheService } from '@shared/interfaces/cache.interface';
import { Audio } from '@domain/entities/audio.entity';

describe('AudioService', () => {
  let service: AudioService;
  let audioRepository: jest.Mocked<IAudioRepository>;
  let cacheService: jest.Mocked<ICacheService>;

  const mockAudio: Audio = new Audio(
    'audio-id-123',
    'prompt-id-123',
    'user-id-123',
    'My Audio Title',
    'https://example.com/audio.mp3',
    new Date(),
    new Date(),
  );

  const mockOtherUserAudio: Audio = new Audio(
    'audio-id-456',
    'prompt-id-456',
    'other-user-id',
    'Other Audio',
    'https://example.com/other.mp3',
    new Date(),
    new Date(),
  );

  beforeEach(async () => {
    const mockAudioRepository = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      findByPromptId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioService,
        {
          provide: 'IAudioRepository',
          useValue: mockAudioRepository,
        },
        {
          provide: 'ICacheService',
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AudioService>(AudioService);
    audioRepository = module.get('IAudioRepository') as jest.Mocked<IAudioRepository>;
    cacheService = module.get('ICacheService') as jest.Mocked<ICacheService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should return paginated audio for a user', async () => {
      const audios = [mockAudio];
      const total = 1;
      const cacheKey = `audios:user:user-id-123:page:1:limit:10`;

      cacheService.get.mockResolvedValue(null);
      audioRepository.findByUserId.mockResolvedValue({ audios, total });

      const result = await service.findByUserId('user-id-123', 1, 10);

      expect(cacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(audioRepository.findByUserId).toHaveBeenCalledWith('user-id-123', 1, 10);
      expect(cacheService.set).toHaveBeenCalledWith(cacheKey, expect.any(Object));
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should return cached result if available', async () => {
      const cacheKey = `audios:user:user-id-123:page:1:limit:10`;
      const cachedResult = {
        data: [mockAudio],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      cacheService.get.mockResolvedValue(cachedResult);

      const result = await service.findByUserId('user-id-123', 1, 10);

      expect(cacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(audioRepository.findByUserId).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });

    it('should calculate totalPages correctly', async () => {
      const audios = Array(25).fill(mockAudio);
      const total = 25;

      cacheService.get.mockResolvedValue(null);
      audioRepository.findByUserId.mockResolvedValue({ audios, total });

      const result = await service.findByUserId('user-id-123', 1, 10);

      expect(result.meta.totalPages).toBe(3); // 25 / 10 = 2.5, ceil = 3
    });
  });

  describe('findById', () => {
    it('should return audio if it belongs to the user', async () => {
      const cacheKey = `audio:audio-id-123`;

      cacheService.get.mockResolvedValue(null);
      audioRepository.findById.mockResolvedValue(mockAudio);

      const result = await service.findById('audio-id-123', 'user-id-123');

      expect(audioRepository.findById).toHaveBeenCalledWith('audio-id-123');
      expect(cacheService.set).toHaveBeenCalledWith(cacheKey, expect.any(Object));
      expect(result).toHaveProperty('id', mockAudio.id);
      expect(result).toHaveProperty('title', mockAudio.title);
    });

    it('should return cached audio if available', async () => {
      const cacheKey = `audio:audio-id-123`;
      const cachedAudio = {
        id: mockAudio.id,
        promptId: mockAudio.promptId,
        title: mockAudio.title,
        url: mockAudio.url,
        createdAt: mockAudio.createdAt,
        updatedAt: mockAudio.updatedAt,
      };

      cacheService.get.mockResolvedValue(cachedAudio);
      audioRepository.findById.mockResolvedValue(mockAudio);

      const result = await service.findById('audio-id-123', 'user-id-123');

      expect(cacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(cachedAudio);
      // Should not set cache again if cached
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if audio does not exist', async () => {
      cacheService.get.mockResolvedValue(null);
      audioRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-audio', 'user-id-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if audio belongs to different user', async () => {
      cacheService.get.mockResolvedValue(null);
      audioRepository.findById.mockResolvedValue(mockOtherUserAudio);

      await expect(service.findById('audio-id-456', 'user-id-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should successfully update audio if it belongs to the user', async () => {
      const updateDto = {
        title: 'Updated Title',
      };

      audioRepository.findById.mockResolvedValue(mockAudio);
      audioRepository.update.mockResolvedValue({
        ...mockAudio,
        title: 'Updated Title',
      });

      const result = await service.update('audio-id-123', updateDto, 'user-id-123');

      expect(audioRepository.findById).toHaveBeenCalledWith('audio-id-123');
      expect(audioRepository.update).toHaveBeenCalledWith('audio-id-123', updateDto);
      expect(cacheService.delete).toHaveBeenCalledWith('audio:audio-id-123');
      expect(cacheService.deletePattern).toHaveBeenCalledWith('audios:user:user-id-123:page:*');
      expect(result).toHaveProperty('title', 'Updated Title');
    });

    it('should throw NotFoundException if audio does not exist', async () => {
      audioRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent-audio', { title: 'New Title' }, 'user-id-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if audio belongs to different user', async () => {
      audioRepository.findById.mockResolvedValue(mockOtherUserAudio);

      await expect(
        service.update('audio-id-456', { title: 'New Title' }, 'user-id-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create new audio if it does not exist', async () => {
      audioRepository.findByPromptId.mockResolvedValue(null);
      audioRepository.create.mockResolvedValue(mockAudio);

      const result = await service.create('prompt-id-123', 'user-id-123', 'My Audio', 'https://example.com/audio.mp3');

      expect(audioRepository.findByPromptId).toHaveBeenCalledWith('prompt-id-123');
      expect(audioRepository.create).toHaveBeenCalledWith({
        promptId: 'prompt-id-123',
        userId: 'user-id-123',
        title: 'My Audio',
        url: 'https://example.com/audio.mp3',
      });
      expect(cacheService.deletePattern).toHaveBeenCalledWith('audios:user:user-id-123:page:*');
      expect(result).toEqual(mockAudio);
    });

    it('should return existing audio if it already exists (idempotency)', async () => {
      audioRepository.findByPromptId.mockResolvedValue(mockAudio);

      const result = await service.create('prompt-id-123', 'user-id-123', 'My Audio', 'https://example.com/audio.mp3');

      expect(audioRepository.findByPromptId).toHaveBeenCalledWith('prompt-id-123');
      expect(audioRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockAudio);
    });
  });

  describe('createAudio', () => {
    it('should create audio and return DTO', async () => {
      audioRepository.findByPromptId.mockResolvedValue(null);
      audioRepository.create.mockResolvedValue(mockAudio);

      const result = await service.createAudio('prompt-id-123', 'user-id-123', 'My Audio', 'https://example.com/audio.mp3');

      expect(result).toHaveProperty('id', mockAudio.id);
      expect(result).toHaveProperty('title', mockAudio.title);
      expect(result).toHaveProperty('url', mockAudio.url);
      // Should not include userId in DTO
      expect(result).not.toHaveProperty('userId');
    });
  });

  describe('toDto', () => {
    it('should convert audio entity to DTO correctly', async () => {
      cacheService.get.mockResolvedValue(null);
      audioRepository.findById.mockResolvedValue(mockAudio);

      const result = await service.findById('audio-id-123', 'user-id-123');

      expect(result).toEqual({
        id: mockAudio.id,
        promptId: mockAudio.promptId,
        title: mockAudio.title,
        url: mockAudio.url,
        createdAt: mockAudio.createdAt,
        updatedAt: mockAudio.updatedAt,
      });
      // Should not include userId in DTO
      expect(result).not.toHaveProperty('userId');
    });
  });
});
