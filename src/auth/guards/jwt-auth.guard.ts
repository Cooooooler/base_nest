import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenBlacklistService } from '../token-blacklist.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly tokenBlacklistService: TokenBlacklistService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const baseResult = (await super.canActivate(context)) as boolean;
    if (!baseResult) return false;

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>();
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (await this.tokenBlacklistService.isBlacklisted(token)) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return true;
  }
}
