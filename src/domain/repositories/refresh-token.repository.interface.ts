export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
}

export interface IRefreshTokenRepository {
  create(token: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | null>;
  revokeToken(token: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
}