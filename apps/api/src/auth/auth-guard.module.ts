import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TokenBlacklistService } from './token-blacklist.service';

/**
 * Provides JwtAuthGuard and TokenBlacklistService to any module that needs
 * guarded endpoints.  Has zero external dependencies — no circular import risk.
 */
@Module({
  imports: [TypeOrmModule.forFeature([BlacklistedToken])],
  providers: [TokenBlacklistService, JwtAuthGuard],
  exports: [JwtAuthGuard, TokenBlacklistService],
})
export class AuthGuardModule {}
