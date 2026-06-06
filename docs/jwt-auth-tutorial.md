# JWT 认证实现教程（NestJS 新手版）

本文档手把手教你理解本项目中的 JWT 认证是怎么实现的，每一步是干什么的，以及如果你要从零开始自己做一遍应该怎么做。

---

## 目录

1. [什么是 JWT？](#1-什么是-jwt)
2. [整体架构](#2-整体架构)
3. [安装依赖](#3-安装依赖)
4. [环境变量](#4-环境变量)
5. [User 实体添加密码](#5-user-实体添加密码)
6. [Auth 模块总览](#6-auth-模块总览)
7. [DTO：请求数据校验](#7-dto请求数据校验)
8. [Entity：黑名单表](#8-entity黑名单表)
9. [TokenBlacklistService：令牌注销服务](#9-tokenblacklistservice令牌注销服务)
10. [JWT Strategy：如何校验令牌](#10-jwt-strategy如何校验令牌)
11. [JwtAuthGuard：保护路由](#11-jwtauthguard保护路由)
12. [@CurrentUser 装饰器](#12-currentuser-装饰器)
13. [AuthService：核心业务逻辑](#13-authservice核心业务逻辑)
14. [AuthController：路由入口](#14-authcontroller路由入口)
15. [AuthModule：组装一切](#15-authmodule组装一切)
16. [AppModule：注册到根模块](#16-appmodule注册到根模块)
17. [全局 ValidationPipe](#17-全局-validationpipe)
18. [用 curl 测试 API](#18-用-curl-测试-api)
19. [常见问题](#19-常见问题)
20. [课后练习](#20-课后练习)

---

## 1. 什么是 JWT？

**JWT（JSON Web Token）** 是一种令牌格式。当用户登录成功后，服务端生成一个加密的字符串（令牌）返回给客户端。客户端后续每次请求都带上这个令牌，服务端验证令牌即可知道是谁在请求。

JWT 的结构：`xxxxx.yyyyy.zzzzz`
- **header**：算法类型
- **payload**：存放数据（如用户 ID、过期时间）
- **signature**：用密钥对前两部分签名，防止篡改

核心特点：**服务端不存储登录状态**（无状态），令牌本身就包含了用户信息。

---

## 2. 整体架构

```
src/
├── app.module.ts          ← 根模块，导入 AuthModule
├── main.ts                ← 应用入口
├── users/                 ← 用户模块（提供用户数据）
│   ├── user.entity.ts     ← 用户实体（含 password 字段）
│   ├── users.service.ts   ← 查询用户（含 findByEmail）
│   └── users.module.ts    ← 导出 UsersService 给 AuthModule 用
└── auth/                  ← 认证模块（新加的）
    ├── auth.module.ts     ← 模块定义
    ├── auth.controller.ts ← 路由：/auth/register, /auth/login 等
    ├── auth.service.ts    ← 核心逻辑：注册、登录、刷新、注销
    ├── dto/               ← 请求体校验规则
    │   ├── register.dto.ts
    │   └── login.dto.ts
    ├── entities/
    │   └── blacklisted-token.entity.ts  ← 已注销令牌的表
    ├── guards/
    │   └── jwt-auth.guard.ts   ← 路由守卫：没令牌就拒绝
    ├── strategies/
    │   └── jwt.strategy.ts     ← Passport 策略：解析和验证 JWT
    ├── token-blacklist.service.ts  ← 黑名单管理
    └── decorators/
        └── current-user.decorator.ts  ← 拿当前用户信息
```

**数据流向（以登录为例）：**

```
客户端 POST /auth/login { email, password }
  → AuthController.login()
    → AuthService.login()
      → UsersService.findByEmail() 查数据库
      → bcrypt.compare() 比密码
      → JwtService.signAsync() 签发令牌
  ← 返回 { accessToken, refreshToken, user }
```

**数据流向（访问受保护接口）：**

```
客户端 GET /auth/profile
  Header: Authorization: Bearer <token>
  → JwtAuthGuard.canActivate()
    → Passport 调用 JwtStrategy.validate()
      → 解析 token，查用户
  → AuthController.getProfile()
    → @CurrentUser() 拿到用户信息
  ← 返回用户资料
```

---

## 3. 安装依赖

```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
pnpm add -D @types/bcrypt
```

| 包名 | 作用 |
|------|------|
| `@nestjs/jwt` | NestJS 对 JWT 的封装，用于签发和验证令牌 |
| `@nestjs/passport` | NestJS 对 Passport 的封装，连接 NestJS 和 Passport |
| `passport` | Node.js 通用的认证中间件 |
| `passport-jwt` | Passport 的 JWT 策略，从请求头提取 token 并验证 |
| `bcrypt` | 密码哈希，存密码时不存明文，存 hash |
| `class-validator` | 用装饰器校验 DTO 字段 |
| `class-transformer` | 配合 class-validator 做类型转换 |

---

## 4. 环境变量

在 `.env` 文件中添加：

```ini
# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```

| 变量 | 含义 | 说明 |
|------|------|------|
| `JWT_SECRET` | 签名密钥 | 生产环境要用长随机字符串，不能用 dev-secret |
| `JWT_ACCESS_EXPIRES` | 访问令牌有效期 | 15m = 15 分钟 |
| `JWT_REFRESH_EXPIRES` | 刷新令牌有效期 | 7d = 7 天 |

> 为什么要有两个令牌？
> - **Access Token**（短命，15 分钟）：每次请求都带着，泄露了影响有限
> - **Refresh Token**（长命，7 天）：专门用来换新的 Access Token，传输频率低，更安全

---

## 5. User 实体添加密码

**文件：** `src/users/user.entity.ts`

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })       // ← 新加的
  password: string;               // ← 新加的，存的是 bcrypt 哈希，不是明文

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}
```

**同时要在 UsersService 添加一个方法：**

```typescript
// src/users/users.service.ts
async findByEmail(email: string): Promise<User | null> {
  return this.usersRepository.findOneBy({ email });
}
```

登录时需要根据邮箱查出用户，再比对密码。

---

## 6. Auth 模块总览

整个认证功能都放在 `src/auth/` 目录下，遵循 NestJS 的标准模块化结构：

```
auth/
├── auth.module.ts              ← @Module() 定义，组装一切
├── auth.controller.ts          ← @Controller() 路由
├── auth.service.ts             ← @Injectable() 业务逻辑
├── dto/                        ← 请求体数据类型 + 校验规则
├── entities/                   ← 数据库实体
├── guards/                     ← 路由守卫
├── strategies/                 ← Passport 策略
├── token-blacklist.service.ts  ← 黑名单服务
└── decorators/                 ← 自定义装饰器
```

下面逐个文件讲解。

---

## 7. DTO：请求数据校验

DTO（Data Transfer Object）定义了客户端发来的数据长什么样，并自动校验合法性。

### RegisterDto（注册请求）

**文件：** `src/auth/dto/register.dto.ts`

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()                          // 必须是合法的邮箱格式
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(6)                       // 密码最少 6 位
  @MaxLength(50)                      // 密码最长 50 位
  password: string;
}
```

### LoginDto（登录请求）

**文件：** `src/auth/dto/login.dto.ts`

```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

> `class-validator` 配合后文会讲到的全局 `ValidationPipe` 自动生效：
> - 如果客户端没传 `email`，自动返回 400 错误
> - 如果密码不到 6 位，自动返回 400 错误
> - 如果传了 DTO 里没定义的字段（如 `role`），自动剔除（`whitelist: true`）

---

## 8. Entity：黑名单表

**文件：** `src/auth/entities/blacklisted-token.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('blacklisted_tokens')               // 表名
export class BlacklistedToken {
  @PrimaryGeneratedColumn()                 // 自增主键
  id: number;

  @Column({ unique: true, length: 64 })     // token 的 SHA256 哈希，唯一
  tokenHash: string;

  @Column({ type: 'timestamptz' })           // 过期时间（和 token 本身的 exp 一样）
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' }) // 创建时间，自动生成
  createdAt: Date;
}
```

> **为什么存 hash 而不是 token 原文？**
> 万一数据库泄露，攻击者也拿不到有效的 token。
>
> **为什么要有 expiresAt？**
> 方便定期清理已过期的黑名单记录。过期的令牌反正也不能用了，黑名单记录留着也没意义。

---

## 9. TokenBlacklistService：令牌注销服务

**文件：** `src/auth/token-blacklist.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { BlacklistedToken } from './entities/blacklisted-token.entity';

@Injectable()
export class TokenBlacklistService {
  constructor(
    @InjectRepository(BlacklistedToken)
    private readonly blacklistedTokenRepository: Repository<BlacklistedToken>,
  ) {}

  // 把 token 做 SHA256 哈希再存，不存明文
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // 将 token 加入黑名单
  async addToBlacklist(token: string, expiresAt: Date): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.blacklistedTokenRepository
      .createQueryBuilder()
      .insert()
      .into(BlacklistedToken)
      .values({ tokenHash, expiresAt })
      .orIgnore()           // 如果已经存在就不重复插入
      .execute();
  }

  // 检查 token 是否在黑名单中
  async isBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const count = await this.blacklistedTokenRepository.count({
      where: { tokenHash },
    });
    return count > 0;
  }

  // 清理已过期的黑名单记录（可以放定时任务里跑）
  async removeExpired(): Promise<void> {
    await this.blacklistedTokenRepository.delete({
      expiresAt: LessThanOrEqual(new Date()),  // 过期时间 <= 当前时间
    });
  }
}
```

**这段代码的三个核心能力：**
1. `addToBlacklist` — 注销时调用，让 token 失效
2. `isBlacklisted` — 每次请求时检查，被注销的 token 拒绝访问
3. `removeExpired` — 清理过期数据，节省数据库空间

---

## 10. JWT Strategy：如何校验令牌

**文件：** `src/auth/strategies/jwt.strategy.ts`

这里是 Passport 的 JWT 策略，告诉 NestJS：收到带 `Authorization: Bearer xxx` 的请求时，怎么解析这个 token。

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: string;    // 用户 ID（JWT 标准字段：subject）
  email: string;
  type: string;   // 'access' 或 'refresh'
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // 从 Authorization: Bearer <token> 提取 token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 不忽略过期时间——过期令牌直接拒绝
      ignoreExpiration: false,
      // 用环境变量中的密钥验证签名
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // Passport 验证成功后会自动调用这个方法
  async validate(payload: JwtPayload) {
    // 只有 type 为 'access' 的令牌才能访问受保护接口
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // 查数据库确认用户还存在（未被删除）
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 返回的 user 会被挂到 request.user 上
    return user;
  }
}
```

**执行流程：**
1. 请求到达 → `JwtAuthGuard`（下一节讲）
2. Guard 触发 Passport → `JwtStrategy` 被调用
3. `super()` 配置了解析方式：从 Header 取 token + 用 JWT_SECRET 验证签名
4. 如果签名验证通过 → 调用 `validate()` 方法
5. `validate()` 中检查 token 类型、查用户是否存在
6. 一切 OK → return user → Passport 把 user 挂到 `request.user` 上

---

## 11. JwtAuthGuard：保护路由

**文件：** `src/auth/guards/jwt-auth.guard.ts`

Guard（守卫）是 NestJS 的概念，决定一个请求能不能到达 Controller。这里的作用是：**没有有效 JWT 令牌的请求全部拒绝**。

```typescript
import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenBlacklistService } from '../token-blacklist.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly tokenBlacklistService: TokenBlacklistService) {
    super();
  }

  // canActivate 是 Guard 的核心方法，返回 true 才放行
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 先让父类（AuthGuard）用 JWT Strategy 验证签名
    const baseResult = (await super.canActivate(context)) as boolean;
    if (!baseResult) return false;

    // 签名验证通过后，再查黑名单
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>();
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      // 如果 token 在黑名单中（已注销），拒绝
      if (await this.tokenBlacklistService.isBlacklisted(token)) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return true;
  }
}
```

**两层校验：**
1. **Passport 层** — token 签名是否正确？有没有过期？用户是否存在？
2. **黑名单层** — token 有没有被注销？

用法：在 Controller 的路由上加上 `@UseGuards(JwtAuthGuard)` 即可保护。

---

## 12. @CurrentUser 装饰器

**文件：** `src/auth/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: unknown }>();
    return request.user;
  },
);
```

JWT Strategy 验证通过后，会把用户对象挂到 `request.user`。这个装饰器让你在 Controller 中方便地拿到当前用户：

```typescript
// 不写装饰器：this.request.user
// 写了之后：
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

---

## 13. AuthService：核心业务逻辑

**文件：** `src/auth/auth.service.ts`

这是认证功能的核心，包含注册、登录、刷新、注销四个主要方法。

### register（注册）

```typescript
async register(dto: RegisterDto) {
  // 1. 先查邮箱是否已被注册
  const existing = await this.usersService.findByEmail(dto.email);
  if (existing) {
    throw new ConflictException('Email already registered');
  }

  // 2. 用 bcrypt 哈希密码（加盐 10 轮）
  const hashedPassword = await bcrypt.hash(dto.password, 10);

  // 3. 创建用户（存哈希，不存明文）
  const user = await this.usersService.create({
    email: dto.email,
    name: dto.name,
    password: hashedPassword,
  });

  // 4. 生成令牌
  const tokens = await this.generateTokens(user.id, user.email);

  // 5. 返回用户信息和令牌
  return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
}
```

> 为什么用 `bcrypt.hash(password, 10)`？
> - 10 是 salt rounds（加盐轮数），越高越安全但也越慢
> - 10 是一个好的平衡点，大约需要 100ms，攻击者暴力破解成本大幅增加

### login（登录）

```typescript
async login(dto: LoginDto) {
  // 1. 根据邮箱查用户
  const user = await this.usersService.findByEmail(dto.email);
  if (!user) {
    throw new UnauthorizedException('Invalid email or password');
  }

  // 2. 比密码（bcrypt.compare 会自动提取盐并验证）
  const isPasswordValid = await bcrypt.compare(dto.password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid email or password');
  }

  // 3. 生成令牌并返回
  const tokens = await this.generateTokens(user.id, user.email);
  return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
}
```

> **注意**：错误消息故意写成 "Invalid email or password" 而不是分别说"邮箱不存在"和"密码错误"，防止攻击者试探哪些邮箱已注册。

### refresh（刷新令牌）

```typescript
async refresh(refreshToken: string) {
  try {
    // 1. 验证 refreshToken 的签名和有效期
    const payload = this.jwtService.verify<TokenPayload>(refreshToken, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    // 2. 必须是 refresh 类型
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // 3. 检查是否已被注销
    if (await this.tokenBlacklistService.isBlacklisted(refreshToken)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // 4. 把旧的 refreshToken 加入黑名单（令牌轮换）
    await this.tokenBlacklistService.addToBlacklist(
      refreshToken,
      new Date((payload.exp ?? 0) * 1000),
    );

    // 5. 生成并返回新的令牌对
    return this.generateTokens(payload.sub, payload.email);
  } catch (err) {
    if (err instanceof UnauthorizedException) throw err;
    throw new UnauthorizedException('Invalid or expired refresh token');
  }
}
```

> **令牌轮换（Token Rotation）**：每次用 refresh token 换新令牌时，旧的 refresh token 立即失效。这样如果客户端的 refresh token 泄露了，攻击者只能用一次。

### logout（注销）

```typescript
async logout(accessToken: string, refreshToken?: string) {
  const blacklistToken = async (token: string) => {
    try {
      // 用 decode（不验证签名）获取过期时间
      const payload = this.jwtService.decode(token) as TokenPayload | null;
      if (payload?.exp) {
        // 加入黑名单，直到 token 原本的过期时间
        await this.tokenBlacklistService.addToBlacklist(
          token,
          new Date(payload.exp * 1000),
        );
      }
    } catch {
      // 如果 token 格式不对，忽略
    }
  };

  // 同时拉黑 access token 和 refresh token
  await Promise.all([
    blacklistToken(accessToken),
    refreshToken ? blacklistToken(refreshToken) : Promise.resolve(),
  ]);
}
```

### generateTokens（生成令牌对）

```typescript
private async generateTokens(userId: string, email: string) {
  const secret = this.configService.get<string>('JWT_SECRET') ?? '';
  const accessExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES', '15m') ?? '15m';
  const refreshExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES', '7d') ?? '7d';

  const [accessToken, refreshToken] = await Promise.all([
    this.jwtService.signAsync(
      { sub: userId, email, type: 'access' } as any,
      { secret, expiresIn: accessExpires } as any,
    ),
    this.jwtService.signAsync(
      { sub: userId, email, type: 'refresh', jti: crypto.randomUUID() } as any,
      { secret, expiresIn: refreshExpires } as any,
    ),
  ]);

  return { accessToken, refreshToken };
}
```

**两个令牌的 payload 区别：**

| 字段 | Access Token | Refresh Token |
|------|-------------|---------------|
| `sub` | 用户 ID | 用户 ID |
| `email` | 用户邮箱 | 用户邮箱 |
| `type` | `'access'` | `'refresh'` |
| `jti` | 无 | UUID（令牌唯一 ID） |
| 有效期 | 15 分钟 | 7 天 |

> `jti`（JWT ID）是每个 refresh token 的唯一标识，用于令牌轮换时精确标识要拉黑的是哪个 token。

---

## 14. AuthController：路由入口

**文件：** `src/auth/auth.controller.ts`

```typescript
import {
  Controller, Post, Get, Body, Headers,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('auth')          // 所有路由以 /auth 开头
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)   // 默认 POST 返回 201，改成 200
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
  @UseGuards(JwtAuthGuard)   // ← 需要登录才能注销
  async logout(
    @Headers('authorization') auth: string,
    @Body('refreshToken') refreshToken?: string,
  ) {
    const accessToken = auth?.split(' ')[1];
    return this.authService.logout(accessToken, refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)   // ← 需要登录才能查看
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
```

**完整 API 列表：**

| 方法 | 路径 | 需登录 | 说明 |
|------|------|--------|------|
| POST | `/auth/register` | 否 | 注册 |
| POST | `/auth/login` | 否 | 登录 |
| POST | `/auth/refresh` | 否 | 刷新令牌 |
| POST | `/auth/logout` | 是 | 注销 |
| GET | `/auth/profile` | 是 | 获取当前用户信息 |

---

## 15. AuthModule：组装一切

**文件：** `src/auth/auth.module.ts`

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
    UsersModule,                                    // 要用 UsersService 查用户
    PassportModule.register({ defaultStrategy: 'jwt' }),  // 默认策略设成 JWT
    JwtModule.register({}),                          // JWT 模块
    TypeOrmModule.forFeature([BlacklistedToken]),    // 注册黑名单实体
    ConfigModule,                                    // 读环境变量
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TokenBlacklistService],
  exports: [AuthService],
})
export class AuthModule {}
```

**每个 import 的作用：**

| 导入 | 为什么需要 |
|------|-----------|
| `UsersModule` | AuthService 要用 UsersService 查用户 |
| `PassportModule` | 让 Passport 知道默认认证策略是 JWT |
| `JwtModule` | 提供 JwtService，用来 signAsync / verify |
| `TypeOrmModule.forFeature` | 让 BlacklistedToken 实体可以被注入 |
| `ConfigModule` | JwtStrategy 在 constructor 中注入 ConfigService 读 JWT_SECRET |

---

## 16. AppModule：注册到根模块

**文件：** `src/app.module.ts`（关键部分）

```typescript
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
// ... 其他导入
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // ... 其他模块（ConfigModule, TypeOrmModule, UsersModule）
    AuthModule,            // ← 把 AuthModule 加进来
  ],
  providers: [
    AppService,
    {
      provide: APP_PIPE,   // ← 全局 ValidationPipe
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,               // 剔除 DTO 未定义的字段
          forbidNonWhitelisted: true,     // 传了未定义字段就报错
          transform: true,                // 自动类型转换
        }),
    },
  ],
})
export class AppModule {}
```

---

## 17. 全局 ValidationPipe

在 `AppModule` 中注册了全局的 `ValidationPipe`，这意味着**所有 Controller 的参数校验自动生效**。

**三个选项的含义：**

| 选项 | 效果 |
|------|------|
| `whitelist: true` | 自动删除 DTO 未定义的字段。例如 DTO 只有 `email` 和 `password`，客户端多传了 `role`，`role` 会被静默删除 |
| `forbidNonWhitelisted: true` | 在 whitelist 基础上，传了未定义字段直接报 400 错误，而不是静默删除 |
| `transform: true` | 自动类型转换。例如 `@Param('id', ParseUUIDPipe)` 会把字符串转成正确的类型 |

---

## 18. 用 curl 测试 API

确保 PostgreSQL 已运行，执行完迁移后启动服务：

```bash
pnpm run migration:run
pnpm run start:dev
```

### 注册

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","name":"Alice","password":"123456"}'
```

返回示例：
```json
{
  "code": 1,
  "data": {
    "user": { "id": "uuid...", "email": "alice@example.com", "name": "Alice" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  },
  "msg": "ok"
}
```

### 登录

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"123456"}'
```

返回同注册，包含 `accessToken` 和 `refreshToken`。

### 查看个人信息（需替换 token）

```bash
curl http://localhost:3000/auth/profile \
  -H "Authorization: Bearer <你的accessToken>"
```

返回：
```json
{
  "id": "uuid...",
  "email": "alice@example.com",
  "name": "Alice",
  "createdAt": "2026-06-07T..."
}
```

### 刷新令牌

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<你的refreshToken>"}'
```

返回新的 `accessToken` 和 `refreshToken`。

### 注销

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <你的accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<你的refreshToken>"}'
```

注销后，再用同样的 access token 访问 `/auth/profile` 会返回 401。

---

## 19. 常见问题

### Q：为什么 access token 有效期这么短？
安全性。如果 access token 泄露了，攻击者最多用 15 分钟。配合 refresh token 轮换，可以进一步限制损失。

### Q：注销为什么要服务端记黑名单？JWT 不是无状态的吗？
JWT 本身是无状态的，但"注销"这个需求天然需要状态——你要让已经发出的 token 失效。纯客户端删除 token 做不到真正的注销。黑名单方案在安全性和简单性之间做了平衡。

### Q：黑名单不是要查数据库吗，每次请求都查会不会慢？
黑名单查询是主键/唯一键查询，毫秒级。而且只有被注销过的令牌才会在表里，正常情况下表是很小的。定期清理过期记录让表保持精简。

### Q：为什么密码错误消息不明确说是"密码错误"？
防止攻击者通过错误消息枚举已注册的邮箱。统一说"邮箱或密码错误"让攻击者无法区分是邮箱不存在还是密码不对。

### Q：refresh token 为什么要轮换？
如果 refresh token 泄露了，没有轮换的话攻击者可以反复使用。轮换后，每次刷新都让旧 refresh token 失效，攻击者只能使用一次。

### Q：generateTokens 里的 `as any` 是什么？
`@nestjs/jwt` 的类型定义和我们的用法有细微差别（`expiresIn` 的类型不兼容），用 `as any` 绕过类型检查。不影响运行。

### Q：为什么 User 实体里的 password 加 `@Exclude()`？
`@Exclude()` 是 `class-transformer` 的装饰器，配合 `ClassSerializerInterceptor` 拦截器（在 `main.ts` 中全局注册），自动排除响应中的 password 字段。即使开发者在 Controller 中直接 return User 实体，密码也不会出现在 API 响应中。

### Q：register 方法为什么要用事务？
保证"查邮箱 → 写入用户"这两个操作的原子性。如果不用事务，在高并发下可能出现两个请求同时通过邮箱检查，都执行插入，导致数据不一致。

### Q：全局 HttpExceptionFilter 有什么用？
如果没有 filter，未捕获的异常可能返回默认的 HTML 错误页面或不一致的 JSON 格式。`HttpExceptionFilter` 保证所有错误都返回统一的 JSON 格式：`{ code: 0, data: null, msg: "错误信息" }`，同时自动记录 500 错误到日志。

---

## 课后练习

理解了上面的内容后，可以尝试自己动手：

1. **增加密码强度校验** — 在 RegisterDto 中添加更多校验（大写字母、数字、特殊字符）
2. **增加角色系统** — 给 User 实体添加 `role` 字段，创建角色守卫
3. **实现自动清理过期黑名单** — 用 NestJS `@Cron()` 定时器每天清理一次
4. **添加找回密码功能** — 用邮件发送重置链接
