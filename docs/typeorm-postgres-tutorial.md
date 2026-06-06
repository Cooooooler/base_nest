# TypeORM + PostgreSQL 数据库接入教程（NestJS 新手版）

本文档手把手教你本项目是如何用 TypeORM 连接 PostgreSQL 的，以及如果你要从零开始实现一遍应该怎么做。

---

## 目录

1. [什么是 ORM？为什么用 TypeORM？](#1-什么是-orm为什么用-typeorm)
2. [整体架构](#2-整体架构)
3. [安装依赖](#3-安装依赖)
4. [环境变量](#4-环境变量)
5. [TypeORM 配置方式一：forRoot / forRootAsync](#5-typeorm-配置方式一forroot--forrootasync)
6. [TypeORM 配置方式二：独立 DataSource（用于迁移）](#6-typeorm-配置方式二独立-datasource用于迁移)
7. [为什么要"两个配置"？](#7-为什么要两个配置)
8. [实体（Entity）：定义数据表](#8-实体entity定义数据表)
9. [自动加载实体：autoLoadEntities 的作用](#9-自动加载实体autoloadentities-的作用)
10. [在模块中注册实体：forFeature](#10-在模块中注册实体forfeature)
11. [注入 Repository：@InjectRepository](#11-注入-repositoryinjectrepository)
12. [Service 中的 CRUD 操作](#12-service-中的-crud-操作)
13. [数据库迁移（Migration）](#13-数据库迁移migration)
14. [完整流程：从零到连上数据库](#14-完整流程从零到连上数据库)
15. [用 Docker 启动 PostgreSQL](#15-用-docker-启动-postgresql)
16. [常见问题](#16-常见问题)

---

## 1. 什么是 ORM？为什么用 TypeORM？

### 什么是 ORM

**ORM（Object Relational Mapping）** 让你用 TypeScript 类（对象）来操作数据库表，而不需要写 SQL。

```typescript
// 不用 ORM：手写 SQL
await db.query("SELECT * FROM users WHERE email = 'alice@example.com'");

// 用 ORM：调用方法
await usersRepository.findOneBy({ email: 'alice@example.com' });
```

### 为什么选 TypeORM

- **NestJS 官方推荐** — `@nestjs/typeorm` 是 NestJS 官方维护的集成包
- **装饰器驱动** — 用 `@Entity()`、`@Column()` 装饰器定义表结构，和 NestJS 的装饰器风格一致
- **活跃维护** — 2026 年发布 1.0 稳定版
- **迁移支持** — 内置迁移工具，生产环境必备

---

## 2. 整体架构

```
src/
├── app.module.ts                ← 根模块，用 TypeOrmModule.forRootAsync 连接数据库
├── config/
│   └── database.config.ts       ← 数据库配置命名空间（读环境变量）
├── database/
│   ├── data-source.ts           ← 独立的 DataSource（给 migrate 命令用的）
│   └── migrations/              ← 迁移文件放这里
└── users/                       ← 功能模块示例
    ├── user.entity.ts           ← 实体（对应数据库 users 表）
    ├── users.module.ts          ← 用 TypeOrmModule.forFeature 注册实体
    ├── users.service.ts         ← 用 @InjectRepository 操作数据库
    └── users.controller.ts      ← HTTP 路由
```

**两条路径的对比：**

| | 正常运行 | 执行迁移 |
|--|---------|---------|
| 入口 | `NestFactory.create(AppModule)` | `typeorm migration:run` 命令 |
| 配置文件 | `app.module.ts` 中的 `TypeOrmModule.forRootAsync` | `src/database/data-source.ts` |
| 加载方式 | NestJS DI 容器 | 独立运行，不经过 NestJS |
| 配置内容 | 连接 + 自动加载实体 | 连接 + 实体路径 + 迁移路径 |

---

## 3. 安装依赖

```bash
pnpm add @nestjs/typeorm typeorm pg @nestjs/config dotenv
```

| 包名 | 作用 |
|------|------|
| `@nestjs/typeorm` | NestJS 官方 TypeORM 集成，提供 `TypeOrmModule`、`@InjectRepository` 等 |
| `typeorm` | TypeORM 核心库，提供 `DataSource`、`Entity`、`Column` 等 |
| `pg` | PostgreSQL 的 Node.js 驱动，TypeORM 用它连接 PG |
| `@nestjs/config` | 读取 `.env` 文件，提供 `ConfigService` |
| `dotenv` | 给独立 DataSource 用的环境变量加载（不经过 NestJS） |

> `pg` 是数据库驱动。如果换 MySQL，就装 `mysql2` 而不是 `pg`。

---

## 4. 环境变量

**文件：** `.env`（已加入 `.gitignore`，不会提交到 git）

```ini
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nest_base
```

**文件：** `.env.example`（提交到 git，作为模板）

```ini
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=
DB_DATABASE=nest_base
```

**每个变量的含义：**

| 变量 | 含义 | 默认值 |
|------|------|--------|
| `DB_HOST` | 数据库地址 | `localhost` |
| `DB_PORT` | 数据库端口 | `5432`（PostgreSQL 默认端口） |
| `DB_USERNAME` | 数据库用户名 | `postgres` |
| `DB_PASSWORD` | 数据库密码 | 无默认，必填 |
| `DB_DATABASE` | 数据库名 | `nest_base` |

---

## 5. TypeORM 配置方式一：forRoot / forRootAsync

### 配置命名空间

**文件：** `src/config/database.config.ts`

先把环境变量封装成一个有默认值的命名空间：

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'nest_base',
}));
```

> `registerAs('database', ...)` 创建一个名为 `database` 的配置命名空间。之后可以通过 `configService.get('database.host')` 访问。

### AppModule 中的配置

**文件：** `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    // 1. 加载环境变量和配置命名空间
    ConfigModule.forRoot({
      isGlobal: true,           // ConfigService 全局可用，不用每个模块都 import
      load: [databaseConfig],   // 加载配置命名空间
      envFilePath: '.env',      // 从 .env 文件读
    }),

    // 2. 用异步工厂方法配置 TypeORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],  // 注入 ConfigService
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',                           // 数据库类型
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),

        autoLoadEntities: true,   // 自动加载用 forFeature 注册的实体
        synchronize: false,       // ！！！生产环境必须 false！！！
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
  ],
})
export class AppModule {}
```

### 为什么推荐 forRootAsync 而不是 forRoot？

`TypeOrmModule.forRoot()` 是同步配置，连接信息写死在代码里：

```typescript
// 不推荐：连接信息硬编码
TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',    // 写死了
  password: '123456',   // 写死了——泄露风险
});
```

`TypeOrmModule.forRootAsync()` 是异步配置，从环境变量读取：

```typescript
// 推荐：从环境变量读
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config) => ({
    host: config.get('DB_HOST'),   // 不同环境换 .env 文件即可
    password: config.get('DB_PASSWORD'),
  }),
});
```

**好处：**
1. 密码不会硬编码在代码里
2. 开发/测试/生产环境只需换 `.env` 文件
3. 可以动态读取配置（如从密钥管理服务获取）

### synchronize 为什么必须 false？

```typescript
synchronize: true,   // ❌ 危险！
```

`synchronize: true` 表示每次启动应用时，TypeORM 自动根据实体创建/修改数据库表。这让开发很方便，但：

- **可能删数据**：你改了一个字段名，重启后旧列被删，数据丢失
- **无法回滚**：没有迁移记录，出了问题不知道改了啥
- **多环境灾难**：测试环境同步后可能和生产环境结构不一致

正确做法：`synchronize: false` + 用迁移（Migration）管理表结构变更。

---

## 6. TypeORM 配置方式二：独立 DataSource（用于迁移）

**文件：** `src/database/data-source.ts`

```typescript
import { config as dotenvConfig } from 'dotenv';
import { DataSource } from 'typeorm';

// 加载 .env 文件（因为不经过 NestJS，需要手动加载）
dotenvConfig();

// 创建一个独立的 DataSource
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'nest_base',

  // 注意：这里是指向编译后的 JS 文件路径
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
});
```

**为什么 entities 写 `dist/**/*.entity.js` 而不是 `src/**/*.entity.ts`？**

因为 `typeorm migration:run` 命令直接运行 Node.js，不认识 TypeScript。所以必须先 `nest build` 编译成 JS，再执行迁移。

---

## 7. 为什么要"两个配置"？

初学者常问：AppModule 里已经配了一次，为什么还要一个 `data-source.ts`？

原因：**他们运行的环境不同**

```
┌─────────────────────────────────────────────────────────────┐
│                    NestJS 应用启动时                          │
│                                                             │
│  NestFactory.create(AppModule)                               │
│    → ConfigModule.forRoot() 加载 .env                        │
│    → TypeOrmModule.forRootAsync() 配置数据库连接              │
│    → autoLoadEntities: true 自动加载实体                      │
│                                                             │
│  依赖 NestJS DI 容器，无法独立运行                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    执行迁移命令时                              │
│                                                             │
│  typeorm migration:run -d src/database/data-source.ts        │
│    → dotenv.config() 手动加载 .env                           │
│    → new DataSource({...}) 创建连接                          │
│    → entities: ['dist/**/*.entity.js'] 显式指定实体路径        │
│    → migrations: ['dist/database/migrations/*.js'] 执行迁移    │
│                                                             │
│  不依赖 NestJS，命令行独立运行                                  │
└─────────────────────────────────────────────────────────────┘
```

**关键差异：**

| | AppModule（运行应用） | data-source.ts（执行迁移） |
|--|---------------------|--------------------------|
| 谁来加载 `.env` | ConfigModule 自动加载 | 手动调用 `dotenv.config()` |
| 实体怎么发现 | `autoLoadEntities: true` | 显式写 `entities: ['dist/**/*.entity.js']` |
| 迁移文件路径 | 不需要 | `migrations: ['dist/database/migrations/*.js']` |

**重要原则：两个配置的环境变量名和默认值必须保持一致**，否则会发生"应用能启动但迁移找不到表"的问题。

---

## 8. 实体（Entity）：定义数据表

**文件：** `src/users/user.entity.ts`

实体就是一个 TypeScript 类，通过装饰器告诉 TypeORM 表长什么样。

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')              // 对应数据库中的 users 表
export class User {
  @PrimaryGeneratedColumn('uuid')   // 主键，UUID 格式，自动生成
  id: string;

  @Column({ unique: true, length: 255 })  // 唯一索引，最长 255 字符
  email: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })    // 存 bcrypt 哈希
  password: string;

  @Column({ default: true })  // 默认值 true
  isActive: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  // timestamptz：带时区的时间戳
  // default: () => 'NOW()'：插入时自动填当前时间
  createdAt: Date;
}
```

### 常用装饰器

| 装饰器 | 作用 |
|--------|------|
| `@Entity('表名')` | 标记这是一个实体，对应数据库表 |
| `@PrimaryGeneratedColumn('uuid')` | 自增主键（UUID 格式） |
| `@PrimaryGeneratedColumn()` | 自增主键（数字格式，1, 2, 3...） |
| `@Column()` | 普通列 |
| `@Column({ unique: true })` | 唯一约束 |
| `@Column({ default: true })` | 默认值 |
| `@Column({ type: 'text' })` | 指定数据库类型 |
| `@Column({ nullable: true })` | 允许为空 |
| `@CreateDateColumn()` | 自动设为插入时间 |

---

## 9. 自动加载实体：autoLoadEntities 的作用

在 `TypeOrmModule.forRootAsync` 中我们配置了：

```typescript
autoLoadEntities: true,
```

这行配置的意思是：**NestJS 会自动收集所有通过 `TypeOrmModule.forFeature()` 注册的实体**，不需要在根配置中一个个列出。

```typescript
// ❌ 不用 autoLoadEntities 时：要在根配置中手动列举
TypeOrmModule.forRoot({
  entities: [User, Article, Comment],  // 每加一个实体都要修改这里
});

// ✅ 用了 autoLoadEntities：每个模块自己注册
// app.module.ts 中只需要 autoLoadEntities: true
// users.module.ts 中：
@Module({
  imports: [TypeOrmModule.forFeature([User])],  // ← 实体在这里注册
})
```

**好处：**
- 添加新实体时，只需在对应的模块中用 `forFeature` 注册
- 不需要修改根配置
- 功能模块的自包含性更强

---

## 10. 在模块中注册实体：forFeature

**文件：** `src/users/users.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),  // ← 把 User 实体注册到这个模块
  ],                                    //    Repository<User> 就可以注入了
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],              // ← 导出供 AuthModule 使用
})
export class UsersModule {}
```

> `TypeOrmModule.forFeature([User])` 做了两件事：
> 1. 让这个模块中可以注入 `Repository<User>`
> 2. 告诉 `autoLoadEntities`：User 这个实体要加载

---

## 11. 注入 Repository：@InjectRepository

**文件：** `src/users/users.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)                    // ← 注入 User 对应的 Repository
    private readonly usersRepository: Repository<User>,
  ) {}

  // Repository 提供了完整的 CRUD 方法
  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);  // 创建实体实例
    return this.usersRepository.save(user);            // 保存到数据库
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
```

**`@InjectRepository(User)` 做了什么？**

1. TypeORM 用 `User` 实体生成一个 `Repository<User>` 对象
2. `@InjectRepository(User)` 把这个 Repository 注入到 service 中
3. 你就可以用 `this.usersRepository.find()` 等方法操作 `users` 表了

**前提条件：**
- 在 `UsersModule` 中调用了 `TypeOrmModule.forFeature([User])`（第 10 节）
- 在根配置中配置了数据库连接（第 5 节）
- 以上条件缺一不可

---

## 12. Service 中的 CRUD 操作

`Repository` 提供的常用方法：

| 方法 | 说明 | SQL 示例 |
|------|------|----------|
| `find()` | 查所有 | `SELECT * FROM users` |
| `find({ where: { isActive: true } })` | 条件查询 | `SELECT * FROM users WHERE is_active = true` |
| `findOneBy({ id: 'xxx' })` | 按字段查一条 | `SELECT * FROM users WHERE id = 'xxx' LIMIT 1` |
| `save(entity)` | 插入或更新 | `INSERT INTO users ...` 或 `UPDATE users SET ...` |
| `create(data)` | 创建实体实例（不保存） | 不生成 SQL |
| `update(id, data)` | 更新 | `UPDATE users SET ... WHERE id = 'xxx'` |
| `delete(id)` | 删除 | `DELETE FROM users WHERE id = 'xxx'` |
| `count({ where: ... })` | 计数 | `SELECT COUNT(*) FROM users WHERE ...` |

**create 和 save 的区别：**

```typescript
// create 只在内存中创建一个实体对象，不操作数据库
const user = this.usersRepository.create({ email: 'test@test.com' });
// user 只是一个普通对象，还没有存到数据库

// save 把实体写入数据库
await this.usersRepository.save(user);
```

---

## 13. 数据库迁移（Migration）

### 为什么需要迁移

开发中直接改实体就够了，但生产环境不行。迁移让你：

1. **版本控制表结构** — 每次变更都生成一个迁移文件，可以追溯到谁改了什么
2. **安全部署** — 先执行迁移改表结构，再部署新代码
3. **回滚能力** — 发现出错可以 `migration:revert`

### 迁移命令

```bash
# 1. 生成迁移（TypeORM 对比实体和数据库，自动生成 SQL）
pnpm run migration:generate --name=CreateUsersTable

# 2. 执行迁移
pnpm run migration:run

# 3. 回滚最近一次迁移
pnpm run migration:revert
```

### 命令背后的流程

以 `pnpm run migration:run` 为例：

```
1. nest build           ← 先把 TypeScript 编译成 JS
2. typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
                        ← 用 data-source.ts 的配置连接数据库
                        ← 查找 dist/database/migrations/*.js 中的迁移文件
                        ← 逐个执行还未运行过的迁移
```

`typeorm-ts-node-commonjs` 是 TypeORM 1.0 自带的命令，它会在后台用 ts-node 加载 TypeScript 配置文件。

### 迁移文件长什么样

```typescript
// src/database/migrations/1780768862168-CreateUsersTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1780768862168 implements MigrationInterface {
  name = 'CreateUsersTable1780768862168';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // up：执行迁移时运行（创建表、加列等）
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "name" character varying(100) NOT NULL,
        "password" character varying(255) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_email" UNIQUE ("email"),
        CONSTRAINT "PK_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // down：回滚时运行（删表、删列等）
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
```

### 迁移工作流

```
开发周期
  │
  ├── 修改实体（添加字段、修改类型等）
  │
  ├── pnpm run migration:generate --name=AddPhoneToUsers
  │   ← TypeORM 生成迁移文件
  │
  ├── 审查生成的 SQL 是否正确
  │
  ├── pnpm run migration:run
  │   ← 应用到本地数据库
  │
  ├── 提交代码（包含实体 + 迁移文件）
  │
  └── 部署时自动运行 pnpm run migration:run
```

---

## 14. 完整流程：从零到连上数据库

### 第一步：安装依赖

```bash
pnpm add @nestjs/typeorm typeorm pg @nestjs/config dotenv
```

### 第二步：配置环境变量

创建 `.env`，填入数据库连接信息。

### 第三步：创建配置命名空间

创建 `src/config/database.config.ts`（第 5 节）。

### 第四步：配置 AppModule

在 `src/app.module.ts` 中加入 `ConfigModule.forRoot()` 和 `TypeOrmModule.forRootAsync()`（第 5 节）。

### 第五步：创建独立 DataSource

创建 `src/database/data-source.ts`（第 6 节）。

### 第六步：添加迁移脚本

`package.json` 中添加：

```json
"migration:generate": "nest build && typeorm-ts-node-commonjs migration:generate -d src/database/data-source.ts src/database/migrations/",
"migration:run": "nest build && typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts",
"migration:revert": "nest build && typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts"
```

### 第七步：创建迁移文件

```bash
pnpm run migration:generate --name=CreateUsersTable
pnpm run migration:run
```

### 第八步：创建实体 + 模块

创建 `src/users/user.entity.ts` + `src/users/users.module.ts` + `src/users/users.service.ts`，参考第 8/10/11 节。

### 第九步：启动验证

```bash
pnpm run start:dev
```

启动后访问 `http://localhost:3000/users`，应该能正常返回数据。

---

## 15. 用 Docker 启动 PostgreSQL

如果没有安装 PostgreSQL，可以用 Docker 快速启动一个：

```bash
# 启动 PostgreSQL 容器
docker run -d \
  --name nest-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=nest_base \
  -p 5432:5432 \
  postgres:16
```

| 参数 | 说明 |
|------|------|
| `--name nest-pg` | 容器名 |
| `-e POSTGRES_PASSWORD=postgres` | 设置密码 |
| `-e POSTGRES_DB=nest_base` | 创建数据库 |
| `-p 5432:5432` | 映射端口 |
| `postgres:16` | PostgreSQL 16 镜像 |

```bash
# 停止容器
docker stop nest-pg

# 重新启动
docker start nest-pg

# 删除容器（数据也会被删除！）
docker rm -f nest-pg
```

---

## 16. 常见问题

### Q：TypeORM 1.0 和 0.3 有什么区别？

1.0 是 0.3 的稳定版，核心 API 基本一致。主要变化：
- 去掉了 `chalk`、`mkdirp`、`uuid` 等依赖，改用更轻量的替代
- `DataSource` 仍然是核心类（0.3 引入的，取代了 0.2 的 `Connection`）

### Q：为什么不建议用 `synchronize: true`？

可以理解为"自动挡"和"手动挡"的区别：

- `synchronize: true`（自动挡）：方便，但不知道引擎盖下发生了什么。出问题不好排查。
- `synchronize: false` + 迁移（手动挡）：每次变更都有记录，可以回滚，多人协作时不会冲突。

开发环境可以用 `synchronize: true` 快速迭代，但本项目中强制 `synchronize: false`，从一开始就养成好习惯。

### Q：`@InjectRepository()` 和 `@InjectDataSource()` 有什么区别？

| 装饰器 | 注入什么 | 什么时候用 |
|--------|---------|-----------|
| `@InjectRepository(User)` | `Repository<User>` | 大部分 CRUD |
| `@InjectDataSource()` | `DataSource` | 需要事务、原生查询、多实体操作 |

```typescript
// 大部分情况用 @InjectRepository
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
}

// 需要事务时用 @InjectDataSource
@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async transferMoney() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    // ... 一系列数据库操作
    await queryRunner.commitTransaction();
  }
}
```

### Q：entities: `['dist/**/*.entity.js']` 中的 `**` 是什么意思？

glob 通配符：
- `dist/` — 在 dist 目录下搜索
- `**` — 任意层级的子目录
- `*.entity.js` — 所有以 `.entity.js` 结尾的文件

所以 `dist/users/user.entity.js`、`dist/articles/article.entity.js`、`dist/admin/settings/settings.entity.js` 都能匹配到。

### Q：为什么 `nest-cli.json` 中要设置 `deleteOutDir: true`？

```json
{
  "compilerOptions": {
    "deleteOutDir": true   // 每次 build 前删除 dist 目录
  }
}
```

确保旧文件不会残留。如果实体被删除了但旧编译文件还在，TypeORM 可能会加载到已经不存在的实体导致奇怪的问题。

### Q：`module: "nodenext"` 对 TypeORM 有影响吗？

`tsconfig.json` 中 `module: "nodenext"` 让 TypeScript 采用 Node.js 的 ESM/CJS 模块解析规则。TypeORM 1.0 和 `@nestjs/typeorm` 都兼容这种模式。`typeorm-ts-node-commonjs` 命令也是专门为这种配置设计的。

### Q：`typeorm-ts-node-commonjs` 和 `typeorm` 命令有什么区别？

- `typeorm` — 直接运行，要求配置文件是 JS
- `typeorm-ts-node-commonjs` — 集成 ts-node，可以直接加载 `.ts` 配置文件
- `typeorm-ts-node-esm` — 同上的 ESM 版本

因为我们的 `data-source.ts` 是 TypeScript 文件，所以要 `typeorm-ts-node-commonjs`。

---

## 课后练习

自己动手试一下：

1. **添加一个新实体** — 比如 `Article`（文章），包含 title、content、authorId 字段
2. **建立关联** — Article 和 User 之间的多对一关系（`@ManyToOne`）
3. **创建迁移** — 运行 `migration:generate` 生成建表迁移
4. **自定义查询** — 在 Repository 上用 `createQueryBuilder` 写连表查询
5. **添加事务** — 用 `@InjectDataSource()` 实现一个需要事务的操作
