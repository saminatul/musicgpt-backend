import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { User, SubscriptionStatus } from '@domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toDomain(user) : null;
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        subscriptionStatus: data.subscriptionStatus,
      },
    });
    return this.toDomain(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.subscriptionStatus && { subscriptionStatus: data.subscriptionStatus }),
      },
    });
    return this.toDomain(user);
  }

  async findAll(page: number, limit: number): Promise<{ users: User[]; total: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users: users.map((u) => this.toDomain(u)),
      total,
    };
  }

  async search(query: string, cursor?: string, limit: number = 10): Promise<{ users: User[]; nextCursor?: string }> {
    const take = limit + 1; // Fetch one extra to determine if there's a next page
    const where = {
      OR: [
        { email: { contains: query, mode: 'insensitive' as const } },
        { displayName: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    const users = cursor
      ? await this.prisma.user.findMany({
          where,
          take,
          cursor: { id: cursor },
          skip: 1,
          orderBy: { id: 'asc' },
        })
      : await this.prisma.user.findMany({
          where,
          take,
          orderBy: { id: 'asc' },
        });

    const hasNext = users.length > limit;
    const results = hasNext ? users.slice(0, limit) : users;
    const nextCursor = hasNext ? results[results.length - 1].id : undefined;

    return {
      users: results.map((u) => this.toDomain(u)),
      nextCursor,
    };
  }

  private toDomain(prismaUser: any): User {
    return new User(
      prismaUser.id,
      prismaUser.email,
      prismaUser.password,
      prismaUser.displayName,
      prismaUser.subscriptionStatus as SubscriptionStatus,
      prismaUser.createdAt,
      prismaUser.updatedAt,
    );
  }
}
