export interface RegisterDto {
  email: string;
  name: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface RegisterResponse extends AuthTokens {
  user: AuthUser;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}
