# Scalar API 接口文档教程（NestJS 新手版）

本文档教你如何在本 NestJS 项目中集成 Scalar，自动生成漂亮的 API 接口文档。

---

## 目录

1. [什么是 Scalar？](#1-什么是-scalar)
2. [整体流程](#2-整体流程)
3. [安装依赖](#3-安装依赖)
4. [main.ts 中配置文档](#4-maints-中配置文档)
5. [@ApiTags：给接口分组](#5-apitags给接口分组)
6. [@ApiOperation：描述接口](#6-apioperation描述接口)
7. [@ApiProperty：描述字段](#7-apiproperty描述字段)
8. [@ApiBearerAuth：标记需登录的接口](#8-apibearerauth标记需登录的接口)
9. [@ApiBody：自定义请求体描述](#9-apibody自定义请求体描述)
10. [访问文档](#10-访问文档)
11. [在文档中测试接口](#11-在文档中测试接口)
12. [Scalar 主题](#12-scalar-主题)
13. [完整文件清单](#13-完整文件清单)
14. [常见问题](#14-常见问题)

---

## 1. 什么是 Scalar？

**Scalar** 是一个开源的 API 文档工具，和 Swagger UI 类似，但更好看、功能更丰富。它读取 OpenAPI 规范（JSON 格式），渲染成交互式文档页面。

Scalar vs Swagger UI：

| 对比 | Swagger UI | Scalar |
|------|-----------|--------|
| 界面风格 | 传统 | 现代化 |
| 内置 API 客户端 | 有（较简陋） | 有（更完善） |
| 主题 | 有限 | 10+ 种主题 |
| 安装 | @nestjs/swagger 自带 | 额外安装 @scalar/nestjs-api-reference |
| 使用方式 | 中间件挂载 | 中间件挂载 |

本项目的做法是：**用 `@nestjs/swagger` 生成 OpenAPI JSON，用 `@scalar/nestjs-api-reference` 渲染为 Scalar 界面**。

---

## 2. 整体流程

```
Controller/DTO 上的装饰器
        │
        ▼
@nestjs/swagger 扫描装饰器
        │
        ▼
生成 OpenAPI 规范（JavaScript 对象）
        │
        ▼
@scalar/nestjs-api-reference 接收规范
        │
        ▼
渲染为交互式文档页面 → http://localhost:3000/docs
```

**整个过程不需要手写 OpenAPI YAML/JSON，只需要在代码上加装饰器。**

涉及的装饰器：

| 装饰器 | 加在哪里 | 作用 |
|--------|---------|------|
| `@ApiTags('Auth')` | Controller 类 | 给接口分组 |
| `@ApiOperation({ summary, description })` | 路由方法 | 描述每个接口 |
| `@ApiProperty({ example, description })` | DTO/Entity 字段 | 描述请求/响应字段 |
| `@ApiBearerAuth()` | 路由方法 | 标记该接口需要 JWT 认证 |
| `@ApiBody({ schema })` | 路由方法 | 描述自定义请求体 |

---

## 3. 安装依赖

```bash
pnpm add @nestjs/swagger @scalar/nestjs-api-reference
```

| 包名 | 作用 |
|------|------|
| `@nestjs/swagger` | NestJS 官方 Swagger 集成，提供所有装饰器和 `SwaggerModule.createDocument()` |
| `@scalar/nestjs-api-reference` | Scalar 官方 NestJS 集成，`apiReference()` 函数接收 OpenAPI 规范并渲染 |

---

## 4. 封装到独立函数

为了保持 `main.ts` 简洁，文档配置被封装到了 `src/common/docs/setup.ts` 中：

**应用入口：** `src/main.ts`

```typescript
// main.ts 中只需一行调用
setupApiDocs(app);
```

**文档配置：** `src/common/docs/setup.ts`

```typescript
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

export function setupApiDocs(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Base Nest API')
    .setDescription('NestJS 11 项目接口文档')
    .setVersion('0.0.2')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.use(
    '/docs',
    apiReference({
      spec: { content: document },
      theme: 'purple',
    }),
  );
}
```

**三步详解：**

| 步骤 | 代码 | 做了什么 |
|------|------|---------|
| 1 | `new DocumentBuilder()...build()` | 创建 OpenAPI 基本信息（标题、版本、认证方式） |
| 2 | `SwaggerModule.createDocument(app, config)` | NestJS 遍历所有 Controller，读取装饰器，生成完整的 OpenAPI JSON |
| 3 | `app.use('/docs', apiReference({...}))` | 把 Scalar 页面挂载到 `/docs` 路径 |

> `apiReference()` 是 `@scalar/nestjs-api-reference` 提供的函数。它的 `spec.content` 接收 OpenAPI 规范对象（由 `SwaggerModule.createDocument` 生成）。

---

## 5. @ApiTags：给接口分组

**作用：** 把接口按功能分组显示，类似文件夹。

**示例：**

```typescript
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')        // ← 这个 Controller 里的所有接口归到 "Auth" 组
@Controller('auth')
export class AuthController { ... }

@ApiTags('Users')       // ← 这些接口归到 "Users" 组
@Controller('users')
export class UsersController { ... }
```

Scalar 界面上，接口会按 `Auth` 和 `Users` 两个分组显示。

**加在哪里：** Controller 类上面（不是方法上）。

---

## 6. @ApiOperation：描述接口

**作用：** 给每个接口写说明。

```typescript
import { ApiOperation } from '@nestjs/swagger';

@Post('register')
@ApiOperation({
  summary: '用户注册',              // 标题
  description: '使用邮箱、用户名和密码注册新用户',  // 详细说明
})
async register(@Body() dto: RegisterDto) { ... }

@Post('login')
@HttpCode(HttpStatus.OK)
@ApiOperation({
  summary: '用户登录',
  description: '使用邮箱和密码登录，返回 accessToken 和 refreshToken',
})
async login(@Body() dto: LoginDto) { ... }

@Get('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({
  summary: '获取当前用户信息',
  description: '返回已登录用户的个人信息',
})
getProfile(@CurrentUser() user: User) { ... }
```

**加在哪里：** 路由方法上。

---

## 7. @ApiProperty：描述字段

**作用：** 告诉文档每个字段长什么样，显示在请求体/响应体的示例中。

**加在 DTO 上（请求体）：**

```typescript
// src/auth/dto/register.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'alice@example.com', description: '用户邮箱' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Alice', description: '用户名', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '123456', description: '密码（最少 6 位）', minLength: 6, maxLength: 50 })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}
```

**加在 DTO 上（登录请求）：**

```typescript
// src/auth/dto/login.dto.ts
export class LoginDto {
  @ApiProperty({ example: 'alice@example.com', description: '用户邮箱' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '用户密码' })
  @IsString()
  password: string;
}
```

**加在 Entity 上（响应体）：**

```typescript
// src/users/user.entity.ts
import { ApiProperty } from '@nestjs/swagger';

@Entity('users')
export class User {
  @ApiProperty({ format: 'uuid', description: '用户唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'alice@example.com', description: '用户邮箱' })
  @Column({ unique: true, length: 255 })
  email: string;

  @ApiProperty({ example: 'Alice', description: '用户名' })
  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })          // ← password 不加 @ApiProperty
  password: string;                   //   避免在文档中暴露密码字段

  @ApiProperty({ example: true, description: '是否激活' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ type: 'string', format: 'date-time', description: '创建时间' })
  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}
```

> **注意：** password 字段没有加 `@ApiProperty()`，这样密码不会出现在文档的响应示例中，避免敏感信息泄露。

**@ApiProperty 常用参数：**

| 参数 | 类型 | 作用 |
|------|------|------|
| `example` | any | 示例值 |
| `description` | string | 字段说明 |
| `required` | boolean | 是否必填（默认 true） |
| `default` | any | 默认值 |
| `minLength` | number | 最小长度 |
| `maxLength` | number | 最大长度 |
| `format` | string | 格式（如 `uuid`、`date-time`） |

如果不加 `@ApiProperty`，Swagger 也能从 TypeScript 类型推断一些基本信息，但加了之后文档更完整（有示例值、说明）。

---

## 8. @ApiBearerAuth：标记需登录的接口

**作用：** 在文档中标明这个接口需要 JWT 认证，Scalar 页面上会显示"锁"图标和一个"Authorize"按钮。

```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()              // ← 标记接口需要 Bearer Token
getProfile(@CurrentUser() user: User) { ... }

@Post('logout')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
async logout(...) { ... }
```

**前提：** 在 `main.ts` 的 `DocumentBuilder` 中调用过 `.addBearerAuth()`。

Scalar 页面上的操作流程：

```
1. 用户打开 /docs
2. 点击 "Authorize" 按钮
3. 输入 JWT token（登录后获取）
4. 点击带🔒图标的接口
5. Scalar 自动在请求头加上 Authorization: Bearer <token>
```

---

## 9. @ApiBody：自定义请求体描述

**作用：** 对于没有 DTO 的路由参数（如 `@Body('refreshToken')`），手动描述请求体。

```typescript
@Post('refresh')
@ApiOperation({ summary: '刷新令牌', description: '用 refreshToken 换取新的令牌对' })
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      refreshToken: { type: 'string' },
    },
  },
})
async refresh(@Body('refreshToken') refreshToken: string) { ... }
```

这里 `refreshToken` 不是一个 DTO 类，而是一个字符串，所以需要 `@ApiBody()` 告诉 Swagger 请求体的格式。

---

## 10. 访问文档

启动应用后：

```bash
pnpm run start:dev
```

打开浏览器访问：**http://localhost:3000/docs**

你会看到：

- 紫色的 Scalar 文档页面
- 左侧分栏：`Auth` 和 `Users` 两组
- 每个接口有：HTTP 方法、路径、标题
- 点击展开可看到：请求参数、响应示例、状态码

---

## 11. 在文档中测试接口

Scalar 页面内置了 API 客户端，可以直接在文档中发送请求测试。

### 测试不需要登录的接口

1. 展开 `POST /auth/register`
2. 在请求体中填写：
   ```json
   {
     "email": "alice@example.com",
     "name": "Alice",
     "password": "123456"
   }
   ```
3. 点击 "Send Request"
4. 看到响应结果

### 测试需要登录的接口

1. 先调用 `POST /auth/login` 获取 token
2. 回到页面顶部，找到 "Authorize" 按钮
3. 输入获取到的 accessToken
4. 再去调用 `GET /auth/profile`，会自动带上 Token

---

## 12. Scalar 主题

Scalar 支持多种主题，在 `main.ts` 中通过 `theme` 选项设置：

```typescript
apiReference({
  spec: { content: document },
  theme: 'purple',    // ← 可选的主题
})
```

可用主题：

| 主题 | 效果 |
|------|------|
| `'default'` | 默认浅色 |
| `'alternate'` | 备用浅色 |
| `'moon'` | 深色 |
| `'purple'` | 紫色 |
| `'solarized'` | 暖色 |
| `'bluePlanet'` | 蓝色 |
| `'saturn'` | 土星色 |
| `'kepler'` | 开普勒色 |
| `'mars'` | 火星色 |
| `'deepSpace'` | 深空色 |
| `'laserwave'` | 霓虹色 |

---

## 13. 完整文件清单

实现 Scalar 文档需要操作以下文件：

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 自动修改 | 新增 `@nestjs/swagger` 和 `@scalar/nestjs-api-reference` 依赖 |
| `src/common/docs/setup.ts` | 创建 | 文档配置独立封装 |
| `src/main.ts` | 修改 | 抽空文档配置，添加拦截器和过滤器 |
| `src/auth/auth.controller.ts` | 修改 | 加 `@ApiTags`、`@ApiOperation`、`@ApiBearerAuth`、`@ApiBody` |
| `src/users/users.controller.ts` | 修改 | 加 `@ApiTags`、`@ApiOperation`、`@ApiBearerAuth` |
| `src/auth/dto/register.dto.ts` | 修改 | 字段加 `@ApiProperty` |
| `src/auth/dto/login.dto.ts` | 修改 | 字段加 `@ApiProperty` |
| `src/users/user.entity.ts` | 修改 | 字段加 `@ApiProperty`（password 字段不加，避免泄露） |

无需新建文件。

---

## 14. 常见问题

### Q：为什么不直接用 Swagger UI 而要用 Scalar？

Swagger UI 是 NestJS 默认方案，但 Scalar 提供了更好的体验：
- 更现代化的界面设计
- 更好的 API 客户端（可以直接测试接口）
- 多种主题可选
- 性能更好

### Q：一定要装 @nestjs/swagger 吗？

是的。`@nestjs/swagger` 负责两件事：
1. **提供装饰器**（`@ApiTags`、`@ApiProperty` 等）
2. **生成 OpenAPI 规范**（`SwaggerModule.createDocument()`）

`@scalar/nestjs-api-reference` 只负责渲染，不负责生成。

### Q：`SwaggerModule.createDocument()` 是干嘛的？

它遍历项目中的**所有 Controller 和 DTO**，读取上面的装饰器（`@ApiTags`、`@ApiProperty`、`@Get`、`@Body` 等），生成一个 JavaScript 对象——这个对象就是 OpenAPI 规范（等同于一个 `openapi.json` 文件）。

### Q：@ApiProperty 和 class-validator 的装饰器（@IsEmail 等）功能重复吗？

不重复，它们各有各的作用：

```typescript
@ApiProperty({ example: 'alice@example.com', description: '用户邮箱' })  // ← 文档用
@IsEmail()                                                                // ← 校验用
email: string;
```

- `@ApiProperty` → 告诉 Scalar 文档这个字段长什么样
- `@IsEmail` → 告诉 NestJS ValidationPipe 请求来了要校验邮箱格式

两者可以同时存在，互不冲突。

### Q：password 字段为什么不在文档里显示？

在 `user.entity.ts` 中，password 字段没有加 `@ApiProperty()`：

```typescript
@Column({ length: 255 })
password: string;   // 没有 @ApiProperty，文档中不会显示
```

这样用户信息接口返回的示例中就不会包含密码字段，避免误把敏感信息暴露出去。

### Q：换了主题但没生效怎么办？

Scalar 的主题可能被浏览器缓存了。可以：
1. 清除浏览器缓存再刷新
2. 或者在 URL 后加个查询参数：`http://localhost:3000/docs?v=2`

### Q：访问 /docs 返回 404？

检查以下几点：
1. 应用是否正在运行（`pnpm run start:dev`）
2. 是否正确安装了两个依赖包
3. `main.ts` 中 `app.use('/docs', apiReference(...))` 是否写在 `app.listen()` 之前
4. 重启应用后重试

---

## 课后练习

自己动手试一下：

1. **换主题** — 在 `main.ts` 中把 `theme: 'purple'` 改成 `'moon'` 或 `'laserwave'`
2. **添加新接口描述** — 如果在 UsersController 中加了新接口，记得加 `@ApiOperation`
5. **确认密码字段被排除** — password 有 `@Exclude()` 配合 `ClassSerializerInterceptor` 自动过滤
4. **调整分组名** — 把 `@ApiTags('Auth')` 改成 `@ApiTags('认证管理')` 看看中文效果
