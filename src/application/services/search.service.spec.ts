import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { IAudioRepository } from '@domain/repositories/audio.repository.interface';
import { User } from '@domain/entities/user.entity';
import { SubscriptionStatus } from '@domain/entities/user.entity';

describe('SearchService', () => {
  let service: SearchService;
  let userRepository: jest.Mocked<IUserRepository>;
  let audioRepository: jest.Mocked<IAudioRepository>;

  const mockUsers = [
    new User('1', 'john@example.com', 'pass', 'John Doe', SubscriptionStatus.FREE, new Date(), new Date()), // Exact email match (score: 3)
    new User('2', 'johnny@example.com', 'pass', 'Johnny Smith', SubscriptionStatus.PAID, new Date(), new Date()), // Partial match (score: 2)
    new User('3', 'jane@example.com', 'pass', 'John', SubscriptionStatus.FREE, new Date(), new Date()), // Exact name match (score: 3)
  ];

  const mockAudios = [
    { id: '1', promptId: 'p1', userId: '1', title: "John's Song", url: 'url1', createdAt: new Date(), updatedAt: new Date() },
    { id: '2', promptId: 'p2', userId: '2', title: 'Johnny Music', url: 'url2', createdAt: new Date(), updatedAt: new Date() },
    { id: '3', promptId: 'p3', userId: '3', title: 'Other Song', url: 'url3', createdAt: new Date(), updatedAt: new Date() },
  ];

  beforeEach(async () => {
    const mockUserRepository = {
      search: jest.fn(),
    };

    const mockAudioRepository = {
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
        {
          provide: 'IAudioRepository',
          useValue: mockAudioRepository,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    userRepository = module.get('IUserRepository');
    audioRepository = module.get('IAudioRepository');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should return empty results for empty query', async () => {
      const result = await service.search('', 1, 10);

      expect(result.users.data).toEqual([]);
      expect(result.audio.data).toEqual([]);
      expect(userRepository.search).not.toHaveBeenCalled();
      expect(audioRepository.search).not.toHaveBeenCalled();
    });

    it('should return empty results for whitespace-only query', async () => {
      const result = await service.search('   ', 1, 10);

      expect(result.users.data).toEqual([]);
      expect(result.audio.data).toEqual([]);
    });

    it('should search users and audio in parallel', async () => {
      userRepository.search.mockResolvedValue({
        users: mockUsers,
        nextCursor: undefined,
      });
      audioRepository.search.mockResolvedValue({
        audios: mockAudios,
        nextCursor: undefined,
      });

      await service.search('john', 1, 10);

      expect(userRepository.search).toHaveBeenCalledWith('john', undefined, 10);
      expect(audioRepository.search).toHaveBeenCalledWith('john', undefined, 10);
    });

    it('should rank results with exact matches first', async () => {
      userRepository.search.mockResolvedValue({
        users: mockUsers,
        nextCursor: undefined,
      });
      audioRepository.search.mockResolvedValue({
        audios: mockAudios,
        nextCursor: undefined,
      });

      const result = await service.search('john', 1, 10);

      // Get indices of exact matches (score: 3) and partial matches (score: 2)
      const johnExactIndex = result.users.data.findIndex(u => u.email === 'john@example.com');
      const johnNameExactIndex = result.users.data.findIndex(u => u.displayName === 'John');
      const johnnyPartialIndex = result.users.data.findIndex(u => u.email === 'johnny@example.com');

      // Verify exact matches exist
      expect(johnExactIndex).not.toBe(-1);
      expect(johnNameExactIndex).not.toBe(-1);
      expect(johnnyPartialIndex).not.toBe(-1);

      // Exact matches (score: 3) should come before partial matches (score: 2)
      // Check that the partial match comes after all exact matches
      expect(johnExactIndex).toBeLessThan(johnnyPartialIndex);
      expect(johnNameExactIndex).toBeLessThan(johnnyPartialIndex);
    });

    it('should return nextCursor in meta when available', async () => {
      userRepository.search.mockResolvedValue({
        users: mockUsers,
        nextCursor: 'user-cursor-123',
      });
      audioRepository.search.mockResolvedValue({
        audios: mockAudios,
        nextCursor: 'audio-cursor-456',
      });

      const result = await service.search('john', 1, 10);

      expect(result.users.meta.nextCursor).toBe('user-cursor-123');
      expect(result.audio.meta.nextCursor).toBe('audio-cursor-456');
    });

    it('should trim query before searching', async () => {
      userRepository.search.mockResolvedValue({
        users: [],
        nextCursor: undefined,
      });
      audioRepository.search.mockResolvedValue({
        audios: [],
        nextCursor: undefined,
      });

      await service.search('  john  ', 1, 10);

      expect(userRepository.search).toHaveBeenCalledWith('john', undefined, 10);
      expect(audioRepository.search).toHaveBeenCalledWith('john', undefined, 10);
    });
  });

  describe('ranking', () => {
    it('should rank exact email match higher than partial match', async () => {
      const users = [
        new User('1', 'johnny@example.com', 'pass', 'Johnny', SubscriptionStatus.FREE, new Date(), new Date()),
        new User('2', 'john@example.com', 'pass', 'John', SubscriptionStatus.FREE, new Date(), new Date()),
      ];

      userRepository.search.mockResolvedValue({
        users,
        nextCursor: undefined,
      });
      audioRepository.search.mockResolvedValue({
        audios: [],
        nextCursor: undefined,
      });

      const result = await service.search('john', 1, 10);

      // Exact match should be first
      expect(result.users.data[0].email).toBe('john@example.com');
    });

    it('should rank exact name match higher than partial match', async () => {
      const users = [
        new User('1', 'user1@example.com', 'pass', 'Johnny', SubscriptionStatus.FREE, new Date(), new Date()),
        new User('2', 'user2@example.com', 'pass', 'John', SubscriptionStatus.FREE, new Date(), new Date()),
      ];

      userRepository.search.mockResolvedValue({
        users,
        nextCursor: undefined,
      });
      audioRepository.search.mockResolvedValue({
        audios: [],
        nextCursor: undefined,
      });

      const result = await service.search('john', 1, 10);

      // Exact match should be first
      expect(result.users.data[0].displayName).toBe('John');
    });
  });
});
