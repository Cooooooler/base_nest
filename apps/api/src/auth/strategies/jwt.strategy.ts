import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { VerifyCallback } from 'passport-jwt';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: string;
  email: string;
  type: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload, done: VerifyCallback) {
    if (payload.type !== 'access') {
      done(new UnauthorizedException('Invalid token type'), false);
      return;
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      done(new UnauthorizedException('User not found'), false);
      return;
    }
    done(null, user);
  }
}
