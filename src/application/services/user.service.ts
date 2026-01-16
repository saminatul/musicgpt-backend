import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { ICacheService } from '@shared/interfaces/cache.interface';
import { UpdateUserDto, UserResponseDto, PaginatedUserResponseDto } from '../dto/user.dto';
import { User } from '@domain/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    @Inject('ICacheService') private readonly cacheService: ICacheService,
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedUserResponseDto> {
    const cacheKey = `users:page:${page}:limit:${limit}`;
    const cached = await this.cacheService.get<PaginatedUserResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const { users, total } = await this.userRepository.findAll(page, limit);
    const totalPages = Math.ceil(total / limit);

    const result: PaginatedUserResponseDto = {
      data: users.map((u) => this.toDto(u)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    await this.cacheService.set(cacheKey, result);
    return result;
  }

  async findById(id: string): Promise<UserResponseDto> {
    const cacheKey = `user:${id}`;
    const cached = await this.cacheService.get<UserResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const result = this.toDto(user);
    await this.cacheService.set(cacheKey, result);
    return result;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.userRepository.update(id, dto as any);

    // Invalidate cache
    await this.cacheService.delete(`user:${id}`);
    await this.cacheService.deletePattern('users:page:*');

    return this.toDto(updated);
  }

  private toDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
