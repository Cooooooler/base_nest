import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenBlacklistService } from './token-blacklist.service';

interface TokenPayload {
  sub: string;
  email: string;
  type: string;
  exp?: number;
  jti?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = await queryRunner.manager.save('users', {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
      });

      await queryRunner.commitTransaction();

      const tokens = await this.generateTokens((user as any).id, (user as any).email);
      return {
        user: { id: (user as any).id, email: (user as any).email, name: (user as any).name },
        ...tokens,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      if (await this.tokenBlacklistService.isBlacklisted(refreshToken)) {
        throw new UnauthorizedException('Token has been revoked');
      }

      await this.tokenBlacklistService.addToBlacklist(
        refreshToken,
        new Date((payload.exp ?? 0) * 1000)
      );

      return this.generateTokens(payload.sub, payload.email);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(accessToken: string, refreshToken?: string) {
    const blacklistToken = async (token: string) => {
      try {
        const payload = this.jwtService.decode(token);
        if (payload?.exp) {
          await this.tokenBlacklistService.addToBlacklist(token, new Date(payload.exp * 1000));
        }
      } catch {
        // ignore decode errors for invalid tokens
      }
    };

    await Promise.all([
      blacklistToken(accessToken),
      refreshToken ? blacklistToken(refreshToken) : Promise.resolve(),
    ]);
  }

  private async generateTokens(userId: string, email: string) {
    const secret = this.configService.get<string>('JWT_SECRET') ?? '';
    const accessExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES', '15m') ?? '15m';
    const refreshExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES', '7d') ?? '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, type: 'access' } as any,
        { secret, expiresIn: accessExpires } as any
      ),
      this.jwtService.signAsync(
        { sub: userId, email, type: 'refresh', jti: crypto.randomUUID() } as any,
        { secret, expiresIn: refreshExpires } as any
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
