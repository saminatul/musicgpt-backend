import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { User } from '@domain/entities/user.entity';
import { SubscriptionStatus } from '@domain/entities/user.entity';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let userRepository: jest.Mocked<IUserRepository>;

  const mockFreeUser: User = new User(
    'user-id-123',
    'test@example.com',
    'hashed-password',
    'Test User',
    SubscriptionStatus.FREE,
    new Date(),
    new Date(),
  );

  const mockPaidUser: User = new User(
    'user-id-123',
    'test@example.com',
    'hashed-password',
    'Test User',
    SubscriptionStatus.PAID,
    new Date(),
    new Date(),
  );

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    userRepository = module.get('IUserRepository') as jest.Mocked<IUserRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should successfully subscribe a FREE user to PAID', async () => {
      userRepository.findById.mockResolvedValue(mockFreeUser);
      userRepository.update.mockResolvedValue(mockPaidUser);

      const result = await service.subscribe('user-id-123');

      expect(userRepository.findById).toHaveBeenCalledWith('user-id-123');
      expect(userRepository.update).toHaveBeenCalledWith('user-id-123', {
        subscriptionStatus: SubscriptionStatus.PAID,
      });
      expect(result).toHaveProperty('subscriptionStatus', SubscriptionStatus.PAID);
      expect(result).toHaveProperty('message', 'Subscription activated successfully');
    });

    it('should successfully subscribe a PAID user to PAID (idempotent)', async () => {
      userRepository.findById.mockResolvedValue(mockPaidUser);
      userRepository.update.mockResolvedValue(mockPaidUser);

      const result = await service.subscribe('user-id-123');

      expect(result.subscriptionStatus).toBe(SubscriptionStatus.PAID);
      expect(result.message).toBe('Subscription activated successfully');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.subscribe('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should successfully cancel a PAID subscription', async () => {
      userRepository.findById.mockResolvedValue(mockPaidUser);
      userRepository.update.mockResolvedValue(mockFreeUser);

      const result = await service.cancel('user-id-123');

      expect(userRepository.findById).toHaveBeenCalledWith('user-id-123');
      expect(userRepository.update).toHaveBeenCalledWith('user-id-123', {
        subscriptionStatus: SubscriptionStatus.FREE,
      });
      expect(result).toHaveProperty('subscriptionStatus', SubscriptionStatus.FREE);
      expect(result).toHaveProperty('message', 'Subscription cancelled successfully');
    });

    it('should successfully cancel a FREE subscription (idempotent)', async () => {
      userRepository.findById.mockResolvedValue(mockFreeUser);
      userRepository.update.mockResolvedValue(mockFreeUser);

      const result = await service.cancel('user-id-123');

      expect(result.subscriptionStatus).toBe(SubscriptionStatus.FREE);
      expect(result.message).toBe('Subscription cancelled successfully');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.cancel('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('subscription flow', () => {
    it('should handle complete subscription lifecycle', async () => {
      // Start as FREE
      userRepository.findById.mockResolvedValue(mockFreeUser);
      userRepository.update.mockResolvedValue(mockPaidUser);

      const subscribeResult = await service.subscribe('user-id-123');
      expect(subscribeResult.subscriptionStatus).toBe(SubscriptionStatus.PAID);

      // Cancel to FREE
      userRepository.findById.mockResolvedValue(mockPaidUser);
      userRepository.update.mockResolvedValue(mockFreeUser);

      const cancelResult = await service.cancel('user-id-123');
      expect(cancelResult.subscriptionStatus).toBe(SubscriptionStatus.FREE);
    });
  });
});
