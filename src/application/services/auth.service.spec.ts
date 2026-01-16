import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token.repository.interface';
import { User } from '@domain/entities/user.entity';
import { SubscriptionStatus } from '@domain/entities/user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-refresh-token-uuid'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let mockJwtService: { sign: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  const mockUser: User = new User(
    'user-id-123',
    'test@example.com',
    'hashed-password',
    'Test User',
    SubscriptionStatus.FREE,
    new Date(),
    new Date(),
  );

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    const mockRefreshTokenRepository = {
      create: jest.fn(),
      findByToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(() => 'mock-access-token'),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.accessTokenExpiration') return '15m';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
        {
          provide: 'IRefreshTokenRepository',
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService as any,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService as any,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get('IUserRepository') as jest.Mocked<IUserRepository>;
    refreshTokenRepository = module.get('IRefreshTokenRepository') as jest.Mocked<IRefreshTokenRepository>;
    jwtService = mockJwtService;
    configService = mockConfigService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123',
        displayName: 'Test User',
      };

      userRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      userRepository.create.mockResolvedValue(mockUser);
      refreshTokenRepository.create.mockResolvedValue({
        id: 'token-id',
        userId: mockUser.id,
        token: 'mock-refresh-token-uuid',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.register(registerDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(userRepository.create).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'Password123',
        displayName: 'Test User',
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepository.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      refreshTokenRepository.create.mockResolvedValue({
        id: 'token-id',
        userId: mockUser.id,
        token: 'mock-refresh-token-uuid',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.login(loginDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      userRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should successfully refresh tokens', async () => {
      const refreshToken = 'valid-refresh-token';
      const tokenRecord = {
        id: 'token-id',
        userId: mockUser.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      refreshTokenRepository.findByToken.mockResolvedValue(tokenRecord);
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenRepository.revokeToken.mockResolvedValue(undefined);
      refreshTokenRepository.create.mockResolvedValue({
        id: 'new-token-id',
        userId: mockUser.id,
        token: 'new-refresh-token',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.refresh(refreshToken);

      expect(refreshTokenRepository.findByToken).toHaveBeenCalledWith(refreshToken);
      expect(refreshTokenRepository.revokeToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('username', mockUser.displayName);
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      const refreshToken = 'invalid-token';

      refreshTokenRepository.findByToken.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh token is revoked', async () => {
      const refreshToken = 'revoked-token';
      const tokenRecord = {
        id: 'token-id',
        userId: mockUser.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        revokedAt: new Date(),
      };

      refreshTokenRepository.findByToken.mockResolvedValue(tokenRecord);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh token is expired', async () => {
      const refreshToken = 'expired-token';
      const tokenRecord = {
        id: 'token-id',
        userId: mockUser.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date(),
      };

      refreshTokenRepository.findByToken.mockResolvedValue(tokenRecord);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
