import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IRefreshTokenRepository, RefreshToken } from '@domain/repositories/refresh-token.repository.interface';

@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken> {
    const token = await this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });
    return this.toDomain(token);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });
    return refreshToken ? this.toDomain(refreshToken) : null;
  }

  async revokeToken(token: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  private toDomain(prismaToken: any): RefreshToken {
    return {
      id: prismaToken.id,
      userId: prismaToken.userId,
      token: prismaToken.token,
      expiresAt: prismaToken.expiresAt,
      createdAt: prismaToken.createdAt,
      revokedAt: prismaToken.revokedAt || undefined,
    };
  }
}
