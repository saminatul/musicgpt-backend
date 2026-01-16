import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { IAudioRepository } from '@domain/repositories/audio.repository.interface';
import { SearchResultDto } from '../dto/search.dto';

@Injectable()
export class SearchService {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    @Inject('IAudioRepository') private readonly audioRepository: IAudioRepository,
  ) {}

  async search(query: string, page: number = 1, limit: number = 10): Promise<SearchResultDto> {
    if (!query || query.trim().length === 0) {
      return {
        users: { data: [], meta: {} },
        audio: { data: [], meta: {} },
      };
    }

    const trimmedQuery = query.trim();

    // Search users and audio in parallel
    const [userResults, audioResults] = await Promise.all([
      this.userRepository.search(trimmedQuery, undefined, limit),
      this.audioRepository.search(trimmedQuery, undefined, limit),
    ]);

    // Rank results (exact match > partial match)
    const rankedUsers = this.rankUsers(userResults.users, trimmedQuery);
    const rankedAudios = this.rankAudios(audioResults.audios, trimmedQuery);

    return {
      users: {
        data: rankedUsers.map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          subscriptionStatus: u.subscriptionStatus,
        })),
        meta: {
          nextCursor: userResults.nextCursor,
        },
      },
      audio: {
        data: rankedAudios.map((a) => ({
          id: a.id,
          promptId: a.promptId,
          userId: a.userId,
          title: a.title,
          url: a.url,
        })),
        meta: {
          nextCursor: audioResults.nextCursor,
        },
      },
    };
  }

  private rankUsers(users: any[], query: string): any[] {
    return users.sort((a, b) => {
      const aEmailExact = a.email.toLowerCase() === query.toLowerCase() ? 3 : 0;
      const aEmailPartial = a.email.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
      const aNameExact = a.displayName.toLowerCase() === query.toLowerCase() ? 3 : 0;
      const aNamePartial = a.displayName.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
      const aScore = Math.max(aEmailExact, aEmailPartial, aNameExact, aNamePartial);

      const bEmailExact = b.email.toLowerCase() === query.toLowerCase() ? 3 : 0;
      const bEmailPartial = b.email.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
      const bNameExact = b.displayName.toLowerCase() === query.toLowerCase() ? 3 : 0;
      const bNamePartial = b.displayName.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
      const bScore = Math.max(bEmailExact, bEmailPartial, bNameExact, bNamePartial);

      return bScore - aScore;
    });
  }

  private rankAudios(audios: any[], query: string): any[] {
    return audios.sort((a, b) => {
      const aExact = a.title.toLowerCase() === query.toLowerCase() ? 3 : 0;
      const aPartial = a.title.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
      const aScore = Math.max(aExact, aPartial);

      const bExact = b.title.toLowerCase() === query.toLowerCase() ? 3 : 0;
      const bPartial = b.title.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
      const bScore = Math.max(bExact, bPartial);

      return bScore - aScore;
    });
  }
}
