import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'node:crypto';
import { LessThanOrEqual, Repository } from 'typeorm';
import { BlacklistedToken } from './entities/blacklisted-token.entity';

@Injectable()
export class TokenBlacklistService {
  constructor(
    @InjectRepository(BlacklistedToken)
    private readonly blacklistedTokenRepository: Repository<BlacklistedToken>
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async addToBlacklist(token: string, expiresAt: Date): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.blacklistedTokenRepository
      .createQueryBuilder()
      .insert()
      .into(BlacklistedToken)
      .values({ tokenHash, expiresAt })
      .orIgnore()
      .execute();
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const count = await this.blacklistedTokenRepository.count({
      where: { tokenHash },
    });
    return count > 0;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeExpired(): Promise<void> {
    await this.blacklistedTokenRepository.delete({
      expiresAt: LessThanOrEqual(new Date()),
    });
  }
}
