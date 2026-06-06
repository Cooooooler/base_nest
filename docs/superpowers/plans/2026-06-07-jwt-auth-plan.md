# JWT Authentication 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现完整的 JWT 认证系统，支持注册、登录、令牌刷新、服务端注销

**架构：** 新增 `AuthModule` 处理认证流程，使用 Passport + JWT Strategy 保护路由，bcrypt 加密密码，数据库表记录已注销令牌实现服务端黑名单

**技术栈：** NestJS 11, TypeORM 1.0, PostgreSQL, Passport, JWT, bcrypt

**设计文档：** `docs/superpowers/specs/2026-06-07-jwt-auth-design.md`

---

### 任务 1：安装依赖和环境变量

**文件：**

- 修改：`package.json`
- 修改：`.env`
- 修改：`.env.example`

- [ ] **步骤 1：安装依赖包**

```bash
cd F:\project\nest\base_nest
pnpm add bcrypt @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add -D @types/bcrypt
```

- [ ] **步骤 2：更新 `.env` 添加 JWT 相关变量**

在 `.env` 末尾追加：

```
# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```

- [ ] **步骤 3：更新 `.env.example` 同步**

末尾追加相同内容（密码留空让开发者自行填写）。

- [ ] **步骤 4：Commit**

```bash
git add package.json pnpm-lock.yaml .env .env.example
git commit -m "chore: add JWT and bcrypt dependencies"
```

---

### 任务 2：User 实体增加 password 字段 + findByEmail

**文件：**

- 修改：`src/users/user.entity.ts`
- 修改：`src/users/users.service.ts`
- 修改：`src/users/users.module.ts`

- [ ] **步骤 1：User 实体增加 password 列**

```typescript
// user.entity.ts 在 name 后追加
@Column({ length: 255 })
password: string;
```

- [ ] **步骤 2：UsersService 增加 findByEmail()**

```typescript
// 追加方法
async findByEmail(email: string): Promise<User | null> {
  return this.usersRepository.findOneBy({ email });
}
```

- [ ] **步骤 3：UsersModule 导出 UsersService**

```typescript
// exports 数组已有 UsersService
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

只需确认 exports 已有即可。

- [ ] **步骤 4：更新 users.service.spec.ts 添加 findByEmail 测试**

```typescript
// describe 块内追加
describe('findByEmail', () => {
  it('should return a user by email', async () => {
    const result = await service.findByEmail(mockUser.email);
    expect(result).toEqual(mockUser);
    expect(mockFindOneBy).toHaveBeenCalledWith({ email: mockUser.email });
  });
});
```

- [ ] **步骤 5：Commit**

```bash
git add src/users/
git commit -m "feat: add password field to User and findByEmail method"
```

---

### 任务 3：创建 BlacklistedToken Entity

**文件：**

- 创建：`src/auth/entities/blacklisted-token.entity.ts`

- [ ] **步骤 1：创建实体**

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('blacklisted_tokens')
export class BlacklistedToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 64 })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
```

- [ ] **步骤 2：更新数据源配置让该实体可被发现**

无需额外操作，`autoLoadEntities: true` + 在 AuthModule 中用 `TypeOrmModule.forFeature([BlacklistedToken])` 注册即可。

- [ ] **步骤 3：Commit**

```bash
git add src/auth/entities/blacklisted-token.entity.ts
git commit -m "feat: add BlacklistedToken entity for JWT revocation"
```

---

### 任务 4：创建 Auth DTOs

**文件：**

- 创建：`src/auth/dto/register.dto.ts`
- 创建：`src/auth/dto/login.dto.ts`

- [ ] **步骤 1：创建 RegisterDto**

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}
```

- [ ] **步骤 2：创建 LoginDto**

```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

- [ ] **步骤 3：安装 class-validator 和 class-transformer**

```bash
pnpm add class-validator class-transformer
```

- [ ] **步骤 4：Commit**

```bash
git add src/auth/dto/ pnpm-lock.yaml package.json
git commit -m "feat: add auth DTOs with class-validator"
```

---

### 任务 5：创建 Auth Guards + Decorators

**文件：**

- 创建：`src/auth/guards/jwt-auth.guard.ts`
- 创建：`src/auth/decorators/current-user.decorator.ts`

- [ ] **步骤 1：创建 JwtAuthGuard**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenBlacklistService } from '../token-blacklist.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly tokenBlacklistService: TokenBlacklistService) {
    super();
  }

  handleRequest(err: any, user: any, info: any, context: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (this.tokenBlacklistService.isBlacklisted(token)) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return user;
  }
}
```

- [ ] **步骤 2：创建 @CurrentUser() 装饰器**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
```

- [ ] **步骤 3：Commit**

```bash
git add src/auth/guards/ src/auth/decorators/
git commit -m "feat: add JwtAuthGuard and CurrentUser decorator"
```

---

### 任务 6：创建 JWT Strategy + TokenBlacklistService

**文件：**

- 创建：`src/auth/strategies/jwt.strategy.ts`
- 创建：`src/auth/token-blacklist.service.ts`

- [ ] **步骤 1：创建 JWT Strategy**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
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

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
```

- [ ] **步骤 2：创建 TokenBlacklistService**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as crypto from 'crypto';
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
      where: { tokenHash, expiresAt: MoreThan(new Date()) },
    });
    return count > 0;
  }

  async removeExpired(): Promise<void> {
    await this.blacklistedTokenRepository.delete({
      expiresAt: MoreThan(new Date()),
    });
  }
}
```

- [ ] **步骤 3：Commit**

```bash
git add src/auth/strategies/ src/auth/token-blacklist.service.ts
git commit -m "feat: add JWT strategy and token blacklist service"
```

---

### 任务 7：创建 AuthService

**文件：**

- 创建：`src/auth/auth.service.ts`

- [ ] **步骤 1：编写 AuthService**

```typescript
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { TokenBlacklistService } from './token-blacklist.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
    });

    const tokens = await this.generateTokens(user.id, user.email);
    return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      if (await this.tokenBlacklistService.isBlacklisted(refreshToken)) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Blacklist the used refresh token (rotation)
      await this.tokenBlacklistService.addToBlacklist(refreshToken, new Date(payload.exp * 1000));

      return this.generateTokens(payload.sub, payload.email);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(accessToken: string, refreshToken?: string) {
    try {
      const accessPayload = this.jwtService.decode(accessToken) as any;
      if (accessPayload?.exp) {
        await this.tokenBlacklistService.addToBlacklist(
          accessToken,
          new Date(accessPayload.exp * 1000)
        );
      }
    } catch {
      // Ignore decode errors
    }

    if (refreshToken) {
      try {
        const refreshPayload = this.jwtService.decode(refreshToken) as any;
        if (refreshPayload?.exp) {
          await this.tokenBlacklistService.addToBlacklist(
            refreshToken,
            new Date(refreshPayload.exp * 1000)
          );
        }
      } catch {
        // Ignore decode errors
      }
    }
  }

  private async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, type: 'access' },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES', '15m'),
        }
      ),
      this.jwtService.signAsync(
        { sub: userId, email, type: 'refresh', jti: uuidv4() },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES', '7d'),
        }
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
```

注意：需要在 `package.json` 中添加 `uuid` 包，或使用 crypto.randomUUID() 替代 v4。

改为使用 `crypto.randomUUID()` 避免额外安装 uuid 包：

```typescript
// 移除 import { v4 as uuidv4 } from 'uuid';
// generateTokens 中使用:
jti: crypto.randomUUID(),
```

- [ ] **步骤 2：用 `crypto.randomUUID()` 替代 uuid 导入**

确认第 8 行的 uuid 导入已被移除，在 `generateTokens` 中使用 `crypto.randomUUID()`。

- [ ] **步骤 3：提交**

```bash
git add src/auth/auth.service.ts
git commit -m "feat: add AuthService with register, login, refresh, logout"
```

---

### 任务 8：创建 AuthController

**文件：**

- 创建：`src/auth/auth.controller.ts`
- 创建：`src/auth/auth.controller.spec.ts`

- [ ] **步骤 1：创建 AuthController**

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Headers('authorization') auth: string,
    @Body('refreshToken') refreshToken?: string
  ) {
    const accessToken = auth?.split(' ')[1];
    return this.authService.logout(accessToken, refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: User) {
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
  }
}
```

- [ ] **步骤 2：创建 AuthController 单元测试**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const dto = { email: 'test@test.com', name: 'Test', password: '123456' };
      await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      const dto = { email: 'test@test.com', password: '123456' };
      await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh', async () => {
      await controller.refresh('some-refresh-token');
      expect(authService.refresh).toHaveBeenCalledWith('some-refresh-token');
    });
  });

  describe('logout', () => {
    it('should call authService.logout', async () => {
      await controller.logout('Bearer access-token', 'refresh-token');
      expect(authService.logout).toHaveBeenCalledWith('access-token', 'refresh-token');
    });
  });
});
```

- [ ] **步骤 3：Commit**

```bash
git add src/auth/auth.controller.ts src/auth/auth.controller.spec.ts
git commit -m "feat: add AuthController with register/login/refresh/logout/profile"
```

---

### 任务 9：创建 AuthModule + 更新 AppModule

**文件：**

- 创建：`src/auth/auth.module.ts`
- 修改：`src/app.module.ts`

- [ ] **步骤 1：创建 AuthModule**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenBlacklistService } from './token-blacklist.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    TypeOrmModule.forFeature([BlacklistedToken]),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TokenBlacklistService],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **步骤 2：更新 AppModule**

在 imports 数组中追加 `AuthModule`：

```typescript
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
// ... 现有导入
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // ... 现有 imports
    AuthModule,
  ],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
    },
  ],
})
export class AppModule {}
```

注意：APP_PIPE 是全局 ValidationPipe，确保 class-validator DTOs 生效。

- [ ] **步骤 3：Commit**

```bash
git add src/auth/auth.module.ts src/app.module.ts
git commit -m "feat: add AuthModule and register global ValidationPipe"
```

---

### 任务 10：验证

- [ ] **步骤 1：编译检查**

```bash
pnpm run build
```

预期：编译成功，无错误。

- [ ] **步骤 2：运行测试**

```bash
pnpm run test
```

预期：所有测试通过（AppController + UsersService + AuthController）。

- [ ] **步骤 3：Lint**

```bash
pnpm run lint
```

预期：ESLint 零错误零警告。

- [ ] **步骤 4：最终 Commit（如有修复）**

```bash
git add -A
git commit -m "chore: fix lint and test issues after auth integration"
```
