import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token.repository.interface';
import { RegisterDto, LoginDto, AuthResponseDto, RefreshTokenResponseDto } from '../dto/auth.dto';
import { User } from '@domain/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    @Inject('IRefreshTokenRepository') private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      displayName: dto.displayName,
      subscriptionStatus: 'FREE' as any,
    } as any);

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        subscriptionStatus: user.subscriptionStatus,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        subscriptionStatus: user.subscriptionStatus,
      },
    };
  }

  async refresh(refreshToken: string): Promise<RefreshTokenResponseDto> {
    const tokenRecord = await this.refreshTokenRepository.findByToken(refreshToken);
    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findById(tokenRecord.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Revoke old token (token rotation)
    await this.refreshTokenRepository.revokeToken(refreshToken);

    // Generate new tokens
    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      username: user.displayName,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.revokeToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllUserTokens(userId);
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.accessTokenExpiration'),
    });

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}
