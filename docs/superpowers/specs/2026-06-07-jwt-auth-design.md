# JWT Authentication Design

## Overview

Add full JWT authentication to the NestJS 11 project: register, login, refresh tokens, and logout (server-side token blacklisting).

## API Endpoints

| Method | Path             | Auth | Description                         |
|--------|------------------|------|-------------------------------------|
| POST   | `/auth/register` | No   | Register with email, name, password |
| POST   | `/auth/login`    | No   | Login → accessToken + refreshToken  |
| POST   | `/auth/refresh`  | No   | Rotate refresh token                |
| POST   | `/auth/logout`   | JWT  | Blacklist current token             |
| GET    | `/auth/profile`  | JWT  | Current user info                   |

## Token Strategy

- **Access Token**: 15m, payload `{ sub, email, type: 'access' }`
- **Refresh Token**: 7d, payload `{ sub, jti, type: 'refresh' }`, rotated on each refresh
- **Blacklist**: `blacklisted_tokens` table stores hashed tokens at logout

## Modules & Files

### New: `src/auth/`
- `auth.module.ts` — imports JwtModule, UsersModule, TypeOrmModule.forFeature([BlacklistedToken])
- `auth.controller.ts` — routes above
- `auth.service.ts` — register/login/refresh/logout logic
- `dto/register.dto.ts` — email, name, password validation
- `dto/login.dto.ts` — email, password validation
- `guards/jwt-auth.guard.ts` — extends AuthGuard('jwt')
- `guards/optional-auth.guard.ts` — optional auth (returns null if no token)
- `strategies/jwt.strategy.ts` — Passport strategy, extracts user from DB
- `token-blacklist.service.ts` — check/add blacklisted tokens
- `decorators/current-user.decorator.ts` — `@CurrentUser()` parameter decorator
- `entities/blacklisted-token.entity.ts` — token hash + expiresAt

### Modified: `src/users/`
- `user.entity.ts` — add `password` column
- `users.service.ts` — add `findByEmail()` method
- `users.module.ts` — export UsersService

### Modified: `src/app.module.ts`
- import AuthModule
- add global pipe for validation

## Dependencies

`bcrypt` `@nestjs/jwt` `@nestjs/passport` `passport` `passport-jwt` `@types/bcrypt` (dev)

## Env vars (new)

```
JWT_SECRET=dev-secret-change-in-production
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```
